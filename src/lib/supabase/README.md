# Supabase Integration

Reserved for the planned Supabase connection layer. No client is configured yet.

When database integration begins:

1. Install `@supabase/supabase-js` and, for cookie-based Next.js authentication,
   `@supabase/ssr`.
2. Copy `.env.example` to `.env.local` and fill in the project URL and publishable
   key locally.
3. Add `client.ts` for browser access and `server.ts` for request-scoped server
   access. Use generated types from `@/types/database` once the schema exists.
4. If Supabase Auth is enabled, implement session refresh with Next.js Proxy and
   cookie handling before relying on authenticated server rendering.

Keep queries specific to a feature in that feature's `server/` directory. Keep
administrative credentials server-only and enforce database access using RLS.

See [the architecture guide](../../../docs/architecture.md) for boundaries
and [the official client guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
for the integration workflow.
