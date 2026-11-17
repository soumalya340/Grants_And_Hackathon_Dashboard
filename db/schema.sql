CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  organization TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('grant', 'hackathon', 'bounty')),
  status TEXT NOT NULL DEFAULT 'saved' CHECK (status IN ('saved', 'in progress', 'submitted', 'won')),
  deadline DATE NOT NULL,
  reward TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS opportunities_deadline_idx ON opportunities (deadline);
