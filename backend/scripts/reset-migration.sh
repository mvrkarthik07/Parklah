#!/bin/sh
# Reset failed migration state
npx prisma migrate resolve --rolled-back 20250101000000_init_postgresql || true
npx prisma migrate deploy

