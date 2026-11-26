CREATE TABLE IF NOT EXISTS matchter.swipe_cards (
 profile_id uuid PRIMARY KEY REFERENCES matchter.account_profiles(id),
 display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 150),
 city text NOT NULL CHECK (char_length(city) BETWEEN 1 AND 100),
 specialty text NOT NULL CHECK (char_length(specialty) BETWEEN 1 AND 120),
 bio text NOT NULL CHECK (char_length(bio)<=600),
 work_mode text NOT NULL DEFAULT '' CHECK (work_mode IN ('','Independiente','Con equipo','Contratista')),
 published boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS matchter.swipe_favorites (
 owner_profile_id uuid NOT NULL REFERENCES matchter.account_profiles(id),
 target_profile_id uuid NOT NULL REFERENCES matchter.swipe_cards(profile_id),
 saved boolean NOT NULL DEFAULT true,
 PRIMARY KEY(owner_profile_id,target_profile_id),
 CHECK(owner_profile_id<>target_profile_id)
);
CREATE TABLE IF NOT EXISTS matchter.swipe_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 sender_profile_id uuid NOT NULL REFERENCES matchter.account_profiles(id),
 recipient_profile_id uuid NOT NULL REFERENCES matchter.account_profiles(id),
 dedupe_key text NOT NULL CHECK(char_length(dedupe_key)=64),
 details jsonb NOT NULL CHECK(jsonb_typeof(details)='object'),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(),
 responded_at timestamptz,
 CHECK(sender_profile_id<>recipient_profile_id),
 CHECK((status='pending')=(responded_at IS NULL)),
 UNIQUE(sender_profile_id,recipient_profile_id,dedupe_key)
);
CREATE INDEX IF NOT EXISTS swipe_requests_recipient_idx ON matchter.swipe_requests(recipient_profile_id,created_at DESC);
CREATE INDEX IF NOT EXISTS swipe_requests_sender_idx ON matchter.swipe_requests(sender_profile_id,created_at DESC);
GRANT SELECT (profile_id,display_name,city,specialty,bio,work_mode,published,updated_at), INSERT (profile_id,display_name,city,specialty,bio,work_mode,published), UPDATE (display_name,city,specialty,bio,work_mode,published,updated_at) ON matchter.swipe_cards TO matchter_auth_app;
GRANT SELECT (owner_profile_id,target_profile_id,saved), INSERT (owner_profile_id,target_profile_id,saved), UPDATE (saved) ON matchter.swipe_favorites TO matchter_auth_app;
GRANT SELECT (id,sender_profile_id,recipient_profile_id,dedupe_key,details,status,created_at,responded_at), INSERT (sender_profile_id,recipient_profile_id,dedupe_key,details), UPDATE (status,responded_at) ON matchter.swipe_requests TO matchter_auth_app;
