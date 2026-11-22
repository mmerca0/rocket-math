-- Math Rocket: shared family leaderboard.
--
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- It is safe to run more than once (everything uses "if not exists").
--
-- Every table is prefixed "math_" so other apps can share this Supabase
-- project without name clashes.
--
-- Security model: Row Level Security is ON with NO policies, and the
-- browser roles (anon, authenticated) have no table privileges. That means
-- the public/publishable key can read or write nothing. Only the app's
-- server (Next.js route handlers using the SECRET key, which bypasses RLS)
-- can touch these tables.

-- ---------- Pilots ----------

create table if not exists public.math_pilots (
  -- The id is created on the device (crypto.randomUUID) so a pilot can exist
  -- offline first and be uploaded later without creating a duplicate.
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),

  -- 1–20 characters, no leading/trailing spaces.
  constraint math_pilots_name_length check (char_length(name) between 1 and 20),
  constraint math_pilots_name_trimmed check (name = btrim(name))
);

-- One pilot per name (case-insensitive), so "Leo" added on the iPad and
-- "leo" added on the phone become the same pilot.
create unique index if not exists math_pilots_name_unique
  on public.math_pilots (lower(name));

-- ---------- Scores ----------

create table if not exists public.math_scores (
  -- Also created on the device, so re-uploading the same score is a no-op.
  id uuid primary key default gen_random_uuid(),
  pilot_id uuid not null references public.math_pilots (id) on delete cascade,
  -- The game has 12 steps: 1–8, then 9a/9b and 10a/10b. Stored as text so
  -- 9a and 9b stay separate leaderboards.
  level text not null,
  score integer not null,
  -- Percent correct, 0–100. NULL for scores saved before accuracy was
  -- recorded (older rounds uploaded from a device on first sync).
  accuracy smallint,
  played_at timestamptz not null default now(),

  constraint math_scores_level_valid check (
    level in ('1', '2', '3', '4', '5', '6', '7', '8', '9a', '9b', '10a', '10b')
  ),
  -- A perfect 2-minute round on the hardest step is roughly 20,000 points,
  -- so 1,000,000 leaves plenty of headroom while rejecting nonsense.
  constraint math_scores_score_range check (score between 0 and 1000000),
  constraint math_scores_accuracy_range check (
    accuracy is null or accuracy between 0 and 100
  )
);

-- Makes "top 10 for level X" fast.
create index if not exists math_scores_level_score_idx
  on public.math_scores (level, score desc, played_at);

-- Makes deleting a pilot (cascade) fast.
create index if not exists math_scores_pilot_idx
  on public.math_scores (pilot_id);

-- ---------- Lock it down ----------

alter table public.math_pilots enable row level security;
alter table public.math_scores enable row level security;

-- No policies on purpose: with RLS on and no policies, the anon and
-- authenticated roles are denied everything. Revoking the grants as well
-- is belt-and-braces in case a permissive policy is ever added by mistake.
revoke all on table public.math_pilots from anon, authenticated;
revoke all on table public.math_scores from anon, authenticated;
