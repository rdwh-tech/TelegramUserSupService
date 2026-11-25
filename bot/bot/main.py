"""Минимальная точка входа Telegram-бота"""

import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.filters import CommandStart
from aiogram.types import Message

from bot.config import get_settings
from bot.texts import WELCOME_DEFAULT

logger = logging.getLogger(__name__)


async def main() -> None:
    settings = get_settings()
    logging.basicConfig(
        level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    dispatcher = Dispatcher()

    @dispatcher.message(CommandStart())
    async def handle_start(message: Message) -> None:
        await message.answer(
            f"{WELCOME_DEFAULT}\n\n"
            "Это базовая версия бота. Обработка FAQ и обращений будет добавлена позже"
        )

    # контекстный менеджер закрывает HTTP-сессию Telegram даже при остановке polling
    async with Bot(token=settings.BOT_TOKEN.get_secret_value()) as bot:
        logger.info("Запуск Telegram-бота для компании %s", settings.COMPANY_ID)
        await dispatcher.start_polling(bot, close_bot_session=False)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Бот остановлен пользователем")
