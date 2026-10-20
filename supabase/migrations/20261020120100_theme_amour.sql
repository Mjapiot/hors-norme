-- V1.1 : nouveau thème gratuit « Amour & séduction » (pack classique, décoché par défaut dans l'app).
alter table public.questions drop constraint if exists questions_theme_check;
alter table public.questions add constraint questions_theme_check check (
  theme in ('corps', 'animaux', 'geo', 'espace', 'sport', 'constructions', 'histoire', 'insolite', 'amour',
            'football', 'rugby', 'cinema', 'musique', 'jo')
);
