# 🛠️ FixTech — Сервис автоматизации обработки заявок сервисного центра

<div align="center">

### *Полнофункциональная CRM-система для приема, распределения и контроля заявок на ремонт техники с двухсторонней интеграцией в Telegram.*

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.141+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0+-D71F00?style=flat-square&logo=sqlalchemy&logoColor=white)](https://www.sqlalchemy.org/)
[![aiogram](https://img.shields.io/badge/aiogram-3.x-2CA5E0?style=flat-square&logo=telegram&logoColor=white)](https://docs.aiogram.dev/)
[![Uvicorn](https://img.shields.io/badge/ASGI-Uvicorn-499848?style=flat-square)](https://www.uvicorn.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

[**О проекте**](#-о-проекте) • [**Архитектура**](#-архитектура-системы) • [**Возможности**](#-ключевой-функционал) • [**Жизненный цикл заявки**](#-жизненный-цикл-заявки) • [**Быстрый старт**](#-быстрый-старт) • [**API эндпоинты**](#-rest-api-справочник) • [**База данных**](#-база-данных-postgresql)

---

</div>

## 📌 О проекте

**FixTech** — это комплексное решение для сервисных центров и ремонтных мастерских (смартфоны, ноутбуки, ПК, бытовая электроника), автоматизирующее весь путь заявки: от оформления клиентом на сайте до моментального назначения мастеру и изменения статусов через интерактивные inline-кнопки в Telegram.

Система объединяет:
1. **Клиентский лендинг** с быстрой онлайн-формой записи на ремонт и диагностику.
2. **Асинхронный REST API бэкенд** на FastAPI для надежной валидации и обработки данных.
3. **Реляционное хранилище** на PostgreSQL с оптимизированной структурой таблиц.
4. **Интерактивного Telegram-бота** (aiogram 3) для оперативного управления заявками на лету без входа в браузер.
5. **Административную панель** с защищенной сессионной авторизацией, фильтрацией и аналитической сводкой в реальном времени.

---

## 🏗 Архитектура системы

```mermaid
flowchart TD
    subgraph Client ["🖥️ Клиентская часть"]
        Landing["🌐 Лендинг (HTML5 / CSS3 / JS)"]
        Form["📝 Форма оформления заявки"]
        Landing --> Form
    end

    subgraph Backend ["⚡ FastAPI Backend"]
        API["REST API Маршруты"]
        AuthModule["🔐 Сессионная авторизация (HttpOnly Cookie)"]
        Form -->|"POST /requests"| API
    end

    subgraph Database ["🗄️ Хранилище данных"]
        PG[("PostgreSQL\nТаблица: requests")]
        API <-->|"SQLAlchemy 2.0 Engine"| PG
    end

    subgraph AdminCRM ["📊 Управление и мониторинг"]
        AdminWeb["💻 Админ-панель (/admin)\nСтатистика + Таблица заявок"]
        AdminWeb <-->|"Fetch API & Session Cookie"| API
    end

    subgraph TelegramService ["🤖 Telegram Интеграция (aiogram 3)"]
        Bot["FixTech Telegram Bot"]
        API -->|"Асинхронное уведомление"| Bot
        Bot -->|"Inline-кнопки (Взять / Завершить / Отклонить)"| Bot
        Bot <-->|"Прямое обновление статуса"| PG
    end
```

---

## ✨ Ключевой функционал

### 🌐 Для клиентов (Сайт):
- Адаптивный и современный интерфейс с презентацией услуг и прайса сервиса.
- Форма экспресс-заявки: ввод имени, номера телефона, типа устройства и описания поломки.
- Валидация входных данных и мгновенная обратная связь с присвоением **уникального ID тикета**.

### 🤖 Для мастеров и менеджеров (Telegram Bot):
- **Моментальные Push-уведомления** в личный чат или группу при поступлении нового заказа.
- Полная карточка клиента прямо в сообщении (контакты, устройство, жалоба).
- **Интерактивные Inline-кнопки управления**:
  - `🔧 Взять в работу` — переводит заявку в статус `in_progress` и подменяет кнопку на «Завершить».
  - `❌ Отклонить` — переводит в статус `rejected`.
  - `✅ Завершить` — закрывает заявку со статусом `completed`.
- Двусторонняя синхронизация: изменение статуса в Telegram немедленно обновляет статус в PostgreSQL и админке.

### 🛡️ Для управляющего (Админ-панель `/admin`):
- Защита сессионными `HttpOnly` cookie-файлами (страница `/login`).
- **Живой дашборд со статистикой**: счетчики всех заявок, новых, в процессе, завершенных и отклоненных.
- Таблица обращений с датой создания, подробной информацией и селекторами для ручной смены статуса.
- Безопасный выход из системы (`/logout`).

---

## 🔄 Жизненный цикл заявки

```
         ┌──────────────────┐
         │     Клиент       │
         │  оформил заказ   │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │  Статус: [new]   │ ◄─── Уведомление летит в Telegram
         └────────┬─────────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
┌───────────────┐   ┌────────────────┐
│  [in_progress]│   │   [rejected]   │
│   В работе    │   │   Отклонена    │
└───────┬───────┘   └────────────────┘
        │
        ▼
┌───────────────┐
│  [completed]  │
│   Завершена   │
└───────────────┘
```

---

## 📁 Структура проекта

```bash
FixTech/
├── app/
│   ├── __init__.py
│   ├── database.py       # Подключение к PostgreSQL через SQLAlchemy Engine
│   ├── main.py           # FastAPI приложение, роуты API, раздача статики и Web-страниц
│   ├── telegram.py       # aiogram 3 бот, диспетчер команд и обработчик inline-кнопок
│   └── static/           # Фронтенд-ресурсы
│       ├── index.html    # Главная страница (клиентский сайт и форма заказа)
│       ├── login.html    # Страница входа в панель администратора
│       ├── admin.html    # Дашборд управления заявками и статистика
│       └── style.css     # Кастомные стили интерфейса
│
├── .env.example          # Шаблон конфигурации переменных окружения
├── .gitignore            # Исключения версионного контроля (venv, .env, __pycache__)
├── requirements.txt      # Список зависимостей Python
└── README.md             # Документация проекта
```

---

## 🛠 Стек технологий

| Категория | Технологии | Назначение |
| :--- | :--- | :--- |
| **Backend** | Python 3.10+, FastAPI, Pydantic | Высокопроизводительный асинхронный REST API |
| **Server** | Uvicorn (ASGI) | Запуск веб-сервера и фонового Telegram polling |
| **Database** | PostgreSQL, SQLAlchemy 2.0, psycopg2 | Надежное реляционное хранилище и пул соединений |
| **Telegram Bot** | aiogram 3.x | Современный асинхронный бот с Inline-клавиатурами |
| **Frontend** | HTML5, CSS3, JavaScript (Fetch API) | Легковесный адаптивный UI без тяжелых фреймворков |
| **Security** | python-dotenv, Cookie-based Auth | Изоляция секретов и авторизация в админке |

---

## 🚀 Быстрый старт

### 1. Клонирование репозитория
```bash
git clone https://github.com/Ali-bit-bot-ux/FixTech.git
cd FixTech
```

### 2. Создание и активация виртуального окружения
- **Windows:**
  ```powershell
  python -m venv .venv
  .venv\Scripts\activate
  ```
- **Linux / macOS:**
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  ```

### 3. Установка зависимостей
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

---

## ⚙️ Настройка окружения (`.env`)

Создайте файл `.env` в корневой директории проекта:

```ini
# --- Подключение к базе данных ---
DATABASE_URL=postgresql://postgres:password@localhost:5432/fixtech

# --- Настройки Telegram Бота ---
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ
ADMIN_CHAT_ID=123456789

# --- Учетные данные администратора ---
ADMIN_USERNAME=admin
ADMIN_PASSWORD=SuperSecretPassword123
```

> 💡 **Как получить параметры Telegram?**
> 1. `TELEGRAM_BOT_TOKEN`: Создайте нового бота через [@BotFather](https://t.me/BotFather) в Telegram и скопируйте API токен.
> 2. `ADMIN_CHAT_ID`: Напишите боту любое сообщение — в коде бота встроен хэндлер, который ответит: `Твой chat_id: 123456789`. Вставьте это число в `.env`.

---

## 🗄 База данных PostgreSQL

Создайте базу данных в PostgreSQL:
```sql
CREATE DATABASE fixtech;
```

Выполните скрипт создания рабочей таблицы:
```sql
CREATE TABLE IF NOT EXISTS requests (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(64) NOT NULL,
    device VARCHAR(255) NOT NULL,
    problem TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индекс для ускорения сортировки и фильтрации
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at DESC);
```

---

## 🏃 Запуск приложения

Запустите сервер с помощью **Uvicorn**:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

После старта в консоли появится лог запуска сервера и инициализации бота:
```text
INFO:     Started server process
INFO:     Waiting for application startup.
Telegram bot started!
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### Доступные страницы:
- 🌐 **Клиентский сайт:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
- 🔐 **Вход в админку:** [http://127.0.0.1:8000/login](http://127.0.0.1:8000/login)
- 📊 **Панель управления:** [http://127.0.0.1:8000/admin](http://127.0.0.1:8000/admin)
- 📑 **Интерактивная Swagger-документация:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 📡 REST API Справочник

| Метод | Эндпоинт | Описание | Доступ |
| :--- | :--- | :--- | :--- |
| `POST` | `/requests` | Создание новой заявки от клиента | Публичный |
| `GET` | `/requests` | Получение списка всех заявок | Публичный / Админ |
| `GET` | `/requests/stats` | Сводная аналитика по статусам тикетов | Публичный / Админ |
| `PATCH`| `/requests/{id}/status` | Смена статуса (`new`, `in_progress`, `completed`, `rejected`) | Публичный / Бот / Админ |
| `GET` | `/login` | Страница аутентификации администратора | Публичный |
| `POST` | `/login` | Проверка пароля и выдача `admin_session` cookie | Форма |
| `GET` | `/admin` | Страница дашборда | Только с сессией |
| `GET` | `/logout` | Сброс сессионного cookie | Авторизованный |

#### Пример тела запроса для создания заявки (`POST /requests`):
```json
{
  "name": "Алексей Смирнов",
  "phone": "+7 (999) 123-45-67",
  "device": "MacBook Pro 14 M1 (2021)",
  "problem": "Попадание жидкости на клавиатуру, не включается"
}
```

---

## 🔒 Безопасность в Production

При развертывании системы на боевом сервере рекомендуется:
1. Использовать хэширование паролей (например, `passlib` с `bcrypt`) вместо прямого сравнения строк.
2. Включить HTTPS (SSL-сертификаты от Let's Encrypt) и перевести сессионные куки в режим `secure=True`.
3. Ограничить доступ к API через CORS (`CORSMiddleware`) для предотвращения несанкционированных вызовов.
4. Развернуть PostgreSQL и приложение через `docker-compose` с Nginx в качестве Reverse Proxy.

---

## 🗺 Дальнейшее развитие (Roadmap)

- [ ] 💬 SMS / WhatsApp оповещение клиентов о готовности устройства.
- [ ] 🧾 Генерация квитанции о приеме в ремонт и акта выполненных работ в PDF.
- [ ] 👥 Ролевая модель: разделение прав на «Администратора», «Менеджера» и «Мастера».
- [ ] 💰 Учет стоимости запчастей и итоговой выручки по выполненным заказам.
- [ ] 🐳 Подготовка `Dockerfile` и `docker-compose.yml` для развертывания в один клик.

---

## 📄 Лицензия

Проект распространяется под открытой лицензией [MIT](LICENSE). Вы можете свободно модифицировать и использовать код в коммерческих и некоммерческих целях.
