FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache postgresql-client openssl tzdata
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
COPY src ./src
COPY sql ./sql
COPY scripts ./scripts
RUN for f in /app/scripts/*.sh; do tr -d '\015' < "$f" > "$f.tmp" && mv "$f.tmp" "$f"; done \
    && chmod +x /app/scripts/*.sh && mkdir -p /app/storage/photos /app/storage/attachments /backups
EXPOSE 8080
CMD ["node", "src/server.js"]
