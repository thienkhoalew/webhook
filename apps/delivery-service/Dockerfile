FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY nest-cli.json tsconfig*.json webpack.config.js ./
COPY apps/delivery-service ./apps/delivery-service
COPY libs/contracts ./libs/contracts
RUN npm run build:delivery

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3001
CMD ["sh", "-c", "node node_modules/typeorm/cli.js -d dist/apps/delivery-service/database/data-source.js migration:run && node dist/apps/delivery-service/main.js"]
