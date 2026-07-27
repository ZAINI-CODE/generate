# Farmhouse Booking Admin (PWA)

Farmhouse Booking Admin is a static Progressive Web App for managing farmhouse bookings.  
It is built with HTML, CSS, and JavaScript, and stores data in LocalStorage (no backend required).

## Project Description

- Manage bookings with create, edit, delete, and search flows
- View dashboard insights (today, upcoming, monthly revenue, recent bookings)
- Generate booking confirmation slips and print/share them
- Export/import backups and use app settings for branding details
- Install as a PWA with offline-capable support

## Run

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run in development mode:

   ```bash
   npm run dev
   ```

3. Build check:

   ```bash
   npm run build
   ```

4. Start server:

   ```bash
   npm run start
   ```

You can also open `/home/runner/work/generate/generate/index.html` directly in a browser.

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
