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

## Deploy Runbook (Beta)

1. Provision managed MongoDB and create app user.
2. Set backend env vars from `.env.production.example`.
3. Deploy container and expose port `4000`.
4. Verify:
   - `GET /health` returns `status: ok`
   - `GET /ready` returns `status: ready`
5. Point frontend `EXPO_PUBLIC_API_URL` to deployed backend URL.
6. Run smoke checks from mobile/web client (auth, zones, activity, manual transition).

## Rollback

1. Roll back to previous container image/tag.
2. Re-run `/ready` and core smoke checks.
3. If issue is data-related, restore Mongo backup/snapshot from provider.
