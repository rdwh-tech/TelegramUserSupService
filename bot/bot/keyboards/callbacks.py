OPEN_FAQ = "open_faq"
NEW_TICKET = "new_ticket"
REOPEN_TICKET = "reopen_ticket"
BACK_TO_MAIN = "back_to_main"
CONFIRM_CREATE_TICKET = "confirm_create_ticket"
CANCEL_CREATE_TICKET = "cancel_create_ticket"
FAQ_PREFIX = "faq:"
CSAT_PREFIX = "csat:"
MAX_CALLBACK_BYTES = 64 # лимит Telegram на callback_data как раз 64 байта

def _checked(data: str) -> str:
    if len(data.encode("utf-8")) > MAX_CALLBACK_BYTES:
        raise ValueError("callback_data longer than 64 bytes")
    return data

def build_faq_data(faq_id) -> str:
    return _checked(f"{FAQ_PREFIX}{faq_id}")

def parse_faq_data(data: str | None) -> str | None:
    if not data or not data.startswith(FAQ_PREFIX):
        return None
    return data[len(FAQ_PREFIX):] or None

def build_csat_data(ticket_id, score: int) -> str:
    if score not in (1, 2, 3, 4, 5):
        raise ValueError("score must be 1..5")
    return _checked(f"{CSAT_PREFIX}{ticket_id}:{score}")

def parse_csat_data(data: str | None) -> tuple[str, int] | None:
    if not data or not data.startswith(CSAT_PREFIX):
        return None
    body = data[len(CSAT_PREFIX):]
    ticket_id, sep, score_raw = body.rpartition(":")
    if not sep or not ticket_id or score_raw not in ("1", "2", "3", "4", "5"):
        return None
    return ticket_id, int(score_raw)
