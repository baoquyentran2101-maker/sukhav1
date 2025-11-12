create extension if not exists "pgcrypto";

create table if not exists orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null
);
insert into orgs(name) values ('BQ Café') on conflict do nothing;

create table if not exists profiles (
  id uuid primary key,
  org_id uuid not null default (select id from orgs limit 1)
);

create table if not exists areas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default (select id from orgs limit 1),
  name text not null,
  sort int default 0
);

create table if not exists tables (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default (select id from orgs limit 1),
  area_id uuid not null references areas(id) on delete cascade,
  code text not null,
  status text not null default 'empty',
  unique (org_id, code)
);

create table if not exists menu_groups (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default (select id from orgs limit 1),
  name text not null,
  sort int default 0
);

create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default (select id from orgs limit 1),
  group_id uuid not null references menu_groups(id) on delete cascade,
  name text not null,
  price numeric(12,2) not null default 0,
  is_active boolean default true,
  sort int default 0
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default (select id from orgs limit 1),
  table_id uuid not null references tables(id),
  status text not null default 'open',
  created_at timestamptz default now()
);
create unique index if not exists one_open_per_table_idx on orders(table_id) where (status='open');

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default (select id from orgs limit 1),
  order_id uuid not null references orders(id) on delete cascade,
  item_id uuid not null references menu_items(id),
  qty int not null check (qty>0),
  price numeric(12,2) not null,
  amount numeric(12,2) generated always as (qty*price) stored
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default (select id from orgs limit 1),
  order_id uuid not null references orders(id) on delete cascade,
  method text not null,
  paid_amount numeric(12,2) not null,
  paid_at timestamptz default now()
);

insert into areas(name,sort) values ('Khu A',1) on conflict do nothing;
do $$
declare a uuid; declare i int;
begin
  select id into a from areas where name='Khu A' limit 1;
  for i in 1..8 loop
    insert into tables(area_id,code,status) values (a, format('A%s',i), 'empty')
    on conflict do nothing;
  end loop;
end $$;

insert into menu_groups(name,sort) values ('Cà phê',1),('Trà',2),('Bánh',3) on conflict do nothing;

insert into menu_items(group_id,name,price,sort)
select g.id, v.name, v.price, v.sort
from (values
  ('Cà phê','Americano',30000,1),
  ('Cà phê','Cà phê sữa',35000,2),
  ('Cà phê','Latte',40000,3),
  ('Trà','Trà đào',35000,1),
  ('Trà','Trà lài',25000,2),
  ('Bánh','Croissant',25000,1)
) as v(group_name,name,price,sort)
join menu_groups g on g.name=v.group_name
on conflict do nothing;

create or replace function inc_qty(p_id uuid) returns void language plpgsql as $$
begin
  update order_items set qty = qty + 1 where id = p_id;
end $$;

create or replace function dec_qty(p_id uuid) returns void language plpgsql as $$
begin
  update order_items set qty = greatest(qty - 1, 1) where id = p_id;
end $$;
