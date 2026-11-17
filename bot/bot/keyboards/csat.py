from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from keyboards.callbacks import build_csat_data

def csat_keyboard(ticket_id) -> InlineKeyboardMarkup:
    # ticket_id вшит в callback_data, поэтому по идее работать и после перезапуска бота
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text=f"{score} ⭐", callback_data=build_csat_data(ticket_id, score))
        for score in (1, 2, 3, 4, 5)
    ]])
