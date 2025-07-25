# Système de Réservation de Rendez-vous - Documentation

## Vue d'ensemble
Système complet de réservation de rendez-vous pour l'application Tr3s Sport, permettant aux clients de réserver des séances solo ou de groupe avec des coaches.

## Architecture

### Modèles de données (`models/appointment.ts`)
```typescript
// Rendez-vous principal
interface Appointment {
  id: string;
  createdBy: string; // ID utilisateur créateur
  type: 'solo' | 'group';
  sessionType: string; // Type de séance (Yoga, Cardio, etc.)
  description?: string;
  location: string;
  date: Date;
  notes?: string;
  globalStatus: 'pending' | 'confirmed' | 'declined';
  createdAt: Date;
  updatedAt: Date;
}

// Participant à un rendez-vous
interface AppointmentParticipant {
  id: string;
  appointmentId: string;
  userId?: string; // null si pas encore inscrit
  email: string;
  role: 'client' | 'coach';
  status: 'pending' | 'accepted' | 'declined';
  joinedAt?: Date;
}
```

### Services (`services/appointmentService.ts`)

#### Fonctions principales :
- `createAppointment()` - Créer un nouveau rendez-vous
- `getAppointmentsByClient()` - Récupérer les RDV d'un client
- `getPendingAppointmentsForCoach()` - RDV en attente pour un coach
- `updateParticipantStatus()` - Accepter/refuser une demande
- `getAppointmentById()` - Détails d'un RDV spécifique

### Composants UI

#### 1. CreateAppointmentScreen (`components/appointments/CreateAppointmentScreen.tsx`)
Formulaire en 3 étapes pour créer un rendez-vous :
- **Étape 1** : Choix du type (solo/groupe)
- **Étape 2** : Détails (séance, lieu, date, notes)
- **Étape 3** : Sélection coaches et invitation clients

**Fonctionnalités :**
- Validation en temps réel
- Sélection multiple coaches (groupe uniquement)
- Gestion emails invités avec validation
- Logging complet pour debugging

#### 2. ClientDashboard (`components/appointments/ClientDashboard.tsx`)
Interface client pour voir ses rendez-vous :
- Liste des RDV créés
- Statut détaillé par coach
- Résumé des participants (groupe)
- Bouton création nouveau RDV
- Pull-to-refresh

#### 3. CoachDashboard (`components/appointments/CoachDashboard.tsx`)
Interface coach pour gérer les demandes :
- Liste des demandes en attente
- Détails complets du RDV
- Boutons Accepter/Refuser
- Information sur les autres participants
- Mise à jour temps réel

#### 4. FloatingActionButton (`components/appointments/FloatingActionButton.tsx`)
Bouton flottant pour accès rapide à la création de RDV.

## Navigation

### Routes créées :
- `/appointments/create` - Création de RDV
- `/appointments/client-dashboard` - Dashboard client
- `/appointments/coach-dashboard` - Dashboard coach
- `/(tabs)/myAppointments-redirect` - Redirection vers dashboard client

## Flux fonctionnel

### 1. Rendez-vous Solo
1. Client sélectionne "Solo"
2. Remplit détails (séance, lieu, date)
3. Choisit UN coach
4. Soumission → RDV créé
5. Coach reçoit demande
6. Coach accepte/refuse
7. Client voit le statut

### 2. Rendez-vous Groupe  
1. Client sélectionne "Groupe"
2. Remplit détails
3. Choisit UN OU PLUSIEURS coaches
4. Ajoute emails clients invités
5. Soumission → RDV créé
6. Tous les coaches reçoivent demandes
7. Clients invités reçoivent invitations
8. Chacun peut accepter/refuser indépendamment

## Base de données Firebase

### Collections :
- `appointments` - Rendez-vous principaux
- `appointmentParticipants` - Participants et leurs statuts

### Sécurité Firestore :
- Authentification requise
- Lecture : créateur + participants
- Modification : permissions spécifiques par rôle
- Validation des champs obligatoires

## Logging et Debug

Système de logging complet avec emojis pour faciliter le debug :
- 🏗️ Création
- 📋 Récupération  
- 👨‍⚕️ Actions coach
- 🔄 Mises à jour
- ✅ Succès
- ❌ Erreurs

## Installation et utilisation

### Prérequis :
- Expo React Native
- Firebase/Firestore configuré
- Service `coachService` avec `getAllCoaches()`
- Authentification utilisateur

### Intégration :
1. Importer les composants dans vos écrans
2. Ajouter les routes dans votre navigation
3. Configurer les règles Firebase
4. Ajouter le FloatingActionButton aux pages principales

### Configuration Firebase :
1. Appliquer les règles de sécurité
2. Créer les index composés nécessaires :
   - `appointmentParticipants` : `userId`, `role`, `status`
   - `appointments` : `createdBy`, `date`

## Fonctionnalités avancées

### Gestion des invitations
- Emails stockés pour utilisateurs non-inscrits
- Processus d'association automatique lors de l'inscription
- Validation email côté client

### Statuts dynamiques
- Calcul automatique du statut global basé sur les participants
- Mise à jour temps réel des dashboards
- Notifications visuelles avec badges colorés

### Interface utilisateur
- Design responsive et mobile-first
- Animations et feedback utilisateur
- Gestion des états de chargement
- Pull-to-refresh sur les listes

## Évolutions possibles

### Court terme :
- Notifications push
- Système de rappels
- Chat intégré
- Géolocalisation

### Long terme :
- Paiement intégré
- Système de notes/avis
- Analytics avancées
- API externe calendrier

## Dépannage

### Problèmes courants :
1. **Coaches non affichés** → Vérifier `getAllCoaches()` dans `coachService`
2. **Navigation impossible** → Vérifier les routes dans `app/`
3. **Permissions Firebase** → Vérifier règles de sécurité
4. **Dates invalides** → Vérifier compatibilité web/mobile

### Debug :
- Activer les logs console
- Vérifier les collections Firebase
- Tester avec des données de test
- Valider l'authentification utilisateur
