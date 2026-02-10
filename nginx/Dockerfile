# Stage 1: Build the React application
FROM node:18-alpine as build

WORKDIR /app

# Copy package files (path relative to repo root because docker build context is .)
COPY frontend/package*.json ./
RUN npm install

# Copy source code (path relative to repo root)
COPY frontend/ .

# Build the application
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy the built files from the previous stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]