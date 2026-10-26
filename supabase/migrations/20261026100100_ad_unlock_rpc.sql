-- V1.3 : thème premium débloqué pour une partie grâce à une vidéo récompensée (appelée par l'app).
--   select public.ad_unlock('hn-…', 'status', null)     → {"remaining": n}
--   select public.ad_unlock('hn-…', 'claim', 'football') → {"ready": false, "remaining": n}
--                                                          ou {"ready": true, "remaining": n, "questions": [...]}
-- Le droit est créé par la fonction Edge `ad-reward` (signature Google vérifiée), valable 3 heures,
-- consommé une seule fois. Security definer : la table ad_grants et les questions payantes restent
-- illisibles avec la clé publique ; seule cette fonction y accède, avec ces règles.

create or replace function public.ad_unlock(p_device text, p_action text, p_theme text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_remaining int;
  v_grant text;
  v_questions jsonb;
begin
  if p_device is null or p_device !~ '^hn-[A-Za-z0-9_-]{8,64}$' then
    raise exception 'deviceId';
  end if;

  select count(*) into v_count from ad_grants
  where device_id = p_device and created_at > now() - interval '24 hours';
  v_remaining := greatest(0, 3 - v_count);

  if p_action = 'status' then
    return jsonb_build_object('remaining', v_remaining);
  elsif p_action <> 'claim' then
    raise exception 'action';
  end if;

  if p_theme is null or p_theme not in ('football', 'rugby', 'cinema', 'musique', 'jo') then
    raise exception 'theme';
  end if;

  -- Dernier droit non utilisé et encore valable ; verrouillé pour qu'il ne serve qu'une fois.
  select transaction_id into v_grant from ad_grants
  where device_id = p_device and theme = p_theme and used_at is null
    and created_at > now() - interval '3 hours'
  order by created_at desc
  limit 1
  for update skip locked;

  if v_grant is null then
    return jsonb_build_object('ready', false, 'remaining', v_remaining);
  end if;

  update ad_grants set used_at = now() where transaction_id = v_grant;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', q.id, 'theme', q.theme, 'type', q.type, 'prompt', q.prompt, 'unit', q.unit,
    'answer', q.answer, 'items', q.items, 'year', q.year, 'tolerance', q.tolerance,
    'subject', q.subject, 'source', q.source, 'perishable', q.perishable,
    'difficulty', q.difficulty, 'verified_at', q.verified_at
  ) order by q.id), '[]'::jsonb)
  into v_questions
  from questions q
  join packs p on p.id = q.pack_id
  where p.theme = p_theme and q.status = 'published';

  return jsonb_build_object('ready', true, 'remaining', v_remaining, 'questions', v_questions);
end;
$$;

revoke all on function public.ad_unlock(text, text, text) from public;
grant execute on function public.ad_unlock(text, text, text) to anon, authenticated;
