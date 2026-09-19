create extension if not exists pgcrypto;
create table if not exists categories(id uuid primary key default gen_random_uuid(),name text not null unique,slug text not null unique,description text default '',seo_title text default '',seo_description text default '',icon text,parent_id uuid references categories(id),created_at timestamptz default now(),updated_at timestamptz default now());
create table if not exists sites(id uuid primary key default gen_random_uuid(),url text not null,normalized_url text not null unique,domain text not null,title text,description text,logo_url text,favicon_url text,og_title text,og_description text,og_image text,category_id uuid references categories(id),status text not null default 'pending' check(status in ('pending','approved','rejected','disabled')),submitted_at timestamptz default now(),updated_at timestamptz default now(),last_checked_at timestamptz,fetch_status text,fetch_error text,view_count bigint not null default 0,slug text not null unique);
create index if not exists sites_category_idx on sites(category_id);create index if not exists sites_status_idx on sites(status);create index if not exists sites_submitted_idx on sites(submitted_at desc);create index if not exists sites_domain_idx on sites(domain);create index if not exists sites_title_idx on sites(title);
alter table categories enable row level security;alter table sites enable row level security;
create policy "public read categories" on categories for select using(true);
create policy "public read approved sites" on sites for select using(status='approved');
create policy "public submit pending sites" on sites for insert with check(status='pending');
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
create policy "users can vote once" on site_votes for insert with check(auth.uid() = user_id);
create policy "users can remove own vote" on site_votes for delete using(auth.uid() = user_id);

create policy "read approved comments" on site_comments for select using(status='approved');
create policy "users create comments" on site_comments for insert with check(auth.uid() = user_id and status='pending');
create policy "users update own pending comments" on site_comments for update using(auth.uid() = user_id and status='pending') with check(auth.uid() = user_id and status='pending');

-- Server-side moderation/rate limiting must be performed by a trusted Edge Function.
-- Never expose a service-role key in browser code. Apply per-IP and per-account limits
-- in the Edge Function, then write moderation_events and block repeat offenders.
