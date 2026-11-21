# Working on this project

@AGENTS.md

## About me

- I'm a beginner-to-intermediate coder. **Explain every change in plain language**: what changed, why, and anything I need to do.
- Prefer **boring, well-known solutions** over clever or new ones. Use what Next.js, React and Tailwind already provide before reaching for anything else.

## Rules

1. **Never commit secrets.** Put them in `.env.local` (ignored by Git) and in Vercel → Settings → Environment Variables. Add the key name (no value) to `.env.example`. Never put a secret in a `NEXT_PUBLIC_` variable.
2. **Ask before adding a dependency** and say why it's needed, what it does, and what the no-dependency alternative would be.
3. **One feature per pull request.** Keep PRs small and focused.
4. **Before finishing, run all checks** and make sure they pass:
   ```bash
   npm run lint && npm run typecheck && npm run test && npm run build
   ```
   (Shortcut: `npm run check`.) If something fails, fix it or tell me clearly.
5. **Mobile-first.** Design for the phone first, then larger screens. Test at **390px wide** (iPhone size). Respect safe areas (notch, home indicator) and light/dark mode.
6. **Supabase:** every table has **Row Level Security turned on** with **explicit policies** for each action (select, insert, update, delete). No table without RLS, ever. Never use the service-role key in browser code.
7. **Always commit and push before ending a session.** Work that isn't pushed can be lost.

## Project facts

- App name and colours: `src/config/site.ts` (single source of truth).
- Tests sit next to the code they test: `something.test.tsx`.
- Node version: `.nvmrc`. CI: `.github/workflows/ci.yml`.
