# 🛒 Supermarket Price Catalog (Microservice)

Простой и эффективный микросервис для мониторинга цен на продукты.
Проект построен по архитектуре **SPA (Single Page Application)** с разделением на Backend (API) и Frontend (React), завернутых в Docker.

> **🤖 Внимание для AI (Google Gemini):**
> Этот проект предназначен для доработки и поддержки искусственным интеллектом.
> Внизу файла находится секция **"Instructions for AI Context"**, обязательная к прочтению перед внесением изменений.

---

## 🛠 Технологический стек

* **Backend:** Python 3.11 (Slim), **FastAPI** (Async), **SQLModel** (SQLAlchemy wrapper), **aiosqlite**.
* **Database:** SQLite (хранится в `/app/data/database.db` внутри контейнера, мапится через Docker Volume).
* **Frontend:** **React 18**, **Vite**, Bootstrap 5 (Glassmorphism UI).
* **Infrastructure:** Docker, Docker Compose, Nginx (Production), Vite Dev Server (Development).
* **CI/CD:** Jenkins Pipeline.

---

## 📂 Структура проекта

```text
supermarket_catalog/
├── backend/                # Сервис API (Async FastAPI)
│   ├── main.py             # Точка входа API
│   ├── models.py           # SQLModel схемы
│   ├── routers/            # Эндпоинты (products, shops, lists...)
│   └── Dockerfile          # Сборка бэкенда (python:slim)
├── frontend/               # React приложение
│   ├── src/                # Исходный код React
│   ├── vite.config.js      # Конфигурация сборщика
│   ├── Dockerfile          # Dev Container (Vite)
│   └── nginx/              # Конфиг Nginx для Prod
│       └── Dockerfile      # Prod Container (Multi-stage build)
├── docker-compose.yml      # Оркестрация контейнеров (Dev Profile)
└── README.md               # Документация
```

## 🚀 Запуск и Установка

### Локальный запуск (Development)

Для разработки с Hot Reload (изменения в коде сразу видны):

```bash
# Сборка и запуск
docker compose up -d --build

# Просмотр логов
docker compose logs -f
```

*   **Frontend**: http://localhost:8040 (Vite Dev Server)
*   **Backend API**: http://localhost:8040/api/docs (Swagger UI)

### Production (Jenkins / Nginx)

В продакшене используется `frontend/nginx/Dockerfile`, который выполняет **мульти-стейдж сборку**:
1.  Компилирует React (`npm run build`).
2.  Раздает статику через Nginx.

---

## 🔌 API Endpoints

Все запросы идут с префиксом `/api`. Бэкенд полностью **асинхронный** (`async/await`).

| Метод  | Эндпоинт           | Описание                                      |
|--------|-------------------|-----------------------------------------------|
| GET    | /products         | Получить список всех товаров                 |
| POST   | /products         | Добавить новый товар                         |
| PUT    | /products/{id}    | Обновить товар (цена, вес, магазин)          |
| DELETE | /products/{id}    | Удалить товар из каталога                    |
| GET    | /shops            | Получить список магазинов                    |
| GET    | /lists            | Получить все списки покупок                  |
| GET    | /admin/config     | Получить настройки (валюта)                  |
| POST   | /telegram/send/{id}| Отправить список в Telegram (Background Task)|

---

## 🧠 Instructions for AI Context (Google Gemini)

Если ты (AI) читаешь этот файл для внесения изменений в код, следуй этим строгим правилам:

### 1. Архитектурные принципы
*   **Backend-First**: Бэкенд отдает только JSON. Никакого HTML рендеринга (Jinja2).
*   **Async Everywhere**: Весь I/O на бэкенде должен быть асинхронным (используй `await`, `select`, `AsyncSession`).
*   **Database**: Используем `aiosqlite`. Добавляй индексы (`index=True`) для полей, по которым идет поиск/сортировка.

### 2. Frontend (React + Vite)
*   Используй **Functional Components** и **Hooks** (`useState`, `useEffect`, `useContext`).
*   Глобальное состояние через `AppContext` (без Redux, если не требуется).
*   Стилизация: CSS Modules или глобальный `App.css` с использованием Bootstrap классов.
*   **UI**: Придерживайся стиля "Glassmorphism" (полупрозрачные карточки, градиенты).

### 3. Docker Strategy
*   **Dev**: `frontend/Dockerfile` запускает `npm run dev`.
*   **Prod**: `frontend/nginx/Dockerfile` делает `npm run build` -> Nginx.
*   **Jenkins**: Пайплайн должен использовать Prod Dockerfile.

### 4. Контекст Валюты
*   Приложение поддерживает мультивалютность (EUR, USD, RUB). Валюта хранится в `AppConfig`.

### 5. API Контракт
*   Если меняешь модель в `backend/models.py`, обязательно обнови `frontend/src/api.js` и соответствующие React компоненты.

---

**Автор проекта:** Serge Svalov & Google Gemini
