-- 002_todo_attachments.sql
--
-- Adds image attachment support to todos so users can attach handwritten notes
-- (photo or scan) to a task. Image is uploaded to the `todo-attachments`
-- Storage bucket and the public URL is persisted on `todos.image_url`.
--
-- Bucket is PUBLIC for read (direct CDN URLs) so the UI can render thumbnails
-- without signed-URL roundtrips. Writes are RLS-gated to the owner's folder
-- using the path convention `<user_id>/<filename>`.

-- 1. Schema
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Storage bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('todo-attachments', 'todo-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS — owner-only writes, public reads
CREATE POLICY "Users upload own todo attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'todo-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users update own todo attachments"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'todo-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'todo-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users delete own todo attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'todo-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Public read todo attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'todo-attachments');
