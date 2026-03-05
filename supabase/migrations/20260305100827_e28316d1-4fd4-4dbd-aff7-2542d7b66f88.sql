
-- =============================================
-- BrainBuddy LMS Schema - Phase 1
-- New tables added alongside existing ones
-- =============================================

-- 1. Organisations
CREATE TABLE public.organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text UNIQUE,
  invite_mode text NOT NULL DEFAULT 'restricted' CHECK (invite_mode IN ('open','restricted','closed')),
  content_approval_required boolean NOT NULL DEFAULT false,
  ai_enabled boolean NOT NULL DEFAULT true,
  ai_kill_switch boolean NOT NULL DEFAULT false,
  max_ai_tokens_per_day_per_student integer NOT NULL DEFAULT 10000,
  late_submission_policy text NOT NULL DEFAULT 'penalty' CHECK (late_submission_policy IN ('none','penalty','unlimited')),
  late_penalty_percent_per_day integer NOT NULL DEFAULT 10,
  max_quiz_retakes integer NOT NULL DEFAULT 3,
  score_counts_as text NOT NULL DEFAULT 'best' CHECK (score_counts_as IN ('best','last','average')),
  grading_lock_days integer NOT NULL DEFAULT 7,
  data_retention_days integer NOT NULL DEFAULT 365,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended','frozen','deleted')),
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','enterprise')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

-- 2. Departments
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- 3. Add LMS columns to existing profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'independent_student' CHECK (role IN ('super_admin','admin','teacher','student','independent_student')),
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id),
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id),
  ADD COLUMN IF NOT EXISTS is_independent boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('invited','active','restricted','suspended','removed','graduated')),
  ADD COLUMN IF NOT EXISTS streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rank text NOT NULL DEFAULT 'Novice',
  ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS consistency_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_attention_span_mins float NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preferred_learning_style text NOT NULL DEFAULT 'textual' CHECK (preferred_learning_style IN ('visual','textual','problem-based')),
  ADD COLUMN IF NOT EXISTS peak_hours text NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS cognitive_fatigue_index float NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS motivation_driver text NOT NULL DEFAULT 'mastery',
  ADD COLUMN IF NOT EXISTS learning_velocity float NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invited_by uuid,
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

-- 4. Classrooms
CREATE TABLE public.classrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organisations(id),
  department_id uuid REFERENCES public.departments(id),
  name text NOT NULL,
  subject text,
  description text,
  cover_color text NOT NULL DEFAULT '#6366f1',
  owner_id uuid NOT NULL REFERENCES public.profiles(id),
  enrollment_mode text NOT NULL DEFAULT 'link' CHECK (enrollment_mode IN ('open','link','approval')),
  student_cap integer,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','orphaned','deleted')),
  orphaned_at timestamptz,
  orphaned_reason text,
  clone_of uuid REFERENCES public.classrooms(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;

-- 5. Classroom Members
CREATE TABLE public.classroom_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student','co_teacher')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','waitlisted','restricted','removed')),
  enrolled_by uuid REFERENCES public.profiles(id),
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  restricted_at timestamptz,
  restriction_reason text,
  UNIQUE(classroom_id, user_id)
);

ALTER TABLE public.classroom_members ENABLE ROW LEVEL SECURITY;

-- 6. Invites
CREATE TABLE public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organisations(id),
  classroom_id uuid REFERENCES public.classrooms(id),
  invited_by uuid NOT NULL REFERENCES public.profiles(id),
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin','teacher','student','co_teacher')),
  token text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','revoked')),
  expires_at timestamptz NOT NULL,
  resend_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- 7. Content Items
CREATE TABLE public.content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid REFERENCES public.classrooms(id),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  org_id uuid REFERENCES public.organisations(id),
  type text NOT NULL CHECK (type IN ('note','quiz','flashcard_deck','task')),
  title text NOT NULL,
  body jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','published','locked','archived','deleted')),
  visibility_start timestamptz,
  visibility_end timestamptz,
  assigned_to text NOT NULL DEFAULT 'all' CHECK (assigned_to IN ('all','specific')),
  assigned_user_ids uuid[] NOT NULL DEFAULT '{}',
  prerequisite_content_id uuid REFERENCES public.content_items(id),
  max_attempts integer NOT NULL DEFAULT 3,
  score_counts_as text NOT NULL DEFAULT 'best' CHECK (score_counts_as IN ('best','last','average')),
  points integer NOT NULL DEFAULT 100,
  late_submission_allowed boolean NOT NULL DEFAULT true,
  late_penalty_percent_per_day integer NOT NULL DEFAULT 10,
  is_anonymous_submission boolean NOT NULL DEFAULT false,
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  deleted_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

