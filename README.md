# TAG Information Systems Portal

Centralized enterprise portal for TAG Corporation — one login for every internal
application (BOM Checker, TAG-MPS, TAG-Patrolling, TAG-VLRP, TAG-AI Query, ERP, BI…),
with department-based access control, Face Unlock sign-in and email notifications.

## Quick start

```bash
npm install
npm run dev        # API on :4100 + Vite dev server on :5173
```

Open http://localhost:5173

### Default accounts (seeded on first run)

| Username     | Password    | Role        | Department |
|--------------|-------------|-------------|------------|
| `superadmin` | `admin123`  | Super Admin | IT         |
| `itadmin`    | `it123`     | Admin       | IT         |
| `erpmgr`     | `erp123`    | User        | ERP        |
| `designer`   | `design123` | User        | Design     |

> Change these passwords immediately (Profile → Change password), or manage
> accounts from Admin Console → Users & Access.

## Features

- **User login** — username/password (bcrypt) with 12-hour JWT sessions
- **Face Unlock** — enroll from Profile (3-sample webcam scan, stored as a
  128-number signature, no photos kept); then sign in hands-free.
  Runs fully on-premise — models are served from `client/public/models`.
- **Role-based access** — `user` / `admin` / `superadmin`
- **Department-based app visibility** — users only see apps assigned to their
  department (or "All"); admins see everything
- **Admin Console** — add / edit / delete apps (icon + color picker, department
  targeting), manage users, test mail
- **Email notifications** — welcome mail with credentials on account creation,
  new-app announcements to affected departments (needs SMTP in `.env`)
- **Dark / light theme**, live clock, search & department filters

## Configuration

Copy `.env.example` to `.env` and fill in:

- `JWT_SECRET` — long random string (required for production)
- `API_PORT` — API port (default 4100; 4000 is used by TAG-MPS)
- SMTP settings — leave blank to run without email

## Production

```bash
npm run build      # builds client to dist/
npm start          # serves API + built client on API_PORT
```

Face Unlock requires HTTPS (or localhost) — browsers block camera access on
plain http:// from other machines.

## Deployment (Dokploy — portal.tagcorporation.cloud)

The repo ships a `Dockerfile`; in Dokploy:

1. **Create Application** → Source: GitHub → repo `karthiktagcorporation/TAG-Portal`, branch `main`, Build Type **Dockerfile**
2. **Environment** tab:
   ```
   JWT_SECRET=<long random string — required>
   PORTAL_URL=https://portal.tagcorporation.cloud
   SMTP_HOST=... SMTP_PORT=587 SMTP_USER=... SMTP_PASS=...   (optional)
   ```
3. **Advanced → Volume Mounts**: add a volume mounted at `/app/data`
   (persists the SQLite database across deployments — without this, users
   and apps reset on every deploy!)
4. **Domains** tab: `portal.tagcorporation.cloud`, container port **4100**,
   HTTPS on (Let's Encrypt) — HTTPS also unlocks camera access for Face Unlock
5. Deploy. Auto-deploy on push can be enabled in the app's settings.

## Storage

SQLite database at `data/portal.db` (created automatically, WAL mode).
Back it up by copying the file.
