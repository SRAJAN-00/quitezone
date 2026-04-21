# QuietZone Frontend

Expo Router app for QuietZone auth, zone management, and activity tracking.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure API URL:

```bash
cp .env.example .env
```

Set `EXPO_PUBLIC_API_URL` to your backend, for example:

```env
EXPO_PUBLIC_API_URL=https://quietzone-backend.onrender.com
```

`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is optional and only needed if you switch back to a Google Maps SDK view.

```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-android-key
```

3. Start app:

```bash
npm run web
```

For Android silent automation, use a dev build (not Expo Go):

```bash
npx expo prebuild --platform android
npx expo run:android
```

## Reliability Gates

Run before any beta build:

```bash
npm run lint
npx tsc --noEmit
```

## Core v1 Behavior

- Auth session restore with refresh fallback
- Zone CRUD with map-based editor
- Activity timeline
- Manual transition logging from Activity tab (`Log enter` / `Log exit`)
- Actionable retry states for API/network failures
- Android zone-entry automation: geofence enter/exit detection with native silent/vibrate control

## Android Silent Automation Setup

1. Log in and create at least one active zone.
2. Open Home tab > `Silent Automation`.
3. Tap `Setup / Refresh automation`.
4. Grant:
   - Foreground location
   - Background location
   - Notification policy access (Do Not Disturb control)
5. Leave app running/backgrounded and enter the zone.
6. Verify Activity shows transition logs and mode-apply metadata.

## Android Beta Checklist

1. Confirm backend `/ready` is healthy.
2. Set production/staging `EXPO_PUBLIC_API_URL`.
3. Run lint + typecheck gates.
4. Build Android beta artifact.
5. Execute `docs/beta-smoke-checklist.md`.
6. Share build with testers and collect issues with reproduction steps + request IDs.
