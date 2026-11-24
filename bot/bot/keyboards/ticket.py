from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

from .. import texts
from .callbacks import (
    CANCEL_CREATE_TICKET,
    CONFIRM_CREATE_TICKET,
    NEW_TICKET,
    REOPEN_TICKET,
)

def confirm_ticket_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=texts.BTN_CONFIRM_TICKET, callback_data=CONFIRM_CREATE_TICKET)],
        [InlineKeyboardButton(text=texts.BTN_CANCEL, callback_data=CANCEL_CREATE_TICKET)],
    ])

def new_ticket_keyboard() -> InlineKeyboardMarkup:
    # кнопка "Создать новое обращение"
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=texts.BTN_NEW_TICKET, callback_data=NEW_TICKET)],
    ])

def closed_ticket_keyboard() -> InlineKeyboardMarkup:
    # под сообщением "Предыдущее обращение уже закрыто" есть кнопки "Создать новое" или "Открыть прежнее заново"
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=texts.BTN_NEW_TICKET, callback_data=NEW_TICKET)],
        [InlineKeyboardButton(text=texts.BTN_REOPEN_TICKET, callback_data=REOPEN_TICKET)],
    ])
