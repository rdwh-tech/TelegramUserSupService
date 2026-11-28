import unittest
from unittest.mock import AsyncMock, Mock

from aiogram.types import Message

from bot import texts
from bot.handlers.faq import (
    faq_back_to_main,
    faq_command,
    faq_open,
    faq_question,
)
from bot.services.api_client import ApiError
from bot.states import BotState


class FaqHandlerTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.items = [
            {
                "id": "1",
                "question": "Как создать обращение?",
                "answer": "Нажмите кнопку создания обращения.",
            }
        ]

        self.message = Mock(spec=Message)
        self.message.answer = AsyncMock()
        self.message.edit_text = AsyncMock()

        self.state = Mock()
        self.state.set_state = AsyncMock()

        self.api = Mock()
        self.api.get_faq = AsyncMock(return_value=self.items)
        self.api.get_welcome_message = AsyncMock(
            return_value="Приветствие компании"
        )

        self.callback = Mock()
        self.callback.message = self.message
        self.callback.data = "faq:1"
        self.callback.answer = AsyncMock()

    async def test_faq_command(self):
        await faq_command(self.message, self.state, self.api)

        self.api.get_faq.assert_awaited_once()
        self.state.set_state.assert_awaited_once_with(
            BotState.FAQ_LIST
        )

        args, kwargs = self.message.answer.await_args
        self.assertEqual(args[0], texts.FAQ_PROMPT)
        self.assertEqual(
            kwargs["reply_markup"]
            .inline_keyboard[0][0].callback_data,
            "faq:1",
        )

    async def test_empty_faq(self):
        self.api.get_faq.return_value = []

        await faq_command(self.message, self.state, self.api)

        args, kwargs = self.message.answer.await_args
        self.assertEqual(args[0], texts.FAQ_EMPTY)
        self.assertEqual(
            kwargs["reply_markup"]
            .inline_keyboard[0][0].callback_data,
            "new_ticket",
        )

    async def test_open_faq_callback(self):
        await faq_open(self.callback, self.state, self.api)

        self.callback.answer.assert_awaited_once()
        self.message.edit_text.assert_awaited_once()
        self.state.set_state.assert_awaited_once_with(
            BotState.FAQ_LIST
        )

    async def test_faq_question(self):
        await faq_question(self.callback, self.state, self.api)

        self.state.set_state.assert_awaited_once_with(
            BotState.FAQ_ANSWER
        )

        args, kwargs = self.message.edit_text.await_args
        self.assertEqual(args[0], self.items[0]["answer"])
        self.assertEqual(
            kwargs["reply_markup"]
            .inline_keyboard[0][0].callback_data,
            "open_faq",
        )

    async def test_unknown_question(self):
        self.callback.data = "faq:999"

        await faq_question(self.callback, self.state, self.api)

        args, _ = self.message.edit_text.await_args
        self.assertEqual(args[0], texts.FAQ_EMPTY)
        self.state.set_state.assert_not_awaited()

    async def test_back_to_main(self):
        await faq_back_to_main(
            self.callback, self.state, self.api
        )

        self.state.set_state.assert_awaited_once_with(
            BotState.MAIN_MENU
        )

        args, _ = self.message.edit_text.await_args
        self.assertEqual(args[0], "Приветствие компании")

    async def test_api_error(self):
        self.api.get_faq.side_effect = ApiError(
            "Service unavailable"
        )

        await faq_command(self.message, self.state, self.api)

        self.message.answer.assert_awaited_once_with(
            texts.ERR_SERVICE_UNAVAILABLE
        )
        self.state.set_state.assert_not_awaited()
