import sys
from pathlib import Path
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import texts
from keyboards.callbacks import NEW_TICKET, OPEN_FAQ

def main_menu_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=texts.BTN_FAQ, callback_data=OPEN_FAQ)],
        [InlineKeyboardButton(text=texts.BTN_NEW_TICKET, callback_data=NEW_TICKET)],
    ])
