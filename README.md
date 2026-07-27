# Farmhouse Booking Admin (PWA)

Static admin-only booking management website built with HTML, CSS, JavaScript, and LocalStorage.

## Run

```bash
npm run dev
```

Or open `/home/runner/work/generate/generate/index.html` directly in a browser.

## Deploy (Vercel)

- Framework preset: **Other**
- Build command: `npm run build`
- Output directory: `.`
- `vercel.json` includes clean URL support.

## Features

- Admin dashboard (totals, today's, upcoming, monthly revenue, recent bookings)
- Booking CRUD with LocalStorage persistence
- Search by client, contact, booking ID, or date
- Premium booking confirmation slip preview + print/PDF flow + sharing links
- JSON export/import backups and automatic LocalStorage snapshots
- Settings page for farmhouse branding/details
- PWA manifest and service worker for installable offline-capable usage
- Default dark theme with responsive layouts for phone/tablet/desktop
- App-level loading overlay and empty-state feedback for smoother UX
