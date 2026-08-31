# React Meet API

This directory is a standalone Express API deployment. The Vite frontend is deployed separately and calls this service over HTTPS. Hostinger runs `src/server.js`; `package.json` and `.env` remain at this deployment root. DummyJSON is used only once to seed ten local demo accounts; the server owns all later authentication, registration, email verification, and password resets.

## Local setup

1. Copy `backend/.env.example` to `backend/.env` and set a private `JWT_SECRET`, `MONGODB_URI`, and Hostinger SMTP credentials.
2. Start MongoDB.
3. From the repository root, run `npm run migrate:auth` once for an existing database created by the previous backend.
4. Run `npm run seed:users` to import ten DummyJSON demo users with bcrypt password hashes.
5. Run `npm run dev` to start the API and Vite client together.

The client proxy forwards `/api` to `http://localhost:8011` during local development. `npm run dev` prefixes logs with `[server]` and `[client]`; it waits for the API health endpoint before starting Vite.

## Production deployment

Deploy this `backend/` directory as a Hostinger Node.js Web App.

1. Upload the contents of `backend/` so `package.json`, `.env`, and `src/` are directly inside Hostinger's `nodejs/` directory.
2. Start command: `npm start` (runs `node src/server.js`).
3. Add the server variables from `.env.example` in Hostinger's environment-variable panel.
4. Remove `PORT=8011` from the deployed `.env` and do not set `PORT` in Hostinger. The API uses Hostinger's `PORT` when provided, otherwise defaults to production port `3000`.

Set `NODE_ENV=production`, `COOKIE_SECURE=true`, `COOKIE_SAME_SITE=none`, `CLIENT_ORIGIN=https://your-frontend-domain.com`, and `APP_URL=https://your-frontend-domain.com/meetv1`. Build the frontend with `VITE_API_BASE_URL=https://your-api-domain.com/api`.

For a cross-site web API, login also returns a tab-scoped bearer token because some browsers block third-party cookies. The frontend sends it in the `Authorization` header. Treat this as a compatibility fallback: an API subdomain such as `api.your-frontend-domain.com` with the HttpOnly cookie is the safer browser deployment. For Capacitor, store the bearer token with a native secure-storage plugin, not browser storage. Keep `CLIENT_ORIGIN` minimal in production; place `http://localhost:5173` only in a development or staging API environment.

For a non-sensitive API check, open `/` , `/api`, or `/api/health` on the API domain.

Seeded demo accounts preserve the published DummyJSON credentials, for example `emilys` / `emilyspass`. They are development-only accounts; no plaintext password is persisted.

## Audit data

Audit events include the authenticated actor, target user, event type, server-observed IP address, user agent, and timestamp. Apply a documented retention policy and privacy notice before collecting this data from real users.

## Meeting signaling

WebRTC offer, answer, and ICE messages use the API application's authenticated WebSocket endpoint at `/ws/meetings`; media remains peer-to-peer. The server admits only the host or a participant already marked `admitted` for the meeting. This replaces the public Nostr relay transport and requires the hosting proxy to support WebSocket upgrades. Configure a TURN server through the frontend's `VITE_ICE_SERVERS` JSON value for reliable calls across restrictive networks.
