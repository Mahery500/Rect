# REGISTRE DES APIS MANQUANTES OU INCOMPLÈTES DU BACKEND SYMFONY

> Ce document recense chaque écran où une donnée requise par l'interface ne peut pas être fournie par le backend existant, en application stricte de la **Règle n°1** (zéro donnée locale, zéro mock).

| Écran / Brique | Donnée voulue | Endpoint / Format attendu | Constat dans l'ancien code |
|---|---|---|---|
| Administration Entreprises (`entreprises`) | Modification d'une entreprise conventionnée | `PUT /api/entreprises/{id}` (ou `/api/companies/{id}`) | `companies.repository.ts` et `identity.contracts.ts` précisent que PUT n'est pas exposé par l'API Symfony (HTTP 501 / 405). |
| Administration Entreprises (`entreprises`) | Suppression d'une entreprise conventionnée | `DELETE /api/entreprises/{id}` (ou `/api/companies/{id}`) | `companies.repository.ts` et `identity.contracts.ts` précisent que DELETE n'est pas exposé par l'API Symfony (HTTP 501 / 405). |
| Catalogue d'Actes (`catalogue-actes`) | Modification d'une catégorie d'actes | `PATCH /api/categorie_actes/{id}` | L'API Symfony n'expose pas de modification de catégorie : le code et le libellé sont permanents à la création. |
| Catalogue d'Actes (`catalogue-actes`) | Suppression d'une catégorie d'actes | `DELETE /api/categorie_actes/{id}` | L'API Symfony n'expose pas de suppression de catégorie (HTTP 501 / 405). |
| Catalogue d'Actes (`catalogue-actes`) | Suppression physique d'un acte médical | `DELETE /api/acte_definitions/{id}` | L'API Symfony refuse la suppression physique (conservation médico-légale) ; les actes s'activent/désactivent via `POST /api/acte_definitions/{id}/activation` `{ actif: boolean }`. |
| Dossiers Patients (`patients`) | Création unitaire manuelle d'un patient | `POST /api/patients` | Non exposé par le backend Symfony (HTTP 501 / 405) : l'intégration se fait exclusivement via l'import de fichier Excel (`POST /api/import-patients`) ou affiliation salarié (`POST /api/agents`). |
| Dossiers Patients (`patients`) | Remplacement complet / suppression d'un patient | `PUT /api/patients/{id}`, `DELETE /api/patients/{id}` | Non exposés par le backend Symfony (conservation médico-légale des dossiers). Seule la complétion des champs vides est supportée via `PATCH /api/patients/{id}/completer`. |
| Définitions d'Observations (`observation-definitions`) | Suppression physique d'une observation | `DELETE /api/observation_definitions/{id}` | Non exposé par le backend Symfony pour préserver l'historique des observations cliniques. La modification se fait via `PATCH /api/observation_definitions/{id}` (verrouillée au seul libellé si déjà utilisée en base). |
