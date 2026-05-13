-- 004_events_realtime.sql
--
-- The events table was supposed to live in the supabase_realtime publication
-- per 001_initial_schema.sql, but it was missing from the live project's
-- publication while todos was present (confirmed via pg_publication_tables
-- on 2026-05-13). Cross-tab event sync therefore did not fire even though
-- TodoContext sync worked. This migration adds public.events back
-- (idempotent) so the realtime channel actually broadcasts INSERT/UPDATE/
-- DELETE for events.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
  END IF;
END
$$;
