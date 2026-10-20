# LinkForge

LinkForge is a URL shortener with a React interface and an Express API. A user submits a URL, receives a short link, and can view the links created by the service and their click counts.

## Project layout

```text
client/   React app built with Vite
server/   Express API and JSON-backed link storage
tests/    Node.js API contract tests
```

## Requirements and setup

Use Node.js 20 or newer with npm. From the repository root, install all workspace dependencies:

```sh
npm install
```

Start both the API and Vite development server from the root:

```sh
npm run dev
```

To work on either app separately, run `npm run dev --workspace @linkforge/server` or `npm run dev --workspace linkforge-client` from the repository root. Build the frontend with `npm run build` or `npm run build --workspace linkforge-client`, both from the root. Run the backend in production mode with `npm start` from the root.

## API

The API listens on port `3001` by default. The Vite development server proxies `/api` and `/r` requests to it.

- `GET /api/health` returns `{ "status": "ok" }`.
- `GET /api/links` returns `{ "links": [...] }`.
- `POST /api/links` accepts `{ "url": "https://example.com" }` and returns `201` with `{ "link": ... }`.
- `GET /r/:code` redirects to the saved destination with HTTP `302` and increments its click count.

Each link has `code`, `shortUrl`, `originalUrl`, `createdAt`, and `clicks` fields. Invalid URLs and unknown codes return client errors rather than creating or redirecting a link.

## Tests

Run the API contract suite from the repository root:

```sh
npm test
```

Tests use Node's built-in test runner and start the Express app on an ephemeral local port. They isolate persisted data in a temporary directory; no external service is required.

## Configuration

The server supports `PORT` to choose its listening port, `BASE_URL` to override the short-link origin, and `DATA_FILE` to select the JSON storage file. Keep local configuration and generated data out of version control; never commit secrets.
