
-- Exam terms (e.g. Term 1, Term 2)
CREATE TABLE public.exam_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                         -- e.g. "Term 1", "Term 2"
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(batch_id, name)
);

-- Individual exams within a term (Unit Test 1, Mid-term, Final, etc.)
CREATE TABLE public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id UUID NOT NULL REFERENCES public.exam_terms(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.batch_sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                         -- e.g. "Unit Test 1", "Mid-Term", "Final"
  exam_type TEXT NOT NULL DEFAULT 'written',  -- written, internal, practical
  subject TEXT NOT NULL,
  max_written_marks INTEGER NOT NULL DEFAULT 80,
  max_internal_marks INTEGER NOT NULL DEFAULT 20,
  exam_date DATE,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(term_id, section_id, name, subject)
);

-- Student marks for each exam
CREATE TABLE public.student_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  section_id UUID NOT NULL REFERENCES public.batch_sections(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  written_marks NUMERIC(6,2) DEFAULT 0,
  internal_marks NUMERIC(6,2) DEFAULT 0,
  total_marks NUMERIC(6,2) GENERATED ALWAYS AS (written_marks + internal_marks) STORED,
  grade TEXT,
  remarks TEXT,
  is_absent BOOLEAN NOT NULL DEFAULT false,
  entered_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exam_id, student_id)
);

-- Promotion records
CREATE TABLE public.student_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  from_section_id UUID NOT NULL REFERENCES public.batch_sections(id),
  to_section_id UUID REFERENCES public.batch_sections(id),  -- null if not yet assigned
  from_batch_id UUID NOT NULL REFERENCES public.batches(id),
  to_batch_id UUID REFERENCES public.batches(id),
  academic_year TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'promoted', 'detained', 'transferred')),
  overall_percentage NUMERIC(5,2),
  decision_by UUID REFERENCES public.profiles(id),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.exam_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_promotions ENABLE ROW LEVEL SECURITY;

-- exam_terms: org members read, admins manage
CREATE POLICY "Org members can read exam_terms" ON public.exam_terms
  FOR SELECT TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admins can manage exam_terms" ON public.exam_terms
  FOR ALL TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()) AND public.get_user_role(auth.uid()) IN ('super_admin', 'admin'))
  WITH CHECK (org_id = public.get_user_org_id(auth.uid()) AND public.get_user_role(auth.uid()) IN ('super_admin', 'admin'));

-- exams: org members read, admins+teachers manage
CREATE POLICY "Org members can read exams" ON public.exams
  FOR SELECT TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admins and teachers can manage exams" ON public.exams
  FOR ALL TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()) AND public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'teacher'))
  WITH CHECK (org_id = public.get_user_org_id(auth.uid()) AND public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'teacher'));

-- student_marks: org members read, admins+teachers manage
CREATE POLICY "Org members can read student_marks" ON public.student_marks
  FOR SELECT TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Teachers and admins can manage marks" ON public.student_marks
  FOR ALL TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()) AND public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'teacher'))
  WITH CHECK (org_id = public.get_user_org_id(auth.uid()) AND public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'teacher'));

-- student_promotions: org members read, admins manage
CREATE POLICY "Org members can read promotions" ON public.student_promotions
  FOR SELECT TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admins can manage promotions" ON public.student_promotions
  FOR ALL TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()) AND public.get_user_role(auth.uid()) IN ('super_admin', 'admin'))
  WITH CHECK (org_id = public.get_user_org_id(auth.uid()) AND public.get_user_role(auth.uid()) IN ('super_admin', 'admin'));
