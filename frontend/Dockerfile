FROM node:18-alpine

WORKDIR /app

# Install dependencies first (cached if package.json doesn't change)
COPY package*.json ./
RUN npm install

# In development, we will mount the source code via docker-compose
# So we don't strictly need to COPY . . here, but it's good as a fallback
COPY . .

# Expose Vite port
EXPOSE 5173

# Run Vite with --host to allow external access
CMD ["npm", "run", "dev", "--", "--host"]
