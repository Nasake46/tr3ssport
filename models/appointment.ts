export interface Appointment {
  id: string;
  createdBy: string; // user ID
  type: 'solo' | 'group';
  sessionType: string;
  description?: string;
  location: string;
  date: Date;
  notes?: string;
  globalStatus: 'pending' | 'confirmed' | 'declined';
  createdAt: Date;
  updatedAt: Date;
  // Nouveau: stockage direct pour requêtes rapides
  coachIds?: string[]; // liste des coachs liés
  participantsIds?: string[]; // liste des userId connus (créateur + coachs + clients identifiés)
  clientIds?: string[]; // uniquement les userId des clients attendus (créateur + clients identifiés)
  participantsClientIds?: string[]; // alias demandé: liste des IDs clients (même contenu que clientIds) sans collision avec 'participants' détaillé
}

export interface AppointmentParticipant {
  id: string;
  appointmentId: string;
  userId?: string; // null if not registered yet
  email: string;
  role: 'client' | 'coach';
  status: 'pending' | 'accepted' | 'declined';
  joinedAt?: Date;
}

export interface AppointmentFormData {
  type: 'solo' | 'group';
  sessionType: string;
  description?: string;
  location: string;
  date: Date;
  notes?: string;
  coachIds: string[];
  invitedEmails?: string[];
}

export interface AppointmentWithParticipants extends Appointment {
  participants: AppointmentParticipant[];
  coaches: AppointmentParticipant[];
  clients: AppointmentParticipant[];
}
