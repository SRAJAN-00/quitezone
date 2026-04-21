# QuietZone Backend

Express + MongoDB API for auth, zone management, activity events, and device token registration.

## Production Environment

Use `.env.production.example` as the base and set real values:

- `MONGODB_URI`
- `CORS_ORIGIN`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

In `NODE_ENV=production`, the server now fails fast if secrets are unsafe or missing.

## Run Locally

```bash
npm install
npm run dev
```

Health checks:

- `GET /health`
- `GET /ready`

## Container Build

```bash
docker build -t quietzone-backend .
docker run --env-file .env.production.example -p 4000:4000 quietzone-backend
```

## Render Deployment

This repository now includes a root-level `render.yaml` Blueprint for deploying the backend from this monorepo.

### 1) Create the web service in Render

- In Render, create a new Blueprint or Web Service from `https://github.com/SRAJAN-00/quitezone`.
- If you use the Blueprint flow, Render will detect `render.yaml` and create the `quietzone-backend` web service automatically.
- The service uses `QuietZone-backend/` as its monorepo root and builds from `QuietZone-backend/Dockerfile`.

### 2) Set required variables

Render should prompt for:

- `MONGODB_URI`
- `CORS_ORIGIN`

The Blueprint also sets:

- `NODE_ENV=production`
- `PORT=10000`
- generated values for `JWT_ACCESS_SECRET`
- generated values for `JWT_REFRESH_SECRET`

Optional Firebase variables can be added later in the Render dashboard only if push notifications are enabled:

- `FIREBASE_SERVICE_ACCOUNT_JSON`
- or `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

### 3) Verify

- Open the Render service URL and check `/health`
- Check `/ready`
- If `/ready` fails, confirm `MONGODB_URI` is reachable from Render and that the service started with the expected env vars

### 4) Connect the frontend

- Point the frontend API base URL to the Render backend URL
- Rebuild the frontend after changing its API URL

## Deploy Runbook (Beta)

1. Provision managed MongoDB and create app user.
2. Set backend env vars from `.env.production.example`.
3. Deploy container and expose port `4000`.
4. Verify:
   - `GET /health` returns `status: ok`
   - `GET /ready` returns `status: ready`
5. Point frontend `EXPO_PUBLIC_API_URL` to deployed backend URL.
6. Run smoke checks from mobile/web client (auth, zones, activity, manual transition).

## Railway Deployment

### 1) Create the backend service

- Create a new Railway project from this GitHub repository.
- For a monorepo, set the service root directory to `QuietZone-backend`.
- Railway can build this service from the included Dockerfile.
- This repo now includes `QuietZone-backend/railway.json` with the Dockerfile builder, backend-only watch path, and a `/ready` health check.
- If you configure the service from the Railway dashboard and set a root directory manually, point the config file path to `/QuietZone-backend/railway.json`.

### 2) Add MongoDB

- In Railway, add a MongoDB plugin to the project.
- Copy the plugin connection string into `MONGODB_URI` for the backend service.

### 3) Set backend variables

Set these variables on the Railway backend service:

- `NODE_ENV=production`
- `PORT=4000`
- `MONGODB_URI=<Railway MongoDB connection string>`
- `CORS_ORIGIN=<your frontend URL or comma-separated allowlist>`
- `JWT_ACCESS_SECRET=<strong random secret>`
- `JWT_REFRESH_SECRET=<strong random secret>`

Optional Firebase variables, only if push notifications are enabled:

- `FIREBASE_SERVICE_ACCOUNT_JSON`
- or `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

### 4) Deploy and verify

- Deploy the service.
- Open the Railway public URL and check:
   - `/health`
   - `/ready`
- If `/ready` fails, confirm MongoDB is reachable and `MONGODB_URI` is correct.

### 5) CLI deploy option

From `QuietZone-backend/` you can also deploy with the Railway CLI after linking the correct project/service:

```bash
railway login
railway link
railway up
```

### 6) Connect the frontend

- Set the frontend API URL to the Railway backend URL.
- Rebuild the frontend after updating its API base URL.

## Rollback

1. Roll back to previous container image/tag.
2. Re-run `/ready` and core smoke checks.
3. If issue is data-related, restore Mongo backup/snapshot from provider.
