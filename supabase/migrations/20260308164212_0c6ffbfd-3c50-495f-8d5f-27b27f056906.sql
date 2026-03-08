
-- Question Bank: reusable questions teachers can save
CREATE TABLE public.question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'mcq' CHECK (question_type IN ('mcq', 'true_false', 'fill_blank', 'short_answer')),
  options JSONB DEFAULT '[]'::jsonb,
  correct_answer JSONB NOT NULL DEFAULT '0'::jsonb,
  explanation TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  subject TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  points INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

-- Teachers+ in same org can read
CREATE POLICY "org_members_read_question_bank" ON public.question_bank
  FOR SELECT TO authenticated
  USING (
    org_id = (SELECT org_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    AND (SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) IN ('super_admin', 'admin', 'teacher')
  );

-- Teachers+ in same org can insert
CREATE POLICY "teachers_insert_question_bank" ON public.question_bank
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id = (SELECT org_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    AND (SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) IN ('super_admin', 'admin', 'teacher')
  );

-- Creator or admin can update
CREATE POLICY "creator_update_question_bank" ON public.question_bank
  FOR UPDATE TO authenticated
  USING (
    created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    OR (SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) IN ('super_admin', 'admin')
  );

-- Creator or admin can delete
CREATE POLICY "creator_delete_question_bank" ON public.question_bank
  FOR DELETE TO authenticated
  USING (
    created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    OR (SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) IN ('super_admin', 'admin')
  );

-- Quiz Assignments: assign quizzes to sections with scheduling
CREATE TABLE public.quiz_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL,
  section_id UUID REFERENCES public.batch_sections(id) ON DELETE SET NULL,
  assigned_by UUID NOT NULL REFERENCES public.profiles(id),
  assigned_to_all BOOLEAN NOT NULL DEFAULT false,
  scheduled_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  max_attempts INTEGER NOT NULL DEFAULT 1,
  shuffle_questions BOOLEAN NOT NULL DEFAULT false,
  shuffle_options BOOLEAN NOT NULL DEFAULT false,
  show_answers_after BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_assignments ENABLE ROW LEVEL SECURITY;

-- Org members can read their assignments
CREATE POLICY "org_members_read_assignments" ON public.quiz_assignments
  FOR SELECT TO authenticated
  USING (
    org_id = (SELECT org_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
  );

-- Teachers can insert
CREATE POLICY "teachers_insert_assignments" ON public.quiz_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id = (SELECT org_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    AND (SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) IN ('super_admin', 'admin', 'teacher')
  );

-- Teachers can update their assignments
CREATE POLICY "teachers_update_assignments" ON public.quiz_assignments
  FOR UPDATE TO authenticated
  USING (
    assigned_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    OR (SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) IN ('super_admin', 'admin')
  );

-- Student Quiz Attempts: track student attempts on org quizzes
CREATE TABLE public.student_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL,
  assignment_id UUID REFERENCES public.quiz_assignments(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  score NUMERIC(5,2),
  total_points INTEGER NOT NULL DEFAULT 0,
  earned_points INTEGER NOT NULL DEFAULT 0,
  time_taken_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded')),
  graded_by UUID REFERENCES public.profiles(id),
  graded_at TIMESTAMPTZ,
  teacher_feedback TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.student_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Students can see their own attempts, teachers can see all in org
CREATE POLICY "read_quiz_attempts" ON public.student_quiz_attempts
  FOR SELECT TO authenticated
  USING (
    org_id = (SELECT org_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    AND (
      student_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
      OR (SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) IN ('super_admin', 'admin', 'teacher')
    )
  );

-- Students can insert their own attempts
CREATE POLICY "students_insert_attempts" ON public.student_quiz_attempts
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
  );

-- Students can update their own in-progress attempts, teachers can grade
CREATE POLICY "update_quiz_attempts" ON public.student_quiz_attempts
  FOR UPDATE TO authenticated
  USING (
    org_id = (SELECT org_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    AND (
      (student_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) AND status = 'in_progress')
      OR (SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) IN ('super_admin', 'admin', 'teacher')
    )
  );
