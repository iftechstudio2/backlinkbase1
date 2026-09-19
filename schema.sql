create extension if not exists pgcrypto;
create table if not exists categories(id uuid primary key default gen_random_uuid(),name text not null unique,slug text not null unique,description text default '',seo_title text default '',seo_description text default '',icon text,parent_id uuid references categories(id),created_at timestamptz default now(),updated_at timestamptz default now());
create table if not exists sites(id uuid primary key default gen_random_uuid(),url text not null,normalized_url text not null unique,domain text not null,title text,description text,logo_url text,favicon_url text,og_title text,og_description text,og_image text,category_id uuid references categories(id),status text not null default 'pending' check(status in ('pending','approved','rejected','disabled')),submitted_at timestamptz default now(),updated_at timestamptz default now(),last_checked_at timestamptz,fetch_status text,fetch_error text,view_count bigint not null default 0,slug text not null unique);
create index if not exists sites_category_idx on sites(category_id);create index if not exists sites_status_idx on sites(status);create index if not exists sites_submitted_idx on sites(submitted_at desc);create index if not exists sites_domain_idx on sites(domain);create index if not exists sites_title_idx on sites(title);
alter table categories enable row level security;alter table sites enable row level security;
create policy "public read categories" on categories for select using(true);
create policy "public read approved sites" on sites for select using(status='approved');
insert into categories(name,slug) values ('AI','ai'),('Artificial Intelligence','artificial-intelligence'),('Technology','technology'),('Software','software'),('SaaS','saas'),('Web Tools','web-tools'),('Developer Tools','developer-tools'),('Programming','programming'),('Design','design'),('Graphics','graphics'),('Marketing','marketing'),('SEO','seo'),('Business','business'),('Finance','finance'),('E-commerce','e-commerce'),('Shopping','shopping'),('Education','education'),('Learning','learning'),('News','news'),('Media','media'),('Entertainment','entertainment'),('Games','games'),('Gaming','gaming'),('Health','health'),('Fitness','fitness'),('Travel','travel'),('Food','food'),('Recipes','recipes'),('Lifestyle','lifestyle'),('Personal Blogs','personal-blogs'),('Photography','photography'),('Video','video'),('Music','music'),('Sports','sports'),('Jobs','jobs'),('Careers','careers'),('Real Estate','real-estate'),('Construction','construction'),('Home Improvement','home-improvement'),('Automotive','automotive'),('Legal','legal'),('Government','government'),('Nonprofit','nonprofit'),('Communities','communities'),('Forums','forums'),('Social','social'),('Productivity','productivity'),('Utilities','utilities'),('Internet Services','internet-services'),('Hosting','hosting'),('Domains','domains'),('Security','security'),('Cybersecurity','cybersecurity'),('Mobile Apps','mobile-apps'),('Android','android'),('iOS','ios'),('WordPress','wordpress'),('Blogging','blogging'),('Newsletters','newsletters'),('Online Services','online-services'),('Directories','directories'),('Reference','reference'),('Science','science'),('Research','research'),('Books','books'),('Literature','literature'),('Art','art'),('Fashion','fashion'),('Beauty','beauty'),('Parenting','parenting'),('Pets','pets'),('Shopping Deals','shopping-deals'),('Local Businesses','local-businesses'),('Startups','startups'),('Agencies','agencies'),('Freelancers','freelancers'),('Portfolios','portfolios'),('Other','other') on conflict(name) do nothing;
-- Community engagement
create table if not exists site_votes(
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(site_id,user_id)
);
create index if not exists site_votes_site_idx on site_votes(site_id);

