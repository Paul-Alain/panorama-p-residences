
# Refonte du Dashboard Gestionnaire — Résidence Panorama P

Transformer le back-office en centre de contrôle opérationnel : 9 unités physiques (4 Chambres, 4 Studios, 1 Appartement), 100% français, dates au format `jeu 05 nov 2026`, responsive, aucun paiement en ligne.

Le travail est découpé en phases livrables. Chaque phase est testée avant la suivante.

## Phase 1 — Fondations base de données (migrations)

Nouvelles structures, sans casser l'existant :

1. **`reservations`** : ajouter `payment_status` (texte, défaut `non_payé`), `total_amount` (numeric, défaut 0), `notes` (texte). Élargir le cycle de statut (colonne texte libre déjà) vers : `demande` → `en_attente` → `confirmée` → `checkin` (arrivée) → `present` → `checkout` → `terminée`, plus `annulée`. Mapping de l'existant (`nouvelle`→`en_attente`).
2. **`logement_units`** : ajouter `op_status` (texte : `actif`, `nettoyage`, `maintenance`, `bloquée` ; défaut `actif`). `libre/occupée` reste calculé depuis les réservations. `available` = visible à la réservation.
3. **`payments`** (nouvelle table) : `id, reservation_id, amount, method` (espèces / mobile_money / virement / carte_externe), `recorded_by` (uuid), `recorded_by_name`, `note`, `created_at`. RLS + GRANT (admin/équipe via has_role).
4. **`activity_log`** (nouvelle table) : `id, user_id, user_name, action, object_type, object_id, summary, created_at`. RLS lecture équipe, insertion service/équipe.
5. **`residence_settings`** (nouvelle table singleton) : nom, logo_url, devise (FCFA), checkin_time, checkout_time, deposit_percent, cancellation_policy, taxes, email_notifications, langue.
6. **Rôles équipe** : enum `app_role` étendu (`proprietaire`, `gestionnaire`, `reception`, `menage`, `comptable`) en plus de `admin`. `has_role` réutilisé. Helper `is_staff()` pour les accès back-office.

## Phase 2 — Server functions opérationnelles

Dans `src/lib/admin.functions.ts` (+ nouveau `src/lib/payments.functions.ts`) :

- `adminGetDashboard` : KPIs du jour (occupation, dispo, arrivées, départs, demandes en attente, paiements à vérifier, messages à traiter, revenus du mois), liste **arrivées/départs du jour**, **état des 9 unités** (statut calculé), **actions urgentes** (arrivées non payées, départs avec solde, demandes en attente, unités en maintenance, **conflits de réservation**).
- `adminCheckIn` / `adminCheckOut` : transitions de statut (≤ 3 clics), avec garde-fou anti-incohérence.
- `adminUpdateReservationStatus` : workflow imposé (refus des transitions illégales).
- `adminSetUnitOpStatus` : nettoyage / maintenance / bloquée / actif.
- `adminAddPayment` : enregistre un paiement, recalcule le solde, met à jour `payment_status`, **envoie un email au client** (montant, date, réservation, solde restant) via l'infra email existante, journalise.
- `adminListPayments`, `adminGetReservationDetail` (séjour + paiements + messages + avis liés).
- `adminListClients` (fusion doublons email/téléphone, total dépensé, dernier séjour, nb réservations) + `adminGetClientDetail`.
- `adminListActivity`, `adminListTeam`, `adminSetTeamRole`.
- `adminGetSettings` / `adminUpdateSettings`.
- **Anti double-réservation** : validation serveur sur chevauchement par unité physique (confirmée/checkin/present) à l'assignation et à la confirmation ; détection de conflits exposée au dashboard.

## Phase 3 — Navigation & coquille

Remplacer les onglets actuels (`src/routes/admin.tsx`) par le menu : Tableau de bord, Réservations, Calendrier, Logements, Clients, Paiements, Messages, Avis, Équipe, Paramètres. Navigation responsive (onglets scrollables sur mobile, lisibles tablette/desktop).

