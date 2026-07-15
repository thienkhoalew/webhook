# Webhook Manager Microservices

NestJS monorepo gồm hai ứng dụng độc lập. API sở hữu auth, users, subscriptions và events. Delivery service sở hữu attempts, HMAC delivery và retry.

## Ranh giới

```text
Client -> api-service:3000 -> webhook_api_db
                         -> Redis/BullMQ
Redis/BullMQ -> delivery-service:3001 -> webhook_delivery_db
                                      -> target webhook endpoint
api-service -> internal HTTP -> delivery-service
```

Chỉ [contracts](libs/contracts/src/) được chia sẻ. Hai application không import entity, provider hoặc implementation của nhau.

Delivery semantics: at-least-once. `attemptId` dùng làm idempotency key DB và header `X-Webhook-Attempt-Id`. Target có thể nhận request trùng nếu worker crash sau HTTP success nhưng trước DB commit.

Event save và Redis enqueue chưa dùng transactional outbox. Nếu Redis lỗi sau DB commit, request tạo event trả lỗi; client retry tạo event mới. Production cần thêm API outbox publisher để đóng khoảng trống này.

## Cấu trúc

```text
apps/api-service
apps/delivery-service
libs/contracts
```

## Cài đặt

### Chạy toàn bộ stack bằng Docker Compose

```bash
cp .env.example .env
docker compose up --build -d
docker compose ps
```

Hai application tự chạy migrations khi khởi động. Stack sẵn sàng khi PostgreSQL, Redis và `delivery-service` báo `healthy`, còn `api-service` báo `Up`.

Development database cũ không tương thích schema mới. Nếu không cần giữ dữ liệu local:

```bash
docker compose down --volumes --remove-orphans
docker compose up --build -d
```

Lệnh trên xóa toàn bộ API DB, delivery DB và Redis data local. Không chạy nếu cần giữ dữ liệu.

### Chạy application trên host

```bash
npm install
cp .env.example .env
docker compose up -d postgres-api postgres-delivery redis
npm run migration:run
```

Chạy mỗi service trong terminal riêng:

```bash
npm run start:api:dev
npm run start:delivery:dev
```

## Endpoints

- API health: `http://localhost:3000/health`
- Public API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api/docs`
- Delivery health: `http://localhost:3001/health`
- Internal delivery routes yêu cầu `Authorization: Bearer <INTERNAL_SERVICE_TOKEN>`.

Kiểm tra health:

```bash
curl -i http://localhost:3000/health
curl -i http://localhost:3001/health
```

Mỗi endpoint phải trả `HTTP/1.1 200 OK` và JSON chứa `"status":"ok"`.

## Xác minh database ownership

```bash
docker compose exec -T postgres-api \
  psql -U webhook_api_user -d webhook_api_db \
  -c '\dt'

docker compose exec -T postgres-delivery \
  psql -U webhook_delivery_user -d webhook_delivery_db \
  -c '\dt'
```

API DB phải chỉ có bảng domain `users`, `webhook_events`, `webhook_subscriptions`. Delivery DB phải chỉ có bảng domain `webhook_delivery_attempts`. Mỗi DB có thêm bảng metadata `migrations`.

## Build và test

```bash
npm run build:api
npm run build:delivery
npm test
npm run test:e2e
```

## Docker Compose

Compose chạy `postgres-api`, `postgres-delivery`, `redis`, `api-service`, `delivery-service`.

Xem trạng thái và logs:

```bash
docker compose ps
docker compose logs --no-color api-service delivery-service
```

Production phải đặt secret mạnh, bật Redis auth/TLS, bỏ publish port `3001` ra host và chỉ cho API service truy cập delivery service qua private network.

## Migrations

```bash
npm run migration:run:api
npm run migration:run:delivery
npm run migration:show:api
npm run migration:show:delivery
```

API DB chứa `users`, `webhook_subscriptions`, `webhook_events`. Delivery DB chỉ chứa `webhook_delivery_attempts`; IDs API là external references, không có foreign key cross-database.

## Di chuyển dữ liệu development cũ

Migration tự động từ DB đơn sang hai DB không chạy mặc định vì cần hai connection và snapshot secret/url tại thời điểm attempt cũ. Chọn một:

1. Không cần sample data: dừng stack, xóa volumes local, tạo schema mới.
2. Cần giữ data: export users/subscriptions/events vào API DB; join attempts với event/subscription ở DB cũ; import snapshot vào delivery DB. Kiểm tra count/status trước khi xóa DB cũ.

Không log BullMQ command. Command chứa URL, payload và secret snapshot.
