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

create extension if not exists pgcrypto with schema extensions;

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
  adult_confirmed boolean not null default false,
  -- 応募者に発行するキーのハッシュ(応募者はこのキーで自分の応募スレッドを閲覧・返信できる)
  manage_key_hash text
);

alter table public_applications add column if not exists manage_key_hash text;

-- 募集者と応募者のアプリ内やり取り(1応募=1スレッド)
create table if not exists public_replies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  application_id uuid not null references public_applications (id) on delete cascade,
  from_role text not null check (from_role in ('owner', 'applicant')),
  message text not null check (char_length(message) between 1 and 2000)
);

create index if not exists idx_public_replies_application
  on public_replies (application_id, created_at);

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
alter table public_replies enable row level security;

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
revoke all on public_replies from anon;

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
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_key text;
  v_id uuid;
  v_text text;
  v_status text;
begin
  -- U12/U15/U18は成人代表者の確認が必須
  if p_category ~ '^U1[258]' and not coalesce(p_adult_confirmed, false) then
    raise exception 'youth listing requires adult confirmation';
  end if;

  -- ============== 自動モデレーション ==============
  -- 安全な投稿は即時公開(approved)、リスクのある投稿は承認待ち(pending)。
  -- 判定はサーバー側で行うため、クライアントから回避できない。
  v_text := coalesce(p_title, '') || ' ' || coalesce(p_notes, '') || ' ' ||
            coalesce(p_fee, '') || ' ' || coalesce(p_facility_name, '');
  v_status := 'approved';

  -- 1) 子ども関連(U12/U15/U18)は必ず事前承認(安全最優先・自動公開しない)
  if p_category ~ '^U1[258]' then
    v_status := 'pending';
  end if;

  -- 2) 個人情報らしきもの(電話番号・メール・URL・LINE ID交換)を含む場合は承認待ち
  --    規約で本文への個人情報記載は禁止のため、人の目で確認する
  if v_text ~ '0\d{1,4}[-()\s]?\d{1,4}[-()\s]?\d{3,4}'
     or v_text ~* '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'
     or v_text ~* 'https?://'
     or v_text ~* '(LINE|ライン|ＬＩＮＥ)\s*の?\s*(ID|iD|アイデ)'
  then
    v_status := 'pending';
  end if;

  -- 3) 目的外利用・スパムの疑いがある語を含む場合は承認待ち
  if v_text ~* '(出会い|恋人|彼氏募集|彼女募集|パパ活|副業|稼げ|高収入|投資|仮想通貨|マルチ商法|ネットワークビジネス|MLM|宗教|保険の勧誘)'
  then
    v_status := 'pending';
  end if;
  -- ================================================

  v_key := encode(extensions.gen_random_bytes(24), 'hex');

  insert into public_listings (
    type, category, title, prefecture, municipality, area, date, weekday,
    level, fee, court_reserved, notes, facility_name, adult_confirmed,
    status, manage_key_hash
  ) values (
    p_type, p_category, p_title, p_prefecture, p_municipality, p_area,
    p_date, p_weekday, p_level, p_fee, coalesce(p_court_reserved, false),
    p_notes, p_facility_name, coalesce(p_adult_confirmed, false),
    v_status, encode(extensions.digest(v_key, 'sha256'), 'hex')
  ) returning id into v_id;

  return json_build_object('id', v_id, 'manage_key', v_key, 'status', v_status);
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
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_listing public_listings%rowtype;
  v_key text;
  v_id uuid;
begin
  select * into v_listing from public_listings where id = p_listing_id;
  if not found or v_listing.status <> 'approved' then
    raise exception 'listing is not open for applications';
  end if;
  if v_listing.category ~ '^U1[258]' and not coalesce(p_adult_confirmed, false) then
    raise exception 'youth listing requires adult confirmation';
  end if;

  -- 応募者キーを発行(応募者はこのキーで自分のスレッドを閲覧・返信できる)
  v_key := encode(extensions.gen_random_bytes(24), 'hex');

  insert into public_applications (
    listing_id, message, contact, applicant_name, adult_confirmed, manage_key_hash
  ) values (
    p_listing_id, p_message, p_contact, p_applicant_name,
    coalesce(p_adult_confirmed, false),
    encode(extensions.digest(v_key, 'sha256'), 'hex')
  ) returning id into v_id;

  return json_build_object('ok', true, 'application_id', v_id, 'application_key', v_key);
