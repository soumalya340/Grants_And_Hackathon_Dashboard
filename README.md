# Orbit

A personal React dashboard for tracking grants, hackathons, and bounties.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To check a production build, run `npm run build`.

## Connect Neon

1. In Vercel Storage, open your Neon database in the Neon Console. Run [db/schema.sql](db/schema.sql) in the SQL Editor. This creates the `opportunities` table used by Orbit. The `comments` table in the Neon tutorial is only an example and does not match this dashboard's data.
2. Set `DATABASE_URL` and `ORBIT_API_KEY` in Vercel's project environment variables. Use a long random value for `ORBIT_API_KEY`. Do not prefix either name with `VITE_`; both must stay on the server.
3. For local development, copy `.env.example` to `.env.local` and put your real values there. `.env.local` is gitignored. Restart `npm run dev` after changing it.
4. Click **Connect Neon** in the dashboard and enter the same `ORBIT_API_KEY`. Orbit keeps this key in the current browser tab's session storage and uses it to read and write opportunities. Without connecting, the dashboard still uses browser storage.

The Vercel Function at `/api/opportunities` supports `GET`, `POST`, `PUT ?id=...`, and `DELETE ?id=...`. Every request requires `Authorization: Bearer <ORBIT_API_KEY>`. A Grok bot or other agent can add an opportunity with:

```bash
curl -X POST https://your-site.example/api/opportunities \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ORBIT_API_KEY' \
  -d '{"title":"Builder Grant","organization":"Example Foundation","kind":"grant","deadline":"2026-12-15","url":"https://example.org/grant","tags":["open source"]}'
```

`title`, `organization`, `kind`, and `deadline` are required. `kind` is `grant`, `hackathon`, or `bounty`. `status` defaults to `saved`; `reward`, `url`, `description`, and `tags` are optional. The dashboard and agents share the same database after the dashboard is connected. Existing browser-only entries are not automatically migrated; export them before switching if you need a backup.

## Using the dashboard

- Add opportunities with a deadline, status, reward, link, tags, and notes.
- Browse by type, search, filter by status, and review upcoming deadlines.
- Update status directly on a card; use the edit and delete controls to manage entries.
- Export entries as JSON with the download button in the header.

Entries are saved in your browser's local storage until you connect Neon. The six initial entries are fictional examples; use **Remove examples** on the overview to clear them. There is no account or live opportunity feed yet.
