# Supabase Integration

The Supabase connection layer is implemented and used by the Auth backend.

`@supabase/supabase-js` and `@supabase/ssr` are installed with exact version pins.
Supabase Auth is the chosen authentication service; `auth.users` owns identity
and is the source of truth for email.

## Existing integration

- `client.ts` creates a typed browser client using browser-readable cookie
  sessions. `server.ts` creates a request-scoped server client with cookie access.
- `src/proxy.ts` already refreshes Auth sessions and propagates cookie changes.
  Server operations verify identity with `getUser()` before accessing own data.
- Auth signup/login/logout/current-user endpoints and Server Actions use this
  infrastructure. Reuse them instead of creating another Auth connection layer.

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the
local environment using `.env.example`. A running Local or configured hosted
Supabase service is required for Auth; having client files does not provision it.
See [Backend Setup](../../../docs/backend-setup.md) for Local startup.

Clients use `Database` from `@/types/database`. Local schema is v4, but generation
is explicitly deferred until approved real-data import; checked-in types still
reflect v3. Auth columns are unchanged. Regenerate/review types before adding
typed v4 queries; do not hand-edit generated types or query removed tables.

Keep queries specific to a feature in that feature's `server/` directory. Keep
administrative credentials server-only and enforce database access using RLS.
Only own-profile client policies currently exist. Building, check-in, reward and
badge APIs/access rules remain separate work; see
[Backend Handoff](../../../docs/backend-handoff.md).

See [the architecture guide](../../../docs/architecture.md) for boundaries
and [the official client guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
for the integration workflow.
