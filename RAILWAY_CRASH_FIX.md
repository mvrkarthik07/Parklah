# Fixing "Application failed to respond" on Railway

## 🔍 This Error Means:

The backend **crashed during startup** or **failed to start**. Railway can't reach your app.

---

## ✅ Step 1: Check Railway Logs (MOST IMPORTANT!)

1. Go to **Railway Dashboard**
2. Click your **backend service**
3. Click **"Deployments"** tab
4. Click the **latest deployment** (the one that failed)
5. Click **"Logs"** tab
6. **Scroll to the bottom** - look for red errors

**Common errors you'll see:**

### Error 1: Database Connection Failed
```
Error: P1001: Can't reach database server
```
**Fix:** Check `DATABASE_URL` is correct in Railway Variables

### Error 2: Migration Failed
```
Error: P3019 migrate found failed migrations
```
**Fix:** The `start:prod` script should handle this, but check logs

### Error 3: Missing Module
```
Error: Cannot find module './server.js'
```
**Fix:** Build might have failed - check build logs

### Error 4: Prisma Client Not Generated
```
Error: @prisma/client did not initialize yet
```
**Fix:** Make sure `postinstall` script runs: `prisma generate`

### Error 5: Port Already in Use
```
Error: listen EADDRINUSE :::8080
```
**Fix:** Railway sets PORT automatically, don't override it

---

## ✅ Step 2: Verify Build Command

In Railway → Backend service → **Settings** → **Build Command**:

Should be:
```
cd backend && npm install && npm run build
```

---

## ✅ Step 3: Verify Start Command

In Railway → Backend service → **Settings** → **Start Command**:

Should be:
```
cd backend && npm run start:prod
```

OR (if migrations are causing issues):
```
cd backend && npm start
```

---

## ✅ Step 4: Check Environment Variables

In Railway → Backend service → **Variables**, make sure you have:

**REQUIRED:**
- ✅ `DATABASE_URL` - PostgreSQL connection string
- ✅ `JWT_SECRET` - Any random string (e.g., `my-secret-key-123`)
- ✅ `FRONTEND_URL` - Your Vercel URL

**OPTIONAL:**
- `HDB_API_KEY` - For real availability data
- `NEA_API_KEY` - For weather data

---

## ✅ Step 5: Test Locally First

Before deploying, test locally:

```bash
cd backend
npm install
npm run build
npm start
```

If this fails locally, fix the error first, then deploy.

---

## 🔧 Quick Fixes

### Fix 1: Rebuild Everything

1. Railway → Backend service → **Settings**
2. Click **"Redeploy"** on latest deployment
3. Watch the logs in real-time

### Fix 2: Check Database Connection

1. Railway → Your PostgreSQL database
2. Copy the **Connection URL**
3. Make sure it's set as `DATABASE_URL` in backend variables
4. Format should be: `postgresql://user:password@host:port/database`

### Fix 3: Simplify Start Command (Temporary)

If `start:prod` is causing issues, temporarily use:

**Start Command:**
```
cd backend && npm start
```

Then manually run migrations later if needed.

### Fix 4: Check Build Output

1. Railway → Backend service → **Deployments**
2. Click latest deployment
3. Check **"Build Logs"** (not just runtime logs)
4. Look for TypeScript errors or build failures

---

## 🚨 Most Common Issues

### Issue 1: Missing DATABASE_URL
**Symptom:** App crashes immediately on startup  
**Fix:** Add `DATABASE_URL` in Railway Variables

### Issue 2: Prisma Client Not Generated
**Symptom:** `@prisma/client did not initialize`  
**Fix:** Make sure `postinstall` script exists in `package.json`:
```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

### Issue 3: Migration Failed
**Symptom:** `P3019` or migration errors  
**Fix:** Check the `start:prod` script handles this, or use `npm start` temporarily

### Issue 4: Build Failed
**Symptom:** No `dist` folder or TypeScript errors  
**Fix:** Check build logs, fix TypeScript errors locally first

---

## 📋 Debugging Checklist

- [ ] Check Railway logs (most recent errors at bottom)
- [ ] Verify `DATABASE_URL` is set and correct
- [ ] Verify `JWT_SECRET` is set
- [ ] Check build command: `cd backend && npm install && npm run build`
- [ ] Check start command: `cd backend && npm run start:prod`
- [ ] Test locally: `npm run build && npm start`
- [ ] Verify `postinstall` script runs `prisma generate`
- [ ] Check if TypeScript compiles without errors

---

## 💡 What to Share

If you're still stuck, share:
1. **Railway logs** (the red error messages)
2. **Build logs** (if build failed)
3. **Your start command** (from Railway settings)
4. **Environment variables** (names only, not values)

---

**The logs will tell us exactly what's wrong!** Check them first! 🔍

