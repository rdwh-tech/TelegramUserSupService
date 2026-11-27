import json
import unittest
from types import SimpleNamespace

import httpx

from bot.services.api_client import (
    ActiveTicketExistsError,
    ApiAuthError,
    ApiError,
    ApiUnavailableError,
    HttpApiClient,
    TicketClosedError,
    build_api_client,
)

SERVICE_TOKEN = "supersecret-service-token"

def response(status=200, body=None, headers=None):
    if body is None:
        return httpx.Response(status, headers=headers)
    return httpx.Response(status, json=body, headers=headers)


def err(status, code, details=None):
    return response(status, {"error": {"code": code, "message": "server text", "details": details or {}}})

class HttpClientTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.queue = []
        self.requests = []

        def respond(request):
            self.requests.append(request)
            return self.queue.pop(0)

        self.client = HttpApiClient("https://api.example.test", "company-a", SERVICE_TOKEN,
                                    transport=httpx.MockTransport(respond))

    async def asyncTearDown(self):
        await self.client.aclose()

    def reply(self, *responses):
        self.queue.extend(responses)

    def paths(self):
        return [str(req.url.path) for req in self.requests]

    async def test_company_inactive_error_code_is_preserved(self):
        self.reply(err(403, "COMPANY_INACTIVE"))
        with self.assertRaises(ApiError) as captured:
            await self.client.create_ticket(1, 1, None, "Client", "idempotent-key")
        self.assertEqual(captured.exception.code, "COMPANY_INACTIVE")

    async def test_service_auth_and_headers_without_company_id(self):
        self.reply(response(200, {"items": []}))
        self.assertEqual(await self.client.get_faq(), [])
        request = self.requests[0]
        self.assertEqual(request.headers["authorization"], f"Bearer {SERVICE_TOKEN}")
        self.assertNotIn("x-company-id", request.headers)
        self.assertIn("x-request-id", request.headers)
        self.assertEqual(request.url.path, "/internal/bot/v1/faq")

    async def test_missing_service_token_rejected(self):
        with self.assertRaises(ValueError):
            HttpApiClient("https://api.example.test", "c", "")

    async def test_factory_uses_api_service_token_not_bot_token(self):
        settings = SimpleNamespace(API_MODE="http", API_BASE_URL="https://example.test", COMPANY_ID="c",
                                   API_TIMEOUT=3, API_SERVICE_TOKEN=SimpleNamespace(
                                       get_secret_value=lambda: SERVICE_TOKEN),
                                   BOT_TOKEN=SimpleNamespace(get_secret_value=lambda: "BOT-SECRET"))
        client = build_api_client(settings)
        self.assertEqual(client._client.headers["authorization"], f"Bearer {SERVICE_TOKEN}")
        await client.aclose()

    async def test_401_and_403_error_codes(self):
        self.reply(err(401, "INVALID_SERVICE_TOKEN"), err(403, "COMPANY_INACTIVE"))
        with self.assertRaises(ApiAuthError) as auth:
            await self.client.get_faq()
        self.assertEqual(auth.exception.code, "INVALID_SERVICE_TOKEN")
        self.assertNotIn(SERVICE_TOKEN, str(auth.exception))
        with self.assertRaises(ApiError) as inactive:
            await self.client.get_faq()
        self.assertEqual(inactive.exception.code, "COMPANY_INACTIVE")

    async def test_get_retry_on_503_with_same_request_id(self):
        self.reply(err(503, "SERVICE_UNAVAILABLE"), response(200, {"items": []}))
        self.assertEqual(await self.client.get_faq(), [])
        self.assertEqual(len(self.requests), 2)
        self.assertEqual(self.requests[0].headers["x-request-id"], self.requests[1].headers["x-request-id"])

    async def test_non_idempotent_post_is_not_retried(self):
        self.reply(err(503, "SERVICE_UNAVAILABLE"))
        with self.assertRaises(ApiUnavailableError):
            await self.client.submit_rating("t1", 4)
        self.assertEqual(len(self.requests), 1)

    async def test_config_and_faq_caching_and_invalidation(self):
        config = {"company_id": "company-a", "welcome_message": "Здравствуйте", "attachment_limits": {
            "max_file_size_bytes": 100, "document_extensions": [".pdf"], "photo_mime_types": ["image/jpeg"]}}
        self.reply(response(200, config), response(200, {"items": []}),
                   response(200, {**config, "welcome_message": "Новое"}))
        self.assertEqual(await self.client.get_welcome_message(), "Здравствуйте")
        self.assertEqual((await self.client.get_attachment_limits())["max_file_size_bytes"], 100)
        self.assertEqual(await self.client.get_faq(), [])
        self.assertEqual(await self.client.get_faq(), [])
        self.assertEqual((await self.client.get_config(refresh=True))["welcome_message"], "Новое")
        self.assertEqual(self.paths(), ["/internal/bot/v1/config", "/internal/bot/v1/faq", "/internal/bot/v1/config"])

    async def test_config_detects_wrong_company_id(self):
        self.reply(response(200, {"company_id": "another-company", "attachment_limits": {}}))
        with self.assertRaises(ApiError) as error:
            await self.client.get_config()
        self.assertEqual(error.exception.code, "ACCESS_DENIED")

    async def test_register_and_context(self):
        self.reply(response(200, {"client_id": "c1", "created": True}), response(200, {
            "client_id": "c1", "active_ticket": None, "pending_rating": None}))
        await self.client.register_client(42, 42, None, "Иван Иванов")
        context = await self.client.get_client_context(42)
        self.assertIsNone(context["active_ticket"])
        self.assertEqual(self.paths(), ["/internal/bot/v1/clients/42", "/internal/bot/v1/clients/42/context"])
        self.assertEqual(self.requests[0].method, "PUT")
        self.assertEqual(json.loads(self.requests[0].content), {
            "telegram_chat_id": 42, "username": None, "full_name": "Иван Иванов"})

    async def test_create_ticket_idempotent_retry_and_payload(self):
        ticket = {"ticket_id": "t1", "ticket_number": 1042, "status": "new"}
        self.reply(err(503, "SERVICE_UNAVAILABLE"), response(201, ticket))
        self.assertEqual(await self.client.create_ticket(42, 42, "ivan", "Иван", "fixed-uuid"), ticket)
        self.assertEqual(len(self.requests), 2)
        self.assertTrue(all(r.headers["idempotency-key"] == "fixed-uuid" for r in self.requests))
        self.assertNotIn("company_id", json.loads(self.requests[0].content))
        self.assertEqual(json.loads(self.requests[0].content)["username"], "ivan")

    async def test_active_ticket_conflict_contains_ticket_details(self):
        self.reply(err(409, "CLIENT_ACTIVE_TICKET_EXISTS", {"ticket_id": "t", "ticket_number": 77}))
        with self.assertRaises(ActiveTicketExistsError) as exc:
            await self.client.create_ticket(1, 1, None, "X")
        self.assertEqual(exc.exception.details["ticket_id"], "t")

    async def test_text_document_and_photo_shapes(self):
        self.reply(response(201, {"message_id": "m1"}), response(201, {"message_id": "m2"}),
                   response(200, {"message_id": "m2", "duplicate": True}))
        await self.client.send_message("t", "text", content="Hello", telegram_message_id=10)
        await self.client.send_message("t", "document", caption="here", telegram_message_id=11,
                                       file_id="F", file_name="a.pdf", mime_type="application/pdf", file_size_bytes=123)
        await self.client.send_message("t", "photo", telegram_message_id=12,
                                       file_id="G", file_size_bytes=44)
        bodies = [json.loads(r.content) for r in self.requests]
        self.assertEqual(bodies[0], {"type": "text", "content": "Hello", "telegram_message_id": 10, "attachments": []})
        self.assertEqual(bodies[1]["attachments"], [{"file_type": "document", "telegram_file_id": "F",
                                                     "file_name": "a.pdf", "mime_type": "application/pdf",
                                                     "file_size_bytes": 123}])
        self.assertEqual(bodies[1]["content"], "here")
        self.assertEqual(bodies[2]["attachments"][0]["file_name"], "photo_12.jpg")
        self.assertEqual(bodies[2]["attachments"][0]["mime_type"], "image/jpeg")

    async def test_send_message_natural_idempotency_retries_503(self):
        self.reply(err(503, "SERVICE_UNAVAILABLE"), response(200, {"message_id": "m", "duplicate": True}))
        result = await self.client.send_message("t", "text", content="Hi", telegram_message_id=9)
        self.assertTrue(result["duplicate"])
        self.assertEqual(len(self.requests), 2)

    async def test_ticket_closed_and_attachment_errors(self):
        self.reply(err(409, "TICKET_CLOSED"), err(422, "ATTACHMENT_TOO_LARGE"))
        with self.assertRaises(TicketClosedError):
            await self.client.send_message("t", "text", content="Hi", telegram_message_id=1)
        with self.assertRaises(ApiError) as too_large:
            await self.client.send_message("t", "photo", file_id="F", telegram_message_id=2)
        self.assertEqual(too_large.exception.code, "ATTACHMENT_TOO_LARGE")

    async def test_reopen_and_rating(self):
        self.reply(response(200, {"status": "new"}), err(409, "REOPEN_NOT_ALLOWED"),
                   response(201, {"score": 4}), err(409, "RATING_ALREADY_EXISTS"))
        self.assertTrue(await self.client.reopen_ticket("t"))
        self.assertFalse(await self.client.reopen_ticket("t"))
        self.assertTrue(await self.client.submit_rating("t", 4))
        self.assertFalse(await self.client.submit_rating("t", 4))
        self.assertEqual(json.loads(self.requests[2].content), {"score": 4, "comment": None})

    async def test_report_delivery_and_broadcast(self):
        self.reply(response(204), response(200, {"items": [{"client_id": "1", "telegram_chat_id": 9}],
                                                      "next_cursor": None}), response(204))
        await self.client.report_delivery("m1", False, error_code="BOT_BLOCKED_BY_USER", error="blocked")
        items = await self.client.get_broadcast_recipients("campaign", cursor="opaque", limit=500)
        self.assertEqual(items["items"][0]["telegram_chat_id"], 9)
        await self.client.report_broadcast_progress("campaign", 2, 1, True)
        self.assertEqual(self.paths(), ["/internal/bot/v1/messages/m1/delivery",
                                        "/internal/bot/v1/broadcasts/campaign/recipients",
                                        "/internal/bot/v1/broadcasts/campaign/progress"])
        self.assertEqual(json.loads(self.requests[0].content)["error_code"], "BOT_BLOCKED_BY_USER")
        self.assertEqual(json.loads(self.requests[2].content), {"sent": 2, "failed": 1, "finished": True})

    async def test_attachment_download_is_authorized_and_path_restricted(self):
        self.reply(response(200, None, headers={"Content-Disposition": 'attachment; filename="manual.pdf"',
                                                "Content-Type": "application/pdf"}))
        # Empty file is valid in this mocked test; response still has correct content type.
        content, name, mime = await self.client.download_attachment(
            "/internal/bot/v1/attachments/aa01/file")
        self.assertEqual((content, name, mime), (b"", "manual.pdf", "application/pdf"))
        self.assertEqual(self.requests[0].headers["authorization"], f"Bearer {SERVICE_TOKEN}")
        for path in ("https://attacker.example/file", "/internal/bot/v1/other", "../../secret"):
            with self.assertRaises(ApiError):
                await self.client.download_attachment(path)

if __name__ == "__main__":
    unittest.main()
