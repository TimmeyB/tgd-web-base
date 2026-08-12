# TaskGrind — Brand App

A standalone Next.js app for brands to sign up, log in, and launch campaigns.
Fully separate from the Telegram bot — different codebase, different database.
Nothing here touches the bot or its data.

## 1. Set up Neon

1. Go to https://neon.tech, sign up (free), create a new project — name it
   something like `taskgrind-app`.
2. In the project dashboard, find **Connection Details** and copy the
   **pooled connection string** (hostname contains `-pooler`).
3. In the Neon SQL Editor (or via `psql` if you have it), run everything in
   `schema.sql` from this repo to create the `brands` and `campaigns` tables.

## 2. Local setup

```bash
npm install
cp .env.example .env.local
# paste your Neon connection string into DATABASE_URL in .env.local
# generate a random JWT_SECRET, e.g.: openssl rand -base64 32
npm run dev
```

Visit http://localhost:3000 — it should redirect you to `/login`.

## 3. Deploy to Vercel

1. Push this folder to a new GitHub repo.
2. Go to https://vercel.com, import that repo.
3. In the Vercel project's Environment Variables settings, add:
   - `DATABASE_URL` — same Neon pooled connection string
   - `JWT_SECRET` — same secret you generated locally
4. Deploy. Vercel handles the rest.

## What's here

- `/signup`, `/login` — brand auth, real bcrypt-hashed passwords
- `/dashboard` — lists the logged-in brand's campaigns
- `/dashboard/new-campaign` — form to launch a new campaign
- Session handled via a signed JWT in an httpOnly cookie (see `lib/auth.js`)
- `middleware.js` protects everything under `/dashboard` — no valid session,
  no access, redirected to `/login`

## What's NOT here yet (on purpose)

- No connection to the Telegram bot or its SQLite data — this is an isolated
  proof-of-concept per the plan: prove the app works standalone first, wire
  it up to the bot's real data later once it's validated.
- No payments/credit system for campaign funding.
- No password reset flow yet.
