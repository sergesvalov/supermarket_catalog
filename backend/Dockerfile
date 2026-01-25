# Используем легковесный официальный образ Python (Debian Slim)
FROM python:3.11-slim

# Отключаем создание .pyc файлов и буферизацию вывода (важно для логов в Docker)
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Копируем только файл зависимостей, чтобы кешировать слои
COPY requirements.txt .

# Устанавливаем зависимости (без кеша pip для экономии места)
# --no-cache-dir делает образ еще легче
RUN pip install --no-cache-dir -r requirements.txt

# Копируем код приложения
COPY . .

# Создаем папку для базы данных
RUN mkdir -p data

# Запускаем
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]