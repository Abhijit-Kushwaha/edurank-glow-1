
-- Teacher sections table (extends classrooms with teacher-subject mapping)
CREATE TABLE IF NOT EXISTS public.teacher_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE SET NULL,
  subject text NOT NULL,
  section_name text NOT NULL,
  description text,
  student_count integer NOT NULL DEFAULT 0,
  schedule_info text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.teacher_sections ENABLE ROW LEVEL SECURITY;

-- Org members can view sections
CREATE POLICY "Org members can view sections" ON public.teacher_sections
  FOR SELECT TO authenticated
  USING (org_id = get_user_org_id(auth.uid()));

-- Teachers/admins can manage their sections
CREATE POLICY "Teachers can manage own sections" ON public.teacher_sections
  FOR ALL TO authenticated
  USING (
    (teacher_id = get_profile_id(auth.uid()))
    OR (get_user_role(auth.uid()) IN ('super_admin', 'admin'))
  );

-- Teacher-created quizzes for org students
CREATE TABLE IF NOT EXISTS public.org_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  section_id uuid REFERENCES public.teacher_sections(id) ON DELETE SET NULL,
  title text NOT NULL,
  subject text NOT NULL,
  description text,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  difficulty text NOT NULL DEFAULT 'medium',
  time_limit_mins integer DEFAULT 30,
  is_published boolean NOT NULL DEFAULT false,
  due_date timestamptz,
  max_attempts integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.org_quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view published quizzes" ON public.org_quizzes
  FOR SELECT TO authenticated
  USING (
    org_id = get_user_org_id(auth.uid())
    AND (is_published = true OR created_by = get_profile_id(auth.uid()) OR get_user_role(auth.uid()) IN ('super_admin', 'admin'))
  );

CREATE POLICY "Teachers/admins can manage quizzes" ON public.org_quizzes
  FOR ALL TO authenticated
  USING (
    org_id = get_user_org_id(auth.uid())
    AND (created_by = get_profile_id(auth.uid()) OR get_user_role(auth.uid()) IN ('super_admin', 'admin'))
  );

-- Student quiz submissions for org quizzes
CREATE TABLE IF NOT EXISTS public.org_quiz_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.org_quizzes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  score numeric,
  total_questions integer NOT NULL DEFAULT 0,
  correct_answers integer NOT NULL DEFAULT 0,
  time_taken_seconds integer,
  attempt_number integer NOT NULL DEFAULT 1,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(quiz_id, student_id, attempt_number)
);

ALTER TABLE public.org_quiz_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage own submissions" ON public.org_quiz_submissions
  FOR ALL TO authenticated
  USING (student_id = get_profile_id(auth.uid()));

CREATE POLICY "Teachers/admins can view submissions" ON public.org_quiz_submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_quizzes q 
      WHERE q.id = org_quiz_submissions.quiz_id 
      AND q.org_id = get_user_org_id(auth.uid())
      AND (q.created_by = get_profile_id(auth.uid()) OR get_user_role(auth.uid()) IN ('super_admin', 'admin'))
    )
  );

-- Timetable entries
CREATE TABLE IF NOT EXISTS public.timetable_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  section_id uuid REFERENCES public.teacher_sections(id) ON DELETE SET NULL,
  subject text NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  room text,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view timetable" ON public.timetable_entries
  FOR SELECT TO authenticated
  USING (org_id = get_user_org_id(auth.uid()));

CREATE POLICY "SA/Admin can manage timetable" ON public.timetable_entries
  FOR ALL TO authenticated
  USING (
    org_id = get_user_org_id(auth.uid())
    AND get_user_role(auth.uid()) IN ('super_admin', 'admin')
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teacher_sections_org ON public.teacher_sections(org_id);
CREATE INDEX IF NOT EXISTS idx_teacher_sections_teacher ON public.teacher_sections(teacher_id);
CREATE INDEX IF NOT EXISTS idx_org_quizzes_org ON public.org_quizzes(org_id);
CREATE INDEX IF NOT EXISTS idx_org_quizzes_section ON public.org_quizzes(section_id);
CREATE INDEX IF NOT EXISTS idx_timetable_org ON public.timetable_entries(org_id);
CREATE INDEX IF NOT EXISTS idx_timetable_day ON public.timetable_entries(org_id, day_of_week);
