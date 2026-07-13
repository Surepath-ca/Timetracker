# SurePath Time Tracker

An internal time-tracking web application for **SurePath Valuation & Advisory**. It lets
employees log time against client engagements (Clockify-style weekly grid), captures a
work comment on every entry, and lets project owners extract Excel time reports and
generate invoices for the time charged.

Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, Prisma + SQLite, and
ExcelJS. Styled in SurePath's navy-and-gold brand palette.

## Features

- **Secure access, SurePath employees only** — sign-in is restricted to email addresses on
  the `surepathvaluation.ca` domain. Authentication is passwordless: a 6-digit one-time
  passcode (OTP) is emailed to the user, who enters it to receive a signed session cookie.
- **Projects with members and owners** — any user can create a project (an "engagement")
  and designate the owner. Owners manage the member list and project settings. **Only
  members of a project can log time to it.**
- **Weekly time tracker** — a Monday–Sunday grid (like Clockify's tracker). Click any cell
  to add time; durations accept `1:30`, `1.5` (hours), `90m`, or `2h 15m`. Every entry
  carries a free-text **comment** describing the work done. Entries are editable and
  deletable.
- **Owner reports** — the project owner picks a date range and gets a report of all time
  charged, broken down per member and per entry, **with the comments**.
- **Excel export** — the report downloads as a formatted `.xlsx` workbook (detail sheet +
  per-member summary sheet).
- **Invoice generation** — from any report the owner can generate an Excel invoice,
  supplying hourly rates (a default plus optional per-member overrides), tax, currency,
  bill-to details, and notes. The time detail with comments is attached as an appendix.

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example env file and fill in the values:

```bash
cp .env.example .env
```

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLite connection string (default `file:./dev.db`). |
| `SESSION_SECRET` | **Required in production.** A long random string used to sign session JWTs. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `ALLOWED_EMAIL_DOMAINS` | Comma-separated list of permitted email domains. Defaults to `surepathvaluation.ca`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | SMTP server used to email OTP codes. **If `SMTP_HOST` is unset (local dev), OTP codes are printed to the server console instead of emailed.** |

### 3. Set up the database

```bash
npx prisma migrate deploy   # apply migrations
# (for a fresh dev database: npx prisma migrate dev)
```

### 4. Run

```bash
npm run dev      # development, http://localhost:3000
# or
npm run build && npm run start   # production
```

## How authentication works

1. User enters their work email. If the domain isn't allowed, sign-in is refused.
2. A 6-digit OTP is generated, hashed (SHA-256), and stored with a 10-minute expiry.
   The plaintext code is emailed (or logged to the console in dev).
3. User submits the code. On match, the OTP is consumed, a `User` record is upserted, and
   a signed, HTTP-only session cookie (JWT, 7-day expiry) is issued.
4. `src/middleware.ts` verifies the session cookie on every non-public route and redirects
   unauthenticated users to `/login` (API routes get `401`).

Throttling: at most 3 active codes per email in the window, and 5 verification attempts
per code.

## Roles & permissions

| Action | Member | Owner |
| --- | --- | --- |
| Log / edit / delete **own** time on the project | ✅ | ✅ |
| View other members' time | ❌ | ✅ (via reports) |
| Add / remove members, change roles | ❌ | ✅ |
| Edit / delete / archive the project | ❌ | ✅ |
| Run reports, export Excel, generate invoices | ❌ | ✅ |

A project always keeps at least one owner.

## Project structure

```
src/
  app/
    login/                     # OTP sign-in page (public)
    (app)/                     # authenticated shell (sidebar layout)
      tracker/                 # weekly time grid
      projects/                # project list + [id] detail (members, settings)
      reports/                 # owner reports, Excel export, invoice generator
    api/
      auth/                    # request-otp, verify-otp, logout
      projects/                # project + member CRUD
      entries/                 # time-entry CRUD
      reports/[projectId]/     # report JSON, /excel, /invoice
  lib/                         # db, auth, mail, time, reports, projects helpers
  components/                  # Logo, NavLinks, LogoutButton
  middleware.ts                # route protection
prisma/schema.prisma           # data model
```

## Notes

- SQLite keeps deployment simple; to move to Postgres, change the `datasource` provider in
  `prisma/schema.prisma` and `DATABASE_URL`, then re-run migrations.
- Excel files are generated server-side with ExcelJS and streamed as downloads; nothing is
  persisted to disk.