end;
$$;

-- 自分の募集の状態と応募一覧を管理キーで取得する
create or replace function get_my_listing_detail(
  p_listing_id uuid,
  p_manage_key text
) returns json
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_listing public_listings%rowtype;
  v_apps json;
begin
  select * into v_listing from public_listings
    where id = p_listing_id
      and manage_key_hash = encode(extensions.digest(p_manage_key, 'sha256'), 'hex');
  if not found then
    raise exception 'listing not found or invalid manage key';
  end if;

  select coalesce(json_agg(json_build_object(
      'id', a.id,
      'created_at', a.created_at,
      'message', a.message,
      'contact', a.contact,
      'applicant_name', a.applicant_name,
      'adult_confirmed', a.adult_confirmed,
      'replies', (
        select coalesce(json_agg(json_build_object(
            'from_role', r.from_role,
            'message', r.message,
            'created_at', r.created_at
          ) order by r.created_at asc), '[]'::json)
        from public_replies r
        where r.application_id = a.id
      )
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
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_count int;
begin
  update public_listings
    set status = 'closed'
    where id = p_listing_id
      and manage_key_hash = encode(extensions.digest(p_manage_key, 'sha256'), 'hex')
      and status in ('pending', 'approved');
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'listing not found or invalid manage key';
  end if;
  return json_build_object('ok', true);
end;
$$;

-- 募集者として応募に返信する(募集の管理キーが必要)
create or replace function reply_to_application(
  p_listing_id uuid,
  p_manage_key text,
  p_application_id uuid,
  p_message text
) returns json
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_listing public_listings%rowtype;
  v_app public_applications%rowtype;
begin
  select * into v_listing from public_listings
    where id = p_listing_id
      and manage_key_hash = encode(extensions.digest(p_manage_key, 'sha256'), 'hex');
  if not found then
    raise exception 'listing not found or invalid manage key';
  end if;
  select * into v_app from public_applications
    where id = p_application_id and listing_id = p_listing_id;
  if not found then
    raise exception 'application not found for this listing';
  end if;
  if (select count(*) from public_replies where application_id = p_application_id) >= 200 then
    raise exception 'reply limit reached';
  end if;
  insert into public_replies (application_id, from_role, message)
    values (p_application_id, 'owner', p_message);
  return json_build_object('ok', true);
end;
$$;

-- 応募者が自分の応募スレッド(募集者との往復)を取得する(応募キーが必要)
create or replace function get_my_application_detail(
  p_application_id uuid,
  p_application_key text
) returns json
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_app public_applications%rowtype;
  v_listing public_listings%rowtype;
  v_replies json;
begin
  select * into v_app from public_applications
    where id = p_application_id
      and manage_key_hash is not null
      and manage_key_hash = encode(extensions.digest(p_application_key, 'sha256'), 'hex');
  if not found then
    raise exception 'application not found or invalid key';
  end if;
  select * into v_listing from public_listings where id = v_app.listing_id;
  select coalesce(json_agg(json_build_object(
      'from_role', r.from_role,
      'message', r.message,
      'created_at', r.created_at
    ) order by r.created_at asc), '[]'::json)
  into v_replies
  from public_replies r
  where r.application_id = p_application_id;
  return json_build_object(
    'id', v_app.id,
    'listing_title', coalesce(v_listing.title, '(削除された募集)'),
    'listing_status', coalesce(v_listing.status, 'closed'),
    'message', v_app.message,
    'created_at', v_app.created_at,
    'replies', v_replies
  );
end;
$$;

-- 応募者として返信する(応募キーが必要)
create or replace function reply_as_applicant(
  p_application_id uuid,
  p_application_key text,
  p_message text
) returns json
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_app public_applications%rowtype;
begin
  select * into v_app from public_applications
    where id = p_application_id
      and manage_key_hash is not null
      and manage_key_hash = encode(extensions.digest(p_application_key, 'sha256'), 'hex');
  if not found then
    raise exception 'application not found or invalid key';
  end if;
  if (select count(*) from public_replies where application_id = p_application_id) >= 200 then
    raise exception 'reply limit reached';
  end if;
  insert into public_replies (application_id, from_role, message)
    values (p_application_id, 'applicant', p_message);
  return json_build_object('ok', true);
end;
$$;

-- 自分の公開募集の新着サマリをまとめて取得(起動時の自動チェック用・1リクエスト)
-- p_items: [{"id": "...", "key": "..."}, ...]
create or replace function get_my_listings_summary(
  p_items json
) returns json
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_item json;
  v_out json[] := '{}';
  v_listing public_listings%rowtype;
  v_count int;
  v_replies int;
begin
  if p_items is null or json_array_length(p_items) > 50 then
    raise exception 'invalid items';
  end if;
  for v_item in select * from json_array_elements(p_items) loop
    select * into v_listing from public_listings
      where id = (v_item->>'id')::uuid
        and manage_key_hash = encode(extensions.digest(v_item->>'key', 'sha256'), 'hex');
    if found then
      select count(*) into v_count from public_applications where listing_id = v_listing.id;
      select count(*) into v_replies
        from public_replies r
        join public_applications a on a.id = r.application_id
        where a.listing_id = v_listing.id and r.from_role = 'applicant';
      v_out := v_out || json_build_object(
        'id', v_listing.id, 'ok', true, 'status', v_listing.status,
        'application_count', v_count, 'applicant_reply_count', v_replies);
    else
      v_out := v_out || json_build_object('id', v_item->>'id', 'ok', false);
    end if;
  end loop;
  return coalesce(array_to_json(v_out), '[]'::json);
end;
$$;

-- 自分の応募の新着サマリをまとめて取得(応募者側の自動チェック用・1リクエスト)
create or replace function get_my_applications_summary(
  p_items json
) returns json
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_item json;
  v_out json[] := '{}';
  v_app public_applications%rowtype;
  v_status text;
  v_replies int;
begin
  if p_items is null or json_array_length(p_items) > 50 then
    raise exception 'invalid items';
  end if;
  for v_item in select * from json_array_elements(p_items) loop
    select * into v_app from public_applications
      where id = (v_item->>'id')::uuid
        and manage_key_hash is not null
        and manage_key_hash = encode(extensions.digest(v_item->>'key', 'sha256'), 'hex');
    if found then
      select status into v_status from public_listings where id = v_app.listing_id;
      select count(*) into v_replies
        from public_replies where application_id = v_app.id and from_role = 'owner';
      v_out := v_out || json_build_object(
        'id', v_app.id, 'ok', true,
        'listing_status', coalesce(v_status, 'closed'),
        'owner_reply_count', v_replies);
    else
      v_out := v_out || json_build_object('id', v_item->>'id', 'ok', false);
    end if;
  end loop;
  return coalesce(array_to_json(v_out), '[]'::json);
end;
$$;

-- 不適切な募集を通報する
create or replace function report_listing(
  p_listing_id uuid,
  p_reason text
) returns json
language plpgsql security definer set search_path = public, extensions
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
grant execute on function reply_to_application(uuid, text, uuid, text) to anon;
grant execute on function get_my_application_detail(uuid, text) to anon;
grant execute on function reply_as_applicant(uuid, text, text) to anon;
grant execute on function get_my_listings_summary(json) to anon;
grant execute on function get_my_applications_summary(json) to anon;

-- =====================================================================
-- 管理者の運用メモ (SupabaseのTable Editorで行う)
-- - 自動モデレーション: 一般カテゴリの安全な投稿は即時公開(approved)。
--   U12/U15/U18、個人情報らしき記載、スパム疑い語を含む投稿はpendingで保留
-- - 承認: public_listings の status を 'pending' → 'approved' に変更
-- - 却下: status を 'rejected' に変更(公開されない)
-- - 通報対応: reports を確認し、必要なら該当募集を 'closed' / 'rejected' に
-- - 削除依頼: 該当行を削除(応募もcascadeで消える)
-- =====================================================================
