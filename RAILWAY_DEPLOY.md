# One-Time Railway Deployment Guide

## 🚀 Complete Setup - Deploy Once and Done!

Follow these exact steps to deploy your app to Railway.

---

## Step 1: Add PostgreSQL Database

1. In Railway dashboard → Your project
2. Click **"New"** → **"Database"** → **"Add PostgreSQL"**
3. Wait for it to be created
4. Click on the PostgreSQL service
5. Go to **"Variables"** tab
6. **Copy the `DATABASE_URL`** (you'll need this)

---

## Step 2: Deploy Backend

1. Click **"New"** → **"GitHub Repo"** → Select your repository
2. **Settings:**
   - **Root Directory:** `backend`
   - **Build Command:** 
     ```bash
     npm install && npm run build
     ```
   - **Start Command:**
     ```bash
     npm run start:prod
     ```

3. **Environment Variables** (Click "Variables" tab, add these):
   ```
   PORT=8081
   DATABASE_URL=<paste from PostgreSQL service>
   FRONTEND_URL=https://your-frontend.netlify.app
   JWT_SECRET=<generate with: openssl rand -base64 32>
   ```
   
   **To generate JWT_SECRET:**
   - Run locally: `openssl rand -base64 32`
   - Or use: https://generate-secret.vercel.app/32

4. **Wait for deployment** - Check logs to see it start

5. **Get Backend URL:**
   - Settings → Networking → Copy **Public Domain**
   - Save this URL!

---

## Step 3: Deploy Frontend (Netlify)

1. Go to [Netlify](https://netlify.com)
2. **Add new site** → **Import from Git** → Select your repo
3. **Settings:**
   - **Base directory:** `frontend`
   - **Build command:** `npm install && npm run build`
   - **Publish directory:** `dist`

4. **Environment Variables:**
   - Site settings → Environment variables → Add variable
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** Your Railway backend URL from Step 2

5. **Deploy** - Wait for build to complete

6. **Get Frontend URL:**
   - Netlify gives you: `https://your-app.netlify.app`
   - Save this URL!

---

## Step 4: Update Backend CORS

1. Go back to Railway → Backend service
2. **Variables** tab
3. Update `FRONTEND_URL` to your Netlify URL
4. Railway auto-redeploys

---

## Step 5: Test! ✅

1. Visit your Netlify URL
2. Register an account
3. Test all features
4. Share with friends!

---

## 🎉 Done!

Your app is now live! The migrations run automatically on every deploy, so you don't need to do anything else.

---

## Quick Reference

### Railway Backend:
- **Root Directory:** `backend`
- **Build:** `npm install && npm run build`
- **Start:** `npm run start:prod`
- **Required Env Vars:**
  - `DATABASE_URL` (from PostgreSQL)
  - `FRONTEND_URL` (your Netlify URL)
  - `JWT_SECRET` (random string)
  - `PORT=8081`

### Netlify Frontend:
- **Base Directory:** `frontend`
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`
- **Required Env Var:**
  - `VITE_API_BASE_URL` (your Railway backend URL)

---

## Troubleshooting

**Backend won't start:**
- Check `DATABASE_URL` is set correctly
- Check logs for errors
- Make sure PostgreSQL is running

**Frontend can't connect:**
- Verify `VITE_API_BASE_URL` is correct
- Check backend is running (visit backend URL/healthz)
- Update `FRONTEND_URL` in backend if changed

**Database errors:**
- Migrations run automatically on start
- Check Railway logs for migration errors
- Verify `DATABASE_URL` format is correct

