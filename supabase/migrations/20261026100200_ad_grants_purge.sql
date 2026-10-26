-- V1.3 : les droits de vidéo (identifiant aléatoire d'appareil + thème) ne sont gardés que 7 jours.
-- Purge à chaque nouvelle vidéo confirmée : pas besoin de tâche planifiée.
create or replace function public.ad_grants_purge() returns trigger language plpgsql security definer set search_path = public as $$
begin
delete from ad_grants where created_at < now() - interval '7 days';
return null;
end;
$$;

drop trigger if exists ad_grants_purge on public.ad_grants;
create trigger ad_grants_purge after insert on public.ad_grants for each statement execute function public.ad_grants_purge();

revoke all on function public.ad_grants_purge() from public, anon, authenticated;
