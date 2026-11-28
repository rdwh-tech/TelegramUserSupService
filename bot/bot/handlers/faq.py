import logging

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

from bot import texts
from bot.keyboards.callbacks import (
    BACK_TO_MAIN,
    FAQ_PREFIX,
    OPEN_FAQ,
    parse_faq_data,
)
from bot.keyboards.faq import (
    faq_answer_keyboard,
    faq_empty_keyboard,
    faq_list_keyboard,
)
from bot.keyboards.main_menu import main_menu_keyboard
from bot.services.api_client import ApiClient, ApiError
from bot.states import BotState

router = Router(name="faq")
logger = logging.getLogger(__name__)

async def show_faq(
    message: Message,
    state: FSMContext,
    api_client: ApiClient,
    *,
    edit: bool = False,
) -> None:
    try:
        items = await api_client.get_faq()
    except ApiError:
        logger.exception("Failed to load FAQ")
        await message.answer(texts.ERR_SERVICE_UNAVAILABLE)
        return

    if items:
        text = texts.FAQ_PROMPT
        keyboard = faq_list_keyboard(items)
    else:
        text = texts.FAQ_EMPTY
        keyboard = faq_empty_keyboard()

    await state.set_state(BotState.FAQ_LIST)

    if edit:
        await message.edit_text(text, reply_markup=keyboard)
    else:
        await message.answer(text, reply_markup=keyboard)

@router.message(Command("faq"))
async def faq_command(
    message: Message,
    state: FSMContext,
    api_client: ApiClient,
) -> None:
    await show_faq(message, state, api_client)

@router.callback_query(F.data == OPEN_FAQ)
async def faq_open(
    callback: CallbackQuery,
    state: FSMContext,
    api_client: ApiClient,
) -> None:
    await callback.answer()

    if not isinstance(callback.message, Message):
        return

    await show_faq(
        callback.message,
        state,
        api_client,
        edit=True,
    )

@router.callback_query(F.data.startswith(FAQ_PREFIX))
async def faq_question(
    callback: CallbackQuery,
    state: FSMContext,
    api_client: ApiClient,
) -> None:
    await callback.answer()

    if not isinstance(callback.message, Message):
        return

    faq_id = parse_faq_data(callback.data)
    if faq_id is None:
        return

    try:
        items = await api_client.get_faq()
    except ApiError:
        logger.exception("Failed to load FAQ answer")
        await callback.message.answer(texts.ERR_SERVICE_UNAVAILABLE)
        return

    item = next(
        (item for item in items if str(item["id"]) == faq_id),
        None,
    )

    if item is None:
        await callback.message.edit_text(
            texts.FAQ_EMPTY,
            reply_markup=faq_empty_keyboard(),
        )
        return

    await state.set_state(BotState.FAQ_ANSWER)
    await callback.message.edit_text(
        str(item["answer"]),
        reply_markup=faq_answer_keyboard(),
    )

@router.callback_query(F.data == BACK_TO_MAIN)
async def faq_back_to_main(
    callback: CallbackQuery,
    state: FSMContext,
    api_client: ApiClient,
) -> None:
    await callback.answer()

    if not isinstance(callback.message, Message):
        return

    try:
        welcome = await api_client.get_welcome_message()
    except ApiError:
        logger.exception("Failed to load welcome message")
        await callback.message.answer(texts.ERR_SERVICE_UNAVAILABLE)
        return

    await state.set_state(BotState.MAIN_MENU)
    await callback.message.edit_text(
        welcome or texts.WELCOME_DEFAULT,
        reply_markup=main_menu_keyboard(),
    )