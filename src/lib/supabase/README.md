# Supabase Integration

Reserved for the planned Supabase connection layer. No client is configured yet.

`@supabase/supabase-js` and `@supabase/ssr` are installed with exact version pins.
Supabase Auth is the chosen authentication service; `auth.users` owns identity
and is the source of truth for email.

When database integration begins:

1. Copy `.env.example` to `.env.local` and fill in the project URL and publishable
   key locally.
2. Add `client.ts` for browser access and `server.ts` for request-scoped server
   access. Use generated types from `@/types/database` once the schema exists.
3. Implement Supabase Auth session refresh with Next.js Proxy and
   cookie handling before relying on authenticated server rendering.

Keep queries specific to a feature in that feature's `server/` directory. Keep
administrative credentials server-only and enforce database access using RLS.

See [the architecture guide](../../../docs/architecture.md) for boundaries
and [the official client guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
for the integration workflow.
