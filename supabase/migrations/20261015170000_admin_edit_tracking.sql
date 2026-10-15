-- Marque les questions modifiées depuis le back-office (requête authentifiée),
-- pour que les migrations de contenu ne les écrasent jamais.
alter table public.questions add column admin_edited_at timestamptz;

-- Questions déjà retouchées dans le back-office avant cette migration.
update public.questions set admin_edited_at = updated_at where updated_at > created_at + interval '1 second';

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  -- Requête d'un utilisateur connecté (back-office) : on le note. Les migrations n'ont pas d'utilisateur.
  if tg_table_name = 'questions' and auth.uid() is not null then
    new.admin_edited_at = now();
  end if;
  return new;
end;
$$;

-- Même règle pour une question créée depuis le back-office.
create function public.mark_admin_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    new.admin_edited_at = now();
  end if;
  return new;
end;
$$;

create trigger questions_mark_admin_insert before insert on public.questions
  for each row execute function public.mark_admin_insert();
