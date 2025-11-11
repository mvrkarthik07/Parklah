# Debugging Network Errors & Login Issues

## 🔍 Current Issues:
1. **Network error** when trying to register
2. **"Invalid password or email"** when trying to login

---

## ✅ What I Just Fixed:

1. **Enhanced CORS configuration** - Added explicit methods and headers
2. **Better error handling** - Added validation and logging
3. **Improved error messages** - More specific error responses

---

## 🚨 Most Likely Causes:

### Issue 1: CORS Blocking Requests

**Symptom:** Network error, request doesn't reach backend

**Check:**
1. Railway → Backend Variables → `FRONTEND_URL`
   - Should be: `https://your-app.vercel.app` (exact match, no trailing slash)
2. Vercel → Environment Variables → `VITE_API_BASE_URL`
   - Should be: `https://your-backend.railway.app`

**Fix:** Make sure both URLs match exactly (including `https://`)

---

### Issue 2: Database Connection Failed

**Symptom:** Registration/login fails with generic errors

**Check Railway Logs:**
1. Railway → Backend service → Deployments → Latest → Logs
2. Look for:
   - `Error: P1001` - Can't reach database
   - `Error: P1012` - Missing DATABASE_URL
   - Any Prisma errors

**Fix:** 
- Verify `DATABASE_URL` is set in Railway Variables
- Check database is running in Railway

---

### Issue 3: Cookie Settings Issue

**Symptom:** Login works but immediately fails on next request

**Check:**
- Cookies are set with `sameSite: 'none'` and `secure: true`
- CORS allows credentials

**Already fixed in code!** ✅

---

## 🔧 Debugging Steps:

### Step 1: Check Browser Console

1. Open your Vercel frontend
2. Open DevTools (F12) → **Console** tab
3. Try to register/login
4. **Look for red errors**

**Common errors:**
- `CORS policy` → CORS issue
- `Network Error` → Backend not reachable
- `404` → Wrong URL

---

### Step 2: Check Network Tab

1. DevTools → **Network** tab
2. Try to register/login
3. Find the `/auth/register` or `/auth/login` request
4. **Check:**
   - **Status:** 200, 400, 401, 404, or failed?
   - **Request URL:** Should be Railway URL, not localhost
   - **Response:** What does it say?

---

### Step 3: Check Railway Logs

1. Railway → Backend service → **Deployments** → Latest → **Logs**
2. Try to register/login
3. **Look for:**
   - `Registration error:` or `Login error:` (I added these)
   - Database errors
   - Any red errors

---

### Step 4: Test Backend Directly

Test if backend is working:

```bash
# Test registration endpoint
curl -X POST https://your-backend.railway.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test1234","vehicleType":"CAR","vehicleHeight":1.6}'
```

**Expected:** Should return JSON (even if error, should get response)

---

## 📋 Quick Checklist:

- [ ] `FRONTEND_URL` in Railway = Your Vercel URL (exact match)
- [ ] `VITE_API_BASE_URL` in Vercel = Your Railway URL
- [ ] `DATABASE_URL` is set in Railway
- [ ] Backend is running (check `/healthz`)
- [ ] No CORS errors in browser console
- [ ] Network tab shows requests going to Railway (not localhost)

---

## 💡 Most Common Fix:

**90% of the time**, it's:
- `FRONTEND_URL` in Railway doesn't match Vercel URL exactly
- Or `VITE_API_BASE_URL` not set in Vercel

**Double-check both environment variables match exactly!**

---

**Check Railway logs first - they'll tell you exactly what's wrong!** 🔍

