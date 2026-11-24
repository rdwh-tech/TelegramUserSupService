"""REST-контракт /internal/bot/v1 (contracts_bot.md, 19.11.2026).

Только API владеет данными. Компания выводится API из API_SERVICE_TOKEN;
COMPANY_ID не отправляется ни в заголовке, ни в теле запросов.
"""

import asyncio
import json
import logging
import mimetypes
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from urllib.parse import quote, urlsplit

from .. import texts

log = logging.getLogger(__name__)
PREFIX = "/internal/bot/v1"


class ApiError(Exception):
    def __init__(self, message="API error", *, code=None, status=None, details=None):
        super().__init__(message)
        self.code, self.status, self.details = code, status, details or {}


class ApiUnavailableError(ApiError):
    """Timeout, network error, 5xx or exhausted retries."""


class ApiAuthError(ApiError):
    """Invalid service token."""


class TicketClosedError(ApiError):
    """409 TICKET_CLOSED."""


class ActiveTicketExistsError(ApiError):
    """409 CLIENT_ACTIVE_TICKET_EXISTS, details may contain active ticket."""


class ApiClient(ABC):
    @abstractmethod
    async def get_config(self, *, refresh=False) -> dict: ...

    async def get_welcome_message(self) -> str:
        return (await self.get_config()).get("welcome_message") or ""

    async def get_attachment_limits(self) -> dict:
        return (await self.get_config()).get("attachment_limits", {})

    @abstractmethod
    async def get_faq(self, *, refresh=False) -> list[dict]: ...

    @abstractmethod
    async def register_client(self, telegram_user_id: int, telegram_chat_id: int,
                              username: str | None, full_name: str) -> dict: ...

    @abstractmethod
    async def get_client_context(self, telegram_user_id: int) -> dict: ...

    async def get_active_ticket(self, telegram_user_id: int) -> dict | None:
        return (await self.get_client_context(telegram_user_id)).get("active_ticket")

    @abstractmethod
    async def create_ticket(self, telegram_user_id: int, telegram_chat_id: int,
                            telegram_username: str | None, telegram_full_name: str,
                            idempotency_key: str | None = None) -> dict: ...

    @abstractmethod
    async def send_message(self, ticket_id: str, message_type: str, content: str | None = None,
                           file_id: str | None = None, file_name: str | None = None,
                           caption: str | None = None, telegram_message_id: int | None = None,
                           mime_type: str | None = None, file_size_bytes: int | None = None) -> dict: ...

    @abstractmethod
    async def reopen_ticket(self, ticket_id: str) -> bool: ...

    @abstractmethod
    async def submit_rating(self, ticket_id: str, score: int) -> bool: ...

    @abstractmethod
    async def report_delivery(self, message_id: str, delivered: bool,
                              telegram_message_id: int | None = None,
                              error_code: str | None = None, error: str | None = None) -> None: ...

    @abstractmethod
    async def get_broadcast_recipients(self, campaign_id: str, cursor: str | None = None,
                                       limit: int = 500) -> dict: ...

    @abstractmethod
    async def report_broadcast_progress(self, campaign_id: str, sent: int,
                                        failed: int, finished: bool) -> None: ...

    @abstractmethod
    async def download_attachment(self, download_path: str) -> tuple[bytes, str, str]: ...

    async def aclose(self) -> None: ...


