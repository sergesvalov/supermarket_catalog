FROM nginx:latest

# Копируем конфиг
COPY default.conf /etc/nginx/conf.d/default.conf

# Копируем файлы сайта внутрь образа
# (Предполагается, что build контекст будет запускаться из корня проекта)
COPY ../frontend /usr/share/nginx/html