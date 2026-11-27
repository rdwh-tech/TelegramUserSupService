from pathlib import PurePath

from .. import texts

MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024
ALLOWED_DOCUMENT_EXTENSIONS = {".pdf", ".docx", ".txt", ".zip"}
TELEGRAM_TEXT_LIMIT = 4096

def validate_attachment(message) -> tuple[bool, str]:
    # проверка соообщения юзера
    if getattr(message, "sticker", None) or getattr(message, "animation", None):
        return False, texts.ERR_STICKER

    for attr in ("voice", "video_note", "video", "audio"):
        if getattr(message, attr, None):
            return False, texts.ERR_UNSUPPORTED_CONTENT

    document = getattr(message, "document", None)
    if document:
        ext = PurePath(getattr(document, "file_name", None) or "").suffix.lower()
        if ext not in ALLOWED_DOCUMENT_EXTENSIONS:
            return False, texts.ERR_FILE_FORMAT
        if (getattr(document, "file_size", None) or 0) > MAX_FILE_SIZE_BYTES:
            return False, texts.ERR_FILE_SIZE
        return True, ""

    photos = getattr(message, "photo", None)
    if photos:
        largest = photos[-1]
        if (getattr(largest, "file_size", None) or 0) > MAX_FILE_SIZE_BYTES:
            return False, texts.ERR_FILE_SIZE
        return True, ""

    if getattr(message, "text", None):
        return True, ""

    return False, texts.ERR_UNSUPPORTED_CONTENT


def extract_payload(message) -> dict:
    photos = getattr(message, "photo", None)
    document = getattr(message, "document", None)
    caption = getattr(message, "caption", None)

    payload = {"telegram_message_id": message.message_id}

    if photos:
        largest = photos[-1]
        return {
            **payload,
            "message_type": "photo",
            "file_id": largest.file_id,
            "caption": caption,
            "file_size_bytes": getattr(largest, "file_size", None),
        }

    if document:
        return {
            **payload,
            "message_type": "document",
            "file_id": document.file_id,
            "file_name": getattr(document, "file_name", None),
            "caption": caption,
            "mime_type": getattr(document, "mime_type", None),
            "file_size_bytes": getattr(document, "file_size", None),
        }

    return {
        **payload,
        "message_type": "text",
        "content": message.text,
    }


def split_text(text: str, limit: int = TELEGRAM_TEXT_LIMIT) -> list[str]:
    # нарезка длинного текста на части не длиннее допустимного лимита Telegram
    if limit <= 0:
        raise ValueError("limit must be positive")
    parts: list[str] = []
    rest = text
    while len(rest) > limit:
        cut = rest.rfind("\n", 0, limit)
        if cut < limit // 2:
            cut = rest.rfind(" ", 0, limit)
        if cut <= 0:
            cut = limit
        parts.append(rest[:cut])
        rest = rest[cut:].lstrip("\n ")
    if rest:
        parts.append(rest)
    return parts or [""]

def truncate(text: str, limit: int = TELEGRAM_TEXT_LIMIT) -> str:
    return text if len(text) <= limit else text[: limit - 1] + "…"
