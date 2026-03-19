alter publication supabase_realtime add table public.doses;


ALTER TABLE doses REPLICA IDENTITY FULL;