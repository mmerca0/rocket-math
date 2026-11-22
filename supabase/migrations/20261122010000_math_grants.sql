-- Math Rocket: table privileges for the server's secret key.
--
-- Paste this whole file into Supabase → SQL Editor → New query → Run,
-- AFTER 20261122000000_math_leaderboard.sql. It is safe to run more than
-- once (GRANT and REVOKE do nothing if the privilege is already set).
--
-- Why this exists: some Supabase projects do NOT automatically grant the
-- API roles access to new tables. Without these grants the app's server
-- gets "42501 permission denied for table math_pilots", even though the
-- secret key bypasses Row Level Security. RLS decides WHICH ROWS a role may
-- see; GRANT decides whether the role may touch the TABLE at all. Both
-- checks have to pass.
--
-- Every new table must get the same treatment: grant to service_role,
-- revoke from anon and authenticated. See README → "Adding a new table".

grant usage on schema public to service_role;

grant select, insert, update, delete
  on table public.math_pilots, public.math_scores
  to service_role;

grant usage, select on all sequences in schema public to service_role;

-- The browser roles get nothing. (RLS with no policies already blocks
-- them; this is belt-and-braces.)
revoke all on table public.math_pilots, public.math_scores from anon, authenticated;