create table if not exists site_comments(
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check(char_length(body) between 1 and 1000),
  status text not null default 'pending' check(status in ('pending','approved','rejected','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists site_comments_site_idx on site_comments(site_id,status,created_at desc);

create table if not exists blocked_users(
  user_id uuid primary key references auth.users(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  blocked_until timestamptz
);

create table if not exists moderation_events(
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  site_id uuid references sites(id) on delete cascade,
  action text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

alter table site_votes enable row level security;
alter table site_comments enable row level security;
alter table blocked_users enable row level security;
alter table moderation_events enable row level security;

create policy "read vote counts" on site_votes for select using(true);

-- Server-side moderation/rate limiting must be performed by a trusted Edge Function.
-- Never expose a service-role key in browser code. Apply per-IP and per-account limits
-- in the Edge Function, then write moderation_events and block repeat offenders.

-- Production abuse controls: writes are handled only by the directory-write Edge Function.
create table if not exists rate_limit_buckets(
  bucket_key text primary key,
  window_started_at timestamptz not null,
  hits integer not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists rate_limit_buckets_updated_idx on rate_limit_buckets(updated_at);

create table if not exists blocked_clients(
  client_hash text primary key,
  reason text not null,
  created_at timestamptz not null default now(),
  blocked_until timestamptz
);
create index if not exists blocked_clients_until_idx on blocked_clients(blocked_until);

create table if not exists blocked_domains(
  domain text primary key,
  reason text not null default 'blocked',
  created_at timestamptz not null default now()
);

alter table rate_limit_buckets enable row level security;
alter table blocked_clients enable row level security;
alter table blocked_domains enable row level security;
revoke all on rate_limit_buckets, blocked_clients, blocked_domains from anon, authenticated;

alter table site_votes alter column user_id drop not null;
alter table site_votes add column if not exists client_hash text;
alter table site_votes drop constraint if exists site_votes_user_id_fkey;
alter table site_votes add constraint site_votes_actor_check check(user_id is not null or client_hash is not null);
create unique index if not exists site_votes_site_client_uidx on site_votes(site_id,client_hash) where client_hash is not null;

alter table site_comments alter column user_id drop not null;
alter table site_comments add column if not exists client_hash text;
alter table site_comments drop constraint if exists site_comments_user_id_fkey;
alter table site_comments add constraint site_comments_actor_check check(user_id is not null or client_hash is not null);

alter table moderation_events add column if not exists client_hash text;
alter table moderation_events add column if not exists ip_hash text;
alter table moderation_events add column if not exists metadata jsonb not null default '{}'::jsonb;

revoke select on site_votes, site_comments from anon, authenticated;

create or replace function consume_rate_limit(p_bucket_key text,p_window_seconds integer,p_max_hits integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_now timestamptz:=now(); v_row rate_limit_buckets%rowtype; v_reset timestamptz; v_allowed boolean;
begin
 if p_window_seconds<1 or p_window_seconds>86400 or p_max_hits<1 or p_max_hits>1000 then raise exception 'invalid rate limit parameters'; end if;
 insert into rate_limit_buckets(bucket_key,window_started_at,hits,updated_at) values(p_bucket_key,v_now,1,v_now)
 on conflict(bucket_key) do update set
 hits=case when rate_limit_buckets.window_started_at+make_interval(secs=>p_window_seconds)<=v_now then 1 else rate_limit_buckets.hits+1 end,
 window_started_at=case when rate_limit_buckets.window_started_at+make_interval(secs=>p_window_seconds)<=v_now then v_now else rate_limit_buckets.window_started_at end,
 updated_at=v_now returning * into v_row;
 v_reset=v_row.window_started_at+make_interval(secs=>p_window_seconds); v_allowed=v_row.hits<=p_max_hits;
 return jsonb_build_object('allowed',v_allowed,'hits',v_row.hits,'limit',p_max_hits,'reset_at',v_reset);
end; $$;
revoke all on function consume_rate_limit(text,integer,integer) from public,anon,authenticated;

create or replace function site_engagement(p_site_ids uuid[])
returns table(site_id uuid,vote_count bigint,comment_count bigint)
language sql security definer set search_path=public as $$
 select s.id,
   (select count(*) from site_votes v where v.site_id=s.id),
   (select count(*) from site_comments c where c.site_id=s.id and c.status='approved')
 from sites s where s.id=any(p_site_ids) and s.status='approved';
$$;
revoke all on function site_engagement(uuid[]) from public,anon,authenticated;
grant execute on function site_engagement(uuid[]) to anon,authenticated;

revoke execute on function rls_auto_enable() from anon,authenticated;

-- Keep blocked_users and moderation_events server-only. Their RLS remains enabled with no public access.
