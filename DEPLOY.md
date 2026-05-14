# Deploying to Railway

## Quick reference

```bash
# 1. Build locally first (catches TypeScript errors early)
cd frontend && npx next build

# 2. Commit and push
git add -A
git commit -m "description of changes"
git push origin master

# 3. Check builds (Railway auto-deploys from git push)
railway status
railway deployment list --service frontend
railway deployment list --service backend

# 4. Check logs if a deploy fails
railway logs --service frontend --build <DEPLOYMENT_ID>
railway logs --service backend --build <DEPLOYMENT_ID>
railway logs --service frontend --deployment <DEPLOYMENT_ID>
```

## Step-by-step

### 1. Always build locally first

Run `npx next build` in the frontend directory **before** committing. Railway build logs are harder to read and slower to iterate on than a local build. This catches the vast majority of deploy failures.

If the backend has a Dockerfile, you can also check it compiles: `cd backend && npx tsc --noEmit`.

### 2. Commit and push

Railway is linked to the GitHub repo — every push to `master` triggers an automatic deploy on both services (frontend + backend). No need to use `railway deploy` or `railway up` unless you're doing something unusual.

Git staging tips:
- Use `git add -A` or add specific files — never commit `.env` files, `node_modules`, or build artifacts.
- Railway does NOT use the frontend Dockerfile (it uses Railpack, which auto-detects Next.js). A Dockerfile in `frontend/` is ignored, so don't worry about it.
- The backend DOES use its Dockerfile. If you change backend dependencies, make sure `npm ci` works in the Docker build.

### 3. Monitor the deploy

After pushing, check `railway status` or `railway deployment list --service frontend`. You'll see the new deployment cycle through:
- `BUILDING` → `DEPLOYING` → `SUCCESS` (or `FAILED`)

Don't confuse "Online" with "the new code is live." Railway keeps the old deployment running until the new one passes health checks. If the new deploy fails, the old one stays online.

### 4. If a deploy fails

Get the deployment ID from `railway deployment list --service <name>`, then:

```bash
# Build logs (most common source of failures)
railway logs --service frontend --build <DEPLOYMENT_ID>

# Runtime logs (container started but crashes)
railway logs --service frontend --deployment <DEPLOYMENT_ID>
```

Common failures and fixes:

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Build fails with TypeScript error | Missing or wrong type | Run `npx next build` locally first |
| Build succeeds, deploy fails | Health check timeout | Check runtime logs; might be a port or startup issue |
| `Deploy failed` but old site works | New container failed health checks, Railway kept old one | Fix the issue and push again |
| Page returns 404 (e.g. `/help`) | Page wasn't built into the app | Check if the file exists in `frontend/src/app/` and builds locally |

### 5. API_URL and the frontend proxy

The frontend's `next.config.js` uses `process.env.API_URL` for the `/api/*` proxy rewrite. This env var is set on Railway's frontend service and injected at **runtime** (the start command is `API_URL=https://backend-....railway.app npm start`).

If you need to change the API URL, update it in Railway's dashboard (or `railway variables --service frontend`). You don't need to rebuild for env var changes — just redeploy.

## Railway CLI commands cheat sheet

```bash
railway status                           # Overall project status
railway deployment list --service <name> # Deployment history
railway logs --service <name> --build    # Latest build logs
railway logs --service <name> --build <ID> # Specific build logs
railway logs --service <name> --deployment <ID> # Runtime logs
railway variables --service <name>       # List env vars
railway redeploy --service <name> --yes  # Force redeploy (rarely needed)
```
