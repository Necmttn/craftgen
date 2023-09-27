DO $$ BEGIN
 CREATE TYPE "article_status" AS ENUM('draft', 'published', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "member_role" AS ENUM('owner', 'admin', 'editor', 'viewer');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "article_metadata" (
	"id" uuid PRIMARY KEY NOT NULL,
	"article_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "articles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"article_status" "article_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"site" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_members" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"member_role" "member_role" DEFAULT 'viewer' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"full_name" text,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- This trigger automatically creates a profile entry when a new user signs up via Supabase Auth.
-- See https://supabase.com/docs/guides/auth/managing-user-data#using-triggers for more details.
create function public.handle_new_user()
returns trigger as $$
declare 
  new_username text;
  counter int := 0;
  new_project_id uuid;
begin
  new_username := split_part(new.email, '@', 1);
  
  while exists(select 1 from public.user where username = new_username) loop
    counter := counter + 1;
    new_username := split_part(new.email, '@', 1) || '_' || counter;
  end loop;

  insert into public.user (id, email, username, full_name, avatar_url)
  values (new.id, new.email, new_username, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');

  new_project_id := gen_random_uuid();

  insert into public.project (id, name, slug, personal)
  values (new_project_id, new.raw_user_meta_data->>'full_name', new_username, true);

  insert into public.project_members (id, project_id, user_id, member_role)
  values (gen_random_uuid(), new_project_id, new.id, 'owner');

	-- Insert into project_variable table
  insert into public.project_variable (id, project_id, key, is_system)
  values (gen_random_uuid(), new_project_id, 'OPENAI_API_KEY', true),
         (gen_random_uuid(), new_project_id, 'REPLICATE_API_KEY', true);

  return new;
end;
$$ language plpgsql security definer;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
