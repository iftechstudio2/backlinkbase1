# BacklinkBase

Curated website discovery directory for **backlinkbase.org**.

## Architecture

- **Frontend:** Multi-page static architecture hosted on Cloudflare Pages
- **Domain:** https://backlinkbase.org
- **Backend & Database:** Supabase PostgreSQL with Row Level Security (RLS)
- **Submissions:** Handled securely via `directory-write` Supabase Edge Function
- **Admin Moderation:** Protected `/admin/dashboard/` via `admin-directory` Supabase Edge Function

## Features

- **Discover Directory:** Category filters, responsive site showcase cards, direct external links (`Visit Website ↗`), and integrated sharing popovers (X, LinkedIn, WhatsApp, 1-Click Copy).
- **Safe Submission Flow:** Explicit "Fetch Website Details" button with loading animations and duplicate-domain detection.
- **Admin Portal:** Live statistics (Total, Pending, Approved, Categories) with 1-click Approve, Reject, and Delete actions.
- **Modern Theme:** Minimalist high-contrast Black & Light Gray styling with persistent Dark/Light mode toggle.
- **SEO & Compliance:** Schema.org JSON-LD structured data, clean `sitemap.xml`, `robots.txt`, Terms, Privacy Policy, Guidelines, and Disclaimer.
