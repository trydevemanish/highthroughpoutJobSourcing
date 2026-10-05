# High-Throughput Job Processing System

An event-driven backend that accepts events (like `order.placed`) over HTTP, queues them in **RabbitMQ**, and processes them in the background with scalable **workers**. **Redis** handles rate limiting, idempotency, job status, and caching.

The API responds in milliseconds because slow work (email, SMS, invoices) never blocks the request.

## Tech Stack

- Node.js, TypeScript, Express
- RabbitMQ (`amqplib`): message broker
- Redis (`ioredis`): rate limiting, idempotency, job status, cache
- Zod: request validation
- k6: load testing
- Docker Compose: running multiple workers (optional)

## How It Works

```
Client ──POST /events──► API
                          ├─ validate (Zod)
                          ├─ rate limit (Redis)
                          ├─ idempotency check (Redis)
                          ├─ set job status = queued (Redis)
                          └─ publish to RabbitMQ
Client ◄── 202 { jobId } ─┘

RabbitMQ queue ──► Worker 1 ┐
                ──► Worker 2 ├─ do the work, update Redis, ack
                ──► Worker 3 ┘
                     │
                     ├─ failure → retry queue (with delay)
                     └─ too many failures → dead-letter queue (DLQ)

Client ──GET /jobs/:id──► API ──► Redis ──► { status: "done" }
```

**Key ideas**
- **Competing consumers:** many workers listen to the same queue and each message goes to exactly one worker.
- **Ack + redelivery:** if a worker crashes before acking, RabbitMQ gives the message to another worker, so nothing is lost.
- **Idempotency:** the same event sent twice is processed once.
- **Retries + DLQ:** failed jobs are retried, then parked in a dead-letter queue.

<!-- ## Project Structure -->

<!-- ```
.
├── api/            # Express API (routes, middleware, publisher)
├── worker/         # Queue consumers, retry and DLQ logic
├── shared/         # config, redis, rabbit connections, types
├── scripts/        # event generator for testing
├── benchmarks/     # k6 scripts and saved results
├── docker-compose.yml
└── README.md
``` -->

## Event Format

```json
{
  "eventId": "evt_01HZX8K2M4",
  "eventType": "order.placed",
  "version": 1,
  "occurredAt": "2026-09-29T10:15:30.000Z",
  "correlationId": "req_9f3a1c",
  "idempotencyKey": "order-ORD-10021-placed",
  "priority": "normal",
  "payload": {
    "orderId": "ORD-10021",
    "customer": { "customerId": "cus_42", "name": "Raja", "email": "raja@example.com", "phone": "+91XXXXXXXXXX" },
    "items": [{ "productId": "prod_iphone_18", "name": "Apple iPhone 18", "quantity": 1, "unitPrice": 40000000 }],
    "amount": { "subtotal": 40000000, "tax": 7200000, "shipping": 0, "total": 47200000, "currency": "INR" },
    "shippingAddress": { "line1": "House No 412, Vinay Nagar", "city": "Delhi", "state": "Delhi", "pincode": "110001", "country": "IN" },
    "paymentMethod": "UPI",
    "notifyVia": ["email", "sms"]
  }
}
```

Amounts are stored in paise (smallest unit) to avoid floating-point errors.

## Setup

### Prerequisites
- Node.js 20+
- Redis and RabbitMQ (installed locally, or use Docker, see below)
- k6 (for benchmarks): https://k6.io/docs/get-started/installation/

### 1. Install dependencies
```bash
npm install
```

### 2. Create a `.env` file
```
PORT=3000
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://guest:guest@localhost:5672
```

### With Docker (everything, with N workers)
```bash
docker compose up --build --scale worker=3
```
Change `3` to run 1, 2, 4, 8 workers without touching code.

> When using Docker, set `REDIS_URL` and `RABBITMQ_URL` to the service names (`redis`, `rabbitmq`) instead of `localhost`.

## API

| Method | Endpoint | Description |
|---|---|---|
| POST | `/events` | Submit an event. Returns `202 { jobId, status: "queued" }` |
| GET | `/jobs/:id` | Get job status: `queued`, `processing`, `done`, or `failed` |

Responses to know:
- `400`: invalid payload
- `429`: rate limit exceeded
- `200` with the same `jobId`: duplicate `idempotencyKey` (not processed again)

Send a test event:
```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-001" \
  -d @sample-event.json
```

Check the status:
```bash
curl http://localhost:3000/jobs/<jobId>
```

## Monitoring

- **RabbitMQ dashboard:** http://localhost:15672 (login `guest` / `guest`). See queue depth, consumers, and message rates.
- **Worker logs:** each log line includes the worker's process id, so you can see jobs being shared.
  ```bash
  docker compose logs -f worker
  ```
