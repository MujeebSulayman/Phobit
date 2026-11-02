-- Schema for the backend in src/server and src/app/api (Supabase Postgres).
-- Like usedebit.app, the browser never queries tables: only the server, with the service-role key.
-- RLS is on with no policies, and anon/authenticated lose every grant, including on the functions.
-- Apply with `supabase db push`, or paste into the Supabase SQL editor.

-- A recipient is a phone number. Its Privy wallet exists before the person ever signs in.
create table recipients (
  key             text primary key,                -- "phone:+14155550123"
  kind            text not null check (kind = 'phone'),
  contact         text not null,                   -- E.164; never returned by the API
  masked          text not null,                   -- "+1 ••• ••• 0123"
  status          text not null default 'pending' check (status in ('pending', 'active')),  -- active = has a card
  privy_user_id   text unique,
  wallet_id       text,
  wallet_address  text unique,
  auto_payouts    boolean not null default false,  -- our Privy signer is on the wallet
  claimed_at      timestamptz,                     -- first SMS sign-in
  created_at      timestamptz not null default now()
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
  creator_key           text not null,       -- pump.fun creator = the recipient's Privy wallet
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
  payload                  jsonb not null, -- coin fields + recipient + wallet
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

-- sweeping (internal) → swept (fees collected into the recipient's wallet) → swapped (now USDC in
-- that wallet) → unrouted (no card) | submitted → paid | failed
create table payouts (
  id               uuid primary key default gen_random_uuid(),
  mint             text references coins(mint),  -- null when one collection covered several coins
  recipient_key    text not null references recipients(key),
  status           text not null check (status in ('sweeping', 'swept', 'swapped', 'unrouted', 'submitted', 'paid', 'failed')),
  quote_amount     text not null,                -- raw quote-token units collected
  lamports         bigint not null default 0,    -- SOL-equivalent at swap time
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

-- USDC a recipient sent out of their wallet. The treasury pays the network fee.
create table withdrawals (
  signature      text primary key,
  recipient_key  text not null references recipients(key),
  to_address     text not null,
  usdc_amount    numeric(20, 6) not null,
  status         text not null default 'pending' check (status in ('pending', 'confirmed', 'failed')),
  created_at     timestamptz not null default now()
);
create index withdrawals_recipient_idx on withdrawals (recipient_key, created_at desc);

create table keeper_lock (
  id            int primary key,
  locked_until  timestamptz not null default 'epoch'
);
insert into keeper_lock (id) values (1);

create view platform_totals with (security_invoker = true) as
select
  coalesce(sum(usd_cents) filter (where status <> 'sweeping'), 0)::bigint as usd_cents,
  coalesce(sum(lamports)  filter (where status <> 'sweeping'), 0)::bigint as lamports,
  count(*) filter (where status <> 'sweeping') as payouts,
  count(*) filter (where status = 'paid') as paid,
  (select count(*) from coins) as coins,
  (select count(distinct recipient_key) from coins) as recipients
from payouts;

create view daily_fees with (security_invoker = true) as
select (created_at at time zone 'utc')::date as day, coalesce(sum(usd_cents), 0)::bigint as usd_cents
from payouts
where status <> 'sweeping'
group by 1;

-- Records a confirmed launch: recipient, coin, and the pending row's removal in one transaction.
create function finalize_launch(p_mint text, p_recipient jsonb, p_coin jsonb) returns void
language plpgsql set search_path = public as $$
begin
  insert into recipients (key, kind, contact, masked, privy_user_id, wallet_id, wallet_address, auto_payouts)
  values (p_recipient->>'key', 'phone', p_recipient->>'contact', p_recipient->>'masked',
          p_recipient->>'privy_user_id', p_recipient->>'wallet_id', p_recipient->>'wallet_address',
          coalesce((p_recipient->>'auto_payouts')::boolean, false))
  on conflict (key) do update set
    privy_user_id  = coalesce(recipients.privy_user_id, excluded.privy_user_id),
    wallet_id      = coalesce(recipients.wallet_id, excluded.wallet_id),
    wallet_address = coalesce(recipients.wallet_address, excluded.wallet_address),
    auto_payouts   = recipients.auto_payouts or excluded.auto_payouts;

  insert into coins (mint, name, symbol, description, image_url, metadata_uri, twitter, website,
                     creator_wallet, creator_key, quote_mint, recipient_key, launch_signature)
  values (p_mint, p_coin->>'name', p_coin->>'symbol', coalesce(p_coin->>'description', ''), p_coin->>'image_url',
          p_coin->>'metadata_uri', p_coin->>'twitter', p_coin->>'website', p_coin->>'creator_wallet',
          p_coin->>'creator_key', p_coin->>'quote_mint', p_recipient->>'key', p_coin->>'launch_signature')
  on conflict (mint) do nothing;

  delete from pending_launches where mint = p_mint;
end $$;

-- Marks a payout converted to USDC and adds it to its coin's running totals, atomically.
create function record_swap(p_payout uuid, p_usdc numeric, p_cents bigint, p_lamports bigint) returns void
language plpgsql set search_path = public as $$
declare v_mint text;
begin
  update payouts
  set status = 'swapped', usdc_amount = p_usdc, usd_cents = p_cents, lamports = p_lamports, updated_at = now()
  where id = p_payout and status = 'swept'
  returning mint into v_mint;
  if found and v_mint is not null then
    update coins
    set fees_swept_lamports = fees_swept_lamports + p_lamports, fees_swept_usd_cents = fees_swept_usd_cents + p_cents
    where mint = v_mint;
  end if;
end $$;

-- Lease so overlapping keeper runs never collect or swap twice.
create function acquire_keeper_lock(p_minutes int) returns boolean
language sql set search_path = public as $$
  with got as (
    update keeper_lock set locked_until = now() + make_interval(mins => p_minutes)
    where id = 1 and locked_until < now()
    returning 1
  )
  select exists (select 1 from got);
$$;

create function release_keeper_lock() returns void
language sql set search_path = public as $$
  update keeper_lock set locked_until = 'epoch' where id = 1;
$$;

alter table recipients       enable row level security;
alter table coins            enable row level security;
alter table pending_launches enable row level security;
alter table cards            enable row level security;
alter table payouts          enable row level security;
alter table withdrawals      enable row level security;
alter table keeper_lock      enable row level security;
revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;
