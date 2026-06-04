## Objectif

Plusieurs retouches de contenu sur le site Panorama P : mise en forme du titre d'accueil, réorganisation et nettoyage de la section « Nos logements », et corrections des textes de réservation et de contact (avec versions FR/EN dans le message WhatsApp).

## 1. Titre principal de la page d'accueil

Fichier : `src/components/home/hero.tsx` + `src/lib/i18n/translations.ts`

- Aujourd'hui le H1 affiche en une ligne : « Panorama P – Résidence meublée à Bafoussam ».
- Nouveau rendu sur deux lignes :
  - Ligne 1 (grande police) : **Panorama P**
  - Ligne 2 (police plus petite, juste en dessous) : **Résidence meublée à Bafoussam**
  - Suppression du tiret « – ».
- Ajout de clés de traduction `hero.titleMain` (« Panorama P ») et `hero.titleSub` (« Résidence meublée à Bafoussam » / versions DE et EN) et adaptation du composant.

## 2. Section « Nos logements »

Données en base (table `logements`) → mise à jour via migration.

Nouvel ordre d'affichage :
1. Chambre Élégante
2. Studio Meublé Confort
3. Appartement Premium

Nettoyage des équipements (suppression de **Climatisation, Parking, Sécurité** partout, ajout de **Cuisine** à la Chambre Élégante). Résultat pour chaque logement :

```text
Chambre Élégante      : Wi-Fi, Cuisine, Douche moderne, Télévision
Studio Meublé Confort : Wi-Fi, Cuisine, Douche moderne, Télévision
Appartement Premium   : Wi-Fi, Cuisine, Douche moderne, Télévision
```

## 3. Bloc « Demande de réservation » (bas de page)

Fichier : `src/lib/i18n/translations.ts` (clé `reservation.subtitle`, FR/DE/EN)

- Avant : « Indiquez vos dates et nous vous confirmons la disponibilité rapidement. »
- Après : « **Nous sommes ravis de vous recevoir aux dates que vous nous communiquerez ci-dessous.** » (+ traductions DE/EN)

## 4. Message WhatsApp de réservation

Fichier : `src/components/forms/reservation-form.tsx`

Nouveau gabarit, chaque phrase en français puis anglais séparées par « / » :

```text
Bonjour Panorama-P Residence, j'aimerais réserver / Hello Panorama-P Residence, I would like to book:

• Nom / Full name: ...
• Téléphone / Phone: ...
• E-mail / Email: ...
• Arrivée / Check-in: ...
• Départ / Check-out: ...
• Type de logement / Accommodation type: ...
• Personnes / Guests: ...

Merci de me confirmer la disponibilité et le tarif SVP / Please confirm availability and price.
```

Changements précis :
- Première phrase remplacée par « Bonjour Panorama-P Residence, j'aimerais réserver ».
- Le nombre de personnes ne s'affiche jamais comme « NaN » (valeur par défaut sécurisée à 1).
- Ligne « Commentaires / Comments » supprimée.
- « Logement » renommé « Type de logement / Accommodation type ».
- Phrase finale : « Merci de me confirmer la disponibilité et le tarif SVP / Please confirm availability and price. »

## 5. Page Contact

Fichier : `src/lib/i18n/translations.ts` (clé `contact.subtitle`, FR/DE/EN)

- Avant : « Une question ? Écrivez-nous, nous répondons rapidement. »
- Après : « **Une question ? Une réclamation ? Écrivez-nous, nous répondons rapidement.** » (+ traductions DE/EN)

## 6. Corrections orthographiques

Relecture et correction des éventuelles fautes de français dans les chaînes modifiées (apostrophes, accents, espaces avant la ponctuation double).

## Détails techniques

- Une migration SQL (`UPDATE public.logements`) ajustera `sort_order` et `equipments` pour les 3 logements. Aucune modification de schéma ni de RLS, données de production préservées.
- Les modifications de texte passent par `translations.ts` (FR/DE/EN) pour rester cohérentes avec le système multilingue ; aucune chaîne codée en dur ajoutée dans les composants.
- Aucun changement de logique métier (réservations, paiements, calendrier) : uniquement présentation et contenu.
