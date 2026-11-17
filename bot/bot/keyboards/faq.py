import logging
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import texts
from keyboards.callbacks import BACK_TO_MAIN, NEW_TICKET, OPEN_FAQ, build_faq_data

log = logging.getLogger(__name__)

MAX_FAQ_BUTTONS = 90

def faq_list_keyboard(faq_items: list[dict]) -> InlineKeyboardMarkup:
    """Один вопрос на строку. id вопроса должен укладываться в 64 байта callback_data."""
    rows = []
    for item in faq_items[:MAX_FAQ_BUTTONS]:
        try:
            data = build_faq_data(item["id"])
        except ValueError:
            log.warning("FAQ item skipped: id is too long for callback_data")
            continue
        rows.append([InlineKeyboardButton(text=str(item["question"])[:60], callback_data=data)])
    rows.append([InlineKeyboardButton(text=texts.BTN_BACK, callback_data=BACK_TO_MAIN)])
    return InlineKeyboardMarkup(inline_keyboard=rows)

def faq_answer_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=texts.BTN_BACK_TO_QUESTIONS, callback_data=OPEN_FAQ)],
        [InlineKeyboardButton(text=texts.BTN_NEW_TICKET, callback_data=NEW_TICKET)],
    ])

def faq_empty_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=texts.BTN_NEW_TICKET, callback_data=NEW_TICKET)],
    ])
