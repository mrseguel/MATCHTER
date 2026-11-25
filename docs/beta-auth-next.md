# Authentication activation (not connected)
- Create an isolated Neon database, apply reviewed migrations and use server-only DATABASE_URL.
- Use server-side authentication with a maintained library or managed identity provider, email verification, password recovery and secure sessions.
- Configure Google OAuth client and Apple Sign in with Apple (Services ID, domain/return URL and signing credentials as required). Keep secrets out of client and source.
- Google/Apple first login: verify provider identity on server, then complete role-specific onboarding. Never merge accounts solely by an unverified email. Preserve Apple private relay address if used.
- Test callbacks and linking, rejection, logout and session expiry before release. No external sign-in occurs in this preview.
- Treat company RUT, representative RUT, addresses and phone as private; verify legal data before contract signature.
