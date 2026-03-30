FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci --omit=dev

COPY src ./src

EXPOSE 3000

CMD ["npm", "run", "start:cloud"]
