-- Drop the table if it exists
DROP TABLE IF EXISTS daily_logs;

-- Create daily_logs table
CREATE TABLE daily_logs (
  id BIGSERIAL PRIMARY KEY,
  client TEXT NOT NULL,
  project TEXT NOT NULL,
  description TEXT NOT NULL,
  time_in_minutes INTEGER NOT NULL,
  hours DECIMAL(10,2) NOT NULL,
  partner TEXT,
  hourly_rate DECIMAL(10,2),
  associated_daily_ids TEXT[] DEFAULT '{}',
  start_date BIGINT NOT NULL,  -- Unix timestamp in milliseconds
  last_worked_date BIGINT NOT NULL,  -- Unix timestamp in milliseconds
  sub_entries JSONB[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant necessary permissions
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public access on daily_logs" ON daily_logs;

-- Create explicit policies for each operation
CREATE POLICY "Allow public select on daily_logs" ON daily_logs
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on daily_logs" ON daily_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on daily_logs" ON daily_logs
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on daily_logs" ON daily_logs
  FOR DELETE USING (true);

-- Grant access to the anon role (the one used by the anon key)
GRANT ALL ON daily_logs TO anon;
GRANT USAGE, SELECT ON SEQUENCE daily_logs_id_seq TO anon;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema'; 