# QuietZone Beta Smoke Checklist

## Preconditions

- Backend URL is reachable and set in `EXPO_PUBLIC_API_URL`.
- Backend `/ready` is healthy.
- Test account exists (or register in-app).

## Core Flow

1. Launch app and confirm session hydration completes.
2. Register a new account.
3. Log out, then log in with same account.
4. Create zone with map placement and radius.
5. Edit zone and save changes.
6. Open activity tab and verify list renders.
7. Trigger manual `Log enter` and `Log exit`.
8. Confirm activity list updates with new transitions.
9. Delete zone.

## Error Flow

1. Set invalid API URL and relaunch.
2. Confirm actionable retry states appear on Home/Zones/Activity.
3. Restore valid API URL and verify recovery without reinstall.
