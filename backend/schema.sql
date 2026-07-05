-- =====================================================================
-- Hoop Match 公開マッチング用スキーマ (Supabase / PostgreSQL)
--
-- 設計方針:
-- - 認証なし(匿名キーのみ)で安全に運用するため、書き込みはすべて
--   SECURITY DEFINER のRPC関数経由。テーブルへの直接INSERT/UPDATEは不可。
-- - 募集は status='pending' で保存され、管理者がSupabase管理画面
--   (Table Editor)で 'approved' にして初めて公開される(承認制)。
-- - 投稿時にサーバーが管理キーを発行。DBにはSHA-256ハッシュのみ保存。
--   応募の閲覧・募集終了は管理キー保持者(=投稿者)のみ可能。
-- - 応募(連絡先を含む)は匿名ユーザーからは一切SELECT不可。
--
-- 適用方法: SupabaseのSQL Editorにこのファイル全文を貼り付けて実行。
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- テーブル
-- ---------------------------------------------------------------------

create table if not exists public_listings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type text not null check (type in ('opponent', 'member', 'personal', 'helper', 'practice')),
  category text not null,
  title text not null check (char_length(title) between 1 and 100),
  prefecture text not null,
  municipality text not null,
  area text not null,
  date date,
  weekday text,
  level text,
  fee text check (fee is null or char_length(fee) <= 100),
  court_reserved boolean not null default false,
  notes text check (notes is null or char_length(notes) <= 2000),
  facility_name text check (facility_name is null or char_length(facility_name) <= 200),
  adult_confirmed boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'closed', 'rejected')),
  manage_key_hash text not null
);

create index if not exists idx_public_listings_status_date
  on public_listings (status, date);

create table if not exists public_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  listing_id uuid not null references public_listings (id) on delete cascade,
  message text not null check (char_length(message) between 1 and 2000),
  contact text not null check (char_length(contact) between 1 and 300),
  applicant_name text check (applicant_name is null or char_length(applicant_name) <= 100),
  adult_confirmed boolean not null default false
);

create index if not exists idx_public_applications_listing
  on public_applications (listing_id);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  listing_id uuid references public_listings (id) on delete set null,
  reason text not null check (char_length(reason) between 1 and 1000)
);

-- ---------------------------------------------------------------------
-- RLS (行レベルセキュリティ)
-- ---------------------------------------------------------------------

alter table public_listings enable row level security;
alter table public_applications enable row level security;
alter table reports enable row level security;

-- 公開済みの募集のみ誰でも閲覧可(管理キーのハッシュ列はビュー経由で隠す)
drop policy if exists "approved listings are public" on public_listings;
create policy "approved listings are public"
  on public_listings for select
  using (status = 'approved');

-- 応募・通報はRPC経由のみ(anonに対するポリシーなし = 直接アクセス不可)

-- 匿名ユーザーに見せる安全なビュー(manage_key_hashを含まない)
create or replace view public_listings_view as
  select id, created_at, type, category, title, prefecture, municipality,
         area, date, weekday, level, fee, court_reserved, notes,
         facility_name, adult_confirmed, status
  from public_listings
  where status = 'approved';

grant select on public_listings_view to anon;

-- テーブル直接アクセスの権限を絞る(ビューとRPCのみ許可)
revoke all on public_listings from anon;
revoke all on public_applications from anon;
revoke all on reports from anon;

-- ---------------------------------------------------------------------
-- RPC関数 (SECURITY DEFINER)
-- ---------------------------------------------------------------------

-- 募集を投稿する(承認待ちとして保存し、管理キーを返す)
create or replace function submit_listing(
  p_type text,
  p_category text,
  p_title text,
  p_prefecture text,
  p_municipality text,
  p_area text,
  p_date date,
  p_weekday text,
  p_level text,
  p_fee text,
  p_court_reserved boolean,
  p_notes text,
  p_facility_name text,
  p_adult_confirmed boolean
) returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_key text;
  v_id uuid;
