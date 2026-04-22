-- Dayforma initial schema
-- CSC 710 final project · Spring 2026

-- ────────────────────────────────────────────────────────────────────────────
-- Extensions
-- ────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────────────────────
-- profiles — extends auth.users
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    theme_preference TEXT DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system')),
    created_at TIMESTAMPTZ DEFAULT now(),
    last_seen TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- ────────────────────────────────────────────────────────────────────────────
-- categories — per-user event/todo categories
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366f1',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, name)
);

CREATE INDEX idx_categories_user ON categories(user_id);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select_own" ON categories
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "categories_insert_own" ON categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_update_own" ON categories
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "categories_delete_own" ON categories
    FOR DELETE USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- events — calendar entries
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN DEFAULT false,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    rrule JSONB,
    reminder_offset_minutes INTEGER,
    created_by_ai BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CHECK (end_at >= start_at)
);

CREATE INDEX idx_events_user_time ON events(user_id, start_at);
CREATE INDEX idx_events_category ON events(category_id);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_select_own" ON events
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "events_insert_own" ON events
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "events_update_own" ON events
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "events_delete_own" ON events
    FOR DELETE USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- todos — task list entries with optional link to an event
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE todos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_at TIMESTAMPTZ,
    priority TEXT NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'scheduled', 'done')),
    linked_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    created_by_ai BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (linked_event_id)
);

CREATE INDEX idx_todos_user_status ON todos(user_id, status);
CREATE INDEX idx_todos_due ON todos(user_id, due_at);

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "todos_select_own" ON todos
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "todos_insert_own" ON todos
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "todos_update_own" ON todos
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "todos_delete_own" ON todos
    FOR DELETE USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- ai_conversations — rolling per-session conversation history
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT,
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_conversations_user ON ai_conversations(user_id, updated_at DESC);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_conversations_select_own" ON ai_conversations
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ai_conversations_insert_own" ON ai_conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_conversations_update_own" ON ai_conversations
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ai_conversations_delete_own" ON ai_conversations
    FOR DELETE USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- ai_parse_logs — natural-language parse trace for debugging/analytics
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE ai_parse_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    input_text TEXT NOT NULL,
    parsed_output JSONB,
    tool_calls JSONB,
    accepted BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_parse_logs_user ON ai_parse_logs(user_id, created_at DESC);

ALTER TABLE ai_parse_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_parse_logs_select_own" ON ai_parse_logs
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ai_parse_logs_insert_own" ON ai_parse_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- Triggers — auto-create profile and seed default categories on signup
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id UUID := NEW.id;
    new_display_name TEXT := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));
BEGIN
    INSERT INTO profiles (id, email, display_name)
    VALUES (new_user_id, NEW.email, new_display_name);

    INSERT INTO categories (user_id, name, color, is_default) VALUES
        (new_user_id, 'Work',     '#6366f1', true),
        (new_user_id, 'Personal', '#10b981', true),
        (new_user_id, 'Health',   '#ef4444', true);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ────────────────────────────────────────────────────────────────────────────
-- Auto-bump updated_at on events/todos/ai_conversations
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_set_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER todos_set_updated_at
    BEFORE UPDATE ON todos
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER ai_conversations_set_updated_at
    BEFORE UPDATE ON ai_conversations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- Realtime — enable publication on user-data tables
-- ────────────────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE events, todos;
