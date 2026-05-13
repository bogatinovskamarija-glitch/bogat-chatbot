-- Run this in Supabase SQL Editor to create the leads table
-- Dashboard → SQL Editor → New Query → paste this → Run

create table if not exists leads (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  project_type text not null,
  source      text default 'website_chatbot',
  created_at  timestamptz default now()
);

-- Enable Row Level Security (blocks public access; service key bypasses it)
alter table leads enable row level security;

-- No public policies — only the service role key (used in the backend) can insert/read
