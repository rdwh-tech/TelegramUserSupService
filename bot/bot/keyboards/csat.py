from aiogram.types import InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from .callbacks import build_csat_data

def csat_keyboard(ticket_id) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for score in range(1, 6):
        builder.button(
            text=f"{score} ⭐",
            callback_data=build_csat_data(ticket_id, score),
        )
    builder.adjust(5)
    return builder.as_markup()
