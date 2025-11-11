# Quick Deployment Guide - ParkLah!

## 🚀 Fastest Way: Railway (Recommended)

Railway makes deployment super easy. Follow these steps:

### Step 1: Prepare Your Code
1. Make sure all your code is committed to GitHub
2. Push to your repository

### Step 2: Deploy Backend

1. **Go to Railway**: https://railway.app
2. **Sign up/Login** (use GitHub to connect)
3. **Click "New Project"** → **"Deploy from GitHub repo"**
4. **Select your repository**
5. **Configure Backend:**
   - **Root Directory**: Set to `backend` ⚠️ **IMPORTANT: Make sure this is set!**
   - **Build Command**: 
     ```bash
     npm install && npm run build
     ```
     (Note: `prisma generate` runs automatically via `postinstall` script)
   - **OR if Root Directory doesn't work, use:**
     ```bash
     cd backend && npm install && npm run build
     ```
   - **Start Command**: 
     ```bash
     cd backend && npm run start:prod
     ```
     ⚠️ **This automatically runs migrations before starting!**
     ⚠️ **Alternative**: If Root Directory is set, use `npm run start:prod`
6. **Add Environment Variables:**
   - Click on your service → **Variables** tab
   - Add these variables:
     ```
     PORT=8081
     FRONTEND_URL=https://your-frontend-url.railway.app
     DATABASE_URL=postgresql://... (Railway will auto-create this)
     JWT_SECRET=your-random-secret-here (generate with: openssl rand -base64 32)
     ```
   - **Get DATABASE_URL**: Railway auto-creates PostgreSQL. Go to **Data** tab → **Add PostgreSQL** → Copy the connection string

7. **Run Database Migrations:**
   - Go to your backend service → **Deployments** → Click on latest deployment
   - Click **"View Logs"** → Click **"Shell"** tab
   - Run:
     ```bash
     npx prisma migrate deploy
     ```

8. **Get Backend URL:**
   - Railway gives you a URL like: `https://your-backend.railway.app`
   - Copy this URL!

### Step 3: Deploy Frontend

1. **In Railway, create another service:**
   - Click **"New"** → **"GitHub Repo"** → Select same repo
   - **Root Directory**: Set to `frontend`
   - **Build Command**: 
     ```bash
     npm install && npm run build
     ```
   - **Start Command**: (Leave empty - it's a static site)
   - **Output Directory**: `dist`

2. **Add Environment Variable:**
   - Click **Variables** tab
   - Add:
     ```
     VITE_API_BASE_URL=https://your-backend.railway.app
     ```
   - (Use the backend URL from Step 2)

3. **Get Frontend URL:**
   - Railway gives you a URL like: `https://your-frontend.railway.app`
   - **Update Backend CORS:**
     - Go back to backend service → **Variables**
     - Update `FRONTEND_URL` to your frontend URL

### Step 4: Test Your App
1. Visit your frontend URL
2. Try registering a new account
3. Test login and search

---

## 🎯 Alternative: Render (Free Tier Available)

### Backend on Render:

1. **Go to**: https://render.com
2. **Sign up/Login**
3. **New** → **Web Service**
4. **Connect GitHub** → Select your repo
5. **Configure:**
   - **Name**: `parklah-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: 
     ```bash
     cd backend && npm install && npm run build && npx prisma generate
     ```
   - **Start Command**: 
     ```bash
     cd backend && npm start
     ```
6. **Add Environment Variables:**
   - `PORT=8081`
   - `FRONTEND_URL=https://your-frontend.onrender.com`
   - `DATABASE_URL` (Render will create PostgreSQL - use that)
   - `JWT_SECRET=your-random-secret`
7. **Create Database:**
   - **New** → **PostgreSQL**
   - Copy the **Internal Database URL**
   - Add it as `DATABASE_URL` in your backend service
8. **Run Migrations:**
   - After first deploy, go to **Shell** tab
   - Run: `cd backend && npx prisma migrate deploy`

### Frontend on Render:

1. **New** → **Static Site**
2. **Connect GitHub** → Select your repo
3. **Configure:**
   - **Root Directory**: `frontend`
   - **Build Command**: 
     ```bash
     cd frontend && npm install && npm run build
     ```
   - **Publish Directory**: `frontend/dist`
4. **Add Environment Variable:**
   - `VITE_API_BASE_URL=https://your-backend.onrender.com`

---

## 📱 Deploy as Mobile App (Optional)

If you want a mobile app, you can use:

### Option 1: PWA (Progressive Web App)
Your React app can be installed as a PWA. Add to `frontend/index.html`:
```html
<link rel="manifest" href="/manifest.json">
```

### Option 2: React Native (Future)
Convert to React Native for native iOS/Android apps.

---

## ✅ Post-Deployment Checklist

- [ ] Test user registration
- [ ] Test login
- [ ] Test 2FA setup
- [ ] Test carpark search
- [ ] Test map functionality
- [ ] Verify CORS is working
- [ ] Check database migrations ran
- [ ] Test on mobile device

---

## 🔧 Troubleshooting

### "CORS Error"
- Make sure `FRONTEND_URL` in backend matches your frontend URL exactly
- Include `https://` in the URL

### "Database Connection Error"
- Verify `DATABASE_URL` is correct
- Make sure migrations ran: `npx prisma migrate deploy`

### "JWT Secret Error"
- Make sure `JWT_SECRET` is set in backend environment variables
- Generate a new one: `openssl rand -base64 32`

### "Build Failed"
- Check build logs in Railway/Render
- Make sure all dependencies are in `package.json`
- Verify Node version (should be 18+)

---

## 🎉 You're Done!

Once deployed, share your frontend URL with friends and they can create accounts!

**Need help?** Check the logs in your deployment platform's dashboard.

