// Service minimal pour tester les imports
console.log('🔍 MINIMAL SERVICE - Module chargé');

// Test des imports avec chemins relatifs
import { firestore } from '../firebase';
import { 
  Appointment,
  AppointmentParticipant,
  AppointmentFormData,
  AppointmentWithParticipants
} from '../models/appointment';

console.log('🔍 MINIMAL SERVICE - firestore importé:', !!firestore);
console.log('🔍 MINIMAL SERVICE - types importés');

export const testFunction = async (): Promise<void> => {
  console.log('🧪 MINIMAL SERVICE TEST - Fonction appelée avec succès');
};

export const linkUserToEmailInvitations = async (userId: string, userEmail: string): Promise<void> => {
  console.log('🔗 MINIMAL SERVICE LIAISON - Fonction appelée avec:', { userId, userEmail });
};

export const getAllAppointmentsForClient = async (userId: string, userEmail: string): Promise<AppointmentWithParticipants[]> => {
  console.log('📋 MINIMAL SERVICE GET ALL - Fonction appelée avec:', { userId, userEmail });
  return [];
};

console.log('🔍 MINIMAL SERVICE - Exports définis');
