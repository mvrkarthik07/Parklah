# Deployment Guide for ParkLah!

## Pre-Deployment Checklist

### ✅ What's Ready:
- ✅ Backend build scripts (`npm run build`)
- ✅ Frontend build scripts (`npm run build`)
- ✅ Database migrations (Prisma)
- ✅ Authentication system (JWT + 2FA)
- ✅ CORS configuration
- ✅ Error handling
- ✅ Health check endpoint

### ⚠️ What Needs Attention:

#### 1. **Environment Variables**
Create `.env` files for both backend and frontend:

**Backend `.env` (required):**
```env
# Server
PORT=8081
FRONTEND_URL=https://your-frontend-domain.com

# Database (for production, use PostgreSQL instead of SQLite)
DATABASE_URL="postgresql://user:password@host:5432/parklah?schema=public"

# Security (CRITICAL - generate a strong random secret!)
JWT_SECRET=your-super-secret-jwt-key-change-this-to-random-string

# Optional API Keys
HDB_API_KEY=your-hdb-api-key-if-needed
NEA_API_KEY=your-nea-api-key-if-needed

# CSV Data Paths (if not using default)
CARPARKS_CSV_PATH=./data/hdb_carparks.csv
CARPARK_RATES_CSV_PATH=./data/carpark_rates.csv
```

**Frontend `.env` (or `.env.production`):**
```env
VITE_API_BASE_URL=https://your-backend-domain.com
```

#### 2. **Database Migration**
Before deployment, run:
```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

#### 3. **Security Checklist**
- [ ] Change `JWT_SECRET` to a strong random string (use `openssl rand -base64 32`)
- [ ] Update `FRONTEND_URL` to your actual frontend domain
- [ ] For production, switch from SQLite to PostgreSQL
- [ ] Enable HTTPS (required for secure cookies)
- [ ] Review CORS settings for production

#### 4. **Build & Test Locally**
```bash
# Backend
cd backend
npm install
npm run build
npm start

# Frontend
cd frontend
npm install
npm run build
npm run preview
```

## Deployment Platforms

### Option 1: Railway (Recommended - Easy)
1. **Backend:**
   - Connect GitHub repo
   - Set root directory to `backend`
   - Add environment variables
   - Set build command: `npm install && npm run build && npx prisma migrate deploy && npx prisma generate`
   - Set start command: `npm start`

2. **Frontend:**
   - Connect GitHub repo
   - Set root directory to `frontend`
   - Add `VITE_API_BASE_URL` environment variable
   - Set build command: `npm install && npm run build`
   - Set output directory: `dist`

### Option 2: Render
1. **Backend:**
   - Create new Web Service
   - Set build: `cd backend && npm install && npm run build && npx prisma migrate deploy && npx prisma generate`
   - Set start: `cd backend && npm start`

2. **Frontend:**
   - Create new Static Site
   - Set build: `cd frontend && npm install && npm run build`
   - Set publish directory: `frontend/dist`

### Option 3: Vercel (Frontend) + Railway (Backend)
- Frontend on Vercel (excellent for React)
- Backend on Railway or Render

## Post-Deployment

1. **Test Registration:** Create a test account
2. **Test Login:** Verify authentication works
3. **Test 2FA:** Set up and verify 2FA
4. **Test Search:** Verify carpark search works
5. **Check CORS:** Ensure frontend can communicate with backend

## Common Issues

### Issue: CORS Errors
**Solution:** Update `FRONTEND_URL` in backend `.env` to match your frontend domain

### Issue: Database Connection
**Solution:** 
- For production, use PostgreSQL (not SQLite)
- Update `DATABASE_URL` in backend `.env`
- Run migrations: `npx prisma migrate deploy`

### Issue: JWT Errors
**Solution:** Ensure `JWT_SECRET` is set and consistent across deployments

### Issue: CSV Files Not Found
**Solution:** Ensure CSV files are in `backend/data/` directory or update paths in `.env`

## Production Recommendations

1. **Use PostgreSQL** instead of SQLite for production
2. **Enable rate limiting** (already configured)
3. **Use environment-specific configs**
4. **Set up monitoring** (e.g., Sentry)
5. **Enable HTTPS** (required for secure cookies)
6. **Regular database backups**

