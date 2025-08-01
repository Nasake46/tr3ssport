// Service simplifié pour tester
console.log('🔍 SIMPLE SERVICE - Module chargé');

// Test avec imports relatifs simples
import { firestore } from '../firebase';

console.log('🔍 SIMPLE SERVICE - firestore importé:', !!firestore);

export const testFunction = async (): Promise<void> => {
  console.log('🧪 SIMPLE SERVICE TEST - Fonction appelée avec succès');
};

export const linkUserToEmailInvitations = async (userId: string, userEmail: string): Promise<void> => {
  console.log('🔗 SIMPLE SERVICE LIAISON - Fonction appelée avec:', { userId, userEmail });
};

export const getAllAppointmentsForClient = async (userId: string, userEmail: string): Promise<any[]> => {
  console.log('📋 SIMPLE SERVICE GET ALL - Fonction appelée avec:', { userId, userEmail });
  return [];
};

console.log('🔍 SIMPLE SERVICE - Exports définis');
console.log('🔍 SIMPLE SERVICE - testFunction type:', typeof testFunction);
console.log('🔍 SIMPLE SERVICE - linkUserToEmailInvitations type:', typeof linkUserToEmailInvitations);
console.log('🔍 SIMPLE SERVICE - getAllAppointmentsForClient type:', typeof getAllAppointmentsForClient);
