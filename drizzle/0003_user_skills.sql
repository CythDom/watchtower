CREATE TABLE "user_skills" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "skill" text NOT NULL,
  "level" integer NOT NULL DEFAULT 0,
  "source" text NOT NULL DEFAULT 'onboarding',
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "user_skills_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action
);
