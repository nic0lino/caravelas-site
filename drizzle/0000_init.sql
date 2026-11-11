CREATE TYPE "public"."audit_action" AS ENUM('save_draft', 'discard_draft', 'publish', 'restore', 'import');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('editor', 'admin');--> statement-breakpoint
CREATE TYPE "public"."version_status" AS ENUM('published', 'archived');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"site_id" text NOT NULL,
	"actor" text NOT NULL,
	"action" "audit_action" NOT NULL,
	"version_id" text,
	"details" jsonb
);
--> statement-breakpoint
CREATE TABLE "drafts" (
	"site_id" text PRIMARY KEY NOT NULL,
	"revision" integer NOT NULL,
	"based_on" text,
	"content" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"updated_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"user_id" text NOT NULL,
	"site_id" text NOT NULL,
	"role" "role" DEFAULT 'editor' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_user_id_site_id_pk" PRIMARY KEY("user_id","site_id")
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp with time zone,
	"image" text,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "versions" (
	"site_id" text NOT NULL,
	"number" integer NOT NULL,
	"status" "version_status" NOT NULL,
	"content" jsonb NOT NULL,
	"author" text NOT NULL,
	"note" text,
	"based_on" text,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "versions_site_id_number_pk" PRIMARY KEY("site_id","number")
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drafts" ADD CONSTRAINT "drafts_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "versions" ADD CONSTRAINT "versions_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_site_at" ON "audit_log" USING btree ("site_id","at");--> statement-breakpoint
CREATE UNIQUE INDEX "versions_one_published" ON "versions" USING btree ("site_id") WHERE "versions"."status" = 'published';