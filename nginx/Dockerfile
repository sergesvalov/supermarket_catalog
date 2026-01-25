# Самая легкая версия Nginx на базе Alpine Linux
FROM nginx:alpine

# Удаляем стандартный конфиг Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Копируем наш конфиг (путь относительно корня репозитория)
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Копируем статические файлы фронтенда (путь относительно корня репозитория)
COPY frontend /usr/share/nginx/html

# Порт 80 уже открыт в базовом образе, EXPOSE писать не обязательно, но можно для документации
EXPOSE 80