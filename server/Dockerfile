FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=mysql://build_user:build_password@127.0.0.1:3306/build_db

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

RUN npm ci --omit=dev

COPY scripts ./scripts
COPY shared ./shared
COPY src ./src
COPY public ./public

EXPOSE 3000

CMD ["npm", "run", "start:cloud"]
