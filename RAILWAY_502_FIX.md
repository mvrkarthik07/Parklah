# Fixing 502 Bad Gateway on Railway

## 🔍 What is 502 Bad Gateway?

A **502 Bad Gateway** means Railway can't reach your backend server. This usually happens when:
1. The backend crashed on startup
2. The backend isn't listening on the correct port/host
3. Database connection failed
4. Migration errors
5. Missing environment variables

---

## ✅ Quick Fixes

### Step 1: Check Railway Logs

1. Go to **Railway Dashboard** → Your backend service
2. Click **"Deployments"** tab
3. Click on the latest deployment
4. Check **"Logs"** tab
5. Look for errors (red text)

**Common errors you might see:**
- `Error: P1012` → Missing DATABASE_URL
- `Error: P3019` → Migration failed
- `EADDRINUSE` → Port conflict
- `Cannot find module` → Build issue

---

### Step 2: Verify Environment Variables

In Railway → Backend service → **"Variables"** tab, make sure you have:

✅ **Required:**
- `DATABASE_URL` - Your PostgreSQL connection string
- `JWT_SECRET` - A secret key for JWT tokens
- `FRONTEND_URL` - Your frontend URL (can be `http://localhost:5173` for now)

✅ **Optional (but recommended):**
- `PORT` - Railway sets this automatically, but you can override
- `HDB_API_KEY` - For real availability data
- `NEA_API_KEY` - For weather data

---

### Step 3: Check if Backend is Running

1. In Railway → Backend service → **"Settings"**
2. Check **"Healthcheck Path"** - should be `/healthz`
3. Check **"Start Command"** - should be:
   ```
   cd backend && npm run start:prod
   ```
   OR
   ```
   cd backend && npm start
   ```

---

### Step 4: Test Health Endpoint

Try visiting:
```
https://your-backend.railway.app/healthz
```

**Expected response:**
```json
{"ok": true}
```

If this doesn't work, the backend isn't running.

---

## 🔧 Common Fixes

### Fix 1: Server Not Listening on 0.0.0.0

Railway needs the server to listen on `0.0.0.0`, not just `localhost`.

**Check:** `backend/src/index.ts` should listen on all interfaces:
```typescript
app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`[API] listening on :${env.PORT}`)
})
```

---

### Fix 2: Migration Errors

If you see `P3019` migration errors:

1. Go to Railway → Backend service → **"Variables"**
2. Add/update:
   ```
   DATABASE_URL=your-postgres-url
   ```
3. Go to **"Deployments"** → Click **"Redeploy"**

The `start:prod` script should handle failed migrations automatically.

---

### Fix 3: Port Configuration

Railway automatically sets `PORT` environment variable. Make sure your code uses it:

```typescript
// backend/src/config/env.ts
PORT: parseInt(process.env.PORT || '8080', 10)
```

This should work, but verify Railway is setting `PORT`.

---

### Fix 4: Build Issues

If the build fails:

1. Check **"Build Logs"** in Railway
2. Make sure `package.json` has:
   ```json
   {
     "scripts": {
       "build": "tsc -p .",
       "start": "node dist/index.js"
     }
   }
   ```
3. Verify TypeScript compiles without errors locally:
   ```bash
   cd backend
   npm run build
   ```

---

## 🚨 Emergency Fix: Restart Everything

1. **Railway Dashboard** → Backend service
2. Click **"Settings"** → Scroll down
3. Click **"Delete Service"** (don't worry, you can recreate)
4. **OR** Click **"Redeploy"** on the latest deployment

---

## 📋 Debugging Checklist

- [ ] Check Railway logs for errors
- [ ] Verify `DATABASE_URL` is set
- [ ] Verify `JWT_SECRET` is set
- [ ] Check health endpoint: `/healthz`
- [ ] Verify build command: `cd backend && npm run build`
- [ ] Verify start command: `cd backend && npm run start:prod`
- [ ] Check if server listens on `0.0.0.0`
- [ ] Test locally first: `npm run build && npm start`

---

## 🎯 Most Likely Issue

**90% of the time**, it's one of these:

1. **Missing `DATABASE_URL`** → Add it in Railway Variables
2. **Migration failed** → Check logs, the `start:prod` script should handle it
3. **Backend crashed** → Check logs for the actual error

---

## 💡 Quick Test

Run this locally to make sure everything works:

```bash
cd backend
npm run build
npm start
```

Then visit: `http://localhost:8080/healthz`

If this works locally but not on Railway, it's an environment/deployment issue.

---

**Share the Railway logs with me and I can help debug further!** 🔍

