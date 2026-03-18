-- Create feedback table
CREATE TABLE feedback (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  category TEXT NOT NULL CHECK (category IN ('bug', 'feature', 'general', 'performance', 'ui')),
  message TEXT NOT NULL,
  email TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to INSERT feedback
CREATE POLICY "Allow anyone to submit feedback" ON feedback
FOR INSERT WITH CHECK (true);

-- Allow only authenticated users to READ feedback
CREATE POLICY "Only authenticated users can read feedback" ON feedback
FOR SELECT USING (auth.role() = 'authenticated');

-- Create index for faster queries
CREATE INDEX feedback_timestamp_idx ON feedback(timestamp DESC);
