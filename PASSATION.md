# PLAN DE REFONTE ASINA SIH — ARCHITECTURE « BRIQUES LEGO »

> Document de suivi de refonte. À chaque nouvelle session, ce document est relu et mis à jour.
> **Règle n°1 absolue** : ZÉRO donnée locale, ZÉRO valeur inventée (`Date.now()`, `|| 1`, mocks, listes en dur). Tout vient exclusivement de l'API Symfony. Si un endpoint n'existe pas, consigner dans `API_MANQUANTES.md` et afficher un état « Non disponible (API manquante) ».

---

## 1. Conventions d'architecture & Principes

- **Arborescence cible** :
  - `src/noyau/` : Socle indépendant (http, notifications, utils, ui réutilisable). N'importe rien en dehors de lui.
  - `src/briques/` : Briques métier autonomes et indépendantes. N'importent que le noyau.
  - `src/assemblages/` : Vues et écrans métiers assemblant plusieurs briques par onglet/page.
  - `src/cerveau/` : Permissions (`ressource:action`), registre des briques, gestionnaire de session/droits.
  - `src/coquille/` : Mise en page globale (en-tête, navigation latérale, pied de page, conteneur applicatif).
- **Sens d'import strict** :
  `noyau/` ← `briques/` ← `assemblages/` ← `cerveau/` ← `coquille/`
  *(Une couche n'importe JAMAIS une couche située à sa droite)*
- **Anatomie d'une brique** (`src/briques/<nom>/`) :
  - `brique.ts` : Manifeste avec permissions requises via `definirBrique`.
  - `FICHE.md` : Documentation contractuelle (rôle, endpoints réels appelés, composants ui).
  - `modele/` : Types stricts et règles métier pures (en français).
  - `api/` : Fonctions d'appel HTTP + `*.mapping.ts` (conversion API Platform ↔ modèle).
  - `hooks/` : Chargement autonome des données, mutations, état des modales.
  - `ui/` : `Panneau<Nom>.tsx` (point d'entrée recevant `{ mode: 'lecture' | 'edition' | 'masque' }`) + sous-composants.
  - `index.ts` : Seul et unique point d'export de la brique.
- **Règles de style et code** :
  - Tout en français (noms de fichiers, fonctions, variables, messages).
  - Un fichier = une responsabilité, 100 à 150 lignes max.
  - TypeScript strict, 0 `any`.
  - Design : reprise à l'identique des classes Tailwind existantes sans restylage spéculatif.
  - Pages purgées (non migrées) : Ticketing support (`TicketingPage`) et Pilotage/Analysis (`DashboardPage`).

---

## 2. Étapes de migration (Ordre d'exécution)

### Étape 0 : Socle transversal & Noyau
- [x] **0.1 Noyau Utilitaires** (`src/noyau/utils/`) : formatage de dates, montants, gestion d'erreurs (`messageErreur`).
- [x] **0.2 Noyau Notifications** (`src/noyau/notifications/`) : gestionnaire et hook `useNotifier()`, toast existant.
- [x] **0.3 Noyau HTTP & Session** (`src/noyau/http/`) : client HTTP typé, gestion JWT/refresh, extraction hydra/collections.
- [x] **0.4 Noyau UI** (`src/noyau/ui/`) : composants réutilisables existants (Modale, ModaleConfirmationSuppression, ChampTexte, ChampSelection, ChampZoneTexte, ChampRecherche, ActionsFormulaire, SousOnglets, BadgeStatut, TableauDonnees).
- [x] **0.5 Cerveau Permissions** (`src/cerveau/permissions/`) : matrice rôle Symfony → permissions `ressource:action` et résolution du mode (`edition`, `lecture`, `masque`).

---

### Étape 1 : Authentification & Session
- [x] **1.1 Brique Authentification** (`src/briques/authentification/`) : écran de connexion, validation des identifiants, récupération de `/me`, stockage du token.
- [x] **1.2 Cerveau Registre & Session** (`src/cerveau/session/`, `src/cerveau/registre/`) : état de l'utilisateur connecté, sélection site/service actif.

---

### Étape 2 : Référentiels & Administration de base
- [x] **2.1 Brique Sites** (`src/briques/sites/`) : liste, création, modification des sites (GET/POST/PUT `/sites`).
- [x] **2.2 Brique Services** (`src/briques/services/`) : liste, création, modification des services médicaux et types de services (GET/POST/PUT `/services`, `/type-services`).
- [x] **2.3 Brique Entreprises** (`src/briques/entreprises/`) : gestion des entreprises partenaires (GET/POST/PUT/DELETE `/companies`).
- [x] **2.4 Brique Catalogue d'Actes** (`src/briques/catalogue-actes/`) : catégories et définitions d'actes (GET/POST/PATCH `/categorie_actes`, `/acte_definitions`).

---

### Étape 3 : Administration avancée & Personnel
- [x] **3.1 Brique Utilisateurs** (`src/briques/utilisateurs/`) : comptes d'accès, rôles, activation (GET/POST/PUT/DELETE `/users`, `/staffs`).
- [x] **3.2 Brique Affectations** (`src/briques/affectations/`) : affectation des personnels aux sites et services (GET/POST/PATCH/DELETE `/assignments`, `/staffs`).

---

### Étape 4 : Accueil, Patients & File d'attente
- [x] **4.1 Brique Patients** (`src/briques/patients/`) : recherche, complétion fiche patient, importation Excel, affiliation salarié (GET/PATCH `/patients`, POST `/import-patients`, POST `/agents`).
- [x] **4.2 Brique Vérification Adhérents** (`src/briques/verification-adherents/`) : contrôle d'éligibilité, CNAPS, entreprise, rendez-vous du jour, confirmation d'arrivée & émission ticket, carte d'adhérent (GET `/patients`, GET `/rendez-vous`, POST `/rendez-vous/{id}/confirmer-arrivee`, POST `/tickets`).
- [x] **4.3 Brique Rendez-Vous** (`src/briques/rendez-vous/`) : consultation du planning, prise de rendez-vous, annulation, confirmation d'arrivée physique et génération de ticket (GET/POST/DELETE `/rendez-vous`, POST `/rendez-vous/{id}/confirmer-arrivee`).
- [x] **4.4 Brique Émission Tickets & File d'Accueil** (`src/briques/tickets-accueil/`) : émission de ticket avec aiguillage réel, suivi file d'attente, appel guichet et synthèse (POST `/tickets`, GET `/aiguillages`).
- [x] **4.5 Brique Écran Salle d'Attente** (`src/briques/ecran-attente/`) : affichage autonome des tickets appelés, en consultation et en attente, carillon audio et synthèse vocale (route `/ecran-attente`).

---

### Étape 5 : Infirmerie & Soins
- [x] **5.1 Brique File d'Attente Infirmerie** (`src/briques/infirmerie-file/`) : liste des patients en attente de soins, prise en charge (GET `/me/file_attente`, POST `/aiguillages/{id}/prendre_en_charge`).
- [x] **5.2 Brique Constantes Vitales** (`src/briques/constantes-vitales/`) : saisie et suivi des paramètres vitaux (TA, température, poids, pouls) via `/acte_realises/{id}/observations`.
- [x] **5.3 Brique Réalisation d'Actes & Soins** (`src/briques/soins-actes/`) : exécution d'actes prescrits, saisie libre d'actes du catalogue, observations et résultats (POST `/acte_realises`, `/acte_realises/{id}/resultats`, `/acte_realises/{id}/statut`).
- [x] **5.4 Brique Historique Soins** (`src/briques/infirmerie-historique/`) : consultation et filtrage de l'historique des actes du patient (GET `/me/historique_actes`).

---

### Étape 6 : Consultations Médicales
- [x] **6.1 Brique File d'Attente Médecin** (`src/briques/consultation-file/`) : appel et prise en charge patient médecin (GET `/me/file_attente`, POST `/aiguillages/{id}/prendre_en_charge`).
- [x] **6.2 Brique Consultation Active** (`src/briques/consultation-active/`) : anamnèse, examen clinique, diagnostics CIM-10, prescriptions d'actes et clôture médicale (POST `/diagnostics`, `/acte_realises`, `/encounters/{id}/terminer`).
- [x] **6.3 Brique Dossiers Médicaux** (`src/briques/dossiers-medicaux/`) : répertoire clinique hospitalier, historique chronologique des consultations, diagnostics et constantes antérieures (GET `/patients`, `/encounters`, `/diagnostics`, `/acte_realises`).

---

### Étape 7 : Pharmacie & Gestion des Stocks
- [x] **7.1 Brique Référentiel Médicaments & Produits** (`src/briques/pharmacie-catalogue/`) : médicaments, formes, conditionnements, familles (GET `/medicament_resources`, etc.).
- [x] **7.2 Brique État des Stocks** (`src/briques/stock-niveaux/`) : visualisation des quantités par site et alertes péremption.
- [x] **7.3 Brique Dispensation** (`src/briques/stock-dispensation/`) : délivrance sur prescription médicale.
- [x] **7.4 Brique Mouvements & Commandes** (`src/briques/stock-mouvements/`) : entrées fournisseurs, sorties, commandes d'approvisionnement.
- [x] **7.5 Brique Inventaires & Ajustements** (`src/briques/stock-ajustements/`) : inventaires physiques et écarts.

---

### Étape 8 : Assemblages Métiers & Coquille
- [x] **8.1 Assemblage Accueil** (`src/assemblages/accueil/`) : vue complète onglets réception.
- [x] **8.2 Assemblage Infirmerie** (`src/assemblages/infirmerie/`) : vue complète infirmerie.
- [x] **8.3 Assemblage Consultation** (`src/assemblages/consultation/`) : vue complète médecin.
- [x] **8.4 Assemblage Stock** (`src/assemblages/stock/`) : vue complète pharmacie.
- [x] **8.5 Assemblage Administration** (`src/assemblages/administration/`) : vue complète admin.
- [x] **8.6 Coquille Globale** (`src/coquille/`) : en-tête avec site/service actif, barre latérale RBAC, toast, conteneur principal.

---

### Étape 9 : Recette & Bascule Finale
- [x] **9.1 Audit complet règle n°1** (0 valeur inventée, 0 mock, 0 localStorage métier).
- [x] **9.2 Validation compilation et tests**.
- [x] **9.3 Remplacement du point d'entrée `App.tsx` vers la nouvelle coquille**.
- [x] **9.4 Mise en cohérence backend Symfony pour Rendez-Vous, Ticketing et Aiguillages** :
  - Support des multi-représentations API Platform (IRIs `/api/patients/{id}`, objets imbriqués, identifiants directs `patientId`/`ticketId`/`serviceId`).
  - Tolérance aux alias de statuts, dates et identifiants.
  - Résilience aux annulations (basculement `DELETE` → `PATCH` avec statut `ANNULE`).
  - Détection automatique et extraction des tickets émis lors de la confirmation d'arrivée.
  - Enrichissement des payloads d'émission et de réservation avec les formats IRIs et scalaires simultanés.
- [x] **9.5 Mise en cohérence backend Médical (Actes, Observations, Code Systems, Soins infirmiers id 3, Demandes d'actes médecin)** :
  - **Catalogue d'Actes Médicaux & Codes Systèmes** : Ajout du référentiel des terminologies (`/api/code_systems`), modale de gestion des codes systèmes, et association des codifications externes par acte (`PUT /api/acte_definitions/{id}/codifications` et fallback PATCH) à l'identique d'Observation Definitions (LOINC, CCAM, CIM-10, SNOMED CT).
  - **Catégorie Soins Infirmiers Base ID 3** : Prise en compte explicite de la catégorie "Soins" identifiée par `id = 3` en base pour l'infirmerie, priorisation et filtrage dans `listerCatalogueRealisable` via `?categorie=3`, `?categorieId=3` et fallback catalogue avec indicateur visuel.
  - **Demandes d'Actes pour Médecin** : Émission et consultation complète des demandes d'actes dans la consultation active (`PanneauConsultationActive`), avec sélection d'acte, unité destinataire (dont Soins infirmiers id 3), niveau de priorité, indicateur d'urgence ⚡ et instructions cliniques, synchronisé via `/api/demandes`, `/api/demande_actes` et `/api/acte_realises`.
- [x] **9.6 Enregistrement d'actes en encounter (médecin généraliste), définitions de diagnostics & pose de diagnostics** :
  - **Enregistrement d'actes en encounter pour le médecin généraliste** :
    - Volet dédié dans `PanneauConsultationActive` permettant au praticien d'enregistrer directement les actes et gestes médicaux réalisés en séance (`POST /api/acte_realises` avec statut `realise`, `en_cours`, `planifie`, notes d'exécution et date de réalisation).
    - Suivi des actes enregistrés sur la consultation (`actesPrescrits`) avec visualisation des statuts et action rapide de validation de la réalisation (`changerStatutActe`).
  - **Brique Définitions de Diagnostics (`diagnostic-definitions`)** :
    - Référentiel complet des diagnostics nosologiques et de la nomenclature CIM-10 / CIM-11 (`GET/POST/PATCH /api/diagnostic_definitions`, `/api/diagnostic_definitions/{id}/activation`).
    - Gestion des codifications internationales associées par diagnostic (`PUT /api/diagnostic_definitions/{id}/codifications`, terminologies CIM-10, SNOMED-CT).
    - Panneau d'administration dédié `PanneauDiagnosticDefinitions` intégré dans `AssemblageAdministration` avec filtres par chapitre et statut actif/inactif.
    - Permissions RBAC `diagnostic_definition:lire` et `diagnostic_definition:ecrire` intégrées au noyau.
  - **Pose de diagnostics médicaux enrichie** :
    - Sélection et recherche directe depuis le catalogue des définitions diagnostiques (`catalogueDiagnostics`) au sein de `PanneauConsultationActive` avec pré-remplissage automatique des codes CIM-10 et libellés.
    - Transmission des identifiants et IRIs (`diagnosticDefinitionId`, `diagnosticDefinition`, `encounter`) lors de la création de diagnostic (`POST /api/diagnostics`).
- [x] **9.7 Alignement strict sur le backend Symfony Medical (Actes, Résultats, Observations et Diagnostics)** :
  - **Pose de diagnostic médecin** :
    - Respect de la contrainte obligatoire `CreateDiagnosticInput` de Symfony : `diagnosticDefinitionId` est désormais systématiquement fourni (`POST /api/diagnostics` avec `encounterId`, `diagnosticDefinitionId`, `statut`, `commentaire`).
    - Possibilité pour le médecin de créer une nouvelle définition nosologique à la volée dans le catalogue via `diagnosticDefinitionApi.creerDefinition` avant de poser le diagnostic.
    - Transitions de statut conformes aux règles métier (`provisoire` → `confirme` ou `infirme`, verrouillage médico-légal sur statut `infirme`).
  - **Enregistrement des actes et des résultats** :
    - Filtrage des actes médicaux réalisables par le médecin selon son rôle et le type de service via `GET /api/acte_definitions?realisableEncounterId={encounterId}`.
    - Prise en charge des statuts (`realise`, `en_cours`, `planifie`, `saisi_par_erreur`).
    - Ajout et affichage complet des **résultats cliniques** sur les actes réalisés (`POST /api/acte_realises/{id}/resultats` avec type, conclusion et interprétation).
    - Ajout et affichage des **observations** sur les actes (`POST /api/acte_realises/{id}/observations` avec respect du moule `GET /api/acte_definitions/{id}/observations`).
  - **Brique Définition de Diagnostics (`diagnostic-definitions`)** :
    - `POST /api/diagnostic_definitions` aligné sur le DTO backend (`code`, `libelle`, `codifications`).
    - `PATCH /api/diagnostic_definitions/{id}` avec verrouillage du `code` (immuable) et mise à jour des `codifications` et du `libelle`.
    - `POST /api/diagnostic_definitions/{id}/activation` pour basculer le statut actif/inactif (`ChangeActivationInput`).
- [x] **9.8 Alignement strict sur l'API Services (`ServiceOutput`) dans la Vérification et l'Accueil** :
  - **Prise en charge du DTO `ServiceOutput`** : Récupération fidèle de `typeServiceName` (au lieu de `nom`/`libelle`), `siteName`, `description` et `isActive`.
  - **Brique Vérification Adhérents (`verification-adherents`)** :
    - Résolution dynamique du libellé d'orientation (`typeServiceName`), code de file (`INFIRMERIE`, `CONSULTATION`, etc.) et description.
    - Filtrage des services actifs uniquement (`isActive !== false`) et filtrage par `siteId`.
    - Synchronisation dynamique lors des changements de site avec sélection automatique du premier service disponible.
  - **Harmonisation sur `tickets-accueil` et `rendez-vous`** : Alignement identique pour la sélection de services et l'affichage des aiguillages.
- [x] **9.9 Visibilité et continuité de la prise en charge (Infirmerie & Médical)** :
  - **Transmission de l'Encounter ID** : `PriseEnChargeResultat` retourne et transmet désormais systématiquement `encounterId`, `patientId`, `numTicket` lors du clic « Prendre en charge ».
  - **Synchronisation avec `/api/me/patient_en_cours`** : Interrogation automatique au chargement et périodiquement pour restaurer la prise en charge active même après rechargement de page.
  - **Bandeau de soins actif permanent (`AssemblageInfirmerie`)** : Affichage d'un bandeau contextuel avec ticket, identité du patient, chrono d'attente/soins et accès direct aux constantes et actes.
  - **Accès interactif et protection de file (`PanneauInfirmerieFile`)** : Carte métrique cliquable pour ouvrir directement les soins du patient en cours, et désactivation explicite des prises en charge simultanées (règle Symfony 1 patient actif par soignant).
  - **Clôture de l'encounter** : Intégration du bouton « Terminer Soins » avec gestion du forçage en cas d'actes demandés restants (`POST /api/encounters/{id}/terminer`).
  - **Alignement Consultation Médecin (`AssemblageConsultation`)** : Synchronisation identique de `consultationEnCours` avec `/api/me/patient_en_cours`.


