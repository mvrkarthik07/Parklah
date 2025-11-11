# Fixing "Page Can't Be Found" on Login

## 🔍 What "Page Can't Be Found" Usually Means:

1. **Frontend can't reach backend API** (most common)
2. **CORS blocking the request**
3. **Frontend environment variable not set**
4. **Network error**

---

## ✅ Step 1: Check Vercel Environment Variables

**CRITICAL:** Your frontend needs to know where your backend is!

1. Go to **Vercel Dashboard** → Your project
2. Click **"Settings"** → **"Environment Variables"**
3. **Add/Verify:**
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** `https://your-backend.railway.app` (your Railway backend URL)
   - **Environment:** Production, Preview, Development (select all)
4. **Save**
5. **Redeploy** your frontend (Vercel will auto-redeploy, or click "Redeploy")

---

## ✅ Step 2: Check Browser Console

1. Open your Vercel frontend URL
2. Open **Browser DevTools** (F12)
3. Go to **"Console"** tab
4. Try to login
5. **Look for red errors**

**Common errors you'll see:**

### Error 1: Network Error / CORS
```
Access to XMLHttpRequest at 'http://localhost:8080/auth/login' from origin 'https://your-app.vercel.app' has been blocked by CORS policy
```
**Fix:** Frontend is using `localhost:8080` instead of Railway URL → Set `VITE_API_BASE_URL` in Vercel

### Error 2: 404 Not Found
```
POST https://your-backend.railway.app/auth/login 404
```
**Fix:** Check backend logs, verify route exists

### Error 3: Network Error
```
Network Error
```
**Fix:** Backend might be down, check Railway logs

---

## ✅ Step 3: Verify Backend CORS

In Railway → Backend service → **Variables**, make sure:

- `FRONTEND_URL` = Your Vercel URL (e.g., `https://your-app.vercel.app`)

**Important:** Include `https://` and no trailing slash!

---

## ✅ Step 4: Test Backend Directly

Test if the backend login endpoint works:

1. Open **Postman** or **curl** or browser
2. Try:
   ```
   POST https://your-backend.railway.app/auth/login
   Content-Type: application/json
   
   {
     "email": "test@example.com",
     "password": "test123"
   }
   ```

**Expected:** Should return JSON response (even if login fails, you should get a response, not 404)

---

## ✅ Step 5: Check Network Tab

1. Open **Browser DevTools** → **"Network"** tab
2. Try to login
3. Look for the `/auth/login` request
4. **Check:**
   - **Status:** Should be 200, 400, or 401 (not 404)
   - **Request URL:** Should be your Railway backend URL, not `localhost`
   - **Response:** Should have JSON response

---

## 🔧 Quick Fixes

### Fix 1: Frontend Using Wrong Backend URL

**Symptom:** Network tab shows requests to `http://localhost:8080`

**Fix:**
1. Vercel → Settings → Environment Variables
2. Add `VITE_API_BASE_URL` = `https://your-backend.railway.app`
3. Redeploy

### Fix 2: CORS Error

**Symptom:** Console shows CORS error

**Fix:**
1. Railway → Backend Variables
2. Set `FRONTEND_URL` = `https://your-app.vercel.app`
3. Redeploy backend

### Fix 3: Backend Not Responding

**Symptom:** Network error or timeout

**Fix:**
1. Check Railway logs
2. Verify backend is running: `https://your-backend.railway.app/healthz`
3. Should return: `{"ok": true}`

---

## 📋 Debugging Checklist

- [ ] `VITE_API_BASE_URL` is set in Vercel (to Railway backend URL)
- [ ] `FRONTEND_URL` is set in Railway (to Vercel frontend URL)
- [ ] Frontend has been redeployed after adding env var
- [ ] Backend is running (test `/healthz`)
- [ ] Browser console shows no CORS errors
- [ ] Network tab shows requests going to Railway URL (not localhost)

---

## 💡 Most Likely Issue

**90% of the time**, it's:
- Frontend doesn't have `VITE_API_BASE_URL` set in Vercel
- So it's trying to use `http://localhost:8080` (default)
- Which doesn't exist in production

**Fix:** Add `VITE_API_BASE_URL` in Vercel environment variables!

---

**Check your Vercel environment variables first!** That's usually the problem! 🔍

