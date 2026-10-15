-- Hors Norme — schéma initial (lot 2)
-- Packs → questions, statut éditorial, accès admin par liste d'e-mails, RLS partout.

-- ───────── Types ─────────
create type public.question_status as enum ('draft', 'review', 'published', 'archived');
create type public.question_type as enum ('number', 'ranking');

-- ───────── Admins : liste blanche d'e-mails ─────────
create table public.admin_emails (
  email text primary key check (email = lower(email))
);
alter table public.admin_emails enable row level security;
-- Aucune policy : table lisible/modifiable uniquement via le SQL editor (service role).

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_emails
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
$$;

-- ───────── Packs ─────────
create table public.packs (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  title text not null,
  description text not null default '',
  is_free boolean not null default true,
  is_published boolean not null default false,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.packs enable row level security;

create policy "packs: lecture publique des packs publiés"
  on public.packs for select
  to anon, authenticated
  using (is_published or (select public.is_admin()));

create policy "packs: insertion admin"
  on public.packs for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "packs: modification admin"
  on public.packs for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "packs: suppression admin"
  on public.packs for delete
  to authenticated
  using ((select public.is_admin()));

-- ───────── Questions ─────────
create table public.questions (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  pack_id text not null default 'classique' references public.packs (id) on update cascade,
  theme text not null check (theme in ('corps', 'animaux', 'geo', 'espace', 'sport', 'constructions', 'histoire', 'insolite')),
  type public.question_type not null,
  prompt text not null check (length(prompt) between 10 and 300),
  unit text not null default '',
  answer double precision,
  items jsonb,
  year boolean not null default false,
  subject text,
  source text not null default '',
  source_url text,
  perishable boolean not null default false,
  difficulty smallint not null default 2 check (difficulty between 1 and 3),
  status public.question_status not null default 'draft',
  verified_at date,
  review_due_at date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint question_shape check (
    (type = 'number' and answer is not null and items is null)
    or (type = 'ranking' and answer is null and jsonb_typeof(items) = 'array' and jsonb_array_length(items) = 4)
  )
);
create index questions_status_idx on public.questions (status);
create index questions_pack_idx on public.questions (pack_id);
create index questions_review_due_idx on public.questions (review_due_at) where review_due_at is not null;
alter table public.questions enable row level security;

-- Joueurs : uniquement les questions publiées de packs publiés et gratuits.
-- (Les packs payants passeront par un droit d'accès dédié, plus tard.)
create policy "questions: lecture publique"
  on public.questions for select
  to anon, authenticated
  using (
    (status = 'published' and exists (
      select 1 from public.packs p
      where p.id = pack_id and p.is_published and p.is_free
    ))
    or (select public.is_admin())
  );

create policy "questions: insertion admin"
  on public.questions for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "questions: modification admin"
  on public.questions for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "questions: suppression admin"
  on public.questions for delete
  to authenticated
  using ((select public.is_admin()));

-- ───────── updated_at automatique ─────────
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger questions_touch before update on public.questions
  for each row execute function public.touch_updated_at();
create trigger packs_touch before update on public.packs
  for each row execute function public.touch_updated_at();

-- ───────── Droits de l'API (explicites, la RLS filtre ensuite les lignes) ─────────
grant select on public.packs, public.questions to anon, authenticated;
grant insert, update, delete on public.packs, public.questions to authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- ───────── Pack de base ─────────
insert into public.packs (id, title, description, is_free, is_published, sort)
values ('classique', 'Classique', 'Les records du monde, tous thèmes confondus.', true, true, 0);
