-- ============================================================
-- InspectX — Supabase Table Setup Script
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. MACHINES TABLE
CREATE TABLE IF NOT EXISTS public.machines (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  machineid   TEXT UNIQUE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Maintenance', 'Inactive')),
  lastinspection TEXT,
  nextinspection TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Seed default machines if empty
INSERT INTO public.machines (id, name, machineid, status, lastinspection, nextinspection)
SELECT * FROM (VALUES
  ('m1', 'HT Motor',                     'NTPC-HTM-001', 'Active',      '2024-07-15', '2025-01-15'),
  ('m2', 'LT Motor',                     'NTPC-LTM-002', 'Active',      '2024-07-16', '2025-01-16'),
  ('m3', 'Cable Laying/Installation',    'NTPC-CBL-003', 'Maintenance', '2024-06-20', '2024-12-20'),
  ('m4', 'Testing of Power Cables',      'NTPC-TPC-004', 'Active',      '2024-07-01', '2025-01-01'),
  ('m5', 'Cable Trays',                  'NTPC-CT-005',  'Inactive',    '2023-01-10', '2023-07-10'),
  ('m6', 'Earthing System',              'NTPC-ES-006',  'Active',      '2024-05-30', '2024-11-30'),
  ('m7', 'HT/LT SwitchGear',            'NTPC-SWG-007', 'Active',      '2024-07-18', '2025-01-18'),
  ('m8', 'LT Panels',                    'NTPC-LTP-008', 'Maintenance', '2024-07-05', '2024-08-05'),
  ('m9', 'Busduct',                      'NTPC-BSD-009', 'Active',      '2024-06-10', '2024-12-10'),
  ('m10','Station Lighting',             'NTPC-STL-010', 'Active',      '2024-07-20', '2025-01-20'),
  ('m11','Lighting Pole/High Mast/FVI',  'NTPC-LPH-011', 'Active',      '2024-06-25', '2024-12-25'),
  ('m12','Miscellaneous Equipment',      'NTPC-MISC-012','Active',      '2024-05-15', '2024-11-15'),
  ('m13','C&I Equipments/Works',         'NTPC-CI-013',  'Active',      '2024-07-10', '2025-01-10'),
  ('m14','Power Transformer',            'NTPC-PT-014',  'Active',      '2024-04-01', '2024-10-01'),
  ('m15','Outdoor Transformer',          'NTPC-OT-015',  'Active',      '2024-03-15', '2024-09-15'),
  ('m16','Elevator',                     'NTPC-ELV-016', 'Active',      '2024-07-05', '2025-01-05'),
  ('m17','Turbogenerator',               'NTPC-TRB-017', 'Active',      '2024-06-01', '2024-12-01')
) AS v(id, name, machineid, status, lastinspection, nextinspection)
WHERE NOT EXISTS (SELECT 1 FROM public.machines LIMIT 1);

-- 2. USERS TABLE (if not already created)
CREATE TABLE IF NOT EXISTS public.users (
  id      TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  email   TEXT UNIQUE NOT NULL,
  role    TEXT NOT NULL DEFAULT 'Client' CHECK (role IN ('Admin', 'Inspector', 'Client')),
  avatar  TEXT DEFAULT ''
);

-- 3. PENDING_USERS TABLE
CREATE TABLE IF NOT EXISTS public.pending_users (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('Inspector', 'Client')),
  status      TEXT NOT NULL DEFAULT 'pending',
  requestedat TIMESTAMPTZ DEFAULT now()
);

-- 4. INSPECTIONS TABLE
CREATE TABLE IF NOT EXISTS public.inspections (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  machineid       TEXT,
  machineslno     TEXT,
  machinename     TEXT NOT NULL,
  priority        TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Critical', 'High', 'Medium', 'Low')),
  status          TEXT NOT NULL DEFAULT 'Upcoming' CHECK (status IN ('Completed', 'Pending', 'Failed', 'Partial', 'Upcoming')),
  assignedto      TEXT,
  requestedby     TEXT NOT NULL,
  requestdate     TEXT,
  duedate         TEXT,
  notes           TEXT,
  fullreportdata  JSONB,
  createdat       TIMESTAMPTZ DEFAULT now(),
  completedat     TIMESTAMPTZ,
  completedby     TEXT,
  inspectedby     TEXT
);

-- 5. FORM_TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS public.form_templates (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name            TEXT NOT NULL,
  description     TEXT DEFAULT '',
  fields          JSONB NOT NULL DEFAULT '[]'::jsonb,
  assignedmachineids TEXT[] DEFAULT '{}',
  createdat       TIMESTAMPTZ DEFAULT now(),
  updatedat       TIMESTAMPTZ DEFAULT now()
);

-- 6. ACTIVITIES TABLE (for Client activity tracking)
CREATE TABLE IF NOT EXISTS public.activities (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type        TEXT NOT NULL,
  details     TEXT,
  "createdBy" TEXT,
  createdat   TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RLS Policies (optional — disable if using service role key)
-- ============================================================

-- 7. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'info',
  reference_id  TEXT,
  timestamp     TIMESTAMPTZ DEFAULT now(),
  is_read       BOOLEAN DEFAULT false
);

-- 8. ACTIVITY_LOGS TABLE
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  action            TEXT NOT NULL,
  entity_type       TEXT NOT NULL,
  entity_id         TEXT NOT NULL,
  entity_name       TEXT NOT NULL DEFAULT '',
  details           TEXT NOT NULL DEFAULT '',
  performed_by      TEXT NOT NULL,
  performed_by_role TEXT NOT NULL DEFAULT '',
  timestamp         TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON public.notifications(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON public.activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);

ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY IF NOT EXISTS "Allow read for authenticated" ON public.machines FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Allow read for authenticated" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Allow read for authenticated" ON public.inspections FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Allow read for authenticated" ON public.form_templates FOR SELECT TO authenticated USING (true);

-- Allow service role full access (for server actions)
CREATE POLICY IF NOT EXISTS "Allow all for service_role" ON public.machines FOR ALL TO service_role USING (true);
CREATE POLICY IF NOT EXISTS "Allow all for service_role" ON public.users FOR ALL TO service_role USING (true);
CREATE POLICY IF NOT EXISTS "Allow all for service_role" ON public.inspections FOR ALL TO service_role USING (true);
CREATE POLICY IF NOT EXISTS "Allow all for service_role" ON public.form_templates FOR ALL TO service_role USING (true);
CREATE POLICY IF NOT EXISTS "Allow all for service_role" ON public.pending_users FOR ALL TO service_role USING (true);

-- Allow anon read access (needed for client-side supabase calls)
CREATE POLICY IF NOT EXISTS "Allow anon read machines" ON public.machines FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon read users" ON public.users FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon read inspections" ON public.inspections FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon all inspections" ON public.inspections FOR ALL TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon read form_templates" ON public.form_templates FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon insert pending_users" ON public.pending_users FOR INSERT TO anon WITH CHECK (true);

-- Notifications policies
CREATE POLICY IF NOT EXISTS "Allow read own notifications" ON public.notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon read notifications" ON public.notifications FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon all notifications" ON public.notifications FOR ALL TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow all for service_role notifications" ON public.notifications FOR ALL TO service_role USING (true);

-- Activity logs policies
CREATE POLICY IF NOT EXISTS "Allow read activity_logs" ON public.activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon read activity_logs" ON public.activity_logs FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow all for service_role activity_logs" ON public.activity_logs FOR ALL TO service_role USING (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

SELECT 'All tables created successfully!' AS result;
