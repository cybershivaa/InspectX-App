-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- Navigate to: Project → SQL Editor → New Query → paste this → Run

CREATE TABLE IF NOT EXISTS public.form_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text NOT NULL DEFAULT '',
  fields      jsonb NOT NULL DEFAULT '[]',
  createdat   timestamptz NOT NULL DEFAULT now(),
  updatedat   timestamptz NOT NULL DEFAULT now()
);

-- Allow all authenticated users to read templates
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for authenticated users"
  ON public.form_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert for authenticated users"
  ON public.form_templates FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users"
  ON public.form_templates FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow delete for authenticated users"
  ON public.form_templates FOR DELETE
  TO authenticated
  USING (true);