-- 8. Submissions
CREATE TABLE public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL DEFAULT 1,
  body jsonb NOT NULL DEFAULT '{}',
  ai_score float,
  teacher_score float,
  final_score float,
  score_overridden boolean NOT NULL DEFAULT false,
  override_reason text,
  override_by uuid REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft','submitted','graded','regraded')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  graded_at timestamptz,
  regrade_requested boolean NOT NULL DEFAULT false,
  regrade_reason text
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- 9. Learning Nodes
CREATE TABLE public.learning_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organisations(id),
  type text NOT NULL CHECK (type IN ('concept','note','quiz','task','skill')),
  subject text NOT NULL,
  title text NOT NULL,
  difficulty float NOT NULL DEFAULT 5.0,
  bloom_level text NOT NULL DEFAULT 'remember' CHECK (bloom_level IN ('remember','understand','apply','analyze','evaluate','create')),
  prerequisites uuid[] NOT NULL DEFAULT '{}',
  linked_nodes uuid[] NOT NULL DEFAULT '{}',
  estimated_mins integer NOT NULL DEFAULT 15,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_nodes ENABLE ROW LEVEL SECURITY;

-- 10. User Concept States
CREATE TABLE public.user_concept_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  concept_id uuid NOT NULL REFERENCES public.learning_nodes(id) ON DELETE CASCADE,
  mastery_score float NOT NULL DEFAULT 0,
  exposure_count integer NOT NULL DEFAULT 0,
  last_reviewed timestamptz,
  next_review_due timestamptz,
  forgetting_rate float NOT NULL DEFAULT 0.1,
  weakness_flag boolean NOT NULL DEFAULT false,
  confused_with uuid[] NOT NULL DEFAULT '{}',
  UNIQUE(user_id, concept_id)
);

ALTER TABLE public.user_concept_states ENABLE ROW LEVEL SECURITY;

-- 11. LMS AI Sessions
CREATE TABLE public.lms_ai_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  classroom_id uuid REFERENCES public.classrooms(id),
  content_ref_type text,
  content_ref_id uuid,
  messages jsonb NOT NULL DEFAULT '[]',
  summary text,
  tokens_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lms_ai_sessions ENABLE ROW LEVEL SECURITY;

-- 12. LMS Audit Logs
CREATE TABLE public.lms_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES public.profiles(id),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}',
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lms_audit_logs ENABLE ROW LEVEL SECURITY;

-- 13. LMS Announcements
CREATE TABLE public.lms_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  org_id uuid REFERENCES public.organisations(id),
  classroom_id uuid REFERENCES public.classrooms(id),
  title text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lms_announcements ENABLE ROW LEVEL SECURITY;

-- 14. Warnings
CREATE TABLE public.warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id),
  flagged_by uuid NOT NULL REFERENCES public.profiles(id),
  classroom_id uuid REFERENCES public.classrooms(id),
  reason text NOT NULL,
  notes text,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.warnings ENABLE ROW LEVEL SECURITY;

-- 15. LMS Recycle Bin
CREATE TABLE public.lms_recycle_bin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type text NOT NULL,
  item_id uuid NOT NULL,
  item_snapshot jsonb NOT NULL,
  deleted_by uuid NOT NULL REFERENCES public.profiles(id),
  permanent_delete_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lms_recycle_bin ENABLE ROW LEVEL SECURITY;

-- 16. Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lms_announcements;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Helper function: get user role
CREATE OR REPLACE FUNCTION public.get_user_role(uid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE user_id = uid LIMIT 1;
$$;

-- Helper function: get user org_id
CREATE OR REPLACE FUNCTION public.get_user_org_id(uid uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT org_id FROM public.profiles WHERE user_id = uid LIMIT 1;
$$;

-- Helper function: get user profile id
CREATE OR REPLACE FUNCTION public.get_profile_id(uid uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM public.profiles WHERE user_id = uid LIMIT 1;
$$;

-- ORGANISATIONS
CREATE POLICY "SA can manage own org" ON public.organisations
  FOR ALL TO authenticated
  USING (
    id = public.get_user_org_id(auth.uid())
    AND public.get_user_role(auth.uid()) IN ('super_admin','admin')
  );

CREATE POLICY "Org members can read org" ON public.organisations
  FOR SELECT TO authenticated
  USING (id = public.get_user_org_id(auth.uid()));

-- DEPARTMENTS
CREATE POLICY "Org members can read departments" ON public.departments
  FOR SELECT TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "SA/Admin can manage departments" ON public.departments
  FOR ALL TO authenticated
  USING (
    org_id = public.get_user_org_id(auth.uid())
    AND public.get_user_role(auth.uid()) IN ('super_admin','admin')
  );

-- CLASSROOMS
CREATE POLICY "Classroom owner can manage" ON public.classrooms
  FOR ALL TO authenticated
  USING (owner_id = public.get_profile_id(auth.uid()));

CREATE POLICY "Org SA/Admin can read classrooms" ON public.classrooms
  FOR SELECT TO authenticated
  USING (
    org_id = public.get_user_org_id(auth.uid())
    AND public.get_user_role(auth.uid()) IN ('super_admin','admin')
  );

CREATE POLICY "Members can read their classrooms" ON public.classrooms
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classroom_members cm
      WHERE cm.classroom_id = classrooms.id
      AND cm.user_id = public.get_profile_id(auth.uid())
      AND cm.status = 'active'
    )
  );

-- CLASSROOM MEMBERS
CREATE POLICY "Classroom owner manages members" ON public.classroom_members
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classrooms c
      WHERE c.id = classroom_members.classroom_id
      AND c.owner_id = public.get_profile_id(auth.uid())
    )
  );

