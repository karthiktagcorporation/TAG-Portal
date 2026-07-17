# TAG Information Systems Portal — production image for Dokploy
FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production
# SQLite database lives here — mount a volume to persist users/apps
VOLUME /app/data

EXPOSE 4100
CMD ["node", "server/index.js"]
