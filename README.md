# React Auth Dashboard (React + Vite + Tailwind + Capacitor 7)

Production-style React app with authentication, protected routing, responsive mobile UX, analytics charts, and Capacitor Android integration.

## Features

- Auth flow with DummyJSON API (`/auth/login`, `/auth/me`, `/auth/refresh`)
- Axios setup with token injection and refresh handling
- React Router Data APIs (`loader`, `action`, `errorElement`)
- Protected app shell with login/logout
- Pages:
  - Login
  - Dashboard
  - Profile
  - Services
  - Contact Us
  - Native APIs (Geolocation)
- Mobile-first navigation:
  - Bottom tabs (Dashboard, Profile)
  - Left side drawer for secondary routes
- Success toasts:
  - Post-login toast
  - Contact form submission toast (auto-hide in 2s)
- Analytics charts (7-day trend) with mobile-friendly date ticks
- Route error boundary with production-style fallback UI
- Client error reporting hook (`src/services/errorReporter.js`)
- Capacitor 7 setup for Android + Geolocation plugin
- Notch/safe-area handling for native devices

## Tech Stack

- React 18 + Vite
- React Router DOM 6.30.3
- Tailwind CSS 4
- Axios
- Chart.js
- Capacitor 7 (`core`, `cli`, `android`, `geolocation`)

## Project Setup

```bash
npm install
npm run dev
```

## Web Commands

- `npm run dev` - start development server
- `npm run build` - production build
- `npm run preview` - preview production build

## Capacitor Config

File: [`capacitor.config.json`](./capacitor.config.json)

- `appId`: `com.reactexplore.playground`
- `appName`: `ReactAuthDashboard`
- `webDir`: `dist`

## Android Commands

- `npm run cap:add:android` - create Android platform folder (first time)
- `npm run cap:sync` - build web + sync Capacitor assets/plugins to Android
- `npm run cap:open:android` - open project in Android Studio

Recommended workflow:

```bash
npm run build
npm run cap:sync
npm run cap:open:android
```

For iterative development, run `npm run cap:sync` after web changes before rebuilding in Android Studio.

## Native Geolocation Example

Route: `/native-geolocation`

Demonstrates:

- `Geolocation.requestPermissions()`
- `Geolocation.getCurrentPosition()`

## Android Permissions

Location permissions are configured in:

- [`android/app/src/main/AndroidManifest.xml`](./android/app/src/main/AndroidManifest.xml)

Included:

- `android.permission.ACCESS_COARSE_LOCATION`
- `android.permission.ACCESS_FINE_LOCATION`

## Real Device Notch Issue (Android)

Issue observed on physical devices:

- Header/app content could overlap with status bar or camera cutout (notch).
- Toast and top controls could appear too close to the cutout area.

Fix implemented:

1. Native Android window inset handling in:
   - [`android/app/src/main/java/com/reactexplore/playground/MainActivity.java`](./android/app/src/main/java/com/reactexplore/playground/MainActivity.java)
   - `WindowCompat.setDecorFitsSystemWindows(getWindow(), true)`

2. Safe-area CSS support in:
   - [`src/index.css`](./src/index.css)
   - Uses `env(safe-area-inset-top/right/bottom/left)` and utility classes:
     - `.native-safe-top`
     - `.native-toast-top`
     - `.native-main-bottom`
     - `.native-bottom-nav`

3. Safe-area classes applied to app shell in:
   - [`src/layouts/AppLayout.jsx`](./src/layouts/AppLayout.jsx)

After these changes, top/bottom UI spacing behaves correctly on notch/cutout devices.

## Error Handling

- Route-level boundary: `errorElement` in router
- UI fallback page: `src/pages/RouteErrorPage.jsx`
- Reporter hook: `src/services/errorReporter.js` (pluggable for Sentry/Datadog)

## Notes

- iOS setup requires CocoaPods installed on local machine.
- If adding new Capacitor plugins, run `npm run cap:sync` after installation.
