


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."legacy_profiles" (
    "email" character varying NOT NULL,
    "username" character varying,
    "first_name" character varying,
    "use_metric" boolean,
    "start_date" "date",
    "goal_weight" numeric,
    "planned_pounds_per_week" numeric,
    "day_start_offset" integer,
    "private_url_key" character varying,
    "device_type" character varying,
    "refresh_token" character varying,
    "measurements" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."legacy_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "uid" "uuid" NOT NULL,
    "email" character varying(255) NOT NULL,
    "profile" "jsonb" NOT NULL,
    "created_at" "text" DEFAULT "now"(),
    "updated_at" "text" DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provider_links" (
    "uid" "uuid" NOT NULL,
    "provider" character varying(50) NOT NULL,
    "token" "jsonb" NOT NULL,
    "update_reason" "text",
    "updated_at" "text" DEFAULT "now"()
);


ALTER TABLE "public"."provider_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."source_data" (
    "uid" "uuid" NOT NULL,
    "provider" character varying(50) NOT NULL,
    "measurements" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "last_sync" "text",
    "updated_at" "text" DEFAULT "now"(),
    "force_full_sync" boolean DEFAULT false
);


ALTER TABLE "public"."source_data" OWNER TO "postgres";


COMMENT ON COLUMN "public"."source_data"."force_full_sync" IS 'When true, triggers deletion of this source_data row before next sync, causing a full resync. Auto-clears when new data is written.';



CREATE TABLE IF NOT EXISTS "public"."user_accounts" (
    "uid" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "external_id" character varying NOT NULL,
    "provider" character varying DEFAULT 'clerk'::character varying NOT NULL,
    "created_at" "text" DEFAULT "to_char"(("now"() AT TIME ZONE 'UTC'::"text"), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'::"text"),
    "updated_at" "text" DEFAULT "to_char"(("now"() AT TIME ZONE 'UTC'::"text"), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'::"text")
);


ALTER TABLE "public"."user_accounts" OWNER TO "postgres";


ALTER TABLE ONLY "public"."legacy_profiles"
    ADD CONSTRAINT "legacy_profiles_pkey" PRIMARY KEY ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("uid");



ALTER TABLE ONLY "public"."source_data"
    ADD CONSTRAINT "source_data_pkey" PRIMARY KEY ("uid", "provider");



ALTER TABLE ONLY "public"."user_accounts"
    ADD CONSTRAINT "user_accounts_external_provider_unique" UNIQUE ("external_id", "provider");



ALTER TABLE ONLY "public"."user_accounts"
    ADD CONSTRAINT "user_accounts_pkey" PRIMARY KEY ("uid");



ALTER TABLE ONLY "public"."provider_links"
    ADD CONSTRAINT "vendor_links_pkey" PRIMARY KEY ("uid", "provider");



CREATE INDEX "idx_legacy_profiles_email" ON "public"."legacy_profiles" USING "btree" ("email");



CREATE INDEX "idx_legacy_profiles_username" ON "public"."legacy_profiles" USING "btree" ("username");



CREATE INDEX "idx_source_data_updated" ON "public"."source_data" USING "btree" ("updated_at");



CREATE INDEX "idx_user_accounts_external" ON "public"."user_accounts" USING "btree" ("external_id", "provider");



CREATE INDEX "idx_users_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_vendor_links_updated" ON "public"."provider_links" USING "btree" ("updated_at");



ALTER TABLE ONLY "public"."provider_links"
    ADD CONSTRAINT "provider_links_uid_fkey" FOREIGN KEY ("uid") REFERENCES "public"."profiles"("uid") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."source_data"
    ADD CONSTRAINT "source_data_uid_fkey" FOREIGN KEY ("uid") REFERENCES "public"."profiles"("uid") ON DELETE CASCADE;



CREATE POLICY "Deny all access - admin only through service role" ON "public"."legacy_profiles" TO "authenticated" USING (false);



CREATE POLICY "Deny all access - admin only through service role" ON "public"."profiles" TO "authenticated" USING (false);



CREATE POLICY "Deny all access - admin only through service role" ON "public"."provider_links" TO "authenticated" USING (false);



CREATE POLICY "Deny all access - admin only through service role" ON "public"."source_data" TO "authenticated" USING (false);



CREATE POLICY "Deny all access - admin only through service role" ON "public"."user_accounts" TO "authenticated" USING (false);



CREATE POLICY "Deny all access for anon users" ON "public"."legacy_profiles" TO "anon" USING (false);



CREATE POLICY "Deny all access for anon users" ON "public"."profiles" TO "anon" USING (false);



CREATE POLICY "Deny all access for anon users" ON "public"."provider_links" TO "anon" USING (false);



CREATE POLICY "Deny all access for anon users" ON "public"."source_data" TO "anon" USING (false);



CREATE POLICY "Deny all access for anon users" ON "public"."user_accounts" TO "anon" USING (false);



ALTER TABLE "public"."legacy_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."provider_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."source_data" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_accounts" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


































































































































































GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."legacy_profiles" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."legacy_profiles" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."legacy_profiles" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."provider_links" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."provider_links" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."provider_links" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."source_data" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."source_data" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."source_data" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_accounts" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_accounts" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_accounts" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "service_role";
































  create policy "Allow anonymous sync-progress subscriptions"
  on "realtime"."messages"
  as permissive
  for select
  to authenticated, anon
using (((extension = 'broadcast'::text) AND (topic ~~ 'sync-progress:%'::text)));



