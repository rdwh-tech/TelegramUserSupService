"""Конфиг бота""" 
"""Все параметры берутся из переменных окружения, секреты в коде не хранятся и в логи не капают (по идее)"""
from functools import lru_cache
from typing import Literal
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Привязываем экземпляр бота к конкретной комании
    BOT_TOKEN: SecretStr # Токен Tg Bot API компании
    COMPANY_ID: str # ID компании, к которой бот привязан

    # API-сервис
    API_BASE_URL: str = "http://localhost:8000"
    API_MODE: Literal["stub", "http"] = "stub" # Заглушка (stub) и настоящий API (http)
    API_TIMEOUT: int = 10

    # Хранилища / брокер
    REDIS_URL: SecretStr = SecretStr("redis://localhost:6379/0")
    RABBITMQ_URL: SecretStr = SecretStr("amqp://guest:guest@localhost/")
    MQ_ENABLED: bool = False # Заглушка потребителя
    MQ_QUEUE: str = "" # По умолчанию bot_events.<COMPANY_ID>

    # Прочее
    LOG_LEVEL: str = "INFO"
    DEBUG_COMMANDS: bool = False  # Переключение имитации событий оператора без RabbitMQ (для debug.py)

    @property
    def mq_queue_name(self) -> str:
        return self.MQ_QUEUE or f"bot_events.{self.COMPANY_ID}"

@lru_cache
def get_settings() -> Settings:
    return Settings()
