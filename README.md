# Carparkers (MVP)
Full‑stack MVP: React + Vite + TS (frontend), Node + Express + TS + Prisma
(backend), SQLite (dev), JWT cookie auth, mock adapters with real‑API slots.
## Prereqs
- Node 20+
- pnpm (or npm)
## Run (dev)
```bash
# Clone
git clone <repo> carparkers && cd carparkers
# Backend
cd backend
cp ../.env.example .env
pnpm i
pnpm prisma migrate dev --name init
pnpm prisma db seed
pnpm dev
# Frontend (new terminal)
cd ../frontend
pnpm i
pnpm dev