export interface SessionFeedback {
  id: string;
  appointmentId: string;
  sessionId: string;
  evaluatorId: string; // ID de celui qui évalue
  evaluatorRole: 'coach' | 'client';
  evaluatedId: string; // ID de celui qui est évalué
  evaluatedRole: 'coach' | 'client';
  
  // Notes sur 5 étoiles
  sessionQualityRating: number; // 1-5 étoiles pour la qualité de la séance
  personRating: number; // 1-5 étoiles pour la personne (coach ou client)
  
  // Commentaires et questions
  comment: string;
  wouldRepeat: boolean; // Souhaitez-vous refaire une séance avec cette personne ?
  objectiveAchieved: boolean; // Objectif de séance accompli ?
  
  // Métadonnées
  createdAt: Date;
  submittedAt?: Date;
  status: 'pending' | 'submitted';
}

export interface FeedbackFormData {
  sessionQualityRating: number;
  personRating: number;
  comment: string;
  wouldRepeat: boolean;
  objectiveAchieved: boolean;
}

export interface SessionParticipant {
  id: string;
  name: string;
  role: 'coach' | 'client';
  userId: string;
}

export interface FeedbackSession {
  appointmentId: string;
  sessionId: string;
  participants: SessionParticipant[];
  sessionDate: Date;
  duration: number;
}
