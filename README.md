# React Auth Dashboard (React + Vite + Tailwind + Capacitor 7)

Production-style React app with authentication, protected routing, responsive mobile UX, analytics charts, and Capacitor Android integration.

## Features

- Secure API-owned auth with HttpOnly cookies and a cross-site bearer-token fallback
- Axios setup with credential and bearer-token handling
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
- `npm run dev:remote-api` - start only Vite and proxy `/api` to `VITE_API_PROXY_TARGET`
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

## Separate Hostinger Deployments

Deploy the frontend and backend independently. The frontend is a static Vite build; the backend is a Hostinger Node.js Web App. They communicate over HTTPS through the backend's public API domain.

### Current frontend: `connectedarchdemo.digital/meetv1`

1. Build against the deployed API:

```bash
VITE_API_BASE_URL=https://mobile.devapihub.cloud/vzom/api npm run build
```

2. Upload the contents of `dist/` to `public_html/meetv1/`.
3. Keep the generated `dist/.htaccess`; it enables React Router refreshes under `/meetv1/`.
4. Hard-refresh or use an incognito window after deployment to avoid an old cached asset bundle.

The included `.htaccess` adds SPA fallback, HTTPS/HSTS, CSP, frame protection, MIME protection, and camera/microphone permissions. If the API host changes, add the new HTTPS API origin to its `connect-src` directive before rebuilding.

### Current backend: `mobile.devapihub.cloud/vzom`

1. Create a Hostinger Node.js Web App for the API path or subdomain.
2. Upload the contents of `backend/` so `package.json`, `.env`, and `src/` sit directly inside Hostinger's `nodejs/` directory.
3. Set Start command to `npm start` and Node version to `22.x`.
4. Add the following environment variables in Hostinger's Environment variables panel:

```env
NODE_ENV=production
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=at-least-32-random-characters
CLIENT_ORIGIN=https://connectedarchdemo.digital,capacitor://localhost,http://localhost
APP_URL=https://connectedarchdemo.digital/meetv1
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@your-domain.com
SMTP_PASS=your-mailbox-password
MAIL_FROM="React Meet <no-reply@your-domain.com>"
```

Do not add `PORT`; Hostinger supplies it. After deployment, verify `https://mobile.devapihub.cloud/vzom/api/health`, then open `https://connectedarchdemo.digital/meetv1/`.

### Cross-site authentication

The deployed frontend and API use different parent domains. Some browsers block their cross-site HttpOnly cookie, even with `SameSite=None; Secure`. To remain compatible, successful login returns a short-lived bearer token that the frontend keeps in `sessionStorage` for the current browser tab and sends in the `Authorization` header. The API continues to prefer the HttpOnly cookie when it is available.

- Browser sessions use tab-scoped storage only; closing the tab clears the fallback token.
- Capacitor apps should persist the token with native secure storage, not browser storage.
- Keep `CLIENT_ORIGIN` limited to deployed web and native origins. Put Vite localhost origins only in a development/staging API environment.
- The strongest long-term browser setup is `https://api.connectedarchdemo.digital`, which makes the API same-site with the frontend and avoids third-party-cookie restrictions.

### WebRTC signaling

Meeting signaling is handled by the application's authenticated WebSocket endpoint rather than public relay services. The frontend connects to `/ws/meetings` beside the configured API base, and the API permits only admitted participants to join a signaling room. Hostinger must support WebSocket upgrades for the Node.js Web App. For dependable meetings across corporate networks and mobile carriers, configure a TURN service using `VITE_ICE_SERVERS` before building.

### WebRTC + permission requirements in production

- HTTPS is required for camera/microphone access (except localhost).
- Enable SSL on Hostinger before testing meeting calls.
- Users must allow camera and microphone permissions for your domain.

### Troubleshooting

- If the backend returns `503`, confirm its deployed root is `backend`, its start command is `npm start`, and no `PORT` variable is overriding the hosting platform's assigned port.
- If login succeeds but `/api/auth/me` returns `401`, inspect the API request logs. `hasSessionCookie: false` and `hasBearerToken: true` means the cross-site fallback is working; both false means the frontend was not rebuilt with the latest bearer-token support.
- If meeting join hangs on permission request: check browser site permissions and reload.
