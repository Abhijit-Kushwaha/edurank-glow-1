-- Fix teacher_sections ALL policy to also enforce org_id
DROP POLICY IF EXISTS "Teachers can manage own sections" ON public.teacher_sections;
CREATE POLICY "Teachers can manage own sections"
  ON public.teacher_sections
  FOR ALL
  TO authenticated
  USING (
    (org_id = get_user_org_id(auth.uid())) AND
    (
      teacher_id = get_profile_id(auth.uid())
      OR get_user_role(auth.uid()) IN ('super_admin', 'admin')
    )
  );

-- Fix org_quizzes ALL policy to also enforce org_id
DROP POLICY IF EXISTS "Teachers/admins can manage quizzes" ON public.org_quizzes;
CREATE POLICY "Teachers/admins can manage quizzes"
  ON public.org_quizzes
  FOR ALL
  TO authenticated
  USING (
    (org_id = get_user_org_id(auth.uid())) AND
    (
      created_by = get_profile_id(auth.uid())
      OR get_user_role(auth.uid()) IN ('super_admin', 'admin')
    )
  );