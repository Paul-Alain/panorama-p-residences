-- ══════════════════════════════════════════════════════
-- Avis clients réels (Airbnb)
-- ══════════════════════════════════════════════════════

INSERT INTO public.testimonials
(id, name, location, rating, message_fr, message_en, sort_order)
VALUES
(gen_random_uuid(), 'Ntimbi', ' Janvier 2026', 5,
'Cétait un hôte formidable, très accueillant et professionnel. L''appartement est encore mieux qu''en photos. Propre, bien agencé et équipé. Emplacement accessible, sûr et calme. Je réserverai de nouveau. Idéal pour les vacances en famille.',
 1),

(gen_random_uuid(), 'Larry', 'Avril 2026', 5,
'L''endroit idéal pour un séjour paisible et proche de la nature à Bafoussam, à un prix abordable. Vraiment recommandé !', 2),

(gen_random_uuid(), 'Michel', ' Janvier 2026', 5,
'La vue exceptionnelle a rendu notre séjour inoubliable ! Communication fluide avec l''hôte. Appartement impeccable et parfaitement équipé. Nous reviendrons avec des amis.', 3),

(gen_random_uuid(), 'Raoul', ' Janvier 2026', 5,
'Séjour exceptionnel ! Hébergement impeccable, confortable et décoré avec goût. Eau chaude, internet haut débit, parking gratuit sécurisé. Vue panoramique à couper le souffle. Hôte remarquable. Recommandé à 100% !',
 4),


(gen_random_uuid(), 'Thierry',  ' Février 2026', 5,
'Thanks to Rodrigue for hosting us so warmly. Recommended establishment. Beautiful view of the neighborhood. Loved it!', 6)

ON CONFLICT DO NOTHING;
