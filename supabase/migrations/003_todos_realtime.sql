-- 003_todos_realtime.sql
--
-- Re-asserts the `public.todos` table on the `supabase_realtime` publication
-- so the right-panel todo list live-updates after AI-driven inserts (and any
-- other server-side mutation) without requiring a page reload.
--
-- Why: the publication was found empty in the live project despite migration
-- 001 having declared `ALTER PUBLICATION supabase_realtime ADD TABLE events,
-- todos;`. This patch is idempotent — it checks `pg_publication_tables`
-- before adding so re-running on environments where it is already present is
-- a no-op. Fixes #76.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'todos'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.todos';
  END IF;
END
$$;
