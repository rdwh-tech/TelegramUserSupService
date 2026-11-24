# Telegram-бот службы поддержки

Базовая структура Telegram-бота на **aiogram 3**. В этом PR реализованы конфигурация, состояния FSM, клавиатуры, вспомогательные функции обработки сообщений и минимальная точка запуска.

> **Ограничение текущей версии:** при запуске работает только команда `/start` с приветственным сообщением. Клавиатуры и состояния пока подготовлены как отдельные модули, но не подключены к пользовательскому сценарию.

## Установка

Все команды выполняются из каталога **`TelegramUserSupService/bot/`** (в нём лежат `requirements.txt` и эта инструкция).

1. Создайте и активируйте виртуальное окружение:

   ```bash
   python -m venv .venv
   ```

   В Git Bash на Windows:

   ```bash
   source .venv/Scripts/activate
   ```

   В PowerShell:

   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```

2. Установите зависимости приложения и тестового запуска:

   ```bash
   python -m pip install -r requirements.txt
   python -m pip install pytest
   ```

3. Скопируйте шаблон конфигурации в `.env`:

   В Git Bash:

   ```bash
   cp .env.example .env
   ```

   В PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

4. Укажите в `.env` настоящий `BOT_TOKEN` из BotFather и `COMPANY_ID` вашей компании. Для минимального запуска оставьте `API_MODE=stub` и `MQ_ENABLED=false`.

   **Не публикуйте `.env` и настоящие токены в Git.** Для текущего `/start` подключение к Redis, RabbitMQ и Go API не требуется.

## Запуск

Находясь в каталоге `TelegramUserSupService/bot/`, выполните:

```bash
python -m bot.main
```

Откройте вашего бота в Telegram и отправьте `/start`. Бот ответит приветствием. Остановите polling сочетанием **Ctrl+C**: обработка остановки и закрытие HTTP-сессии Telegram предусмотрены в `main.py`.

> Запускайте модуль через `python -m bot.main`, а не через `python bot/main.py` или запуск отдельного файла клавиатуры. Внутренние модули используют импорты Python-пакета `bot`.

## Тестирование

Из каталога `TelegramUserSupService/bot/`:

```bash
python -m pytest tests -v
```

Тесты проверяют callback-данные и утилиты обработки сообщений. Они не заменяют ручную проверку запуска `/start` с реальным Telegram-токеном.

## Структура

```text
bot/
├── .env.example
├── .gitignore
├── README.md
├── requirements.txt
├── bot/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── states.py
│   ├── texts.py
│   ├── keyboards/
│   └── services/
└── tests/
```

## Дальнейшая разработка

REST API-клиент, обработчики FAQ и тикетов, потребитель RabbitMQ, Redis FSM и контейнеризация добавляются отдельными PR. Этот PR предназначен для ревью минимальной запускаемой основы.
