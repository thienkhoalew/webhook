FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY nest-cli.json tsconfig*.json webpack.config.js ./
COPY apps/api-service ./apps/api-service
COPY libs/contracts ./libs/contracts
RUN npm run build:api

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["sh", "-c", "node node_modules/typeorm/cli.js -d dist/apps/api-service/database/data-source.js migration:run && node dist/apps/api-service/main.js"]