class StubApiClient(ApiClient):
    """Small in-memory implementation; used for manual scenarios and unit tests."""
    def __init__(self, company_id: str):
        self.company_id = company_id
        self._tickets = {}
        self._rated = set()
        self._counter = 0
        self._clients = {}
        self._idempotency = {}
        self.sent_messages = []
        self.delivery_reports = []
        self.broadcast_progress = []
        self.broadcast_recipients = []

    async def get_config(self, *, refresh=False):
        return {"company_id": self.company_id, "company_name": "Demo", "is_company_active": True,
                "welcome_message": texts.WELCOME_DEFAULT,
                "attachment_limits": {"max_file_size_bytes": 20 * 1024 * 1024,
                                      "photo_mime_types": ["image/jpeg", "image/png", "image/webp"],
                                      "document_extensions": [".pdf", ".docx", ".txt", ".zip"]},
                "updated_at": "2026-11-19T00:00:00Z"}

    async def get_faq(self, *, refresh=False):
        return [{"id": "1", "question": "Как создать обращение?", "answer": "Нажмите «Связаться с человеком»", "sort_order": 1},
                {"id": "2", "question": "Как долго ждать ответа?", "answer": "Мы отвечаем в течение 15 минут", "sort_order": 2}]

    async def register_client(self, telegram_user_id, telegram_chat_id, username, full_name):
        created = telegram_user_id not in self._clients
        client_id = (str(uuid.uuid4()) if created else self._clients[telegram_user_id]["client_id"])
        self._clients[telegram_user_id] = {"client_id": client_id,
                                           "telegram_chat_id": telegram_chat_id,
                                           "username": username, "full_name": full_name}
        return {"client_id": client_id, "telegram_user_id": telegram_user_id, "created": created}

    def _active_of(self, telegram_user_id):
        for ticket_id, ticket in self._tickets.items():
            if ticket["user"] == telegram_user_id and ticket["status"] != "closed":
                return {"ticket_id": ticket_id, "ticket_number": ticket["ticket_number"],
                        "status": ticket["status"], "escalation_level": "l1"}
        return None

    async def get_client_context(self, telegram_user_id):
        pending = next(({"ticket_id": tid, "ticket_number": t["ticket_number"], "closed_at": "2026-11-19T10:00:00Z"}
                        for tid, t in reversed(list(self._tickets.items()))
                        if t["user"] == telegram_user_id and t["status"] == "closed" and tid not in self._rated), None)
        return {"client_id": self._clients.get(telegram_user_id, {}).get("client_id"),
                "active_ticket": self._active_of(telegram_user_id), "pending_rating": pending}

    async def create_ticket(self, telegram_user_id, telegram_chat_id, telegram_username, telegram_full_name,
                            idempotency_key=None):
        if idempotency_key and idempotency_key in self._idempotency:
            return self._idempotency[idempotency_key].copy()
        active = self._active_of(telegram_user_id)
        if active:
            raise ActiveTicketExistsError("active ticket exists", code="CLIENT_ACTIVE_TICKET_EXISTS",
                                          status=409, details=active)
        await self.register_client(telegram_user_id, telegram_chat_id, telegram_username, telegram_full_name)
        self._counter += 1
        ticket_id = str(uuid.uuid4())
        self._tickets[ticket_id] = {"user": telegram_user_id, "status": "new", "ticket_number": self._counter}
        result = {"ticket_id": ticket_id, "ticket_number": self._counter,
                  "status": "new", "escalation_level": "l1",
                  "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")}
        if idempotency_key:
            self._idempotency[idempotency_key] = result.copy()
        return result

    async def send_message(self, ticket_id, message_type, content=None, file_id=None, file_name=None,
                           caption=None, telegram_message_id=None, mime_type=None, file_size_bytes=None):
        ticket = self._tickets.get(ticket_id)
        if ticket is None:
            raise ApiError("ticket not found", code="TICKET_NOT_FOUND", status=404)
        if ticket["status"] == "closed":
            raise TicketClosedError("ticket closed", code="TICKET_CLOSED", status=409)
        previous = next((m for m in self.sent_messages if m["ticket_id"] == ticket_id
                         and m["telegram_message_id"] == telegram_message_id), None)
        if previous and telegram_message_id is not None:
            return {"message_id": previous["message_id"], "ticket_id": ticket_id,
                    "ticket_status": ticket["status"], "duplicate": True,
                    "created_at": previous["created_at"]}
        if ticket["status"] == "waiting_client":
            ticket["status"] = "in_progress"
        result = {"message_id": str(uuid.uuid4()), "ticket_id": ticket_id,
                  "ticket_status": ticket["status"], "duplicate": False,
                  "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")}
        self.sent_messages.append({"ticket_id": ticket_id, "message_type": message_type, "content": content or caption,
                                   "file_id": file_id, "file_name": file_name, "caption": caption,
                                   "mime_type": mime_type, "file_size_bytes": file_size_bytes,
                                   "telegram_message_id": telegram_message_id, **result})
        return result

    async def reopen_ticket(self, ticket_id):
        ticket = self._tickets.get(ticket_id)
        if not ticket or ticket["status"] != "closed" or self._active_of(ticket["user"]):
            return False
        ticket["status"] = "new"
        return True

    async def submit_rating(self, ticket_id, score):
        if score not in (1, 2, 3, 4, 5):
            raise ApiError("invalid score", code="VALIDATION_ERROR", status=422)
        ticket = self._tickets.get(ticket_id)
        if not ticket or ticket["status"] != "closed":
            raise ApiError("ticket is not closed", code="TICKET_NOT_CLOSED", status=409)
        if ticket_id in self._rated:
            return False
        self._rated.add(ticket_id)
        return True

    async def report_delivery(self, message_id, delivered, telegram_message_id=None, error_code=None, error=None):
        value = {"message_id": message_id, "delivered": delivered,
                 "telegram_message_id": telegram_message_id,
                 "error_code": error_code, "error": error}
        self.delivery_reports = [x for x in self.delivery_reports if x["message_id"] != message_id]
        self.delivery_reports.append(value)

    async def get_broadcast_recipients(self, campaign_id, cursor=None, limit=500):
        start = int(cursor) if cursor else 0
        recipients = self.broadcast_recipients[start:start + limit]
        following = start + len(recipients)
        return {"items": recipients, "next_cursor": str(following) if following < len(self.broadcast_recipients) else None}

    async def report_broadcast_progress(self, campaign_id, sent, failed, finished):
        value = {"campaign_id": campaign_id, "sent": sent, "failed": failed,
                 "finished": finished}
        self.broadcast_progress = [x for x in self.broadcast_progress if x["campaign_id"] != campaign_id]
        self.broadcast_progress.append(value)

    async def download_attachment(self, download_path):
        raise ApiError("stub attachment is not configured", code="ATTACHMENT_NOT_FOUND", status=404)

    async def close_ticket(self, ticket_id):
        if ticket_id in self._tickets:
            self._tickets[ticket_id]["status"] = "closed"

    def last_closed_ticket_id(self, telegram_user_id):
        ids = [tid for tid, t in self._tickets.items() if t["user"] == telegram_user_id and t["status"] == "closed"]
        return ids[-1] if ids else None


