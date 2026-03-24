# Products Platform (NestJS + Next.js)

Full-stack product management platform with role-based access control, background jobs with queues, and CSV report generation.

## Overview

This repository contains:

- `backend` (root project): `NestJS`, `TypeORM`, `PostgreSQL`, `JWT`, `BullMQ`
- `frontend` (`frontend/`): `Next.js`, `TailwindCSS`

Main capabilities:

- authentication (`register`, `login`) with JWT
- role-based authorization (`ADMIN`, `PROFESSIONAL`)
- products CRUD with pagination
- bulk product creation via queue jobs
- background report generation (batch processing) with automatic CSV download in frontend

## Project Structure

```text
.
├── src/                  # NestJS backend source
├── test/unit/            # Backend unit tests
├── frontend/             # Next.js frontend app
├── docker-compose.yml    # PostgreSQL + Redis services
└── data/                 # Local mounted data volumes
```

## Tech Stack

### Backend

- NestJS 11
- TypeORM
- PostgreSQL
- BullMQ + Redis
- JWT + Passport
- Class Validator / Class Transformer

### Frontend

- Next.js 16 (App Router)
- React 19
- TailwindCSS 4

## Prerequisites

- Node.js `>= 20`
- npm `>= 10`
- Docker + Docker Compose (recommended for PostgreSQL/Redis)

## Environment Variables

### Backend (`.env`)

The project includes `.env.example`.

Required keys:

- `PORT` (default `3001`)
- `DB_HOST`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_SYNCHRONIZE`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD` (optional)

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Installation

### 1) Clone and install backend deps

```bash
npm install
```

### 2) Install frontend deps

```bash
cd frontend
npm install
cd ..
```

## Run with Docker services (Postgres + Redis)

Start infra:

```bash
docker compose up -d
```

Stop infra:

```bash
docker compose down
```

## Running the Application

### Backend (NestJS)

```bash
npm run start:dev
```

Backend URL:

- `http://localhost:3001`

### Frontend (Next.js)

```bash
cd frontend
npm run dev
```

Frontend URL:

- `http://localhost:3000`

## Database Seeding

Seed initial users/products:

```bash
npm run seed
```

Default seeded users:

- `admin@example.com` / `admin123` (`ADMIN`)
- `professional@example.com` / `professional123` (`PROFESSIONAL`)

## Backend Scripts

```bash
npm run start:dev     # run API in watch mode
npm run build         # compile backend
npm run test          # run backend unit tests
npm run test:cov      # run coverage
npm run seed          # seed initial data
```

## Frontend Scripts

```bash
cd frontend
npm run dev           # run frontend locally
npm run build         # build frontend
npm run lint          # lint frontend
```

## API Summary

### Auth

- `POST /auth/register`
- `POST /auth/login`

### Products

- `GET /products?page=1&limit=10`
- `GET /products/:id`
- `POST /products` (`ADMIN`)
- `PATCH /products/:id` (`ADMIN`)
- `DELETE /products/:id` (`ADMIN`)
- `POST /products/bulk` (`ADMIN`, queued)

### Reports (queued)

- `POST /reports/generate` (`ADMIN`, `PROFESSIONAL`)
- `GET /reports/:id` (`ADMIN`, `PROFESSIONAL`)
- `GET /reports/:id/download` (`ADMIN`, `PROFESSIONAL`) - CSV download

## Queue Workflows

### Bulk Product Registration

- Enqueues one job per product
- Worker persists products asynchronously

### Background Report Generation

- Enqueues report job
- Worker processes products in batches (`skip/take`)
- Builds CSV
- Marks status: `PENDING -> PROCESSING -> COMPLETED|FAILED`

## Frontend Usage Flow

1. Register or login
2. Access `/products`
3. Generate report from button
4. Wait for status notification
5. CSV download starts automatically when complete

Role behavior:

- `ADMIN`: full product management + report generation
- `PROFESSIONAL`: read-only product view + report generation

## Testing

Backend unit tests are located in `test/unit/` and do not hit the database.

```bash
npm run test
```

## Notes

- Keep `DB_SYNCHRONIZE=true` only for development.
- Redis must be reachable for queue features.
- If backend runs in Docker, use service names (`postgres`, `redis`) as hosts.

