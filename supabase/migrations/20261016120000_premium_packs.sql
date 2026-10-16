-- V1.1 : thèmes premium vendus en achats intégrés (Football, Rugby, Cinéma & séries, Musique, JO).
-- Les questions des packs payants ne sont JAMAIS lisibles avec la clé publique (RLS existante :
-- seuls les packs gratuits sont visibles). Elles sont servies par la fonction Edge `pack-questions`
-- après vérification de l'achat auprès de RevenueCat.

-- Nouveaux thèmes autorisés
alter table public.questions drop constraint if exists questions_theme_check;
alter table public.questions add constraint questions_theme_check check (
  theme in ('corps', 'animaux', 'geo', 'espace', 'sport', 'constructions', 'histoire', 'insolite',
            'football', 'rugby', 'cinema', 'musique', 'jo')
);

-- Lien pack ↔ achat
alter table public.packs add column if not exists theme text;
alter table public.packs add column if not exists product_id text unique;
alter table public.packs add column if not exists entitlement text unique;

insert into public.packs (id, title, description, is_free, is_published, sort, theme, product_id, entitlement) values
  ('football', 'Football', 'Ligue 1, Coupe du monde, Ballon d''or, transferts records…', false, false, 10, 'football', 'hn_pack_football', 'pack_football'),
  ('rugby', 'Rugby', 'Top 14, Coupe du monde, Tournoi des Six Nations, essais records…', false, false, 11, 'rugby', 'hn_pack_rugby', 'pack_rugby'),
  ('cinema', 'Cinéma & séries', 'Box-office, Oscars, films les plus longs, séries les plus vues…', false, false, 12, 'cinema', 'hn_pack_cinema', 'pack_cinema'),
  ('musique', 'Musique', 'Albums les plus vendus, concerts géants, streams records…', false, false, 13, 'musique', 'hn_pack_musique', 'pack_musique'),
  ('jo', 'Jeux olympiques', 'Records olympiques, médailles, Paris 2024, champions hors norme…', false, false, 14, 'jo', 'hn_pack_jo', 'pack_jo')
on conflict (id) do nothing;