class HttpApiClient(ApiClient):
    """HTTP client conforming to contracts_bot.md sections 0 and 1.1."""
    def __init__(self, base_url: str, company_id: str, service_token: str, timeout: int = 10,
                 *, transport=None):
        import httpx
        if not service_token:
            raise ValueError("API_SERVICE_TOKEN is required in API_MODE=http")
        self._httpx = httpx
        self._company_id = company_id  # only for local validation/logs, never sent to API
        self._config = None
        self._faq = None
        self._redis = None
        self._faq_cache_key = f"bot:faq:{company_id}"
        if base_url.lower().startswith("http://") and not any(
                host in base_url.lower() for host in ("localhost", "127.0.0.1", "api:", "host.docker.internal")):
            log.warning("API_BASE_URL uses unencrypted HTTP; use internal trusted networking or HTTPS")
        self._client = httpx.AsyncClient(base_url=base_url.rstrip("/"), timeout=timeout,
                                         transport=transport,
                                         headers={"Authorization": f"Bearer {service_token}",
                                                  "Content-Type": "application/json"})

    @staticmethod
    def _json(response, label):
        try:
            data = response.json()
        except ValueError:
            raise ApiError(f"{label}: invalid JSON") from None
        if not isinstance(data, dict):
            raise ApiError(f"{label}: expected JSON object")
        return data

    def _raise_error(self, response):
        # Proxies may return empty/non-JSON 5xx despite the API contract.
        try:
            payload = self._json(response, "error") if response.content else {}
        except ApiError:
            payload = {}
        info = payload.get("error") or {}
        if not isinstance(info, dict):
            info = {}
        code = info.get("code")
        details = info.get("details") if isinstance(info.get("details"), dict) else {}
        message = f"API error {response.status_code}"  # не выводим чужой message в Telegram или логи
        kwargs = {"code": code, "status": response.status_code, "details": details}
        if response.status_code == 401:
            raise ApiAuthError(message, **kwargs)
        if code == "TICKET_CLOSED":
            raise TicketClosedError(message, **kwargs)
        if code == "CLIENT_ACTIVE_TICKET_EXISTS":
            raise ActiveTicketExistsError(message, **kwargs)
        if response.status_code >= 500:
            raise ApiUnavailableError(message, **kwargs)
        raise ApiError(message, **kwargs)

    async def _request(self, method: str, path: str, *, expected=(200,), retryable=False, **kwargs):
        # Same X-Request-Id and Idempotency-Key survive retries.
        headers = {**kwargs.pop("headers", {}), "X-Request-Id": str(uuid.uuid4())}
        attempts = 3 if method == "GET" or retryable or method == "PUT" else 1
        for index in range(attempts):
            try:
                response = await self._client.request(method, PREFIX + path, headers=headers, **kwargs)
            except (self._httpx.TransportError, self._httpx.TimeoutException) as exc:
                if index + 1 < attempts:
                    await asyncio.sleep((0.5, 1.0)[index])
                    continue
                raise ApiUnavailableError(f"API transport failure: {type(exc).__name__}") from None
            if response.status_code in (502, 503, 504) and index + 1 < attempts:
                await asyncio.sleep((0.5, 1.0)[index])
                continue
            if response.status_code not in expected:
                self._raise_error(response)
            return response
        raise ApiUnavailableError("API retries exhausted")

    def attach_cache(self, redis):
        """Enable shared Redis FAQ cache; invalidated on company.config_updated."""
        self._redis = redis

    async def get_config(self, *, refresh=False):
        if self._config is not None and not refresh:
            return self._config
        data = self._json(await self._request("GET", "/config"), "config")
        if not isinstance(data.get("attachment_limits"), dict):
            raise ApiError("config: attachment_limits is missing")
        if data.get("company_id") != self._company_id:
            raise ApiError("config: company_id does not match bot instance", code="ACCESS_DENIED")
        self._config = data
        return data

    async def get_faq(self, *, refresh=False):
        if refresh:
            self._faq = None
            if self._redis:
                await self._redis.delete(self._faq_cache_key)
        if self._faq is not None:
            return self._faq
        if self._redis and not refresh:
            cached = await self._redis.get(self._faq_cache_key)
            if cached:
                self._faq = json.loads(cached)
                return self._faq
        data = self._json(await self._request("GET", "/faq"), "faq")
        if not isinstance(data.get("items"), list):
            raise ApiError("faq: items missing")
        self._faq = [i for i in data["items"] if isinstance(i, dict) and {"id", "question", "answer"} <= i.keys()]
        if self._redis:
            await self._redis.setex(self._faq_cache_key, 3600, json.dumps(self._faq, ensure_ascii=False))
        return self._faq

    async def register_client(self, telegram_user_id, telegram_chat_id, username, full_name):
        response = await self._request("PUT", f"/clients/{telegram_user_id}", json={
            "telegram_chat_id": telegram_chat_id, "username": username, "full_name": full_name})
        return self._json(response, "client")

    async def get_client_context(self, telegram_user_id):
        data = self._json(await self._request("GET", f"/clients/{telegram_user_id}/context"), "context")
        for field in ("active_ticket", "pending_rating"):
            if data.get(field) is not None and (not isinstance(data[field], dict) or "ticket_id" not in data[field]):
                raise ApiError(f"context: invalid {field}")
        return data

    async def create_ticket(self, telegram_user_id, telegram_chat_id, telegram_username, telegram_full_name,
                            idempotency_key=None):
        key = idempotency_key or str(uuid.uuid4())
        data = self._json(await self._request("POST", "/tickets", expected=(201,), retryable=True,
                                              headers={"Idempotency-Key": key}, json={
            "telegram_user_id": telegram_user_id, "telegram_chat_id": telegram_chat_id,
            "username": telegram_username, "full_name": telegram_full_name}), "ticket")
        if not data.get("ticket_id") or not isinstance(data.get("ticket_number"), int):
            raise ApiError("create ticket: unexpected response")
        return data

    async def send_message(self, ticket_id, message_type, content=None, file_id=None, file_name=None,
                           caption=None, telegram_message_id=None, mime_type=None, file_size_bytes=None):
        if telegram_message_id is None:
            raise ValueError("telegram_message_id is required for natural idempotency")
        if message_type not in ("text", "photo", "document"):
            raise ValueError("invalid message type")
        attachments = []
        if message_type != "text":
            if not file_id:
                raise ValueError("file_id is required for attachment")
            if message_type == "photo":
                file_name = file_name or f"photo_{telegram_message_id}.jpg"
                mime_type = mime_type or "image/jpeg"
            else:
                mime_type = mime_type or mimetypes.guess_type(file_name or "")[0] or "application/octet-stream"
            attachments = [{"file_type": message_type, "telegram_file_id": file_id,
                            "file_name": file_name, "mime_type": mime_type,
                            "file_size_bytes": file_size_bytes}]
        body = {"type": message_type, "content": content if message_type == "text" else caption,
                "telegram_message_id": telegram_message_id, "attachments": attachments}
        response = await self._request("POST", f"/tickets/{quote(str(ticket_id), safe='')}/messages",
                                       expected=(200, 201), retryable=True, json=body)
        return self._json(response, "message")

    async def reopen_ticket(self, ticket_id):
        try:
            await self._request("POST", f"/tickets/{quote(str(ticket_id), safe='')}/reopen")
        except ApiError as exc:
            if exc.status == 409 and exc.code == "REOPEN_NOT_ALLOWED":
                return False
            raise
        return True

    async def submit_rating(self, ticket_id, score):
        try:
            await self._request("POST", f"/tickets/{quote(str(ticket_id), safe='')}/rating",
                                expected=(201,), json={"score": score, "comment": None})
        except ApiError as exc:
            if exc.status == 409 and exc.code == "RATING_ALREADY_EXISTS":
                return False
            raise
        return True

    async def report_delivery(self, message_id, delivered, telegram_message_id=None, error_code=None, error=None):
        body = {"delivered": delivered, "telegram_message_id": telegram_message_id,
                "error_code": error_code, "error": error}
        await self._request("POST", f"/messages/{quote(str(message_id), safe='')}/delivery",
                            expected=(204,), retryable=True, json=body)

    async def get_broadcast_recipients(self, campaign_id, cursor=None, limit=500):
        params = {"limit": limit}
        if cursor:
            params["cursor"] = cursor
        response = await self._request("GET", f"/broadcasts/{quote(str(campaign_id), safe='')}/recipients",
                                       params=params)
        data = self._json(response, "broadcast recipients")
        if not isinstance(data.get("items"), list):
            raise ApiError("broadcast recipients: items missing")
        return data

    async def report_broadcast_progress(self, campaign_id, sent, failed, finished):
        await self._request("POST", f"/broadcasts/{quote(str(campaign_id), safe='')}/progress",
                            expected=(204,), retryable=True,
                            json={"sent": sent, "failed": failed, "finished": finished})

    async def download_attachment(self, download_path):
        """Stream an API attachment with GET retries; never fetch arbitrary URLs."""
        parsed = urlsplit(download_path)
        prefix = f"{PREFIX}/attachments/"
        if (parsed.scheme or parsed.netloc or parsed.query or parsed.fragment
                or not parsed.path.startswith(prefix) or not parsed.path.endswith("/file")
                or parsed.path.count("/") != 6):
            raise ApiError("invalid attachment download path")
        attachment_id = parsed.path[len(prefix):-len("/file")]
        if not attachment_id or "/" in attachment_id or attachment_id in (".", ".."):
            raise ApiError("invalid attachment ID")
        path = PREFIX + f"/attachments/{quote(attachment_id, safe='')}/file"
        request_id = str(uuid.uuid4())
        for attempt in range(3):
            try:
                async with self._client.stream("GET", path, headers={"X-Request-Id": request_id}) as response:
                    if response.status_code in (502, 503, 504) and attempt < 2:
                        await asyncio.sleep((0.5, 1.0)[attempt])
                        continue
                    if response.status_code != 200:
                        await response.aread()
                        self._raise_error(response)
                    limit = 50 * 1024 * 1024
                    chunks, size = [], 0
                    async for chunk in response.aiter_bytes():
                        size += len(chunk)
                        if size > limit:
                            raise ApiError("operator file exceeds Telegram upload limit")
                        chunks.append(chunk)
                    content_type = response.headers.get("content-type", "application/octet-stream")
                    disposition = response.headers.get("content-disposition", "")
                    import re
                    match = re.search(r'filename="?([^";]+)', disposition)
                    filename = match.group(1).replace("\\", "/").split("/")[-1] if match else "attachment"
                    return b"".join(chunks), filename, content_type
            except (self._httpx.TimeoutException, self._httpx.TransportError) as exc:
                if attempt < 2:
                    await asyncio.sleep((0.5, 1.0)[attempt])
                    continue
                raise ApiUnavailableError(f"attachment download failed: {type(exc).__name__}") from None
        raise ApiUnavailableError("attachment download retries exhausted")

    async def aclose(self):
        await self._client.aclose()


def build_api_client(settings) -> ApiClient:
    if settings.API_MODE == "http":
        return HttpApiClient(settings.API_BASE_URL, settings.COMPANY_ID,
                             settings.API_SERVICE_TOKEN.get_secret_value(), settings.API_TIMEOUT)
    log.warning("API_MODE=stub: using in-memory API")
    return StubApiClient(settings.COMPANY_ID)