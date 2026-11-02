-- Schema for the backend in src/server and src/app/api (Neon / Postgres 15+).
-- Only the server connects, with DATABASE_URL; the browser never talks to the database.
-- Apply with: psql "$DATABASE_URL" -f db/migrations/0001_init.sql  (or paste into the Neon SQL editor)

-- A recipient is an identity ("phone:+14155550123"), not an account.
create table recipients (
  key         text primary key,
  kind        text not null check (kind in ('phone', 'email')),
  contact     text not null,                 -- raw E.164 / email; never returned by the API
  masked      text not null,                 -- "+1 ••• ••• 0123"
  status      text not null default 'pending' check (status in ('pending', 'active')),
  claimed_at  timestamptz,                   -- first verified sign-in
  created_at  timestamptz not null default now()
);

create table coins (
  mint                  text primary key,
  name                  text not null,
  symbol                text not null,
  description           text not null default '',
  image_url             text,
  metadata_uri          text not null,
  twitter               text,
  website               text,
  creator_wallet        text not null,       -- the launcher's wallet
  creator_key           text not null,       -- per-coin creator key, HMAC(master_seed, mint)
  quote_mint            text not null,
  recipient_key         text not null references recipients(key),
  fees_swept_lamports   bigint not null default 0,
  fees_swept_usd_cents  bigint not null default 0,
  launch_signature      text not null,
  created_at            timestamptz not null default now()
);
create index coins_created_at_idx on coins (created_at desc);
create index coins_creator_wallet_idx on coins (creator_wallet);
create index coins_recipient_key_idx on coins (recipient_key);

-- Built by POST /api/launch/prepare, promoted to a coin by /api/launch/submit (or the keeper).
create table pending_launches (
  mint                     text primary key,
  user_wallet              text not null,
  message                  text not null,  -- base64 of the exact message the mint signed
  last_valid_block_height  bigint not null,
  payload                  jsonb not null, -- coin fields + recipient
  signature                text,
  created_at               timestamptz not null default now()
);

create table cards (
  id                uuid primary key default gen_random_uuid(),
  recipient_key     text not null references recipients(key),
  provider          text not null,
  provider_card_id  text not null,
  last4             text not null,
  exp               text not null,
  pan_enc           text not null,         -- AES-256-GCM, see src/server/crypto.ts
  cvv_enc           text not null,
  status            text not null default 'active' check (status in ('active', 'closed')),
  wallet_added_at   timestamptz,
  created_at        timestamptz not null default now(),
  closed_at         timestamptz
);
create unique index cards_one_active_per_recipient on cards (recipient_key) where status = 'active';

-- sweeping (internal) → swept → swapped → unrouted | submitted → paid | failed
create table payouts (
  id               uuid primary key default gen_random_uuid(),
  mint             text not null references coins(mint),
  recipient_key    text not null references recipients(key),
  status           text not null check (status in ('sweeping', 'swept', 'swapped', 'unrouted', 'submitted', 'paid', 'failed')),
  quote_amount     text not null,          -- raw quote-token units collected from the vaults
  lamports         bigint not null default 0,  -- SOL-equivalent at swap time
  usdc_amount      numeric(20, 6),
  usd_cents        bigint,
  sweep_signature  text,
  swap_signature   text,
  card_id          uuid references cards(id),
  transfer_id      text,
  failure_reason   text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index payouts_created_at_idx on payouts (created_at desc);
create index payouts_status_idx on payouts (status);
create index payouts_recipient_key_idx on payouts (recipient_key);

-- Single-row lease so overlapping keeper runs don't double-sweep.
create table keeper_lock (
  id            int primary key,
  locked_until  timestamptz not null default 'epoch'
);
insert into keeper_lock (id) values (1);

create view platform_totals as
select
  coalesce(sum(usd_cents) filter (where status <> 'sweeping'), 0)::bigint as usd_cents,
  coalesce(sum(lamports)  filter (where status <> 'sweeping'), 0)::bigint as lamports,
  count(*) filter (where status <> 'sweeping') as payouts,
  count(*) filter (where status = 'paid') as paid,
  (select count(*) from coins) as coins,
  (select count(distinct recipient_key) from coins) as recipients
from payouts;

create view daily_fees as
select (created_at at time zone 'utc')::date as day, coalesce(sum(usd_cents), 0)::bigint as usd_cents
from payouts
where status <> 'sweeping'
group by 1;
