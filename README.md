# Happy First Club — Frontend

Next.js 16 app for Happy First Club: auth, activity tracking, weekly plans, community, and referrals.

## Tech stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- Zustand (state), Axios (API), TanStack Query

## Setup

```bash
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

```bash
npm run dev    # http://localhost:3000
npm run build  # production build
npm start      # run production build
```

## Project structure

```
happy-first-frontend/
├── app/                      # Routes (App Router)
│   ├── login/
│   ├── register/
│   ├── verify-otp/
│   ├── profile-setup/        # Onboarding wizard
│   ├── home/
│   ├── tasks/
│   ├── create-plan/
│   ├── community/
│   ├── referral/
│   ├── settings/             # Account hub (family, profile, reminders, security, support)
│   └── ...
├── components/
│   ├── layout/               # MainLayout, BottomNav, AuthShell
│   ├── ui/                   # Shared UI primitives
│   ├── settings/             # Inline settings forms
│   └── leaderboard/
├── lib/
│   ├── api/                  # API client modules
│   ├── queries/              # TanStack Query hooks
│   ├── store/                # Zustand stores
│   └── utils/                # Helpers (reminder schedule, tours)
├── public/
├── middleware.ts             # Auth route protection
└── next.config.ts            # Redirects for legacy routes
```

## Main routes

| Route | Purpose |
|-------|---------|
| `/register` | Phone registration |
| `/verify-otp` | OTP verification |
| `/login` | Login |
| `/profile-setup` | Onboarding wizard |
| `/home` | Dashboard |
| `/tasks` | Daily activity logging |
| `/create-plan` | Weekly plan builder |
| `/community` | Communities |
| `/referral` | Referral program |
| `/settings` | User settings (collapsible panels) |
| `/activity-photos` | Activity photo gallery (WhatsApp deep link) |

Legacy URLs (`/change-password`, `/support`, `/add-family-member`) redirect to `/settings` panels.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Vercel and other hosting options.
