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
  Timestamp 
} from 'firebase/firestore';
import { firestore } from '@/firebase';
import { 
  AppointmentRequest, 
  CreateAppointmentRequestData, 
  FirestoreAppointmentRequest,
  AppointmentStatus 
} from '@/models/appointment';

/**
 * Crée une nouvelle demande de rendez-vous
 */
export const createAppointmentRequest = async (
  requestData: CreateAppointmentRequestData
): Promise<string> => {
  try {
    console.log('📅 Création d\'une demande de RDV...', requestData);
    
    const requestsRef = collection(firestore, 'appointmentRequests');
    
    const firestoreData: Omit<FirestoreAppointmentRequest, 'id'> = {
      ...requestData,
      preferredDate: requestData.preferredDate ? Timestamp.fromDate(requestData.preferredDate) : undefined,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    const docRef = await addDoc(requestsRef, firestoreData);
    
    console.log('✅ Demande de RDV créée avec l\'ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Erreur lors de la création de la demande:', error);
    throw error;
  }
};

/**
 * Récupère toutes les demandes de RDV pour un coach
 */
export const getCoachAppointmentRequests = async (coachId: string): Promise<AppointmentRequest[]> => {
  try {
    console.log('🔍 Récupération des demandes pour le coach:', coachId);
    
    const requestsRef = collection(firestore, 'appointmentRequests');
    // Requête sans orderBy pour éviter l'index composite
    const q = query(
      requestsRef,
      where('coachId', '==', coachId)
    );
    
    const querySnapshot = await getDocs(q);
    const requests: AppointmentRequest[] = [];
    
    querySnapshot.forEach((doc) => {
      const request = convertFirestoreToAppointmentRequest(doc);
      requests.push(request);
    });
    
    // Trier côté client par date de création (plus récent en premier)
    requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    console.log(`✅ ${requests.length} demandes récupérées`);
    return requests;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des demandes:', error);
    throw error;
  }
};

/**
 * Récupère toutes les demandes de RDV pour un utilisateur
 */
export const getUserAppointmentRequests = async (userId: string): Promise<AppointmentRequest[]> => {
  try {
    console.log('🔍 Récupération des demandes pour l\'utilisateur:', userId);
    
    const requestsRef = collection(firestore, 'appointmentRequests');
    // Requête sans orderBy pour éviter l'index composite
    const q = query(
      requestsRef,
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const requests: AppointmentRequest[] = [];
    
    querySnapshot.forEach((doc) => {
      const request = convertFirestoreToAppointmentRequest(doc);
      requests.push(request);
    });
    
    // Trier côté client par date de création (plus récent en premier)
    requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    console.log(`✅ ${requests.length} demandes récupérées`);
    return requests;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des demandes:', error);
    throw error;
  }
};

/**
 * Met à jour le statut d'une demande de RDV (accepter/refuser)
 */
export const updateAppointmentRequestStatus = async (
  requestId: string,
  status: AppointmentStatus,
  coachResponse?: string,
  confirmedDate?: Date,
  confirmedTime?: string,
  confirmedLocation?: string
): Promise<void> => {
  try {
    console.log('📝 Mise à jour du statut de la demande:', requestId, status);
    
    const requestRef = doc(firestore, 'appointmentRequests', requestId);
    
    const updateData: any = {
      status,
      coachResponse: coachResponse || null,
      updatedAt: Timestamp.now()
    };
    
    // Si le statut est confirmé et qu'on a des détails confirmés, les ajouter
    if (status === 'confirmed') {
      if (confirmedDate) {
        updateData.confirmedDate = Timestamp.fromDate(confirmedDate);
      }
      if (confirmedTime) {
        updateData.confirmedTime = confirmedTime;
      }
      if (confirmedLocation) {
        updateData.confirmedLocation = confirmedLocation;
      }
    }
    
    await updateDoc(requestRef, updateData);
    
    console.log('✅ Statut mis à jour');
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
    throw error;
  }
};

/**
 * Récupère une demande de RDV par son ID
 */
export const getAppointmentRequestById = async (requestId: string): Promise<AppointmentRequest | null> => {
  try {
    console.log('🔍 Récupération de la demande:', requestId);
    
    const requestRef = doc(firestore, 'appointmentRequests', requestId);
    const docSnap = await getDoc(requestRef);
    
    if (!docSnap.exists()) {
      console.log('❌ Demande non trouvée');
      return null;
    }
    
    const request = convertFirestoreToAppointmentRequest(docSnap);
    
    console.log('✅ Demande récupérée');
    return request;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération:', error);
    throw error;
  }
};

/**
 * Convertit les données Firestore en AppointmentRequest
 */
const convertFirestoreToAppointmentRequest = (doc: any): AppointmentRequest => {
  const data = doc.data() as FirestoreAppointmentRequest;
  return {
    id: doc.id,
    userId: data.userId,
    coachId: data.coachId,
    userFirstName: data.userFirstName,
    userLastName: data.userLastName,
    userPhone: data.userPhone,
    userEmail: data.userEmail,
    objective: data.objective,
    sportLevel: data.sportLevel,
    preferredLocation: data.preferredLocation,
    preferredDate: data.preferredDate?.toDate(),
    preferredTime: data.preferredTime,
    additionalNotes: data.additionalNotes,
    confirmedDate: data.confirmedDate?.toDate(),
    confirmedTime: data.confirmedTime,
    confirmedLocation: data.confirmedLocation,
    status: data.status,
    coachResponse: data.coachResponse,
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate()
  };
};
