CREATE TABLE IF NOT EXISTS public.major_exam_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_session text NOT NULL,
  academic_year text NOT NULL,
  examination_type text NOT NULL DEFAULT 'Major Examination',
  semester text NOT NULL,
  cycle_name text NOT NULL,
  department text,
  branch text,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.major_exam_course_offerings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id text NOT NULL,
  course_code text NOT NULL,
  course_name text NOT NULL,
  department_id uuid,
  department_name text,
  branch_id uuid,
  branch_name text,
  study_year text,
  semester text,
  academic_session text,
  cycle_id uuid REFERENCES public.major_exam_cycles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.major_exam_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid REFERENCES public.major_exam_cycles(id) ON DELETE CASCADE,
  course_offering_id uuid REFERENCES public.major_exam_course_offerings(id) ON DELETE CASCADE,
  course_id text NOT NULL,
  examination_date date NOT NULL,
  start_time time,
  end_time time,
  status text NOT NULL DEFAULT 'scheduled',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.major_exam_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid REFERENCES public.major_exam_cycles(id) ON DELETE CASCADE,
  course_offering_id uuid REFERENCES public.major_exam_course_offerings(id) ON DELETE CASCADE,
  material_type text NOT NULL CHECK (material_type IN ('question-paper', 'answer-key')),
  set_label text,
  publication_status text NOT NULL DEFAULT 'draft',
  drive_file_id text,
  drive_folder_id text,
  file_name text,
  file_mime_type text,
  course_code text,
  department_name text,
  branch_name text,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.major_exam_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  student_user_id uuid,
  material_id uuid REFERENCES public.major_exam_materials(id) ON DELETE SET NULL,
  cycle_id uuid REFERENCES public.major_exam_cycles(id) ON DELETE SET NULL,
  request_status text NOT NULL DEFAULT 'denied',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.major_exam_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  actor_role text,
  actor_name text,
  event_type text NOT NULL,
  cycle_id uuid REFERENCES public.major_exam_cycles(id) ON DELETE SET NULL,
  material_id uuid REFERENCES public.major_exam_materials(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.major_exam_sessions(id) ON DELETE SET NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_major_exam_course_offerings_cycle
  ON public.major_exam_course_offerings (cycle_id, course_code);

CREATE INDEX IF NOT EXISTS idx_major_exam_sessions_cycle_course
  ON public.major_exam_sessions (cycle_id, course_offering_id);

CREATE INDEX IF NOT EXISTS idx_major_exam_materials_cycle_course
  ON public.major_exam_materials (cycle_id, course_offering_id, publication_status);

CREATE INDEX IF NOT EXISTS idx_major_exam_audit_logs_cycle
  ON public.major_exam_audit_logs (cycle_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.is_examination_cell_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.account_identifier = auth.uid()::text
      AND lower(COALESCE(u."Ex Factor", '')) = 'examination cell'
  );
$$;

ALTER TABLE public.major_exam_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.major_exam_course_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.major_exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.major_exam_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.major_exam_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.major_exam_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Exam cell admins manage examination cycles"
  ON public.major_exam_cycles
  FOR ALL
  USING (public.is_examination_cell_admin())
  WITH CHECK (public.is_examination_cell_admin());

CREATE POLICY "Exam cell admins manage course offerings"
  ON public.major_exam_course_offerings
  FOR ALL
  USING (public.is_examination_cell_admin())
  WITH CHECK (public.is_examination_cell_admin());

CREATE POLICY "Exam cell admins manage examination sessions"
  ON public.major_exam_sessions
  FOR ALL
  USING (public.is_examination_cell_admin())
  WITH CHECK (public.is_examination_cell_admin());

CREATE POLICY "Students can read published course materials for their programmes"
  ON public.major_exam_materials
  FOR SELECT
  USING (
    publication_status = 'published'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Exam cell admins manage material publication"
  ON public.major_exam_materials
  FOR ALL
  USING (public.is_examination_cell_admin())
  WITH CHECK (public.is_examination_cell_admin());

CREATE POLICY "Students can read own access logs"
  ON public.major_exam_access_logs
  FOR SELECT
  USING (student_user_id = auth.uid());

CREATE POLICY "Exam cell admins manage audit logs"
  ON public.major_exam_audit_logs
  FOR ALL
  USING (public.is_examination_cell_admin())
  WITH CHECK (public.is_examination_cell_admin());
