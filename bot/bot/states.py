from aiogram.fsm.state import State, StatesGroup

class BotState(StatesGroup):
    MAIN_MENU = State() # Главное меню
    FAQ_LIST = State() # Просмотр FAQ
    FAQ_ANSWER = State() # Чтение ответа на вопрос
    CONFIRM_TICKET = State() # Ожидание подтверждения создания тикета
    ACTIVE_DIALOG = State() # Диалог с оператором (активный тикет)
    CSAT_RATING = State() # Ожидание оценки после закрытия тикета