begin
  -- U12/U15/U18は成人代表者の確認が必須
  if p_category ~ '^U1[258]' and not coalesce(p_adult_confirmed, false) then
    raise exception 'youth listing requires adult confirmation';
  end if;

  v_key := encode(gen_random_bytes(24), 'hex');

  insert into public_listings (
    type, category, title, prefecture, municipality, area, date, weekday,
    level, fee, court_reserved, notes, facility_name, adult_confirmed,
    manage_key_hash
  ) values (
    p_type, p_category, p_title, p_prefecture, p_municipality, p_area,
    p_date, p_weekday, p_level, p_fee, coalesce(p_court_reserved, false),
    p_notes, p_facility_name, coalesce(p_adult_confirmed, false),
    encode(digest(v_key, 'sha256'), 'hex')
  ) returning id into v_id;

  return json_build_object('id', v_id, 'manage_key', v_key);
end;
$$;

-- 公開中の募集に応募する(連絡先は募集者のみ閲覧可能)
create or replace function submit_application(
  p_listing_id uuid,
  p_message text,
  p_contact text,
  p_applicant_name text,
  p_adult_confirmed boolean
) returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_listing public_listings%rowtype;
begin
  select * into v_listing from public_listings where id = p_listing_id;
  if not found or v_listing.status <> 'approved' then
    raise exception 'listing is not open for applications';
  end if;
  if v_listing.category ~ '^U1[258]' and not coalesce(p_adult_confirmed, false) then
    raise exception 'youth listing requires adult confirmation';
  end if;

  insert into public_applications (
    listing_id, message, contact, applicant_name, adult_confirmed
  ) values (
    p_listing_id, p_message, p_contact, p_applicant_name,
    coalesce(p_adult_confirmed, false)
  );

  return json_build_object('ok', true);
end;
$$;

-- 自分の募集の状態と応募一覧を管理キーで取得する
create or replace function get_my_listing_detail(
  p_listing_id uuid,
  p_manage_key text
) returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_listing public_listings%rowtype;
  v_apps json;
begin
  select * into v_listing from public_listings
    where id = p_listing_id
      and manage_key_hash = encode(digest(p_manage_key, 'sha256'), 'hex');
  if not found then
    raise exception 'listing not found or invalid manage key';
  end if;

  select coalesce(json_agg(json_build_object(
      'created_at', a.created_at,
      'message', a.message,
      'contact', a.contact,
      'applicant_name', a.applicant_name,
      'adult_confirmed', a.adult_confirmed
    ) order by a.created_at desc), '[]'::json)
  into v_apps
  from public_applications a
  where a.listing_id = p_listing_id;

  return json_build_object(
    'id', v_listing.id,
    'title', v_listing.title,
    'status', v_listing.status,
    'applications', v_apps
  );
end;
$$;

-- 自分の募集を終了する(管理キーが必要)
create or replace function close_listing(
  p_listing_id uuid,
  p_manage_key text
) returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_count int;
begin
  update public_listings
    set status = 'closed'
    where id = p_listing_id
      and manage_key_hash = encode(digest(p_manage_key, 'sha256'), 'hex')
      and status in ('pending', 'approved');
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'listing not found or invalid manage key';
  end if;
  return json_build_object('ok', true);
end;
$$;

-- 不適切な募集を通報する
create or replace function report_listing(
  p_listing_id uuid,
  p_reason text
) returns json
language plpgsql security definer set search_path = public
as $$
begin
  insert into reports (listing_id, reason) values (p_listing_id, p_reason);
  return json_build_object('ok', true);
end;
$$;

grant execute on function submit_listing(text, text, text, text, text, text, date, text, text, text, boolean, text, text, boolean) to anon;
grant execute on function submit_application(uuid, text, text, text, boolean) to anon;
grant execute on function get_my_listing_detail(uuid, text) to anon;
grant execute on function close_listing(uuid, text) to anon;
grant execute on function report_listing(uuid, text) to anon;

-- =====================================================================
-- 管理者の運用メモ (SupabaseのTable Editorで行う)
-- - 承認: public_listings の status を 'pending' → 'approved' に変更
-- - 却下: status を 'rejected' に変更(公開されない)
-- - 通報対応: reports を確認し、必要なら該当募集を 'closed' / 'rejected' に
-- - 削除依頼: 該当行を削除(応募もcascadeで消える)
-- =====================================================================
