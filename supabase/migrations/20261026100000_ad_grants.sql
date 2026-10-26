-- V1.3 : une vidéo récompensée AdMob regardée jusqu'au bout = une partie avec un thème premium.
-- Une ligne est créée par la fonction Edge `ad-reward` quand Google confirme la vidéo (signature vérifiée),
-- puis consommée par la fonction SQL `ad_unlock` qui renvoie les questions du thème. Aucun accès avec la clé publique :
-- RLS activée sans aucune règle, seules les fonctions Edge (clé service_role) lisent et écrivent.

create table public.ad_grants (
  transaction_id text primary key,
  device_id text not null,
  theme text not null check (theme in ('football', 'rugby', 'cinema', 'musique', 'jo')),
  ad_unit text not null default '',
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create index ad_grants_device_recent on public.ad_grants (device_id, created_at desc);

alter table public.ad_grants enable row level security;
revoke all on public.ad_grants from anon, authenticated;
