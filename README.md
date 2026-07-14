# Microservices Demo (Node.js / Express)

A minimal but realistic microservices setup with 3 independent services and an API gateway that routes to them.

## Architecture

```
                ┌─────────────┐
   browser ───▶ │  Frontend    │  (port 5173, React + Vite)
                └──────┬───────┘
                       ▼
                ┌─────────────┐
                │   Gateway    │  (port 3000)
                └──────┬───────┘
         ┌─────────────┼──────────────┐
         ▼              ▼              ▼
   ┌───────────┐  ┌────────────┐  ┌───────────┐
   │  Users    │  │  Products  │  │  Orders   │
   │  :4001    │  │  :4002     │  │  :4003    │
   └───────────┘  └────────────┘  └─────┬─────┘
                                          │
                        calls Users + Products APIs
                        to validate & reserve stock
```

- **users-service** – CRUD for users, backed by its own Postgres database (`users_db`)
- **products-service** – CRUD for products + stock reservation, backed by its own Postgres database (`products_db`); stock reservation runs inside a transaction with a row lock so concurrent orders can't oversell
- **orders-service** – creates orders; calls the users and products services over HTTP to validate a user and reserve stock, then persists the order in its own Postgres database (`orders_db`)
- **gateway** – single entry point on port 3000 that proxies `/api/users`, `/api/products`, `/api/orders` to the right service
- **frontend** – a React (Vite) "ops console" UI: tables + forms for users/products, an order form, a live service-health strip, and a small animated diagram that lights up as an order request flows through gateway → orders → users/products

Each service has its own `package.json`, its own database, and runs independently — this is the "database-per-service" pattern: no service reaches into another service's tables directly, they only talk over HTTP.

## Run locally (without Docker)

Each service needs its own Postgres database. The easiest way is to start just the three databases with Docker and run the Node services directly:

```bash
docker compose up users-db products-db orders-db
```

This starts Postgres on ports 5432 (users), 5433 (products), 5434 (orders) and runs each `db/init.sql` automatically the first time.

Then, in separate terminals:

```bash
cd services/users-service && npm install && npm start      # :4001
cd services/products-service && npm install && npm start   # :4002
cd services/orders-service && npm install && npm start      # :4003
cd gateway && npm install && npm start                       # :3000
cd frontend && npm install && npm run dev                    # :5173
```

Each service reads its connection string from `DATABASE_URL` (see the default in each service's `db.js` — they already point at `localhost:5432/5433/5434` to match the compose file above).

Then open http://localhost:5173.

## Run with Docker Compose (recommended)

```bash
docker compose up --build
```

This builds and starts everything — three Postgres databases, three services, the gateway, and the frontend — with connection strings and health checks already wired up. Open http://localhost:5173.

### Resetting the data

Each database's data lives in a Docker volume so it persists across restarts. To wipe it and start fresh from `db/init.sql` again:

```bash
docker compose down -v
```

## Try it via the UI

Open http://localhost:5173. The top bar shows a live dot for each service (green = reachable). Add a user and a product on their tabs, then go to Orders and place one — watch the pipeline diagram light up as the request moves from the gateway into the orders service and fans out to users + products.

## Try it via curl

```bash
# List products
curl http://localhost:3000/api/products

# Create a user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Carol","email":"carol@example.com"}'

# Place an order (orders-service will call users + products services internally)
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"productId":1,"quantity":2}'
```

## Deploying to Kubernetes

There's a full Kubernetes deployment under [`k8s/`](./k8s/README.md) — Deployments, Services, PVCs for each Postgres database, and an Ingress that replaces the `gateway/` service entirely (path-based routing is exactly what Ingress is for). See `k8s/README.md` for build/push/apply steps.

## Notes / where to take this next

- **Migrations**: schema is just a single `db/init.sql` per service, applied automatically on first container start. For anything beyond a demo, swap that for a real migration tool (e.g. `node-pg-migrate`, Knex, or Prisma Migrate) so schema changes are versioned and repeatable.
- **Service discovery**: URLs are wired via environment variables here. At scale you'd use something like Consul, or Kubernetes DNS/service names.
- **Resilience**: the orders service currently fails the whole request if a downstream call fails. Consider retries, circuit breakers (e.g. `opossum`), and timeouts. If the order write itself fails after stock has already been reserved, you'd also want a compensating action (release the reservation) — this demo doesn't handle that yet.
- **Async messaging**: for things that don't need an instant response (e.g. "send confirmation email"), consider a message queue (RabbitMQ/Kafka) instead of direct HTTP calls between services.
- **Auth**: add JWT verification at the gateway so downstream services can trust an already-authenticated request.
