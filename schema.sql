-- BacklinkBase Production Database Schema
-- Lightweight, clean directory structure (Categories & Sites)

create extension if not exists pgcrypto;
create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

-- Categories Table
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text default '',
  seo_title text default '',
  seo_description text default '',
  icon text,
  parent_id uuid references categories(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Sites Table
create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  domain text not null,
  title text not null,
  description text default '',
  logo_url text,
  favicon_url text,
  category_id uuid references categories(id) on delete set null,
  status text not null default 'pending' check(status in ('pending','approved','rejected','disabled')),
  submitted_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_checked_at timestamptz,
  fetch_status text,
  fetch_error text,
  view_count bigint not null default 0
);

-- Indexes for fast filtering & search
create index if not exists sites_category_idx on sites(category_id);
create index if not exists sites_status_idx on sites(status);
create index if not exists sites_submitted_idx on sites(submitted_at desc);
create index if not exists sites_domain_idx on sites(domain);
create index if not exists sites_title_idx on sites(title);

-- Row Level Security (RLS)
alter table categories enable row level security;
alter table sites enable row level security;

-- Public read policies
create policy "public read categories" on categories for select using(true);
create policy "public read approved sites" on sites for select using(status = 'approved');

-- Default Categories Seed
insert into categories (name, slug) values 
  ('AI', 'ai'),
  ('Artificial Intelligence', 'artificial-intelligence'),
  ('Technology', 'technology'),
  ('Software', 'software'),
  ('SaaS', 'saas'),
  ('Web Tools', 'web-tools'),
  ('Developer Tools', 'developer-tools'),
  ('Programming', 'programming'),
  ('Design', 'design'),
  ('Graphics', 'graphics'),
  ('Marketing', 'marketing'),
  ('SEO', 'seo'),
  ('Business', 'business'),
  ('Finance', 'finance'),
  ('E-commerce', 'e-commerce'),
  ('Education', 'education'),
  ('Health', 'health'),
  ('Lifestyle', 'lifestyle'),
  ('Productivity', 'productivity'),
  ('Utilities', 'utilities'),
  ('Startups', 'startups'),
  ('Other', 'other')
on conflict (name) do nothing;