CREATE POLICY "Members can read own membership" ON public.classroom_members
  FOR SELECT TO authenticated
  USING (user_id = public.get_profile_id(auth.uid()));

CREATE POLICY "SA/Admin can manage all members" ON public.classroom_members
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classrooms c
      WHERE c.id = classroom_members.classroom_id
      AND c.org_id = public.get_user_org_id(auth.uid())
    )
    AND public.get_user_role(auth.uid()) IN ('super_admin','admin')
  );

-- INVITES
CREATE POLICY "Creator can manage invites" ON public.invites
  FOR ALL TO authenticated
  USING (invited_by = public.get_profile_id(auth.uid()));

CREATE POLICY "SA/Admin can read org invites" ON public.invites
  FOR SELECT TO authenticated
  USING (
    org_id = public.get_user_org_id(auth.uid())
    AND public.get_user_role(auth.uid()) IN ('super_admin','admin')
  );

CREATE POLICY "Anyone can read invite by token" ON public.invites
  FOR SELECT TO anon, authenticated
  USING (true);

-- CONTENT ITEMS
CREATE POLICY "Creator can manage content" ON public.content_items
  FOR ALL TO authenticated
  USING (created_by = public.get_profile_id(auth.uid()));

CREATE POLICY "Published content visible to enrolled" ON public.content_items
  FOR SELECT TO authenticated
  USING (
    status = 'published'
    AND (
      classroom_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.classroom_members cm
        WHERE cm.classroom_id = content_items.classroom_id
        AND cm.user_id = public.get_profile_id(auth.uid())
        AND cm.status = 'active'
      )
    )
  );

CREATE POLICY "SA/Admin can read all org content" ON public.content_items
  FOR SELECT TO authenticated
  USING (
    org_id = public.get_user_org_id(auth.uid())
    AND public.get_user_role(auth.uid()) IN ('super_admin','admin')
  );

-- SUBMISSIONS
CREATE POLICY "Users can manage own submissions" ON public.submissions
  FOR ALL TO authenticated
  USING (user_id = public.get_profile_id(auth.uid()));

CREATE POLICY "Teacher can read classroom submissions" ON public.submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.content_items ci
      JOIN public.classrooms c ON c.id = ci.classroom_id
      WHERE ci.id = submissions.content_id
      AND c.owner_id = public.get_profile_id(auth.uid())
    )
  );

-- LEARNING NODES
CREATE POLICY "Authenticated can read learning nodes" ON public.learning_nodes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "SA/Admin/Teacher can manage nodes" ON public.learning_nodes
  FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('super_admin','admin','teacher'));

-- USER CONCEPT STATES
CREATE POLICY "Users own their concept states" ON public.user_concept_states
  FOR ALL TO authenticated
  USING (user_id = public.get_profile_id(auth.uid()));

-- LMS AI SESSIONS
CREATE POLICY "Users own their ai sessions" ON public.lms_ai_sessions
  FOR ALL TO authenticated
  USING (user_id = public.get_profile_id(auth.uid()));

-- LMS AUDIT LOGS
CREATE POLICY "SA can read audit logs" ON public.lms_audit_logs
  FOR SELECT TO authenticated
  USING (public.get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "System can insert audit logs" ON public.lms_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = public.get_profile_id(auth.uid()));

-- ANNOUNCEMENTS
CREATE POLICY "Creator manages announcements" ON public.lms_announcements
  FOR ALL TO authenticated
  USING (created_by = public.get_profile_id(auth.uid()));

CREATE POLICY "Org members can read announcements" ON public.lms_announcements
  FOR SELECT TO authenticated
  USING (
    org_id = public.get_user_org_id(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.classroom_members cm
      WHERE cm.classroom_id = lms_announcements.classroom_id
      AND cm.user_id = public.get_profile_id(auth.uid())
    )
  );

-- WARNINGS
CREATE POLICY "Flaggers can manage warnings" ON public.warnings
  FOR ALL TO authenticated
  USING (flagged_by = public.get_profile_id(auth.uid()));

CREATE POLICY "SA/Admin can read warnings" ON public.warnings
  FOR SELECT TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('super_admin','admin')
  );

-- RECYCLE BIN
CREATE POLICY "SA can manage recycle bin" ON public.lms_recycle_bin
  FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Deleters can read own items" ON public.lms_recycle_bin
  FOR SELECT TO authenticated
  USING (deleted_by = public.get_profile_id(auth.uid()));

-- NOTIFICATIONS
CREATE POLICY "Users own their notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (user_id = public.get_profile_id(auth.uid()));

CREATE POLICY "Users can insert own notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.get_profile_id(auth.uid()));
