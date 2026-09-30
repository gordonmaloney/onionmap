# OnionMap

OnionMap is a private, single-user organising workspace. The React/Vite frontend and Express API deploy together on Vercel; MongoDB Atlas stores one canonical workspace document.

## Local development

Copy `.env.example` to `.env.local` and fill in a MongoDB connection string, a password hash, and a random session secret. Generate the password hash without placing the password in source control:

```sh
node -e "import('./server/auth.js').then(async ({hashPassword}) => console.log(await hashPassword(process.argv[1])))" 'your-long-passphrase'
```

Run the API and frontend in separate terminals:

```sh
npm run server
npm run dev
```

Vite proxies `/api` to `http://localhost:3001`. The production application uses only same-origin API requests.

## Checks

```sh
npm test
npm run lint
npm run build
```

## Production configuration

The Vercel project needs these server-only environment variables:

- `MONGODB_URI`
- `MONGODB_DBNAME=onionmap`
- `ONIONMAP_PASSWORD_HASH`
- `ONIONMAP_SESSION_SECRET`

`vercel.json` sends API routes to one Node function, serves the Vite SPA for all other routes, and places the function in London. Secrets must never use a `VITE_` prefix.

MongoDB is authoritative. `onionmap.workspace.cache.v1` in browser storage is an offline recovery journal; revision checks prevent it from silently overwriting newer server data. Whole-workspace JSON export is the portable backup path.
