FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache postgresql-client openssl tzdata
COPY package*.json ./
RUN npm install --omit=dev
COPY src ./src
COPY sql ./sql
COPY scripts ./scripts
RUN chmod +x /app/scripts/*.sh && mkdir -p /app/storage/photos /backups
EXPOSE 8080
CMD ["sh", "-c", "node scripts/migrate.js && node scripts/seed.js && node src/server.js"]
