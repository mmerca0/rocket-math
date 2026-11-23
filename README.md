# Math Rocket

A space math game for kids. A problem appears at the bottom; asteroids carrying answers drift down. Tap the right one to blast it. Wrong taps and missed right answers cost a shield (three per round).

- **12 steps:** add/subtract within 10 → 20 → two-digit (without, then with regrouping) → times tables → division facts → 9a/9b multi-digit multiplication → 10a/10b long division.
- **Levels 9a–10b** use a "boss asteroid" and a big number pad instead, because picking from close numbers is not a fair test at that level. 5 problems per round, no clock, very slow fall, so there's time for paper.
- **Move up** after a round with ≥ 80% accuracy, at least 8 problems answered (5 in boss rounds) and a shield left. Never moves back down. Any unlocked level can be replayed.
- **Saved on the device first** (localStorage): pilots (name only), unlocked levels and the top 10 scores per level. The game never waits for the network.
- **Optional family leaderboard:** enter a family code once per device and pilots + high scores sync across all your devices (via Supabase). Offline or wrong code? The game keeps working with local scores and syncs later. See [Family leaderboard setup](#family-leaderboard-setup).

**Tip for iPad/iPhone:** open the site in Safari → Share → **Add to Home Screen**, and play from that icon. Safari may clear saved data for websites you haven't opened in 7 days. Home Screen apps are exempt from that rule.

### Where things live

| What                                                        | File                   |
| ----------------------------------------------------------- | ---------------------- |
| Levels, fall speeds, round length                           | `src/game/levels.ts`   |
| Problem generator + plausible wrong answers                 | `src/game/problems.ts` |
| Points, accuracy, "move up?" rule                           | `src/game/scoring.ts`  |
| Round rules (taps, shields, clock)                          | `src/game/round.ts`    |
| Saving players and high scores                              | `src/game/storage.ts`  |
| Merging device data with the leaderboard                    | `src/game/sync.ts`     |
| Browser → API calls (never blocks play)                     | `src/lib/sync.ts`      |
| API routes (`/api/sync`, `/api/leaderboard`, `/api/health`) | `src/app/api/`         |
| Server-only Supabase code                                   | `src/server/`          |
| Database tables                                             | `supabase/migrations/` |
| Screens                                                     | `src/components/`      |
| Sound effects (generated in code)                           | `src/lib/sound.ts`     |

Too fast or too slow for your kid? Change `fallSeconds` in `src/game/levels.ts`.

## Local development

Run the game on your Mac while you work on it. First time on a new computer? Do [New machine setup](#new-machine-setup) first.

1. **Open Terminal in the project folder:**
   ```bash
   cd ~/code/rocket-math
   ```
   [fnm](https://github.com/Schniz/fnm) switches to the right Node version automatically as soon as you enter the folder (it reads `.nvmrc`), so there's nothing else to type. Check with `node -v`; it should start with `v26`.
2. **Install the packages** (first time, and again whenever `package.json` changes, e.g. after pulling a Dependabot update):
   ```bash
   npm install
   ```
3. **Start the game:**
   ```bash
   npm run dev
   ```
4. **Open [http://localhost:3000](http://localhost:3000)** in your browser. Save a file and the page updates by itself. Press **Ctrl + C** in Terminal to stop the server.

**The leaderboard runs in offline mode locally.** The Supabase keys (`SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `FAMILY_CODE`) are stored only in Vercel, not on your Mac. Without them, the `/api/...` routes answer `not-configured`, and the game acts as it does with no internet: you can play normally, and pilots and scores are saved in this browser only. If you type a family code, it shows as offline. That's expected. You'll see the same thing at [http://localhost:3000/api/health](http://localhost:3000/api/health): `{"ok":false,"error":"not-configured"}`. To test the real leaderboard locally, see step 6 of [Family leaderboard setup](#family-leaderboard-setup). Usually it's easier to test it on the Vercel preview URL that every pull request gets.

**Before you open a pull request, run all the checks:**

```bash
npm run check
```

It runs four checks in a row and stops at the first one that fails:

| Step                | What it checks                                     |
| ------------------- | -------------------------------------------------- |
| `npm run lint`      | Code mistakes (ESLint) and formatting (Prettier)   |
| `npm run typecheck` | TypeScript types                                   |
| `npm run test`      | The Vitest tests (`*.test.ts(x)` next to the code) |
| `npm run build`     | The production build works, just like Vercel's     |

If only formatting fails, `npm run format` fixes it for you. GitHub runs the same checks on every pull request.

## Family leaderboard setup

**How it works:** the browser only ever talks to this app's own server routes (`/api/...`). Those routes check the family code and then talk to Supabase with a secret key that never leaves the server. The database tables have Row Level Security on with no policies, so Supabase's public key can't read or write them at all.

```
iPad / phone ──(family code)──▶ Next.js /api/* on Vercel ──(secret key)──▶ Supabase
```

Tables are prefixed `math_`, so other apps can share the same Supabase project.

1. **Create (or reuse) a Supabase project** at [supabase.com](https://supabase.com). The free plan is fine.
2. **Create the tables.** Supabase → **SQL Editor** → **New query** → paste all of each file in [`supabase/migrations/`](supabase/migrations/), **oldest first** (the filename starts with the date), and **Run** each one:
   1. [`20261122000000_math_leaderboard.sql`](supabase/migrations/20261122000000_math_leaderboard.sql) — creates the tables and turns on Row Level Security.
   2. [`20261122010000_math_grants.sql`](supabase/migrations/20261122010000_math_grants.sql) — lets the server's secret key use the tables. Skip it and the server gets `42501 permission denied for table math_pilots`.

   Every file is safe to run again.

3. **Copy two values** from Supabase → **Project Settings**:
   - **Data API** → Project URL → this is `SUPABASE_URL`.
   - **API Keys** → **Secret keys** → create or reveal one (starts with `sb_secret_`) → this is `SUPABASE_SECRET_KEY`. Treat it like a password.
4. **Pick a family code** — any phrase, e.g. three random words. This is `FAMILY_CODE`. Anyone with it can add scores, so don't post it publicly.
5. **Add all three to Vercel:** Project → **Settings → Environment Variables** → add `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `FAMILY_CODE` (no `NEXT_PUBLIC_` prefix!) → **Redeploy** so they take effect.
6. **Locally (optional):** `cp .env.example .env.local`, fill in the same three values, then `npm run dev`.
7. **Check it:** open `https://math.mikemercado.com/api/health` → should show `{"ok":true}`. `{"ok":false,"error":"not-configured"}` means an env var is missing; `database-unavailable` means the URL/key is wrong, the tables don't exist, or the project is paused.
8. **On each device:** open the game → type the family code in the "Share scores with your family?" card (or later: **🏆 High scores → Add family code**). Existing pilots and scores upload automatically; pilots from other devices appear.

**Keeping the free project awake:** Supabase pauses free projects after 7 days with no activity. [`.github/workflows/keep-alive.yml`](.github/workflows/keep-alive.yml) calls `/api/health` every day. You can run it by hand from GitHub → **Actions** → **Keep Supabase awake** → **Run workflow**. Note: GitHub turns off scheduled workflows in a repo with no commits for 60 days. If that happens, GitHub emails you; re-enable it on the Actions tab.

**Adding a new table**

Some Supabase projects don't give the API roles access to new tables automatically, and Row Level Security doesn't change that: RLS decides _which rows_ a role can see, while `GRANT` decides whether it can touch _the table at all_. So every new table needs both. In a **new** migration file (never edit one that's already been run), after `create table`:

```sql
alter table public.math_example enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.math_example to service_role;
grant usage, select on all sequences in schema public to service_role;

revoke all on table public.math_example from anon, authenticated;
```

Name it `supabase/migrations/YYYYMMDDHHMMSS_math_<what>.sql` so it sorts after the others, keep it safe to run twice (`if not exists`, `grant`, `revoke`), run it in the SQL Editor, and list it in step 2 above.

**Good to know**

- Pilots with the same name (ignoring capitals) on different devices become one pilot.
- Removing a pilot removes them from **this device** only. Their scores stay on the family leaderboard. To delete them everywhere, delete the row in Supabase → Table Editor → `math_pilots` (their scores go with it).
- Unlocked levels are still per device. A pilot downloaded to a new device starts at level 1.
- Changing the family code: 🏆 High scores → **Change family code**. Clearing the box turns sharing off on that device.

---

_Built from the app-template:_

A starter for personal web apps. Copy it, rename one line, deploy.

**What's inside**

- **Next.js 16** (App Router) + **TypeScript** (strict) + **Tailwind CSS 4**
- **Installable on iPhone** — web app manifest, auto-generated icon, iOS home-screen tags, safe-area padding for the notch and home indicator
- **Light and dark mode** that follows the phone's setting (no toggle, no JavaScript)
- **Quality checks** — ESLint, Prettier, Vitest (one example test), TypeScript
- **GitHub Actions** runs every check on each pull request and on pushes to `main`
- **Dependabot** opens two grouped update PRs a week: one for npm packages, one for GitHub Actions

The app's name lives in **one place**: [`src/config/site.ts`](src/config/site.ts). The page title, home-screen name, manifest and icon letter all read from it.

## Commands

| Command             | What it does                                          |
| ------------------- | ----------------------------------------------------- |
| `npm run dev`       | Start the app at http://localhost:3000                |
| `npm run lint`      | ESLint + Prettier formatting check                    |
| `npm run format`    | Auto-fix formatting                                   |
| `npm run typecheck` | TypeScript check                                      |
| `npm run test`      | Run tests once (`npm run test:watch` to keep running) |
| `npm run build`     | Production build                                      |
| `npm run check`     | All four checks in a row — run before every PR        |

## Start a new app from this template

- [ ] **Create the repo.** On GitHub, open this repo → **Use this template** → **Create a new repository**. (One-time: Settings → General → tick **Template repository**.)
- [ ] **Clone and install.**
  ```bash
  git clone https://github.com/<you>/<new-app>.git
  cd <new-app>     # fnm switches to the Node version in .nvmrc by itself
  npm install
  ```
- [ ] **Rename.** Change `name` in `src/config/site.ts`. Also change `"name"` in `package.json` (lowercase, dashes — e.g. `"habit-tracker"`).
- [ ] **(Optional) Pick colours.** `colors.accent` in `src/config/site.ts` sets the icon colour.
- [ ] **Run the checks.** `npm run check` — everything should pass.
- [ ] **Connect to Vercel.** [vercel.com/new](https://vercel.com/new) → **Import** the new repo → **Deploy**. No settings needed; Vercel detects Next.js. Every PR now gets a preview URL.
- [ ] **Add environment variables (if any).** Vercel → Project → **Settings → Environment Variables**. Locally: `cp .env.example .env.local` and fill it in.
- [ ] **Add a subdomain** (e.g. `habits.yourdomain.com`):
  1. Vercel → Project → **Settings → Domains** → **Add** → type `habits.yourdomain.com`.
  2. Vercel shows a DNS record. At your domain provider, add a **CNAME** record: name `habits`, value `cname.vercel-dns.com` (use whatever value Vercel shows — it's the source of truth).
  3. Wait a few minutes; Vercel shows a green tick and issues HTTPS automatically. If your domain's nameservers already point to Vercel, step 2 isn't needed.
- [ ] **Protect `main`.** GitHub → Settings → Branches → add a rule for `main`: require a pull request and require the **CI / check** status to pass.
- [ ] **Install on your iPhone.** Open the site in **Safari** → Share → **Add to Home Screen**.

## New machine setup

Do this once per computer. Node versions are managed by [fnm](https://github.com/Schniz/fnm). Each project's `.nvmrc` says which version it needs (Node 26, the current LTS), and fnm switches to it automatically whenever you `cd` into the folder. You never type a "use" command.

### Mac

```bash
# 1. Apple's command-line tools (includes Git)
xcode-select --install

# 2. Homebrew (package manager) — then follow the "Next steps" it prints
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 3. fnm (Node version manager) — switches Node automatically on cd
brew install fnm
cat >> ~/.zshrc <<'ZSH'
# fnm (Node version manager)
eval "$(fnm env --use-on-cd --version-file-strategy=recursive)"
ZSH
source ~/.zshrc

# 4. Node LTS + GitHub CLI
fnm install --lts
brew install gh
gh auth login

# 5. Git identity
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config --global init.defaultBranch main
git config --global core.autocrlf input

# 6. Get a project running
gh repo clone <you>/<repo>
cd <repo>          # fnm switches Node here; if it offers to install the version, answer y
npm install
npm run dev
```

### Windows (PowerShell)

```powershell
# 1. Git, fnm, GitHub CLI, VS Code (winget is built into Windows 10/11)
winget install --id Git.Git -e
winget install --id Schniz.fnm -e
winget install --id GitHub.cli -e
winget install --id Microsoft.VisualStudioCode -e

# 2. Close and reopen PowerShell, then make fnm switch Node automatically on cd:
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned   # lets PowerShell run your profile
if (-not (Test-Path $PROFILE)) { New-Item $PROFILE -Force }
Add-Content $PROFILE 'fnm env --use-on-cd --version-file-strategy=recursive --shell powershell | Out-String | Invoke-Expression'
. $PROFILE
fnm install --lts

# 3. Git identity and line endings
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config --global init.defaultBranch main
git config --global core.autocrlf false
gh auth login

# 4. Get a project running
gh repo clone <you>/<repo>
cd <repo>          # fnm switches Node here; if it offers to install the version, answer y
npm install
npm run dev
```

> **Why `core.autocrlf`?** Windows uses different line endings (CRLF) from Mac (LF). This repo's `.gitattributes` stores everything as LF, so all machines agree and diffs don't fill with invisible changes.

**Editor:** open the folder in VS Code and accept the recommended extensions (ESLint, Prettier, Tailwind). Format-on-save is already configured.

## Where things live

```
src/
  config/site.ts      ← app name and colours (rename here)
  app/
    layout.tsx        ← <head> tags, iOS meta, theme colour
    page.tsx          ← home page
    page.test.tsx     ← example test
    globals.css       ← Tailwind, light/dark colours, safe-area padding
    manifest.ts       ← web app manifest (/manifest.webmanifest)
    icon.tsx          ← browser + manifest icons (192, 512)
    apple-icon.tsx    ← iPhone home-screen icon (180)
  lib/app-icon.tsx    ← draws the icon (first letter on a coloured square)
```

To use a real icon instead, delete `icon.tsx` and `apple-icon.tsx` and drop `icon.png` (512×512) and `apple-icon.png` (180×180) into `src/app/`, then update the `icons` list in `manifest.ts`.
