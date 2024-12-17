-- (DONE) This SQL migration creates a daily_aggregations table to store each day's aggregated WIP results.
-- Schema:
-- date: The date (YYYY-MM-DD) for which the aggregation is computed.
-- aggregation: A JSONB column holding the aggregated data (clients/projects/hours/description).
-- created_at: Timestamp for record creation.

CREATE TABLE IF NOT EXISTS daily_aggregations (
  date date PRIMARY KEY,
  aggregation jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);