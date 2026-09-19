# BacklinkBase

Production-ready website discovery directory for **backlinkbase.org**.

## Architecture

- **Frontend:** Cloudflare Pages
- **Domain:** https://backlinkbase.org
- **Database/API:** Supabase
- **Public reads:** server-side Supabase RPCs with indexed pagination
- **Writes:** `directory-write` Supabase Edge Function only
- **Secrets:** privileged Supabase secret keys stay inside Edge Functions
- **Homepage:** latest 5 per category, capped at 50
- **Discover:** server-side category/search pagination, 50 per page

## Production security

The public browser never writes directly to `sites`, `site_votes`, or `site_comments`.

`directory-write` provides:
- IP and client rate limits
- hashed IP/client identifiers instead of storing raw IPs
- duplicate URL protection
- mandatory category validation
- server-side metadata fetching
- SSRF-oriented URL validation and private-host blocking
- blocked-domain support
- phone-number detection
- prohibited-content filtering
- comment link blocking
- moderation event logging
- repeated-violation automatic temporary blocking
- anonymous vote/comment abuse controls
- CORS allowlisting for the production domain

### Rate limits

Current server-side limits:
- submissions: 3/hour per IP and 5/hour per client
- comments: 10/10 minutes per IP and 15/10 minutes per client
- votes: 30/minute per IP
- repeated moderation violations: 3 strikes in 24 hours → 24-hour client block

These are abuse controls, not a guarantee that every malicious website or bypass technique can be detected automatically. The `blocked_domains` table is available for manual/domain-level enforcement.

## Database

Run `schema.sql` on a new environment, or use the applied Supabase migrations on the production project.

RLS remains enabled. Sensitive moderation/rate-limit tables are not publicly readable/writable. Public engagement counts are exposed through a controlled aggregate RPC rather than exposing client hashes.

## Deployment

Cloudflare Pages should point to the GitHub repository and use `main` as the production branch.

The production canonical URL is:

https://backlinkbase.org/

Never put a Supabase secret/service-role key in frontend code. The browser may contain only the publishable key, with access constrained by RLS and the Edge Function architecture.