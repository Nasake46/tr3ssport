// Service avec uniquement Firebase - pas de types custom
console.log('🔍 FIREBASE ONLY SERVICE - Module chargé');

// Imports Firebase seulement
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
  writeBatch 
} from 'firebase/firestore';
import { firestore } from '../firebase';

console.log('🔍 FIREBASE ONLY SERVICE - Firebase imports réussis');
console.log('🔍 FIREBASE ONLY SERVICE - firestore disponible:', !!firestore);

const APPOINTMENTS_COLLECTION = 'appointments';
const PARTICIPANTS_COLLECTION = 'appointmentParticipants';

export const testFunction = async (): Promise<void> => {
  console.log('🧪 FIREBASE ONLY SERVICE TEST - Fonction appelée avec succès');
  console.log('🧪 FIREBASE ONLY SERVICE TEST - firestore:', !!firestore);
  console.log('🧪 FIREBASE ONLY SERVICE TEST - collection function:', !!collection);
};

export const linkUserToEmailInvitations = async (userId: string, userEmail: string): Promise<void> => {
  console.log('🔗 FIREBASE ONLY SERVICE LIAISON - Début pour:', { userId, userEmail });
  
  try {
    // Trouver tous les participants qui ont cet email 
    const participantsQuery = query(
      collection(firestore, PARTICIPANTS_COLLECTION),
      where('email', '==', userEmail)
    );
    
    const participantsSnapshot = await getDocs(participantsQuery);
    console.log(`🔗 FIREBASE ONLY SERVICE LIAISON - ${participantsSnapshot.size} participants trouvés avec cet email`);
    
    if (participantsSnapshot.empty) {
      console.log('🔗 FIREBASE ONLY SERVICE LIAISON - Aucune invitation à lier');
      return;
    }
    
    // Filtrer ceux qui n'ont pas encore de userId ou ont un userId différent
    const participantsToUpdate = participantsSnapshot.docs.filter(doc => {
      const data = doc.data();
      return !data.userId || data.userId !== userId;
    });
    
    console.log(`🔗 FIREBASE ONLY SERVICE LIAISON - ${participantsToUpdate.length} invitations à lier`);
    
    if (participantsToUpdate.length === 0) {
      console.log('🔗 FIREBASE ONLY SERVICE LIAISON - Toutes les invitations sont déjà liées');
      return;
    }
    
    // Mettre à jour chaque participant avec le userId
    const batch = writeBatch(firestore);
    
    participantsToUpdate.forEach(doc => {
      const participantRef = doc.ref;
      batch.update(participantRef, {
        userId: userId,
        updatedAt: Timestamp.now()
      });
    });
    
    await batch.commit();
    console.log(`✅ FIREBASE ONLY SERVICE LIAISON - ${participantsToUpdate.length} invitations liées avec succès`);
    
  } catch (error) {
    console.error('❌ FIREBASE ONLY SERVICE LIAISON - Erreur:', error);
    throw error;
  }
};

export const getAllAppointmentsForClient = async (userId: string, userEmail: string): Promise<any[]> => {
  console.log('📋 FIREBASE ONLY SERVICE GET ALL - Fonction appelée avec:', { userId, userEmail });
  // Pour l'instant, retourner un tableau vide pour tester
  return [];
};

console.log('🔍 FIREBASE ONLY SERVICE - Exports définis');