Ajouter un util `formatDateFr(date)` → `jeu 05 nov 2026` utilisé partout ; suppression des formats `2026-11-05`, `Nov 5`, `05/11/2026`. Toutes les chaînes EN restantes passées en FR dans `translations.ts`.

## Phase 4 — Tableau de bord opérationnel

`dashboard-overview.tsx` réécrit : cartes KPI essentielles, **bloc Actions urgentes** (description + niveau d'urgence + bouton), **bloc Aujourd'hui** (2 colonnes Arrivées/Départs avec heure, client, unité, personnes, statut paiement, bouton Check-in/Check-out), **bloc État des 9 unités** (statut, client actuel/prochain, période, paiement, actions Voir/Réserver/Bloquer/Maintenance). Priorité visuelle aux opérations du jour.

## Phase 5 — Réservations

Tableau avec **unité physique** affichée (`Studio 3`). Colonnes : Référence, Client, Téléphone, Unité, Arrivée, Départ, Personne(s), Statut réservation, Statut paiement. Actions : Voir détails, Confirmer, Check-in, Check-out, Ajouter paiement, Générer facture PDF, Contacter client. Statuts paiement manuels (non payé, acompte, partiel, payé, solde dû). Workflow strict.

## Phase 6 — Calendrier (planning hôtelier)

Réécriture `occupancy-calendar.tsx` : lignes = 9 unités, colonnes = jours, libellé = nom court client. Code couleur (libre/confirmé/présent/arrivée-départ/conflit-maintenance/bloqué/nettoyage). Clic réservation → panneau latéral (client, tel, paiement, séjour, notes ; actions Modifier/Check-in/Check-out/Ajouter paiement). Case libre → Nouvelle réservation / Bloquer / Maintenance / Nettoyage.

## Phase 7 — Logements, Clients, Paiements, Messages, Avis, Équipe, Paramètres

- **Logements** : 2 sections — Types (Chambre Élégante cap.2, Studio Meublé Confort cap.2, Appartement Premium cap.4 ; prix/nuit, nb unités, actif) + Unités physiques (statut auto).
- **Paiements** : tableau (date, réservation, client, montant, méthode, enregistré par) ; reçu PDF + facture PDF ; **aucune passerelle de paiement**.
- **Clients** : interdiction sans nom, fusion doublons, fiche client (historique réservations/paiements/messages/avis).
- **Messages** : centralisés, statuts Non lu / En cours / Traité.
- **Avis** : note moyenne, récents, répartition ; Répondre / Masquer.
- **Équipe** : rôles + permissions, **journal d'activité** (date, utilisateur, action, objet).
- **Paramètres** : nom, logo, devise FCFA, horaires check-in/out, % acompte, politique annulation, notifications email, taxes, langue.

## Détails techniques

- PDF reçu/facture : génération côté client avec `jspdf` (ajout dépendance), aucune dépendance Node-only côté serveur.
- Email post-paiement : réutilise `enqueueAppEmail` + nouveau template `payment-receipt`.
- Statuts d'unité calculés à la volée depuis les réservations (libre/occupée/arrivée/départ) combinés à `op_status` (nettoyage/maintenance/bloquée).
- Toutes les écritures passent par des server functions protégées `requireSupabaseAuth` + `assertStaff`, RLS en filet de sécurité.
- Permissions par rôle appliquées côté serveur (ex. seul comptable/gestionnaire/proprietaire ajoutent un paiement).

## Hypothèses

- `total_amount` par défaut = prix catégorie × nuits, ajustable manuellement ; le solde = total − somme des paiements.
- Les rôles back-office (gestionnaire, réception, etc.) ont accès au dashboard ; `admin`/`proprietaire` gardent tous les droits.
- Pas de migration destructive : les données existantes sont conservées et remappées.
