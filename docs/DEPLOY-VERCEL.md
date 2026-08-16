# Deploying Gmora STEM to Vercel

This branch (`deploy/vercel`) carries everything Vercel needs. `main` stays
clean — nothing here changes how the app runs locally.

---

## Read this first

Vercel runs PHP as a **serverless function** with a **read-only filesystem**
apart from `/tmp`, which is wiped between invocations. That is a real mismatch
with a Laravel app that stores files and runs a queue. Three consequences you
have to design around, not around which there is any config flag:

| What | Why it breaks | What this branch does |
|---|---|---|
| Certificates, lesson PDFs, presentation bundles, cover images | Written to local disk; the disk disappears after the request | Disks are switchable to S3/R2 via env |
| Queued jobs (9 dispatch sites) | No long-running worker process exists | `QUEUE_CONNECTION=sync` — jobs run inside the request |
| Scheduled task (`PurgeExpiredVideoTokens`, hourly) | No cron process | Use a Vercel Cron hitting a route, or run it elsewhere |

**Presentation uploads will still not work on Vercel** even with S3.
`PresentationService` unzips to a local temp directory and serves extracted
files; that logic needs rewriting for object storage. Everything else works
once storage is pointed at a bucket.

If you would rather not deal with any of this, a host that runs Laravel as a
normal long-lived process — Laravel Cloud, Forge, Railway, Render, Fly.io —
needs no code changes at all and keeps the queue, scheduler and local disk.
Vercel is the harder path, and it is the one set up below.

---

## What is on this branch

| File | Purpose |
|---|---|
| `api/index.php` | Serverless entrypoint; redirects Laravel's writable paths to `/tmp` |
| `vercel.json` | Runtime (`vercel-php@0.9.0`), build command, static-asset routing |
| `.vercelignore` | Keeps tests, CI and node_modules out of the bundle |
| `bootstrap/app.php` | Honours `LARAVEL_STORAGE_PATH` (no-op when unset) |
| `config/filesystems.php` | Adds the missing `private` disk; both disks can switch to S3 |

---

## 1. Object storage

Create a bucket on Cloudflare R2 or AWS S3. R2 has no egress fees, which suits
video-adjacent content.

Two buckets is cleanest: one public (course covers), one private (certificates,
lesson PDFs). One bucket works if you prefer — leave `AWS_PRIVATE_BUCKET` unset
and it falls back to `AWS_BUCKET`.

## 2. Database

Your Neon Postgres already works. Vercel's functions are in a fixed region —
put them in the region closest to your Neon instance (`us-east-2` today), or
you pay the round trip on every query. Set the region in Vercel's project
settings under **Functions**.

Sessions and cache **must** be `database` on Vercel. File drivers write to
`/tmp` and vanish between requests, which logs users out at random.

## 3. Environment variables

Set these in Vercel → Project → Settings → Environment Variables.

```
APP_NAME=Gmora STEM
APP_ENV=production
APP_KEY=                      # php artisan key:generate --show
APP_DEBUG=false
APP_URL=https://your-domain.vercel.app

LOG_CHANNEL=stderr            # the only log destination that survives

DB_CONNECTION=pgsql
DB_URL=                       # your Neon pooled connection string

SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=sync

FILESYSTEM_DISK=s3
PRIVATE_FILESYSTEM_DRIVER=s3
PUBLIC_FILESYSTEM_DRIVER=s3
PUBLIC_FILESYSTEM_URL=https://<your-public-bucket-url>

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=auto       # 'auto' for R2; the real region for S3
AWS_BUCKET=
AWS_PRIVATE_BUCKET=
AWS_ENDPOINT=                 # R2: https://<account>.r2.cloudflarestorage.com
AWS_USE_PATH_STYLE_ENDPOINT=false
```

Generate the key locally and paste the value — do not commit it:

```bash
php artisan key:generate --show
```

## 4. Migrations

Vercel has no release phase, so migrations do **not** run on deploy. Run them
yourself against the production database before the first deploy and after any
schema change:

```bash
DB_URL='<production connection string>' php artisan migrate --force
```

Seeding is a one-off for the first deploy:

```bash
DB_URL='<production connection string>' php artisan db:seed --force
```

Change the seeded admin password immediately — `DatabaseSeeder` uses
`password`.

## 5. Deploy

```bash
git push origin deploy/vercel
```

Then in Vercel: **Add New → Project → import the repository**, and set
**Production Branch** to `deploy/vercel` under Settings → Git. Leave the build
settings alone; `vercel.json` provides them.

To ship changes:

```bash
git checkout deploy/vercel
git merge main          # bring in the work from main
git push origin deploy/vercel
```

## 6. The scheduled job

`PurgeExpiredVideoTokens` runs hourly via Laravel's scheduler, which needs a
cron process Vercel does not have. Either add a Vercel Cron in `vercel.json`
pointing at a route that runs the job, or run `php artisan schedule:run` from
any machine that already has the production env.

---

## After the first deploy, check these

The parts most likely to break are the ones that touch the filesystem or the
session:

- [ ] Sign in, reload twice — you stay signed in (sessions are in Postgres)
- [ ] Sign in as an admin — the 2FA challenge completes
- [ ] Upload a course cover image, then reload the course page — it still shows
- [ ] Complete a course and download the certificate PDF
- [ ] Open a PDF lesson
- [ ] A video lesson plays and the watermark shows
- [ ] `/up` returns 200
