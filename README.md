# 🛒 Supermarket Price Catalog (Microservice)

Простой и эффективный микросервис для мониторинга цен на продукты.
Проект построен по архитектуре SPA (Single Page Application) с разделением на Backend (API) и Frontend (Static), завернутых в Docker.

> **🤖 Внимание для AI (Google Gemini):**
> Этот проект предназначен для доработки и поддержки искусственным интеллектом.
> Внизу файла находится секция **"Instructions for AI Context"**, обязательная к прочтению перед внесением изменений.

---

## 🛠 Технологический стек

* **Backend:** Python 3.11 (Slim), FastAPI, SQLModel (SQLAlchemy wrapper).
* **Database:** SQLite (хранится в `/app/data/database.db` внутри контейнера, мапится через Docker Volume).
* **Frontend:** HTML5, Vanilla JavaScript (ES6+), Bootstrap 5.
* **Infrastructure:** Docker, Docker Compose, Nginx (Reverse Proxy & Static Server).
* **CI/CD:** Jenkins Pipeline.

---

## 📂 Структура проекта

```text
supermarket_catalog/
├── backend/                # Сервис API
│   ├── main.py             # Точка входа FastAPI
│   ├── requirements.txt    # Зависимости Python
│   └── Dockerfile          # Сборка бэкенда (python:slim)
├── frontend/               # Статический фронтенд
│   └── index.html          # SPA приложение (HTML + JS)
├── nginx/                  # Конфигурация веб-сервера
│   ├── default.conf        # Правила маршрутизации (Proxy pass)
│   └── Dockerfile          # Сборка фронтенда (nginx:alpine)
├── docker-compose.yml      # Оркестрация контейнеров
└── README.md               # Документация

🚀 Запуск и Установка
Локальный запуск (Docker Compose)

Для разработки и тестирования:
Bash

# Сборка и запуск в фоновом режиме
docker compose up -d --build

# Просмотр логов
docker compose logs -f

Сервис будет доступен по адресу: http://localhost:8040
API Документация

FastAPI автоматически генерирует Swagger UI:

    URL: http://localhost:8040/api/docs

🔌 API Endpoints

Все запросы идут с префиксом /api.
| Метод  | Эндпоинт           | Описание                                      |
|--------|-------------------|-----------------------------------------------|
| GET    | /products         | Получить список всех товаров                 |
| POST   | /products         | Добавить новый товар                         |
| PUT    | /products/{id}    | Обновить товар                               |
| DELETE | /products/{id}    | Удалить товар из каталога                    |
| GET    | /shops            | Получить список магазинов                    |
| GET    | /lists            | Получить все списки покупок                  |
| GET    | /admin/config     | Получить настройки приложения (валюта)       |
| POST   | /admin/config     | Обновить настройки приложения                |

Модель данных Product (JSON):
```json
{
  "name": "Молоко",
  "shop_id": 1,
  "price": 2.50,
  "weight": 1000,
  "calories": 64,
  "quantity": 1
}
```

🧠 Instructions for AI Context (Google Gemini)

Если ты (AI) читаешь этот файл для внесения изменений в код, следуй этим строгим правилам:
1. Архитектурные принципы

    Backend-First: Бэкенд ничего не знает о HTML. Он отдает только JSON. Не используй Jinja2Templates в Python коде.

    Nginx Routing: Nginx раздает статику с корня / и проксирует запросы /api/* в контейнер backend:8000. Не меняй конфиг Nginx без веской причины.

    Database: Используем SQLModel. Не пиши чистый SQL и старайся не смешивать с сырым SQLAlchemy, если это возможно. База данных всегда SQLite для простоты.

2. Frontend (KISS - Keep It Simple, Stupid)

    Не предлагай npm, React, Vue или Webpack, пока тебя явно не попросят.

    Используй Vanilla JS и fetch().

    Стилизация через CDN Bootstrap 5.

3. Docker Optimization

    Используй Alpine версии для Nginx.

    Используй Slim версии для Python.

    Всегда проверяй, что права на папку data настроены корректно (SQLite требует прав на запись в папку).

4. Контекст Валюты

    Приложение поддерживает три валюты: **Евро (€)**, **Доллар ($)**, **Рубль (₽)**.
    Валюта настраивается в разделе "Администрирование".
    По умолчанию используется Евро (€).

5. API Контракт

    Если ты меняешь модель Product в Python, убедись, что JS код на фронтенде обновлен соответственно (поля в fetch, отображение в таблице).

Автор проекта: Serge Svalov & Google Gemini


Supermarket Price Tracker & Shopping List
1. Общее описание

Цель: Веб-приложение для мониторинга цен на продукты в разных магазинах, ведения истории изменений цен и формирования списков покупок с возможностью отправки в Telegram. Стек:

    Backend: Python 3.10+, FastAPI, SQLModel (SQLAlchemy + Pydantic), SQLite.

    Frontend: Vanilla JS (модульная структура ES6), HTML5, Bootstrap 5.

    Infrastructure: Docker, Jenkins (CI/CD).

2. Архитектура данных (Database Schema)

Проект использует реляционную БД со следующими сущностями:

    Shop: id, name.

    Product: id, name, price, weight, calories, quantity, shop_id (FK), updated_at.

    PriceHistory: id, product_id (FK), price, created_at.

    ShoppingList: id, name, created_at.

    ShoppingListItem: id, shopping_list_id (FK), product_id (FK), quantity, is_bought.

    TelegramConfig & TelegramUser: Настройки бота и ID чатов для рассылки.

3. Структура API (Backend Endpoints)

    /products: CRUD операций с товарами. Важна подгрузка связей shop и history через selectinload.

    /lists: Управление списками. Эндпоинт /lists/items отвечает за наполнение списков.

    /telegram/send/{list_id}: Формирует HTML-отчет и отправляет его через BackgroundTasks.

    /catalog: Публичный эндпоинт для экспорта актуальных цен.

4. Структура Frontend (Modules)

Код разделен на модули для оптимизации:

    api.js: Все fetch запросы к бэкенду.

    state.js: Глобальное хранилище данных в памяти (кеш товаров).

    modules/products.js: Логика создания товаров.

    modules/lists.js: Управление списками (открытие, добавление товаров через "Picker").

    modules/telegram.js: Настройка интеграции.

5. Известные технические особенности и проблемы

    Lazy Loading: SQLModel по умолчанию не грузит связанные объекты. Требуется явный session.refresh(obj, ["relation"]) после коммита.

    Concurrency: Использование BackgroundTasks для внешних API (Telegram), чтобы избежать блокировки Uvicorn.

    Security: Необходимость экранирования спецсимволов (html.escape) для корректной работы parse_mode="HTML" в Telegram.

    UI/UX: Реализован "умный поиск" (фильтрация) по всему каталогу при добавлении в список.

