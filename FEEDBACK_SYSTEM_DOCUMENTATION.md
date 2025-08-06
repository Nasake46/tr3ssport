# Système de Feedback Automatique

## Vue d'ensemble

Le système de feedback automatique permet de collecter les évaluations des coachs et clients après chaque séance. Le système se déclenche automatiquement à la fin d'une séance et demande à chaque participant de remplir un formulaire d'évaluation.

## Fonctionnalités

### Formulaire de Feedback
Chaque participant évalue :
- **Qualité de la séance** : Note de 1 à 5 étoiles
- **La personne** (coach ou client) : Note de 1 à 5 étoiles  
- **Commentaire libre** : Optionnel
- **Souhaitez-vous refaire une séance ?** : Oui/Non
- **Objectif de séance accompli ?** : Oui/Non

### Déclenchement Automatique
- Le feedback se déclenche automatiquement à la fin d'une séance
- Chaque participant (coach + clients) reçoit son formulaire
- Le système empêche les doublons (un feedback par participant par séance)

### Gestion des Feedbacks
- Les feedbacks sont stockés dans Firestore
- Statut "pending" ou "submitted"
- Possibilité de consulter les feedbacks en attente
- Statistiques agrégées par utilisateur

## Architecture

### Modèles de données

```typescript
// Feedback individuel
interface SessionFeedback {
  id: string;
  appointmentId: string;
  sessionId: string;
  evaluatorId: string; // Celui qui évalue
  evaluatorRole: 'coach' | 'client';
  evaluatedId: string; // Celui qui est évalué
  evaluatedRole: 'coach' | 'client';
  sessionQualityRating: number; // 1-5
  personRating: number; // 1-5
  comment: string;
  wouldRepeat: boolean;
  objectiveAchieved: boolean;
  createdAt: Date;
  submittedAt?: Date;
  status: 'pending' | 'submitted';
}

// Données du formulaire
interface FeedbackFormData {
  sessionQualityRating: number;
  personRating: number;
  comment: string;
  wouldRepeat: boolean;
  objectiveAchieved: boolean;
}
```

### Services

#### feedbackService.ts
- `createFeedbackSession()` : Crée les feedbacks pour tous les participants
- `submitFeedback()` : Soumet un feedback rempli
- `getPendingFeedbacksForUser()` : Récupère les feedbacks en attente
- `getSessionFeedbacks()` : Récupère tous les feedbacks d'une séance
- `getFeedbackStats()` : Statistiques agrégées

### Hooks

#### useFeedbackSession.ts
- Gère l'état des feedbacks en attente
- Déclenche l'affichage du modal de feedback
- Soumet les feedbacks
- Gère les feedbacks multiples pour un utilisateur

#### useActiveSession.ts (modifié)
- Accepte un callback `onSessionEnd`
- Déclenche automatiquement le feedback à la fin d'une séance

### Composants

#### FeedbackModal.tsx
- Modal principal contenant le formulaire
- Boutons Fermer/Ignorer

#### SimpleFeedbackForm.tsx
- Formulaire de saisie du feedback
- Interface utilisateur pour les notes et questions

#### SessionWithFeedback.tsx
- Composant de démonstration
- Intègre session et feedback

## Utilisation

### Intégration basique

```typescript
import { useFeedbackSession } from '@/hooks/useFeedbackSession';
import { useActiveSession } from '@/hooks/useActiveSession';
import { FeedbackModal } from '@/components/feedback/FeedbackModal';

function CoachScreen({ coachId, currentUserId }) {
  // Hook de feedback
  const {
    currentFeedback,
    showFeedbackModal,
    submitCurrentFeedback,
    closeFeedbackModal,
    skipCurrentFeedback,
    triggerFeedback
  } = useFeedbackSession(currentUserId, true); // isCoach = true

  // Hook de session avec callback
  const { activeSession, endSession } = useActiveSession(
    coachId, 
    triggerFeedback // Callback pour déclencher le feedback
  );

  return (
    <View>
      {/* Votre UI existante */}
      
      <FeedbackModal
        visible={showFeedbackModal}
        feedback={currentFeedback}
        onSubmit={submitCurrentFeedback}
        onClose={closeFeedbackModal}
        onSkip={skipCurrentFeedback}
      />
    </View>
  );
}
```

### Vérification des feedbacks en attente

```typescript
// Au chargement de l'app ou écran
useEffect(() => {
  checkPendingFeedbacks();
}, [checkPendingFeedbacks]);
```

## Test et Démonstration

Un écran de test est disponible dans `app/test-feedback.tsx` qui démontre :
- Démarrage/arrêt de séance
- Déclenchement automatique du feedback
- Interface utilisateur du formulaire
- Gestion des états

## Flux Complet

1. **Fin de séance** : L'utilisateur termine une séance via `endSession()`
2. **Création des feedbacks** : Le système crée automatiquement les feedbacks pour tous les participants
3. **Affichage du modal** : Le modal de feedback s'affiche pour l'utilisateur actuel (avec délai de 1s)
4. **Saisie** : L'utilisateur remplit le formulaire d'évaluation
5. **Soumission** : Le feedback est envoyé à Firestore avec statut "submitted"
6. **Feedbacks multiples** : Si l'utilisateur a plusieurs feedbacks en attente, ils s'affichent séquentiellement
7. **Confirmation** : Message de confirmation une fois tous les feedbacks soumis

## Stockage Firestore

Collection : `sessionFeedbacks`

Structure des documents :
```javascript
{
  appointmentId: "rdv_123",
  sessionId: "session_rdv_123_1643723456789",
  evaluatorId: "coach_456", 
  evaluatorRole: "coach",
  evaluatedId: "client_789",
  evaluatedRole: "client",
  sessionQualityRating: 4,
  personRating: 5,
  comment: "Très bonne séance !",
  wouldRepeat: true,
  objectiveAchieved: true,
  createdAt: Timestamp,
  submittedAt: Timestamp,
  status: "submitted"
}
```

## Extensions Possibles

- Notifications push pour les feedbacks en attente
- Tableau de bord avec statistiques détaillées  
- Export des feedbacks en CSV/PDF
- Feedbacks anonymes optionnels
- Système de médailles/badges basé sur les évaluations
- Comparaison des performances dans le temps
