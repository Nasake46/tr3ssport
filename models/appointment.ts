import { 
  collection, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  doc, 
  query, 
  where, 
  orderBy, 
  Timestamp, 
  DocumentData 
} from 'firebase/firestore';
import { firestore } from '../firebase';

export type AppointmentStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled';
export type SportLevel = 'debutant' | 'confirme' | 'expert';

export interface AppointmentRequest {
  id?: string;           // ID généré par Firebase
  userId: string;        // ID de l'utilisateur qui prend rendez-vous
  coachId: string;       // ID du coach concerné
  
  // Informations utilisateur
  userFirstName: string;
  userLastName: string;
  userPhone: string;
  userEmail: string;
  
  // Informations de la demande
  objective: string;     // Objectif du coaching
  sportLevel: SportLevel; // Niveau sportif
  preferredLocation: string; // Lieu de préférence
  preferredDate?: Date;  // Date souhaitée (optionnel)
  preferredTime?: string; // Heure souhaitée (optionnel)
  additionalNotes?: string; // Notes supplémentaires
  
  // Informations confirmées (remplies par le coach lors de l'acceptation)
  confirmedDate?: Date;  // Date confirmée par le coach
  confirmedTime?: string; // Heure confirmée par le coach
  confirmedLocation?: string; // Lieu confirmé par le coach
  
  status: AppointmentStatus; // Statut de la demande
  coachResponse?: string; // Réponse du coach
  createdAt: Date;       // Date de création
  updatedAt: Date;       // Date de dernière mise à jour
}

export interface Appointment {
  id?: string;           // ID généré par Firebase
  userId: string;        // ID de l'utilisateur qui prend rendez-vous
  coachId: string;       // ID du coach concerné
  requestId?: string;    // ID de la demande originale
  date: Date;            // Date du rendez-vous
  startTime: string;     // Heure de début (format "HH:MM")
  endTime: string;       // Heure de fin (format "HH:MM")
  location: string;      // Lieu du rendez-vous
  status: AppointmentStatus; // Statut du rendez-vous
  notes?: string;        // Notes optionnelles
  createdAt: Date;       // Date de création
  updatedAt: Date;       // Date de dernière mise à jour
}

export interface FirestoreAppointmentRequest extends Omit<AppointmentRequest, 'preferredDate' | 'confirmedDate' | 'createdAt' | 'updatedAt'> {
  preferredDate?: Timestamp;
  confirmedDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirestoreAppointment extends Omit<Appointment, 'date' | 'createdAt' | 'updatedAt'> {
  date: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CreateAppointmentRequestData = Omit<AppointmentRequest, 'id' | 'createdAt' | 'updatedAt'>;
export type CreateAppointmentData = Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>;

export const convertFirestoreAppointment = (doc: DocumentData): Appointment => {
  const data = doc.data() as FirestoreAppointment;
  return {
    id: doc.id,
    userId: data.userId,
    coachId: data.coachId,
    date: data.date.toDate(),
    startTime: data.startTime,
    endTime: data.endTime,
    location: data.location,
    status: data.status,
    notes: data.notes,
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate()
  };
};

/**
 * Crée un nouveau rendez-vous dans Firestore
 */
export const createAppointment = async (data: CreateAppointmentData): Promise<string> => {
  try {
    const firestoreData: Omit<FirestoreAppointment, 'id'> = {
      userId: data.userId,
      coachId: data.coachId,
      date: Timestamp.fromDate(data.date),
      startTime: data.startTime,
      endTime: data.endTime,
      location: data.location,
      status: data.status,
      notes: data.notes,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(firestore, 'appointments'), firestoreData);
    return docRef.id;
  } catch (error) {
    console.error('Erreur lors de la création du rendez-vous:', error);
    throw error;
  }
};

/**
 * Récupère un rendez-vous par son ID
 */
export const getAppointmentById = async (id: string): Promise<Appointment | null> => {
  try {
    const docRef = doc(firestore, 'appointments', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return convertFirestoreAppointment(docSnap);
    } else {
      return null;
    }
  } catch (error) {
    console.error('Erreur lors de la récupération du rendez-vous:', error);
    throw error;
  }
};

/**
 * Récupère tous les rendez-vous d'un utilisateur
 */
export const getUserAppointments = async (userId: string): Promise<Appointment[]> => {
  try {
    const q = query(
      collection(firestore, 'appointments'),
      where('userId', '==', userId),
      orderBy('date', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(convertFirestoreAppointment);
  } catch (error) {
    console.error('Erreur lors de la récupération des rendez-vous utilisateur:', error);
    throw error;
  }
};

/**
 * Récupère tous les rendez-vous d'un coach
 */
export const getCoachAppointments = async (coachId: string): Promise<Appointment[]> => {
  try {
    const q = query(
      collection(firestore, 'appointments'),
      where('coachId', '==', coachId),
      orderBy('date', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(convertFirestoreAppointment);
  } catch (error) {
    console.error('Erreur lors de la récupération des rendez-vous coach:', error);
    throw error;
  }
};

/**
 * Met à jour le statut d'un rendez-vous
 */
export const updateAppointmentStatus = async (
  appointmentId: string, 
  status: AppointmentStatus
): Promise<void> => {
  try {
    const appointmentRef = doc(firestore, 'appointments', appointmentId);
    await updateDoc(appointmentRef, {
      status,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    throw error;
  }
};

/**
 * Récupère les rendez-vous pour une date spécifique
 */
export const getAppointmentsByDate = async (
  userId: string, 
  date: Date, 
  isCoach: boolean = false
): Promise<Appointment[]> => {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    const fieldToQuery = isCoach ? 'coachId' : 'userId';
    
    const q = query(
      collection(firestore, 'appointments'),
      where(fieldToQuery, '==', userId),
      where('date', '>=', Timestamp.fromDate(startOfDay)),
      where('date', '<=', Timestamp.fromDate(endOfDay)),
      orderBy('date', 'asc'),
      orderBy('startTime', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(convertFirestoreAppointment);
  } catch (error) {
    console.error('Erreur lors de la récupération des rendez-vous par date:', error);
    throw error;
  }
};