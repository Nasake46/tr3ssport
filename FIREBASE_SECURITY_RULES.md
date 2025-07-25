# Règles de sécurité Firebase pour le système de rendez-vous

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Règles pour la collection des rendez-vous
    match /appointments/{appointmentId} {
      // Lecture : créateur du RDV ou participants
      allow read: if request.auth != null && (
        resource.data.createdBy == request.auth.uid ||
        exists(/databases/$(database)/documents/appointmentParticipants/$(request.auth.uid))
      );
      
      // Création : utilisateur authentifié
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.createdBy &&
        request.resource.data.keys().hasAll(['createdBy', 'type', 'sessionType', 'location', 'date', 'globalStatus']);
      
      // Modification : seulement le créateur peut modifier les détails de base
      allow update: if request.auth != null && 
        request.auth.uid == resource.data.createdBy &&
        request.resource.data.createdBy == resource.data.createdBy; // Empêcher changement de propriétaire
      
      // Suppression : seulement le créateur
      allow delete: if request.auth != null && 
        request.auth.uid == resource.data.createdBy;
    }
    
    // Règles pour la collection des participants
    match /appointmentParticipants/{participantId} {
      // Lecture : participant lui-même ou créateur du RDV
      allow read: if request.auth != null && (
        resource.data.userId == request.auth.uid ||
        get(/databases/$(database)/documents/appointments/$(resource.data.appointmentId)).data.createdBy == request.auth.uid
      );
      
      // Création : créateur du RDV ou système d'invitation
      allow create: if request.auth != null && (
        get(/databases/$(database)/documents/appointments/$(request.resource.data.appointmentId)).data.createdBy == request.auth.uid ||
        request.resource.data.userId == request.auth.uid
      );
      
      // Modification : participant lui-même (pour changer son statut)
      allow update: if request.auth != null && 
        resource.data.userId == request.auth.uid &&
        request.resource.data.appointmentId == resource.data.appointmentId &&
        request.resource.data.userId == resource.data.userId; // Empêcher changement d'utilisateur
      
      // Suppression : créateur du RDV ou participant lui-même
      allow delete: if request.auth != null && (
        resource.data.userId == request.auth.uid ||
        get(/databases/$(database)/documents/appointments/$(resource.data.appointmentId)).data.createdBy == request.auth.uid
      );
    }
    
    // Règles pour les autres collections (coaches, users, etc.)
    match /coaches/{coachId} {
      allow read: if request.auth != null; // Tous les utilisateurs connectés peuvent voir les coaches
      allow write: if request.auth != null && request.auth.uid == coachId; // Seul le coach peut modifier ses infos
    }
    
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Explication des règles :

### Collection `appointments`
- **Lecture** : Le créateur du RDV et tous les participants peuvent lire
- **Création** : Utilisateur authentifié, doit être le créateur
- **Modification** : Seul le créateur peut modifier les détails
- **Suppression** : Seul le créateur peut supprimer

### Collection `appointmentParticipants`
- **Lecture** : Le participant lui-même et le créateur du RDV
- **Création** : Le créateur du RDV ou le participant lui-même
- **Modification** : Seul le participant peut modifier son statut
- **Suppression** : Le participant ou le créateur du RDV

### Sécurité supplémentaire
- Validation des champs obligatoires
- Empêcher le changement de propriétaire/participant
- Authentification requise pour toutes les opérations
