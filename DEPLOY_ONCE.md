# 🚀 Deploy Once - Complete Setup

Follow these steps **exactly** and you'll be done!

---

## 📋 Prerequisites

- Code pushed to GitHub
- Railway account (free tier works)
- Netlify account (free tier works)

---

## ⚠️ IMPORTANT: Before Starting

Make sure you've committed and pushed all code changes:
```bash
git add .
git commit -m "Ready for PostgreSQL deployment"
git push
```

## Step 1: Railway - Add PostgreSQL Database

1. Go to [Railway](https://railway.app)
2. Create/Open your project
3. Click **"New"** → **"Database"** → **"Add PostgreSQL"**
4. Wait ~30 seconds for it to create
5. Click on the **PostgreSQL service**
6. Go to **"Variables"** tab
7. **Copy the `DATABASE_URL`** (looks like `postgresql://...`)
8. **Save this!** You'll need it in Step 2

---

## Step 2: Railway - Deploy Backend

1. In same Railway project, click **"New"** → **"GitHub Repo"**
2. Select your repository
3. **Configure Settings:**
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start:prod`

4. **Add Environment Variables** (Click "Variables" tab):
   
   | Variable | Value |
   |----------|-------|
   | `PORT` | `8081` |
   | `DATABASE_URL` | (paste from Step 1) |
   | `FRONTEND_URL` | `https://your-app.netlify.app` (update after Step 3) |
   | `JWT_SECRET` | (generate: visit https://generate-secret.vercel.app/32) |

5. **Wait for deployment** (check logs)
6. **Get Backend URL:**
   - Settings → Networking → Copy **Public Domain**
   - Example: `https://your-backend.railway.app`

---

## Step 3: Netlify - Deploy Frontend

1. Go to [Netlify](https://netlify.com)
2. **Add new site** → **Import from Git** → Connect GitHub → Select repo
3. **Configure:**
   - **Base directory:** `frontend`
   - **Build command:** `npm install && npm run build`
   - **Publish directory:** `dist`

4. **Add Environment Variable:**
   - Site settings → Environment variables → **Edit variables**
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** Your Railway backend URL from Step 2
   - **Save**

5. **Deploy** (click "Deploy site")
6. **Get Frontend URL:**
   - Netlify gives you: `https://your-app.netlify.app`
   - **Save this!**

---

## Step 4: Update Backend CORS

1. Go back to **Railway** → **Backend service**
2. **Variables** tab
3. Update `FRONTEND_URL` to your Netlify URL
4. Railway auto-redeploys (wait ~30 seconds)

---

## ✅ Done! Test Your App

1. Visit your **Netlify URL**
2. **Register** a test account
3. **Test features:**
   - Login
   - Search carparks
   - Click "Locate me"
   - View map
   - Test filters

---

## 🎉 Share with Friends!

Send them your Netlify URL and they can create accounts!

---

## Quick Troubleshooting

**Backend error?**
- Check `DATABASE_URL` is correct
- Check logs in Railway

**Frontend can't connect?**
- Verify `VITE_API_BASE_URL` matches backend URL
- Check backend is running (visit backend URL + `/healthz`)

**Database issues?**
- Migrations run automatically
- Check Railway logs for errors

---

## That's It! 🚀

Your app is live and ready to use!

