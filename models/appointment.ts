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
