FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ src/
COPY migrations/ migrations/

# Build TypeScript
RUN npx tsc

EXPOSE 3006

# Run migrations then start the server
CMD npx tsx src/migrate.ts && node dist/index.js
