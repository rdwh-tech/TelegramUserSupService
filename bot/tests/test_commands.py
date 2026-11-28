import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock

from bot import texts
from bot.handlers.commands import handle_help, handle_start
from bot.services.api_client import ApiError
from bot.states import BotState


class CommandHandlerTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.user = SimpleNamespace(
            id=123,
            username="test_user",
            full_name="Test User",
        )

        self.message = SimpleNamespace(
            from_user=self.user,
            chat=SimpleNamespace(id=456),
            answer=AsyncMock(),
        )

        self.state = SimpleNamespace(
            clear=AsyncMock(),
            set_state=AsyncMock(),
            update_data=AsyncMock(),
        )

        self.api = SimpleNamespace(
            register_client=AsyncMock(),
            get_welcome_message=AsyncMock(
                return_value="Приветствие компании"
            ),
            get_client_context=AsyncMock(
                return_value={
                    "active_ticket": None,
                    "pending_rating": None,
                }
            ),
        )

    async def test_start_registers_client(self):
        await handle_start(
            self.message, self.state, self.api
        )

        self.api.register_client.assert_awaited_once_with(
            telegram_user_id=123,
            telegram_chat_id=456,
            username="test_user",
            full_name="Test User",
        )

        self.state.clear.assert_awaited_once()
        self.state.set_state.assert_awaited_once_with(
            BotState.MAIN_MENU
        )

    async def test_start_shows_welcome_and_keyboard(self):
        await handle_start(
            self.message, self.state, self.api
        )

        args, kwargs = self.message.answer.await_args

        self.assertEqual(args[0], "Приветствие компании")
        self.assertEqual(
            kwargs["reply_markup"]
            .inline_keyboard[0][0].callback_data,
            "open_faq",
        )

    async def test_start_fallback_welcome(self):
        self.api.get_welcome_message.return_value = ""

        await handle_start(
            self.message, self.state, self.api
        )

        args, _ = self.message.answer.await_args
        self.assertEqual(args[0], texts.WELCOME_DEFAULT)

    async def test_start_api_error(self):
        self.api.register_client.side_effect = ApiError(
            "Service unavailable"
        )

        await handle_start(
            self.message, self.state, self.api
        )

        self.message.answer.assert_awaited_once_with(
            texts.ERR_SERVICE_UNAVAILABLE
        )

    async def test_help(self):
        await handle_help(self.message)

        self.message.answer.assert_awaited_once_with(
            texts.HELP
        )

    async def test_start_restores_active_ticket(self):
        self.api.get_client_context.return_value = {
            "active_ticket": {
                "ticket_id": "ticket-123",
                "ticket_number": 42,
            },
            "pending_rating": None,
        }

        await handle_start(
            self.message, self.state, self.api
        )

        self.state.clear.assert_awaited_once()
        self.state.update_data.assert_awaited_once_with(
            ticket_id="ticket-123",
            ticket_number=42,
        )
        self.state.set_state.assert_awaited_once_with(
            BotState.ACTIVE_DIALOG
        )
        self.message.answer.assert_awaited_once_with(
            texts.TICKET_ALREADY_ACTIVE
        )
        self.api.get_welcome_message.assert_not_awaited()

    async def test_start_restores_pending_rating(self):
        self.api.get_client_context.return_value = {
            "active_ticket": None,
            "pending_rating": {
                "ticket_id": "closed-123",
                "ticket_number": 25,
            },
        }

        await handle_start(
            self.message, self.state, self.api
        )

        self.state.update_data.assert_awaited_once_with(
            pending_rating_ticket_id="closed-123",
            pending_rating_ticket_number=25,
        )
        self.state.set_state.assert_awaited_once_with(
            BotState.CSAT_RATING
        )

        args, kwargs = self.message.answer.await_args

        self.assertEqual(
            args[0], texts.TICKET_CLOSED_CSAT
        )
        self.assertEqual(
            kwargs["reply_markup"]
            .inline_keyboard[0][0].callback_data,
            "csat:closed-123:1",
        )

    async def test_start_context_error(self):
        self.api.get_client_context.side_effect = ApiError(
            "Context unavailable"
        )

        await handle_start(
            self.message, self.state, self.api
        )

        self.state.clear.assert_not_awaited()
        self.state.set_state.assert_not_awaited()
        self.message.answer.assert_awaited_once_with(
            texts.ERR_SERVICE_UNAVAILABLE
        )

    async def test_start_prioritizes_active_ticket(self):
        self.api.get_client_context.return_value = {
            "active_ticket": {
                "ticket_id": "active-123",
                "ticket_number": 30,
            },
            "pending_rating": {
                "ticket_id": "closed-123",
                "ticket_number": 25,
            },
        }

        await handle_start(
            self.message, self.state, self.api
        )

        self.state.set_state.assert_awaited_once_with(
            BotState.ACTIVE_DIALOG
        )
        self.state.update_data.assert_awaited_once_with(
            ticket_id="active-123",
            ticket_number=30,
        )

if __name__ == "__main__":
    unittest.main()
