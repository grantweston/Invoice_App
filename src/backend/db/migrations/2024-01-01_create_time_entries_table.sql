-- Drop the table if it exists
DROP TABLE IF EXISTS time_entries;

-- Create time_entries table
CREATE TABLE time_entries (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR(255) NOT NULL,
  project_id VARCHAR(255) NOT NULL,
  hours DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant necessary permissions
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all" ON time_entries;

-- Create explicit policies for each operation
CREATE POLICY "Allow select" ON time_entries
  FOR SELECT USING (true);

CREATE POLICY "Allow insert" ON time_entries
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update" ON time_entries
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete" ON time_entries
  FOR DELETE USING (true);

-- Grant access to the anon role (the one used by the anon key)
GRANT ALL ON time_entries TO anon;
GRANT USAGE, SELECT ON SEQUENCE time_entries_id_seq TO anon;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';