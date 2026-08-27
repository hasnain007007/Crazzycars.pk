-- Homefy.pk commerce schema (PostgreSQL / Supabase).
-- Isolated from CrazzyCars. Website and a future mobile app share these tables.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- Vanilla Postgres (local Docker) does not ship Supabase roles. Cloud already has them.
do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories (id) on delete set null,
  name text not null,
  slug text not null unique,
  description text not null default '',
  image_url text not null default '',
  image_alt text not null default '',
  homepage_icon text not null default '',
  level integer not null default 0,
  sort_order integer not null default 0,
  status text not null default 'active' check (status in ('active', 'inactive', 'draft')),
  featured boolean not null default false,
  show_in_nav boolean not null default true,
  show_on_homepage boolean not null default false,
  seo jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index categories_parent_idx on public.categories (parent_id, sort_order);
create index categories_status_featured_idx on public.categories (status, featured);

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  article_no text not null default '',
  sku text not null default '',
  short_description text not null default '',
  long_description text not null default '',
  regular_price numeric(12, 2) not null default 0,
  sale_price numeric(12, 2),
  quantity integer not null default 0,
  track_inventory boolean not null default true,
  allow_backorder boolean not null default false,
  weight numeric(12, 2) not null default 0,
  weight_unit text not null default 'g',
  vendor text not null default 'Homefy',
  product_type text not null default '',
  collections text[] not null default '{}',
  tags text[] not null default '{}',
  features text[] not null default '{}',
  specifications jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('active', 'inactive', 'draft')),
  featured boolean not null default false,
  new_arrival boolean not null default false,
  is_deal boolean not null default false,
  cod_enabled boolean not null default true,
  seo jsonb not null default '{}'::jsonb,
  rating_average numeric(3, 2) not null default 0,
  review_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index products_article_no_nonempty_idx
  on public.products (article_no)
  where article_no <> '';

create index products_status_created_idx on public.products (status, created_at desc);
create index products_featured_idx on public.products (featured) where featured;
create index products_deal_idx on public.products (is_deal) where is_deal;
create index products_price_idx on public.products (regular_price);
create index products_tags_gin_idx on public.products using gin (tags);
create index products_name_trgm_idx on public.products using gin (name gin_trgm_ops);
create index products_search_trgm_idx on public.products using gin (
  (name || ' ' || coalesce(short_description, '')) gin_trgm_ops
);

create table public.product_categories (
  product_id uuid not null references public.products (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  primary key (product_id, category_id)
);

create index product_categories_category_idx on public.product_categories (category_id);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  alt_text text not null default '',
  is_main boolean not null default false,
  sort_order integer not null default 0
);

create index product_images_product_idx on public.product_images (product_id, sort_order);

create table public.product_option_axes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null,
  enabled boolean not null default true,
  values text[] not null default '{}'
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text not null default '',
  options jsonb not null default '[]'::jsonb,
  price numeric(12, 2) not null default 0,
  stock integer not null default 0,
  image_url text not null default ''
);

create index product_variants_product_idx on public.product_variants (product_id);

-- ---------------------------------------------------------------------------
-- CMS / store config
-- ---------------------------------------------------------------------------
create table public.pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  content text not null default '',
  template text not null default 'custom',
  status text not null default 'draft' check (status in ('published', 'draft')),
  show_in_footer boolean not null default false,
  seo jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.store_settings (
  id uuid primary key default gen_random_uuid(),
  singleton_key text not null unique default 'store_settings',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'homepage',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Customers / orders (web + future app)
-- ---------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text not null unique,
  password_hash text not null default '',
  first_name text not null default '',
  last_name text not null default '',
  phone text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  label text not null default 'Home',
  phone text not null default '',
  street text not null default '',
  city text not null default '',
  province text not null default '',
  postcode text not null default '',
  country text not null default 'Pakistan',
  is_default boolean not null default false
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  public_access_token text not null default '',
  customer_id uuid references public.customers (id) on delete set null,
  customer_name text not null default '',
  customer_email text not null default '',
  customer_phone text not null default '',
  shipping_address jsonb not null default '{}'::jsonb,
  payment_method text not null default 'cod',
  status text not null default 'pending',
  subtotal numeric(12, 2) not null default 0,
  shipping_fee numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_customer_idx on public.orders (customer_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  name text not null,
  slug text not null default '',
  image_url text not null default '',
  variation text not null default '',
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null,
  total numeric(12, 2) not null
);

create index order_items_order_idx on public.order_items (order_id);

-- ---------------------------------------------------------------------------
-- Updated-at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger categories_set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger pages_set_updated_at before update on public.pages
  for each row execute function public.set_updated_at();
create trigger store_settings_set_updated_at before update on public.store_settings
  for each row execute function public.set_updated_at();
create trigger customers_set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — storefront/app can read catalog; writes stay on the server.
-- ---------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_categories enable row level security;
alter table public.product_images enable row level security;
alter table public.product_option_axes enable row level security;
alter table public.product_variants enable row level security;
alter table public.pages enable row level security;
alter table public.store_settings enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.customers enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "public_read_active_categories"
  on public.categories for select
  to anon, authenticated
  using (status = 'active');

create policy "public_read_active_products"
  on public.products for select
  to anon, authenticated
  using (status = 'active');

create policy "public_read_product_categories"
  on public.product_categories for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.status = 'active'
    )
  );

create policy "public_read_product_images"
  on public.product_images for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.status = 'active'
    )
  );

create policy "public_read_product_axes"
  on public.product_option_axes for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.status = 'active'
    )
  );

create policy "public_read_product_variants"
  on public.product_variants for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.status = 'active'
    )
  );

create policy "public_read_published_pages"
  on public.pages for select
  to anon, authenticated
  using (status = 'published');

create policy "public_read_store_settings"
  on public.store_settings for select
  to anon, authenticated
  using (true);

grant usage on schema public to anon, authenticated, service_role;
grant select on
  public.categories,
  public.products,
  public.product_categories,
  public.product_images,
  public.product_option_axes,
  public.product_variants,
  public.pages,
  public.store_settings
to anon, authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
