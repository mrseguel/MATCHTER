BEGIN;

CREATE SCHEMA matchter;

CREATE TABLE matchter.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_issuer text NOT NULL,
  auth_subject text NOT NULL,
  role text NOT NULL CHECK (role IN ('Cliente','Maestro o contratista','Profesional','Empresa')),
  UNIQUE (auth_issuer, auth_subject)
);

CREATE TABLE matchter.requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES matchter.accounts,
  recipient_id uuid NOT NULL REFERENCES matchter.accounts,
  kind text NOT NULL CHECK (kind IN ('profile_invitation','project_interest')),
  dedupe_key text NOT NULL CHECK (length(trim(dedupe_key)) > 0),
  details jsonb NOT NULL CHECK (jsonb_typeof(details) = 'object'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CHECK (sender_id <> recipient_id),
  CHECK ((status = 'pending') = (responded_at IS NULL)),
  UNIQUE (sender_id, recipient_id, kind, dedupe_key)
);

CREATE INDEX requests_inbox ON matchter.requests (recipient_id, created_at DESC);

CREATE VIEW matchter.matches AS
SELECT id AS request_id, sender_id, recipient_id, responded_at AS matched_at
FROM matchter.requests WHERE status = 'accepted';

-- The backend must derive actor_id from the authenticated session.
CREATE FUNCTION matchter.respond(request_id uuid, actor_id uuid, decision text)
RETURNS boolean LANGUAGE sql AS $$
  WITH changed AS (
    UPDATE matchter.requests SET status = decision, responded_at = now()
    WHERE id = request_id AND recipient_id = actor_id AND status = 'pending'
      AND decision IN ('accepted','rejected')
    RETURNING id
  ) SELECT EXISTS (SELECT 1 FROM changed)
$$;

REVOKE ALL ON FUNCTION matchter.respond(uuid, uuid, text) FROM PUBLIC;

DO $test$
DECLARE a uuid; b uuid; c uuid; r uuid; rejected uuid;
BEGIN
  BEGIN
    INSERT INTO matchter.accounts(auth_issuer,auth_subject,role) VALUES ('test',gen_random_uuid()::text,'Cliente') RETURNING id INTO a;
    INSERT INTO matchter.accounts(auth_issuer,auth_subject,role) VALUES ('test',gen_random_uuid()::text,'Profesional') RETURNING id INTO b;
    INSERT INTO matchter.accounts(auth_issuer,auth_subject,role) VALUES ('test',gen_random_uuid()::text,'Empresa') RETURNING id INTO c;
    INSERT INTO matchter.requests(sender_id,recipient_id,kind,dedupe_key,details) VALUES(a,b,'profile_invitation','1','{}') RETURNING id INTO r;
    IF matchter.respond(r,c,'accepted') THEN RAISE EXCEPTION 'Third party accepted'; END IF;
    IF NOT matchter.respond(r,b,'accepted') THEN RAISE EXCEPTION 'Acceptance failed'; END IF;
    IF matchter.respond(r,b,'accepted') OR (SELECT count(*) FROM matchter.matches WHERE request_id=r) <> 1 THEN RAISE EXCEPTION 'Repeat acceptance failed'; END IF;
    INSERT INTO matchter.requests(sender_id,recipient_id,kind,dedupe_key,details) VALUES(a,b,'profile_invitation','2','{}') RETURNING id INTO rejected;
    IF NOT matchter.respond(rejected,b,'rejected') THEN RAISE EXCEPTION 'Rejection failed'; END IF;
    IF EXISTS(SELECT FROM matchter.matches WHERE request_id=rejected) THEN RAISE EXCEPTION 'Rejected match'; END IF;
    RAISE SQLSTATE 'Z0001'; -- Roll back the test fixtures.
  EXCEPTION WHEN SQLSTATE 'Z0001' THEN NULL;
  END;
END $test$;

COMMIT;
