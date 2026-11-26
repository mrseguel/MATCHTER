CREATE TABLE IF NOT EXISTS matchter.swipe_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id uuid NOT NULL REFERENCES matchter.swipe_requests(id),
 sender_profile_id uuid NOT NULL REFERENCES matchter.account_profiles(id),
 client_message_id uuid NOT NULL,
 body text NOT NULL CHECK(char_length(btrim(body)) BETWEEN 1 AND 3000),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(request_id,sender_profile_id,client_message_id)
);
CREATE INDEX IF NOT EXISTS swipe_messages_thread_idx ON matchter.swipe_messages(request_id,created_at DESC,id DESC);
GRANT SELECT (id,request_id,sender_profile_id,client_message_id,body,created_at), INSERT (request_id,sender_profile_id,client_message_id,body) ON matchter.swipe_messages TO matchter_auth_app;
