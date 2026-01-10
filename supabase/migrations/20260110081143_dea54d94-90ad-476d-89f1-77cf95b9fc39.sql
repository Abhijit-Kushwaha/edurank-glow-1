-- Add unique constraint on name column
ALTER TABLE public.profiles ADD CONSTRAINT profiles_name_unique UNIQUE (name);