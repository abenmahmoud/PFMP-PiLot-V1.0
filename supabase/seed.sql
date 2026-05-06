-- =============================================================================
-- PFMP Pilot AI — seed.sql
--
-- Données de démonstration à charger APRÈS la migration 0001_init.sql.
-- Reproduit l'établissement principal "Lycée Professionnel Jean Moulin" et
-- 4 établissements secondaires pour la vue superadmin.
--
-- Important :
--   - Ce seed crée des rôles `auth.users` factices. Pour de vrais comptes,
--     créer les utilisateurs via le dashboard Supabase Auth puis utiliser
--     `update profiles set role = ... where email = ...`.
--   - Tous les UUID sont déterministes pour faciliter les tests/RLS.
--   - Ce seed est idempotent : on peut le rejouer (insert ... on conflict do nothing).
--
-- Usage :
--   psql "$SUPABASE_DB_URL" -f supabase/seed.sql
-- ou via le SQL Editor Supabase (copier-coller l'intégralité).
-- =============================================================================

-- En seed on a besoin de bypasser RLS : on insère en service_role / postgres.
set role postgres;

-- -----------------------------------------------------------------------------
-- 1. Établissements
-- -----------------------------------------------------------------------------
insert into establishments (id, name, city, uai, slug, subdomain, custom_domain, domain_verified, primary_color, status, active)
values
  ('e1000000-0000-0000-0000-000000000001', 'Lycée Professionnel Jean Moulin', 'Lyon',      '0691234A', 'jean-moulin',   'jean-moulin', null, false, '#1d4ed8', 'active', true),
  ('e1000000-0000-0000-0000-000000000002', 'Lycée Voltaire',                  'Marseille', '0132211B', 'voltaire',      null,          null, false, '#7c3aed', 'active', true),
  ('e1000000-0000-0000-0000-000000000003', 'Lycée Marie Curie',               'Paris',     '0750412C', 'marie-curie',   null,          null, false, '#0ea5e9', 'active', true),
  ('e1000000-0000-0000-0000-000000000004', 'Lycée Émile Zola',                'Lille',     '0594321D', 'emile-zola',    null,          null, false, '#16a34a', 'active', true),
  ('e1000000-0000-0000-0000-000000000005', 'Lycée Montaigne',                 'Bordeaux',  '0331122E', 'montaigne',     null,          null, false, '#dc2626', 'active', true)
on conflict (id) do nothing;

-- Établissement settings (uniquement pour le tenant principal pour l'instant)
insert into establishment_settings (establishment_id, school_year, teacher_load_threshold, ai_enabled)
values ('e1000000-0000-0000-0000-000000000001', '2025-2026', 6, true)
on conflict (establishment_id) do nothing;

-- -----------------------------------------------------------------------------
-- 2. auth.users + profiles (les profils auraient été créés par le trigger,
--    mais on les insère manuellement parce qu'on injecte les auth.users via
--    le service_role en seed)
-- -----------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('a0000001-0000-0000-0000-000000000001', 'camille.lefevre@pfmp-pilot.fr'),     -- superadmin
  ('a0000001-0000-0000-0000-000000000002', 'sophie.bernard@jean-moulin.fr'),     -- admin Jean Moulin
  ('a0000001-0000-0000-0000-000000000003', 'marc.dupont@jean-moulin.fr'),        -- ddfpt Jean Moulin
  ('a0000001-0000-0000-0000-000000000004', 'elodie.lambert@jean-moulin.fr'),     -- principal 1MVA + CAP
  ('a0000001-0000-0000-0000-000000000005', 'ines.pereira@jean-moulin.fr'),       -- principal Term Com + 2GATL
  ('a0000001-0000-0000-0000-000000000006', 'julien.garcia@jean-moulin.fr'),      -- referent (3 élèves)
  ('a0000001-0000-0000-0000-000000000007', 'laura.rossi@jean-moulin.fr'),        -- referent
  ('a0000001-0000-0000-0000-000000000008', 'thomas.martin@jean-moulin.fr')       -- referent
on conflict (id) do nothing;

-- Si le trigger handle_new_user a déjà créé les profils, on les met à jour.
-- Sinon on les insère avec on conflict do update pour être idempotent.
insert into profiles (id, establishment_id, first_name, last_name, email, role) values
  ('a0000001-0000-0000-0000-000000000001', null,                                          'Camille', 'Lefèvre',  'camille.lefevre@pfmp-pilot.fr', 'superadmin'),
  ('a0000001-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001',        'Sophie',  'Bernard',  'sophie.bernard@jean-moulin.fr', 'admin'),
  ('a0000001-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000001',        'Marc',    'Dupont',   'marc.dupont@jean-moulin.fr',    'ddfpt'),
  ('a0000001-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000001',        'Élodie',  'Lambert',  'elodie.lambert@jean-moulin.fr', 'principal'),
  ('a0000001-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000001',        'Inès',    'Pereira',  'ines.pereira@jean-moulin.fr',   'principal'),
  ('a0000001-0000-0000-0000-000000000006', 'e1000000-0000-0000-0000-000000000001',        'Julien',  'Garcia',   'julien.garcia@jean-moulin.fr',  'referent'),
  ('a0000001-0000-0000-0000-000000000007', 'e1000000-0000-0000-0000-000000000001',        'Laura',   'Rossi',    'laura.rossi@jean-moulin.fr',    'referent'),
  ('a0000001-0000-0000-0000-000000000008', 'e1000000-0000-0000-0000-000000000001',        'Thomas',  'Martin',   'thomas.martin@jean-moulin.fr',  'referent')
on conflict (id) do update set
  establishment_id = excluded.establishment_id,
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  role = excluded.role;

-- -----------------------------------------------------------------------------
-- 3. Classes (Lycée Jean Moulin)
-- -----------------------------------------------------------------------------
insert into classes (id, establishment_id, name, level, formation, school_year, principal_id) values
  ('c1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', '1ère MVA',     'Bac Pro', 'Maintenance des véhicules',                  '2025-2026', 'a0000001-0000-0000-0000-000000000004'),
  ('c1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', 'Term Commerce','Bac Pro', 'Métiers du commerce et de la vente',         '2025-2026', 'a0000001-0000-0000-0000-000000000005'),
  ('c1000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000001', 'CAP EBT',      'CAP',     'Ébéniste',                                   '2025-2026', 'a0000001-0000-0000-0000-000000000004'),
  ('c1000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000001', '2nde GATL',    'Bac Pro', 'Gestion administrative',                     '2025-2026', 'a0000001-0000-0000-0000-000000000005')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 4. Teachers (lié aux profils referent/principal pour la RLS is_referent_of)
-- -----------------------------------------------------------------------------
insert into teachers (id, establishment_id, profile_id, first_name, last_name, email) values
  ('7ea10000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000004', 'Élodie',  'Lambert',  'elodie.lambert@jean-moulin.fr'),
  ('7ea10000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000005', 'Inès',    'Pereira',  'ines.pereira@jean-moulin.fr'),
  ('7ea10000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000006', 'Julien',  'Garcia',   'julien.garcia@jean-moulin.fr'),
  ('7ea10000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000007', 'Laura',   'Rossi',    'laura.rossi@jean-moulin.fr'),
  ('7ea10000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000008', 'Thomas',  'Martin',   'thomas.martin@jean-moulin.fr')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 5. Élèves (20 répartis sur les 4 classes)
-- -----------------------------------------------------------------------------
insert into students (id, establishment_id, class_id, first_name, last_name, formation) values
  -- 1ère MVA (6)
  ('51000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Lucas',     'Bernard',   'Bac Pro MVA'),
  ('51000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Sofia',     'Almeida',   'Bac Pro MVA'),
  ('51000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Mehdi',     'Belkacem',  'Bac Pro MVA'),
  ('51000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Anaïs',     'Roux',      'Bac Pro MVA'),
  ('51000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Hugo',      'Lambert',   'Bac Pro MVA'),
  ('51000000-0000-0000-0000-000000000006', 'e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Yanis',     'Cheikh',    'Bac Pro MVA'),
  -- Term Commerce (6)
  ('51000000-0000-0000-0000-000000000007', 'e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', 'Maxime',    'Dubois',    'Bac Pro Commerce'),
  ('51000000-0000-0000-0000-000000000008', 'e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', 'Nathan',    'Faure',     'Bac Pro Commerce'),
  ('51000000-0000-0000-0000-000000000009', 'e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', 'Mathilde',  'Girard',    'Bac Pro Commerce'),
  ('51000000-0000-0000-0000-000000000010', 'e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', 'Enzo',      'Vidal',     'Bac Pro Commerce'),
  ('51000000-0000-0000-0000-000000000011', 'e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', 'Léna',      'Mercier',   'Bac Pro Commerce'),
  ('51000000-0000-0000-0000-000000000012', 'e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', 'Inès',      'Toledo',    'Bac Pro Commerce'),
  -- CAP EBT (4)
  ('51000000-0000-0000-0000-000000000013', 'e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003', 'Camille',   'Petit',     'CAP Ébéniste'),
  ('51000000-0000-0000-0000-000000000014', 'e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003', 'Théo',      'Marchand',  'CAP Ébéniste'),
  ('51000000-0000-0000-0000-000000000015', 'e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003', 'Eva',       'Carpentier','CAP Ébéniste'),
  ('51000000-0000-0000-0000-000000000016', 'e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003', 'Sacha',     'Lopez',     'CAP Ébéniste'),
  -- 2nde GATL (4)
  ('51000000-0000-0000-0000-000000000017', 'e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000004', 'Sarah',     'Benali',    'Bac Pro GATL'),
  ('51000000-0000-0000-0000-000000000018', 'e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000004', 'Adam',      'Costa',     'Bac Pro GATL'),
  ('51000000-0000-0000-0000-000000000019', 'e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000004', 'Chloé',     'Renard',    'Bac Pro GATL'),
  ('51000000-0000-0000-0000-000000000020', 'e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000004', 'Noah',      'Da Silva',  'Bac Pro GATL')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 6. Entreprises (8) + tuteurs (8)
-- -----------------------------------------------------------------------------
insert into companies (id, establishment_id, name, address, city, zip_code, sector, professional_family, compatible_formations, students_hosted, reliability, status) values
  ('c0c00000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'Garage Renault Vaise',         '12 rue de la Mécanique', 'Lyon', '69009', 'Automobile',           'automobile',             array['Bac Pro MVA','CAP MV'],          14, 'high',    'strong_partner'),
  ('c0c00000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', 'Carrefour Lyon Confluence',    '5 cours Charlemagne',    'Lyon', '69002', 'Grande distribution',  'commerce_vente',         array['Bac Pro Commerce'],              22, 'high',    'strong_partner'),
  ('c0c00000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000001', 'Atelier Bois Massif',          '47 rue du Bois',         'Lyon', '69007', 'Artisanat',            'artisanat_art',          array['CAP Ébéniste'],                   3, 'medium',  'active'),
  ('c0c00000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000001', 'Cabinet Comptable Sigma',      '8 rue de la République', 'Lyon', '69001', 'Conseil',              'gestion_administration', array['Bac Pro GATL'],                   5, 'high',    'active'),
  ('c0c00000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000001', 'Boucherie Charolaise Bellecour','3 place Bellecour',     'Lyon', '69002', 'Alimentation',         'commerce_vente',         array['Bac Pro Commerce','CAP'],         2, 'low',     'to_watch'),
  ('c0c00000-0000-0000-0000-000000000006', 'e1000000-0000-0000-0000-000000000001', 'Auto-École Étoile',            '15 avenue Berthelot',    'Lyon', '69007', 'Service',              'service_public',         array['Bac Pro GATL'],                   1, 'unknown', 'to_recontact'),
  ('c0c00000-0000-0000-0000-000000000007', 'e1000000-0000-0000-0000-000000000001', 'Peugeot Part-Dieu',            '102 rue de la Part-Dieu','Lyon', '69003', 'Automobile',           'automobile',             array['Bac Pro MVA','CAP MV'],           8, 'high',    'active'),
  ('c0c00000-0000-0000-0000-000000000008', 'e1000000-0000-0000-0000-000000000001', 'Décathlon Lyon Caluire',       '1 rue Pasteur',          'Caluire','69300', 'Grande distribution', 'commerce_vente',         array['Bac Pro Commerce'],               6, 'medium',  'active')
on conflict (id) do nothing;

insert into tutors (id, establishment_id, company_id, first_name, last_name, function, email, responsiveness) values
  ('71040000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'c0c00000-0000-0000-0000-000000000001', 'Vincent',  'Marchetti', 'Chef d''atelier',         'v.marchetti@renault-vaise.fr',  'fast'),
  ('71040000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', 'c0c00000-0000-0000-0000-000000000002', 'Audrey',   'Lemoine',   'Responsable rayon',       'a.lemoine@carrefour.fr',         'fast'),
  ('71040000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000001', 'c0c00000-0000-0000-0000-000000000003', 'Patrick',  'Beaufort',  'Maître ébéniste',         'patrick@atelierboismassif.fr',   'medium'),
  ('71040000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000001', 'c0c00000-0000-0000-0000-000000000004', 'Nathalie', 'Vasseur',   'Expert-comptable',        'n.vasseur@sigma-conseil.fr',     'fast'),
  ('71040000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000001', 'c0c00000-0000-0000-0000-000000000005', 'Bernard',  'Coste',     'Gérant',                  null,                              'slow'),
  ('71040000-0000-0000-0000-000000000006', 'e1000000-0000-0000-0000-000000000001', 'c0c00000-0000-0000-0000-000000000006', 'Olivier',  'Renaud',    'Directeur',               'o.renaud@auto-ecole-etoile.fr',  'unknown'),
  ('71040000-0000-0000-0000-000000000007', 'e1000000-0000-0000-0000-000000000001', 'c0c00000-0000-0000-0000-000000000007', 'Sophie',   'Tournier',  'Cheffe d''équipe',        's.tournier@peugeot-pdt.fr',      'fast'),
  ('71040000-0000-0000-0000-000000000008', 'e1000000-0000-0000-0000-000000000001', 'c0c00000-0000-0000-0000-000000000008', 'Karim',    'Boucetta',  'Responsable rayon sport', 'k.boucetta@decathlon.fr',        'medium')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 7. Périodes PFMP (2 : une terminée + une en cours)
-- -----------------------------------------------------------------------------
insert into pfmp_periods (id, establishment_id, name, school_year, start_date, end_date, status) values
  ('70000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'PFMP Janvier 2026', '2025-2026', '2026-01-12', '2026-02-06', 'completed'),
  ('70000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', 'PFMP Mai 2026',     '2025-2026', '2026-05-04', '2026-05-30', 'in_progress')
on conflict (id) do nothing;

insert into pfmp_period_classes (period_id, class_id) values
  ('70000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002'),
  ('70000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002'),
  ('70000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000003'),
  ('70000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000004')
on conflict (period_id, class_id) do nothing;

-- -----------------------------------------------------------------------------
-- 8. Placements (élève → période → entreprise → tuteur → référent)
-- -----------------------------------------------------------------------------
insert into placements (id, establishment_id, student_id, period_id, company_id, tutor_id, referent_id, start_date, end_date, status) values
  -- Période en cours, 6 placements actifs
  ('70100000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 'c0c00000-0000-0000-0000-000000000001', '71040000-0000-0000-0000-000000000001', '7ea10000-0000-0000-0000-000000000003', '2026-05-04', '2026-05-30', 'in_progress'),
  ('70100000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', 'c0c00000-0000-0000-0000-000000000007', '71040000-0000-0000-0000-000000000007', '7ea10000-0000-0000-0000-000000000003', '2026-05-04', '2026-05-30', 'in_progress'),
  ('70100000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000002', 'c0c00000-0000-0000-0000-000000000001', '71040000-0000-0000-0000-000000000001', '7ea10000-0000-0000-0000-000000000003', '2026-05-04', '2026-05-30', 'in_progress'),
  ('70100000-0000-0000-0000-000000000007', 'e1000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000007', '70000000-0000-0000-0000-000000000002', 'c0c00000-0000-0000-0000-000000000002', '71040000-0000-0000-0000-000000000002', '7ea10000-0000-0000-0000-000000000004', '2026-05-04', '2026-05-30', 'in_progress'),
  ('70100000-0000-0000-0000-000000000008', 'e1000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000008', '70000000-0000-0000-0000-000000000002', 'c0c00000-0000-0000-0000-000000000008', '71040000-0000-0000-0000-000000000008', '7ea10000-0000-0000-0000-000000000004', '2026-05-04', '2026-05-30', 'in_progress'),
  ('70100000-0000-0000-0000-000000000013', 'e1000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000013', '70000000-0000-0000-0000-000000000002', 'c0c00000-0000-0000-0000-000000000003', '71040000-0000-0000-0000-000000000003', '7ea10000-0000-0000-0000-000000000005', '2026-05-04', '2026-05-30', 'signed_convention')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 9. Affectations professeur référent → élève
-- -----------------------------------------------------------------------------
insert into teacher_assignments (id, establishment_id, teacher_id, student_id, period_id) values
  -- Julien Garcia (referent) suit 3 élèves de 1MVA
  ('70200000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', '7ea10000-0000-0000-0000-000000000003', '51000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002'),
  ('70200000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', '7ea10000-0000-0000-0000-000000000003', '51000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002'),
  ('70200000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000001', '7ea10000-0000-0000-0000-000000000003', '51000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000002'),
  -- Laura Rossi suit Term Commerce
  ('70200000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000001', '7ea10000-0000-0000-0000-000000000004', '51000000-0000-0000-0000-000000000007', '70000000-0000-0000-0000-000000000002'),
  ('70200000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000001', '7ea10000-0000-0000-0000-000000000004', '51000000-0000-0000-0000-000000000008', '70000000-0000-0000-0000-000000000002'),
  -- Thomas Martin suit CAP EBT
  ('70200000-0000-0000-0000-000000000006', 'e1000000-0000-0000-0000-000000000001', '7ea10000-0000-0000-0000-000000000005', '51000000-0000-0000-0000-000000000013', '70000000-0000-0000-0000-000000000002')
on conflict (teacher_id, student_id, period_id) do nothing;

-- -----------------------------------------------------------------------------
-- 10. Visites (4 — dont 2 validées et 2 brouillons)
-- -----------------------------------------------------------------------------
insert into visits (id, establishment_id, student_id, teacher_id, period_id, date, contact_type, student_present, tutor_met, conditions, activities, positives, difficulties, alert_level, status) values
  ('80000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', '7ea10000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000002', '2026-05-12', 'visit',  true,  true,  'Atelier propre, tenue fournie, accueil chaleureux.', 'Diagnostic, montage de pneus, vidange.',                       'Très autonome. Pose des questions pertinentes.',           '',                                          'none',      'validated'),
  ('80000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000002', '7ea10000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000002', '2026-05-13', 'visit',  true,  true,  'Concession récente, équipement complet.',            'Accueil client, présentation véhicules.',                     'Bonne posture commerciale.',                              'Encore timide à l''écrit.',                  'vigilance', 'validated'),
  ('80000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000007', '7ea10000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000002', '2026-05-14', 'call',   true,  false, '',                                                   '',                                                              '',                                                          '',                                          'none',      'draft'),
  ('80000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000013', '7ea10000-0000-0000-0000-000000000005', '70000000-0000-0000-0000-000000000002', '2026-05-15', 'visit',  false, true,  'Atelier exigu, machines anciennes mais entretenues.','Découverte de l''outillage, pas encore de réalisation seul.', 'Tuteur très investi.',                                    'Stagiaire absent le jour de la visite.',    'problem',   'draft')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 11. Documents (8 — un mix typique de conventions, attestations, comptes rendus)
-- -----------------------------------------------------------------------------
insert into documents (id, establishment_id, type, student_id, period_id, company_id, name, status) values
  ('d0000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'convention',  '51000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 'c0c00000-0000-0000-0000-000000000001', 'Convention Lucas Bernard — Renault Vaise',      'validated'),
  ('d0000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', 'convention',  '51000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', 'c0c00000-0000-0000-0000-000000000007', 'Convention Sofia Almeida — Peugeot Part-Dieu',  'validated'),
  ('d0000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000001', 'convention',  '51000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000002', 'c0c00000-0000-0000-0000-000000000001', 'Convention Mehdi Belkacem — Renault Vaise',     'draft'),
  ('d0000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000001', 'convention',  '51000000-0000-0000-0000-000000000007', '70000000-0000-0000-0000-000000000002', 'c0c00000-0000-0000-0000-000000000002', 'Convention Maxime Dubois — Carrefour',          'validated'),
  ('d0000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000001', 'attestation', '51000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'c0c00000-0000-0000-0000-000000000001', 'Attestation PFMP Janvier — Lucas Bernard',      'validated'),
  ('d0000000-0000-0000-0000-000000000006', 'e1000000-0000-0000-0000-000000000001', 'visit_report','51000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', null,                                       'Compte rendu visite Lucas Bernard',             'validated'),
  ('d0000000-0000-0000-0000-000000000007', 'e1000000-0000-0000-0000-000000000001', 'convention',  '51000000-0000-0000-0000-000000000013', '70000000-0000-0000-0000-000000000002', 'c0c00000-0000-0000-0000-000000000003', 'Convention Camille Petit — Atelier Bois',       'missing'),
  ('d0000000-0000-0000-0000-000000000008', 'e1000000-0000-0000-0000-000000000001', 'evaluation',  '51000000-0000-0000-0000-000000000007', '70000000-0000-0000-0000-000000000002', 'c0c00000-0000-0000-0000-000000000002', 'Fiche éval Maxime Dubois — Carrefour',          'draft')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 12. Templates de documents (1 par type au global pour démarrer)
-- -----------------------------------------------------------------------------
insert into document_templates (id, establishment_id, type, name, body_markdown, variables, version) values
  ('d7170000-0000-0000-0000-000000000001', null, 'convention',  'Convention type CAP/Bac Pro',
   E'# Convention de stage\n\n**Élève** : {{student.first_name}} {{student.last_name}}\n**Classe** : {{class.name}}\n**Période** : du {{period.start_date}} au {{period.end_date}}\n**Entreprise** : {{company.name}}, {{company.address}}\n**Tuteur** : {{tutor.first_name}} {{tutor.last_name}}, {{tutor.function}}\n\nLe présent document atteste l''accord entre les parties pour la réalisation de la PFMP.',
   '{"student": {}, "class": {}, "period": {}, "company": {}, "tutor": {}}'::jsonb, 1),
  ('d7170000-0000-0000-0000-000000000002', null, 'attestation', 'Attestation de fin de PFMP',
   E'# Attestation de PFMP\n\nJe soussigné(e), {{tutor.first_name}} {{tutor.last_name}}, en qualité de {{tutor.function}} chez {{company.name}}, atteste avoir accueilli en stage :\n\n- {{student.first_name}} {{student.last_name}}\n- du {{period.start_date}} au {{period.end_date}}\n\nFait à {{company.city}}, le {{today}}.',
   '{"student": {}, "tutor": {}, "company": {}, "period": {}}'::jsonb, 1)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 13. Alertes (8 typiques)
-- -----------------------------------------------------------------------------
insert into alerts (id, establishment_id, type, severity, message, related_entity_type, related_entity_id) values
  ('a1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'student_no_stage',     'urgent',     'Anaïs Roux n''a toujours pas trouvé de stage',         'student',  '51000000-0000-0000-0000-000000000004'),
  ('a1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', 'student_no_stage',     'problem',    'Hugo Lambert n''a toujours pas trouvé de stage',       'student',  '51000000-0000-0000-0000-000000000005'),
  ('a1000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000001', 'missing_convention',   'problem',    'Convention manquante : Camille Petit',                 'student',  '51000000-0000-0000-0000-000000000013'),
  ('a1000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000001', 'visit_late',           'vigilance',  'Visite en retard : Mehdi Belkacem',                    'student',  '51000000-0000-0000-0000-000000000003'),
  ('a1000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000001', 'company_watch',        'vigilance',  'À surveiller : Boucherie Charolaise Bellecour',        'company',  'c0c00000-0000-0000-0000-000000000005'),
  ('a1000000-0000-0000-0000-000000000006', 'e1000000-0000-0000-0000-000000000001', 'teacher_overload',     'vigilance',  'Charge élevée : Julien Garcia (3 élèves suivis)',      'teacher',  '7ea10000-0000-0000-0000-000000000003'),
  ('a1000000-0000-0000-0000-000000000007', 'e1000000-0000-0000-0000-000000000001', 'missing_attestation',  'problem',    'Attestation manquante : Sofia Almeida (PFMP janvier)', 'student',  '51000000-0000-0000-0000-000000000002'),
  ('a1000000-0000-0000-0000-000000000008', 'e1000000-0000-0000-0000-000000000001', 'stage_interrupted',    'urgent',     'Stage interrompu : Camille Petit (à requalifier)',     'student',  '51000000-0000-0000-0000-000000000013')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 14. Audit log (quelques entrées pour la timeline)
-- -----------------------------------------------------------------------------
insert into audit_logs (establishment_id, user_id, action, description) values
  ('e1000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000006', 'visit_create',       'Visite créée pour Lucas Bernard chez Renault Vaise'),
  ('e1000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000003', 'assignment_update',  'Affectation : Sofia Almeida → Julien Garcia'),
  ('e1000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 'import',             'Import CSV : 4 nouvelles entreprises'),
  ('e1000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000006', 'ai_generate',        'Génération IA : reformulation compte rendu Lucas Bernard'),
  ('e1000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000003', 'report_validate',    'Compte rendu validé : visite Lucas Bernard');

reset role;

-- =============================================================================
-- Fin du seed
-- =============================================================================
