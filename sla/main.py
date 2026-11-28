from copy import deepcopy

import uvicorn
from fastapi import FastAPI
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from log_format import JsonFormatter


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SLA_")

    host: str = "127.0.0.1"
    port: int = Field(default=8090, ge=1, le=65535)


def create_app() -> FastAPI:
    app = FastAPI(title="Support SLA")

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/ready")
    def ready() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()


def main() -> None:
    settings = Settings()
    log_config = deepcopy(uvicorn.config.LOGGING_CONFIG)
    log_config["formatters"] = {
        name: {"()": JsonFormatter} for name in log_config["formatters"]
    }
    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        log_config=log_config,
        timeout_graceful_shutdown=10,
    )


if __name__ == "__main__":
    main()
