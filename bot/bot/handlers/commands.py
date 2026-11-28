
import logging

from aiogram import Router
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.types import Message

from bot import texts
from bot.keyboards.csat import csat_keyboard
from bot.keyboards.main_menu import main_menu_keyboard
from bot.services.api_client import ApiClient, ApiError
from bot.states import BotState

router = Router(name="commands")
logger = logging.getLogger(__name__)

@router.message(CommandStart())
async def handle_start(
    message: Message,
    state: FSMContext,
    api_client: ApiClient,
) -> None:
    user = message.from_user
    if user is None:
        return

    try:
        await api_client.register_client(
            telegram_user_id=user.id,
            telegram_chat_id=message.chat.id,
            username=user.username,
            full_name=user.full_name,
        )

        context = await api_client.get_client_context(user.id)
        active = context.get("active_ticket")
        pending = context.get("pending_rating")

        if not active and not pending:
            welcome = await api_client.get_welcome_message()

    except ApiError:
        logger.exception("Failed to restore client context")
        await message.answer(texts.ERR_SERVICE_UNAVAILABLE)
        return

    await state.clear()

    if active:
        await state.update_data(
            ticket_id=active["ticket_id"],
            ticket_number=active.get("ticket_number"),
        )
        await state.set_state(BotState.ACTIVE_DIALOG)
        await message.answer(texts.TICKET_ALREADY_ACTIVE)
        return

    if pending:
        await state.update_data(
            pending_rating_ticket_id=pending["ticket_id"],
            pending_rating_ticket_number=pending.get("ticket_number"),
        )
        await state.set_state(BotState.CSAT_RATING)
        await message.answer(
            texts.TICKET_CLOSED_CSAT,
            reply_markup=csat_keyboard(pending["ticket_id"]),
        )
        return

    await state.set_state(BotState.MAIN_MENU)
    await message.answer(
        welcome or texts.WELCOME_DEFAULT,
        reply_markup=main_menu_keyboard(),
    )

@router.message(Command("help"))
async def handle_help(message: Message) -> None:
    await message.answer(texts.HELP)
    
