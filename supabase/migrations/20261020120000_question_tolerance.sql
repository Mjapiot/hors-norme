-- V1.1 : façon de juger l'écart de chaque question.
--   null      → automatique (déduit par l'app : année, âge, degrés, sinon %)
--   relative  → quantité : 5 % / 20 %
--   tight     → record serré (sprints, sauts, lancers) : 0,5 % / 2 %
--   years     → année : 5 / 20 ans
--   age       → âge : 1 / 3 ans
--   degrees   → températures : 1 / 3 °C
-- Les apps V1.0 ne lisent pas cette colonne : aucun impact pour elles.
alter table public.questions
  add column if not exists tolerance text
  check (tolerance in ('relative', 'tight', 'years', 'age', 'degrees'));

comment on column public.questions.tolerance is 'Tolérance de l''écart (null = automatique côté app).';

-- Records serrés : à 20 %, répondre « 11 s » au 100 m rapporterait encore un point.
update public.questions
set tolerance = 'tight'
where tolerance is null
  and id in (
    'sport-080', 'sport-081', 'sport-082', 'sport-083', 'sport-227', 'sport-230',
    'sport-n3-001', 'sport-n3-002', 'sport-n3-003', 'sport-n3-004', 'sport-n3-005', 'sport-n3-006',
    'jo-p1-012', 'jo-p1-023', 'jo-p1-024', 'jo-p1-025', 'jo-p1-026', 'jo-p1-027', 'jo-p1-028'
  );
