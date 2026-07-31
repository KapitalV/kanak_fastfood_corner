# AGENTS.md

## Project
Next.js 16 + TypeScript + Tailwind v4 + Supabase + TanStack Query.
Food ordering app "Kanak Foods". Roles: customer, store, delivery, admin.

## Architecture (do not reorganize)
- repositories/ : Supabase queries ONLY
- services/     : business rules, totals, authorization decisions
- app/api/      : server-only secrets and external integrations
- types/database.ts (rows) | types/domain.ts (joined) | types/api.ts (contracts)
- utils/validation.ts : Zod schemas

## Hard rules
1. Server is the source of truth for money. Never trust a client total.
2. RAZORPAY_KEY_SECRET and SUPABASE_SERVICE_ROLE_KEY are server-only. Never NEXT_PUBLIC_.
3. Schema changes = new numbered file in supabase/migrations/. Never edit an applied one.
4. Every mutation: authenticate server-side, authorize by resource ownership.
   Never trust a role from a browser form.
5. Zod-validate all API input. Safe errors out, detailed logs server-side, no secrets logged.
6. Extend existing code. Do not rewrite working features.

## Verify before you report done
npx tsc --noEmit
npm run lint
npm run build

## Behavior
- Ask before making an unspecified product decision. Do not guess.
- Never deploy. Never touch production data.
- If the build fails and 2 fix attempts don't work, stop and report.