
-- Batches (e.g. Class 6, Class 7, Class 8)
CREATE TABLE public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- e.g. "Class 8"
  class_number INTEGER NOT NULL,         -- numeric for ordering (6, 7, 8...)
  academic_year TEXT NOT NULL DEFAULT '2025-26',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, class_number, academic_year)
);

-- Sections within batches (e.g. Class 8-A, Class 8-B)
CREATE TABLE public.batch_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- e.g. "A", "B", "C"
  display_name TEXT NOT NULL,            -- e.g. "Class 8-A"
  max_students INTEGER DEFAULT 60,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(batch_id, name)
);

-- Assign teachers to sections for specific subjects
CREATE TABLE public.section_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.batch_sections(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id),
  subject TEXT NOT NULL,
  is_class_teacher BOOLEAN NOT NULL DEFAULT false,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES public.profiles(id),
  UNIQUE(section_id, subject)
);

-- Enroll students in sections
CREATE TABLE public.section_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.batch_sections(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  roll_number TEXT,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  enrolled_by UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'promoted', 'dropped')),
  UNIQUE(section_id, student_id)
);

-- RLS
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_students ENABLE ROW LEVEL SECURITY;

-- Batches: org members can read, admins can manage
CREATE POLICY "Org members can read batches" ON public.batches
  FOR SELECT TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admins can manage batches" ON public.batches
  FOR ALL TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()) AND public.get_user_role(auth.uid()) IN ('super_admin', 'admin'))
  WITH CHECK (org_id = public.get_user_org_id(auth.uid()) AND public.get_user_role(auth.uid()) IN ('super_admin', 'admin'));

-- Sections: org members can read, admins can manage
CREATE POLICY "Org members can read sections" ON public.batch_sections
  FOR SELECT TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admins can manage sections" ON public.batch_sections
  FOR ALL TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()) AND public.get_user_role(auth.uid()) IN ('super_admin', 'admin'))
  WITH CHECK (org_id = public.get_user_org_id(auth.uid()) AND public.get_user_role(auth.uid()) IN ('super_admin', 'admin'));

-- Section teachers: org members can read, admins can manage
CREATE POLICY "Org members can read section teachers" ON public.section_teachers
  FOR SELECT TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admins can manage section teachers" ON public.section_teachers
  FOR ALL TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()) AND public.get_user_role(auth.uid()) IN ('super_admin', 'admin'))
  WITH CHECK (org_id = public.get_user_org_id(auth.uid()) AND public.get_user_role(auth.uid()) IN ('super_admin', 'admin'));

-- Section students: org members can read, admins can manage
CREATE POLICY "Org members can read section students" ON public.section_students
  FOR SELECT TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admins can manage section students" ON public.section_students
  FOR ALL TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()) AND public.get_user_role(auth.uid()) IN ('super_admin', 'admin'))
  WITH CHECK (org_id = public.get_user_org_id(auth.uid()) AND public.get_user_role(auth.uid()) IN ('super_admin', 'admin'));
