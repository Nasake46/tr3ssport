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
import { firestore } from '@/firebase';
import { 
  Appointment,
  AppointmentParticipant,
  AppointmentFormData,
  AppointmentWithParticipants
} from '@/models/appointment';

const APPOINTMENTS_COLLECTION = 'appointments';
const PARTICIPANTS_COLLECTION = 'appointmentParticipants';

// Logs de debug au chargement du module
console.log('🔍 SERVICE DEBUG - Module appointmentService chargé');
console.log('🔍 SERVICE DEBUG - APPOINTMENTS_COLLECTION:', APPOINTMENTS_COLLECTION);
console.log('🔍 SERVICE DEBUG - PARTICIPANTS_COLLECTION:', PARTICIPANTS_COLLECTION);

/**
 * Nettoie les données pour Firestore en convertissant undefined en chaîne vide
 */
const cleanDataForFirestore = (data: any): any => {
  const cleaned = { ...data };
  
  // Convertir undefined en chaîne vide pour les champs string optionnels
  if (cleaned.description === undefined) cleaned.description = '';
  if (cleaned.location === undefined) cleaned.location = '';
  if (cleaned.notes === undefined) cleaned.notes = '';
  if (cleaned.sessionType === undefined) cleaned.sessionType = '';
  
  return cleaned;
};

/**
 * Crée un nouveau rendez-vous avec ses participants
 */
export const createAppointment = async (
  formData: AppointmentFormData,
  userId: string,
  userEmail: string
): Promise<string> => {
  console.log('🏗️ CRÉATION RDV - Début avec données:', {
    ...formData,
    date: formData.date.toISOString(),
    userId,
    userEmail
  });
  
  try {
    // Nettoyer les données pour éviter les valeurs undefined
    const cleanedFormData = cleanDataForFirestore(formData);
    
    // 1. Créer le rendez-vous principal avec addDoc (plus simple et plus fiable)
    const appointmentData: Omit<Appointment, 'id'> = {
      createdBy: userId,
      type: cleanedFormData.type,
      sessionType: cleanedFormData.sessionType,
      description: cleanedFormData.description || '',
      location: cleanedFormData.location || '',
      date: Timestamp.fromDate(cleanedFormData.date) as any,
      notes: cleanedFormData.notes || '', // Convertir undefined en chaîne vide
      globalStatus: 'pending',
      createdAt: Timestamp.now() as any,
      updatedAt: Timestamp.now() as any,
    };
    
    console.log('📝 CRÉATION RDV - Données appointment préparées:', appointmentData);
    
    const appointmentRef = await addDoc(collection(firestore, APPOINTMENTS_COLLECTION), appointmentData);
    const appointmentId = appointmentRef.id;
    
    console.log('✅ CRÉATION RDV - Appointment créé avec ID:', appointmentId);
    
    // 2. Ajouter le créateur comme participant client
    const creatorParticipant: Omit<AppointmentParticipant, 'id'> = {
      appointmentId,
      userId,
      email: userEmail,
      role: 'client',
      status: 'accepted', // Le créateur est automatiquement accepté
      joinedAt: Timestamp.now() as any,
    };
    
    await addDoc(collection(firestore, PARTICIPANTS_COLLECTION), creatorParticipant);
    console.log('✅ CRÉATION RDV - Créateur ajouté comme participant');
    
    // 3. Ajouter les coaches sélectionnés un par un
    for (let i = 0; i < formData.coachIds.length; i++) {
      const coachId = formData.coachIds[i];
      
      const coachParticipant: Omit<AppointmentParticipant, 'id'> = {
        appointmentId,
        userId: coachId,
        email: '', // On récupérera l'email plus tard si nécessaire
        role: 'coach',
        status: 'pending',
      };
      
      await addDoc(collection(firestore, PARTICIPANTS_COLLECTION), coachParticipant);
      console.log(`✅ CRÉATION RDV - Coach ${i + 1}/${formData.coachIds.length} ajouté:`, coachId);
    }
    
    // 4. Ajouter les clients invités (pour les rendez-vous de groupe)
    if (formData.type === 'group' && formData.invitedEmails && formData.invitedEmails.length > 0) {
      for (let i = 0; i < formData.invitedEmails.length; i++) {
        const email = formData.invitedEmails[i].trim();
        
        if (email) { // Vérifier que l'email n'est pas vide
          const invitedClient: Omit<AppointmentParticipant, 'id'> = {
            appointmentId,
            email: email,
            role: 'client',
            status: 'pending',
          };
          
          await addDoc(collection(firestore, PARTICIPANTS_COLLECTION), invitedClient);
          console.log(`✅ CRÉATION RDV - Client invité ${i + 1}/${formData.invitedEmails.length}:`, email);
        }
      }
    }
    
    console.log('🎉 CRÉATION RDV - Succès complet! ID:', appointmentId);
    return appointmentId;
    
  } catch (error) {
    console.error('❌ CRÉATION RDV - Erreur complète:', {
      message: error instanceof Error ? error.message : 'Erreur inconnue',
      stack: error instanceof Error ? error.stack : undefined,
      formData: {
        ...formData,
        date: formData.date.toISOString()
      },
      userId,
      userEmail
    });
    throw error;
  }
};

/**
 * Récupère les rendez-vous créés par un client
 */
export const getAppointmentsByClient = async (userId: string): Promise<AppointmentWithParticipants[]> => {
  console.log('📋 RÉCUPÉRATION RDV CLIENT - Début pour:', userId);
  
  try {
    // Récupérer tous les rendez-vous créés par le client
    const appointmentsQuery = query(
      collection(firestore, APPOINTMENTS_COLLECTION),
      where('createdBy', '==', userId)
      // orderBy('date', 'desc') // Temporairement retiré car nécessite un index
    );
    
    const appointmentsSnapshot = await getDocs(appointmentsQuery);
    console.log(`📋 RÉCUPÉRATION RDV CLIENT - ${appointmentsSnapshot.size} rendez-vous trouvés`);
    
    if (appointmentsSnapshot.empty) {
      console.log('📋 RÉCUPÉRATION RDV CLIENT - Aucun rendez-vous trouvé');
      return [];
    }
    
    const appointments: AppointmentWithParticipants[] = [];
    
    for (const appointmentDoc of appointmentsSnapshot.docs) {
      const appointmentData = appointmentDoc.data();
      const appointmentId = appointmentDoc.id;
      
      console.log(`📋 RÉCUPÉRATION RDV CLIENT - Traitement RDV:`, appointmentId);
      console.log(`📋 RÉCUPÉRATION RDV CLIENT - Données brutes appointmentData:`, appointmentData);
      console.log(`📋 RÉCUPÉRATION RDV CLIENT - startTime brut:`, appointmentData.startTime);
      console.log(`📋 RÉCUPÉRATION RDV CLIENT - endTime brut:`, appointmentData.endTime);
      
      // Récupérer les participants pour ce rendez-vous
      const participantsQuery = query(
        collection(firestore, PARTICIPANTS_COLLECTION),
        where('appointmentId', '==', appointmentId)
      );
      
      const participantsSnapshot = await getDocs(participantsQuery);
      const participants = participantsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AppointmentParticipant[];
      
      const appointment: AppointmentWithParticipants = {
        id: appointmentId,
        ...appointmentData,
        date: appointmentData.date?.toDate() || new Date(),
        createdAt: appointmentData.createdAt?.toDate() || new Date(),
        updatedAt: appointmentData.updatedAt?.toDate() || new Date(),
        participants,
        coaches: participants.filter(p => p.role === 'coach'),
        clients: participants.filter(p => p.role === 'client'),
        // Exposer les heures pour le calendrier
        startTime: appointmentData.startTime,
        endTime: appointmentData.endTime,
        duration: appointmentData.duration
      } as any;
      
      appointments.push(appointment);
      console.log(`📋 RÉCUPÉRATION RDV CLIENT - RDV ajouté avec ${participants.length} participants et heures:`, {
        startTime: appointmentData.startTime,
        endTime: appointmentData.endTime
      });
    }
    
    // Trier par date côté client (du plus récent au plus ancien)
    appointments.sort((a, b) => b.date.getTime() - a.date.getTime());
    
    console.log(`📋 RÉCUPÉRATION RDV CLIENT - Succès! ${appointments.length} rendez-vous traités`);
    return appointments;
    
  } catch (error) {
    console.error('❌ RÉCUPÉRATION RDV CLIENT - Erreur:', error);
    throw error;
  }
};

/**
 * Récupère les demandes de rendez-vous en attente pour un coach
 */
export const getPendingAppointmentsForCoach = async (coachId: string): Promise<AppointmentWithParticipants[]> => {
  console.log('👨‍⚕️ RÉCUPÉRATION RDV COACH - Début pour:', coachId);
  
  try {
    // Trouver tous les participants où ce coach est en attente
    const participantsQuery = query(
      collection(firestore, PARTICIPANTS_COLLECTION),
      where('userId', '==', coachId),
      where('role', '==', 'coach'),
      where('status', '==', 'pending')
    );
    
    const participantsSnapshot = await getDocs(participantsQuery);
    console.log(`👨‍⚕️ RÉCUPÉRATION RDV COACH - ${participantsSnapshot.size} participations en attente`);
    
    if (participantsSnapshot.empty) {
      console.log('👨‍⚕️ RÉCUPÉRATION RDV COACH - Aucune demande en attente');
      return [];
    }
    
    const appointments: AppointmentWithParticipants[] = [];
    
    for (const participantDoc of participantsSnapshot.docs) {
      const participantData = participantDoc.data();
      const appointmentId = participantData.appointmentId;
      
      console.log(`👨‍⚕️ RÉCUPÉRATION RDV COACH - Traitement RDV:`, appointmentId);
      
      // Récupérer le rendez-vous
      const appointmentDoc = await getDoc(doc(firestore, APPOINTMENTS_COLLECTION, appointmentId));
      if (!appointmentDoc.exists()) {
        console.warn(`👨‍⚕️ RÉCUPÉRATION RDV COACH - RDV introuvable:`, appointmentId);
        continue;
      }
      
      const appointmentData = appointmentDoc.data();
      
      // Récupérer tous les participants pour ce rendez-vous
      const allParticipantsQuery = query(
        collection(firestore, PARTICIPANTS_COLLECTION),
        where('appointmentId', '==', appointmentId)
      );
      
      const allParticipantsSnapshot = await getDocs(allParticipantsQuery);
      const participants = allParticipantsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AppointmentParticipant[];
      
      const appointment: AppointmentWithParticipants = {
        id: appointmentId,
        ...appointmentData,
        date: appointmentData.date?.toDate() || new Date(),
        createdAt: appointmentData.createdAt?.toDate() || new Date(),
        updatedAt: appointmentData.updatedAt?.toDate() || new Date(),
        participants,
        coaches: participants.filter(p => p.role === 'coach'),
        clients: participants.filter(p => p.role === 'client'),
      } as AppointmentWithParticipants;
      
      appointments.push(appointment);
      console.log(`👨‍⚕️ RÉCUPÉRATION RDV COACH - RDV ajouté avec ${participants.length} participants`);
    }
    
    console.log(`👨‍⚕️ RÉCUPÉRATION RDV COACH - Succès! ${appointments.length} demandes trouvées`);
    return appointments;
    
  } catch (error) {
    console.error('❌ RÉCUPÉRATION RDV COACH - Erreur:', error);
    throw error;
  }
};

/**
 * Met à jour le statut d'un participant (accepter/refuser)
 */
export const updateParticipantStatus = async (
  participantId: string,
  status: 'accepted' | 'declined'
): Promise<void> => {
  console.log('🔄 MAJ STATUT PARTICIPANT - Début:', { participantId, status });
  
  try {
    const participantRef = doc(firestore, PARTICIPANTS_COLLECTION, participantId);
    
    await updateDoc(participantRef, {
      status,
      joinedAt: status === 'accepted' ? Timestamp.now() : undefined,
    });
    
    console.log('✅ MAJ STATUT PARTICIPANT - Succès');
    
    // Optionnel: Mettre à jour le statut global du rendez-vous
    // await updateAppointmentGlobalStatus(appointmentId);
    
  } catch (error) {
    console.error('❌ MAJ STATUT PARTICIPANT - Erreur:', error);
    throw error;
  }
};

/**
 * Récupère un rendez-vous spécifique avec ses participants
 */
export const getAppointmentById = async (appointmentId: string): Promise<AppointmentWithParticipants | null> => {
  console.log('🔍 RÉCUPÉRATION RDV UNIQUE - Début pour:', appointmentId);
  
  try {
    const appointmentDoc = await getDoc(doc(firestore, APPOINTMENTS_COLLECTION, appointmentId));
    
    if (!appointmentDoc.exists()) {
      console.log('🔍 RÉCUPÉRATION RDV UNIQUE - RDV introuvable');
      return null;
    }
    
    const appointmentData = appointmentDoc.data();
    
    // Récupérer les participants
    const participantsQuery = query(
      collection(firestore, PARTICIPANTS_COLLECTION),
      where('appointmentId', '==', appointmentId)
    );
    
    const participantsSnapshot = await getDocs(participantsQuery);
    const participants = participantsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AppointmentParticipant[];
    
    const appointment: AppointmentWithParticipants = {
      id: appointmentId,
      ...appointmentData,
      date: appointmentData.date?.toDate() || new Date(),
      createdAt: appointmentData.createdAt?.toDate() || new Date(),
      updatedAt: appointmentData.updatedAt?.toDate() || new Date(),
      participants,
      coaches: participants.filter(p => p.role === 'coach'),
      clients: participants.filter(p => p.role === 'client'),
    } as AppointmentWithParticipants;
    
    console.log(`🔍 RÉCUPÉRATION RDV UNIQUE - Succès avec ${participants.length} participants`);
    return appointment;
    
  } catch (error) {
    console.error('❌ RÉCUPÉRATION RDV UNIQUE - Erreur:', error);
    throw error;
  }
};

/**
 * Récupère les rendez-vous où un utilisateur est invité comme participant
 */
export const getAppointmentsByParticipant = async (userId: string, userEmail: string): Promise<AppointmentWithParticipants[]> => {
  console.log('📋 RÉCUPÉRATION RDV PARTICIPANT - Début pour:', { userId, userEmail });
  
  try {
    // Trouver tous les participants où cet utilisateur est invité
    const participantsQuery = query(
      collection(firestore, PARTICIPANTS_COLLECTION),
      where('userId', '==', userId),
      where('role', '==', 'client')
    );
    
    const participantsSnapshot = await getDocs(participantsQuery);
    console.log(`📋 RÉCUPÉRATION RDV PARTICIPANT - ${participantsSnapshot.size} participations trouvées par userId`);
    
    // Également chercher par email pour les invitations où userId n'est pas encore défini
    const participantsByEmailQuery = query(
      collection(firestore, PARTICIPANTS_COLLECTION),
      where('email', '==', userEmail),
      where('role', '==', 'client')
    );
    
    const participantsByEmailSnapshot = await getDocs(participantsByEmailQuery);
    console.log(`📋 RÉCUPÉRATION RDV PARTICIPANT - ${participantsByEmailSnapshot.size} participations trouvées par email`);
    
    // Combiner les résultats et éliminer les doublons
    const allParticipantDocs = [
      ...participantsSnapshot.docs,
      ...participantsByEmailSnapshot.docs.filter(emailDoc => 
        !participantsSnapshot.docs.find(userDoc => userDoc.id === emailDoc.id)
      )
    ];
    
    if (allParticipantDocs.length === 0) {
      console.log('📋 RÉCUPÉRATION RDV PARTICIPANT - Aucune participation trouvée');
      return [];
    }
    
    const appointments: AppointmentWithParticipants[] = [];
    const processedAppointmentIds = new Set<string>();
    
    for (const participantDoc of allParticipantDocs) {
      const participantData = participantDoc.data();
      const appointmentId = participantData.appointmentId;
      
      // Éviter de traiter le même rendez-vous plusieurs fois
      if (processedAppointmentIds.has(appointmentId)) {
        continue;
      }
      processedAppointmentIds.add(appointmentId);
      
      console.log(`📋 RÉCUPÉRATION RDV PARTICIPANT - Traitement RDV:`, appointmentId);
      
      // Récupérer le rendez-vous
      const appointmentDoc = await getDoc(doc(firestore, APPOINTMENTS_COLLECTION, appointmentId));
      if (!appointmentDoc.exists()) {
        console.warn(`📋 RÉCUPÉRATION RDV PARTICIPANT - RDV introuvable:`, appointmentId);
        continue;
      }
      
      const appointmentData = appointmentDoc.data();
      
      // Récupérer tous les participants pour ce rendez-vous
      const allParticipantsQuery = query(
        collection(firestore, PARTICIPANTS_COLLECTION),
        where('appointmentId', '==', appointmentId)
      );
      
      const allParticipantsSnapshot = await getDocs(allParticipantsQuery);
      const participants = allParticipantsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AppointmentParticipant[];
      
      const appointment: AppointmentWithParticipants = {
        id: appointmentId,
        ...appointmentData,
        date: appointmentData.date?.toDate() || new Date(),
        createdAt: appointmentData.createdAt?.toDate() || new Date(),
        updatedAt: appointmentData.updatedAt?.toDate() || new Date(),
        participants,
        coaches: participants.filter(p => p.role === 'coach'),
        clients: participants.filter(p => p.role === 'client'),
      } as AppointmentWithParticipants;
      
      appointments.push(appointment);
      console.log(`📋 RÉCUPÉRATION RDV PARTICIPANT - RDV ajouté avec ${participants.length} participants`);
    }
    
    console.log(`📋 RÉCUPÉRATION RDV PARTICIPANT - Succès! ${appointments.length} rendez-vous trouvés`);
    return appointments;
    
  } catch (error) {
    console.error('❌ RÉCUPÉRATION RDV PARTICIPANT - Erreur:', error);
    throw error;
  }
};

/**
 * Récupère tous les rendez-vous d'un client (créés + invitations)
 * UTILISE LA VRAIE COLLECTION 'invitations' comme /invitations
 */
export const getAllAppointmentsForClient = async (userId: string, userEmail: string): Promise<AppointmentWithParticipants[]> => {
  console.log('📋 RÉCUPÉRATION TOUS RDV CLIENT - Début pour:', { userId, userEmail });
  
  try {
    // Récupérer les rendez-vous créés par le client
    const createdAppointments = await getAppointmentsByClient(userId);
    console.log(`📋 RÉCUPÉRATION TOUS RDV CLIENT - ${createdAppointments.length} RDV créés`);
    
    // Récupérer les invitations depuis la collection 'invitations' (comme /invitations)
    const invitedAppointments = await getInvitationsForCalendar(userId);
    console.log(`📋 RÉCUPÉRATION TOUS RDV CLIENT - ${invitedAppointments.length} RDV invités (depuis collection invitations)`);
    
    // Combiner et éliminer les doublons (au cas où un client s'inviterait lui-même)
    const allAppointments = [...createdAppointments];
    const createdIds = new Set(createdAppointments.map(apt => apt.id));
    
    for (const invitedApt of invitedAppointments) {
      if (!createdIds.has(invitedApt.id)) {
        allAppointments.push(invitedApt);
      }
    }
    
    // Trier par date
    allAppointments.sort((a, b) => b.date.getTime() - a.date.getTime());
    
    console.log(`📋 RÉCUPÉRATION TOUS RDV CLIENT - Total: ${allAppointments.length} RDV (${createdAppointments.length} créés + ${invitedAppointments.length} invités)`);
    return allAppointments;
    
  } catch (error) {
    console.error('❌ RÉCUPÉRATION TOUS RDV CLIENT - Erreur:', error);
    throw error;
  }
};

/**
 * Fonction de test pour vérifier les exports
 */
export const testFunction = async (): Promise<void> => {
  console.log('🧪 FONCTION TEST - Appelée avec succès');
  console.log('🧪 FONCTION TEST - firestore disponible:', !!firestore);
};

/**
 * Récupère les invitations depuis la collection 'invitations' comme sur la page /invitations
 * C'est la VRAIE fonction qui fonctionne !
 */
export const getInvitationsForCalendar = async (userId: string): Promise<AppointmentWithParticipants[]> => {
  console.log('🎯 INVITATIONS CALENDRIER - Récupération pour userId:', userId);
  
  try {
    // Utiliser la MÊME logique que /invitations
    const invitationsQuery = query(
      collection(firestore, 'invitations'),
      where('invitedUserId', '==', userId)
    );

    const snapshot = await getDocs(invitationsQuery);
    console.log(`🎯 INVITATIONS CALENDRIER - ${snapshot.size} invitations trouvées`);
    
    const appointments: AppointmentWithParticipants[] = [];
    
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      console.log(`🎯 INVITATIONS CALENDRIER - Traitement invitation:`, {
        id: docSnapshot.id,
        appointmentId: data.appointmentId,
        status: data.status
      });
      
      // Récupérer les données du RDV associé (comme dans /invitations)
      try {
        const appointmentDoc = await getDoc(doc(firestore, 'appointments', data.appointmentId));
        if (appointmentDoc.exists()) {
          const aptData = appointmentDoc.data();
          console.log(`🎯 INVITATIONS CALENDRIER - Données aptData brutes:`, aptData);
          console.log(`🎯 INVITATIONS CALENDRIER - startTime brut:`, aptData.startTime);
          console.log(`🎯 INVITATIONS CALENDRIER - endTime brut:`, aptData.endTime);
          
          // Récupérer tous les participants pour ce rendez-vous
          const participantsQuery = query(
            collection(firestore, PARTICIPANTS_COLLECTION),
            where('appointmentId', '==', data.appointmentId)
          );
          
          const participantsSnapshot = await getDocs(participantsQuery);
          const participants = participantsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as AppointmentParticipant[];
          
          const appointment: AppointmentWithParticipants = {
            id: data.appointmentId,
            ...aptData,
            date: aptData.date?.toDate() || new Date(),
            createdAt: aptData.createdAt?.toDate() || new Date(),
            updatedAt: aptData.updatedAt?.toDate() || new Date(),
            participants,
            coaches: participants.filter(p => p.role === 'coach'),
            clients: participants.filter(p => p.role === 'client'),
            // Ajouter le statut de l'invitation pour le calendrier
            invitationStatus: data.status,
            // Exposer les heures de début et fin pour le calendrier
            startTime: aptData.startTime,
            endTime: aptData.endTime,
            duration: aptData.duration
          } as any;
          
          appointments.push(appointment);
          console.log(`🎯 INVITATIONS CALENDRIER - RDV ajouté:`, {
            id: appointment.id,
            date: appointment.date.toISOString(),
            startTime: aptData.startTime,
            endTime: aptData.endTime,
            status: data.status
          });
        }
      } catch (error) {
        console.warn('⚠️ INVITATIONS CALENDRIER - Impossible de récupérer le RDV:', error);
      }
    }
    
    // Trier par date (plus récent en premier)
    appointments.sort((a, b) => b.date.getTime() - a.date.getTime());
    
    console.log(`✅ INVITATIONS CALENDRIER - ${appointments.length} RDV d'invitations récupérés`);
    return appointments;
    
  } catch (error) {
    console.error('❌ INVITATIONS CALENDRIER - Erreur:', error);
    throw error;
  }
};

/**
 * Associe les invitations par email à un utilisateur connecté
 * À appeler quand un utilisateur se connecte pour lier ses invitations
 */
export const linkUserToEmailInvitations = async (userId: string, userEmail: string): Promise<void> => {
  console.log('🔗 LIAISON INVITATIONS - Fonction appelée avec:', { userId, userEmail });
  console.log('🔗 LIAISON INVITATIONS - firestore disponible:', !!firestore);
  console.log('🔗 LIAISON INVITATIONS - collection disponible:', !!collection);
  console.log('🔗 LIAISON INVITATIONS - PARTICIPANTS_COLLECTION:', PARTICIPANTS_COLLECTION);
  console.log('🔗 LIAISON INVITATIONS - Début pour:', { userId, userEmail });
  
  try {
    // D'abord, regarder TOUS les participants pour debug
    const allParticipantsQuery = query(collection(firestore, PARTICIPANTS_COLLECTION));
    const allParticipantsSnapshot = await getDocs(allParticipantsQuery);
    console.log(`🔗 LIAISON DEBUG - Total participants dans la DB: ${allParticipantsSnapshot.size}`);
    
    // Afficher les 5 premiers pour debug
    allParticipantsSnapshot.docs.slice(0, 5).forEach((doc, index) => {
      const data = doc.data();
      console.log(`🔗 LIAISON DEBUG - Participant ${index + 1}:`, {
        id: doc.id,
        email: data.email,
        userId: data.userId,
        role: data.role,
        appointmentId: data.appointmentId
      });
    });
    
    // Trouver tous les participants qui ont cet email 
    const participantsQuery = query(
      collection(firestore, PARTICIPANTS_COLLECTION),
      where('email', '==', userEmail)
    );
    
    const participantsSnapshot = await getDocs(participantsQuery);
    console.log(`🔗 LIAISON INVITATIONS - ${participantsSnapshot.size} participants trouvés avec cet email`);
    
    // Afficher les participants trouvés pour debug
    participantsSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`🔗 LIAISON DEBUG - Participant trouvé ${index + 1}:`, {
        id: doc.id,
        email: data.email,
        userId: data.userId || 'PAS_DÉFINI',
        role: data.role,
        status: data.status,
        appointmentId: data.appointmentId
      });
    });
    
    if (participantsSnapshot.empty) {
      console.log('🔗 LIAISON INVITATIONS - Aucune invitation à lier');
      return;
    }
    
    // Filtrer ceux qui n'ont pas encore de userId ou ont un userId différent
    const participantsToUpdate = participantsSnapshot.docs.filter(doc => {
      const data = doc.data();
      return !data.userId || data.userId !== userId;
    });
    
    console.log(`🔗 LIAISON INVITATIONS - ${participantsToUpdate.length} invitations à lier`);
    
    if (participantsToUpdate.length === 0) {
      console.log('🔗 LIAISON INVITATIONS - Toutes les invitations sont déjà liées');
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
    console.log(`✅ LIAISON INVITATIONS - ${participantsToUpdate.length} invitations liées avec succès`);
    
  } catch (error) {
    console.error('❌ LIAISON INVITATIONS - Erreur:', error);
    throw error;
  }
};

/**
 * Ajoute un lien Jitsi à un rendez-vous
 */
export const addJitsiLinkToAppointment = async (appointmentId: string, jitsiLink: string): Promise<void> => {
  console.log('🎥 JITSI LINK - Ajout du lien pour RDV:', appointmentId);
  
  try {
    const appointmentRef = doc(firestore, APPOINTMENTS_COLLECTION, appointmentId);
    
    await updateDoc(appointmentRef, {
      jitsiLink: jitsiLink,
      updatedAt: Timestamp.now()
    });
    
    console.log('✅ JITSI LINK - Lien ajouté avec succès:', jitsiLink);
    
  } catch (error) {
    console.error('❌ JITSI LINK - Erreur ajout lien:', error);
    throw error;
  }
};

/**
 * Récupère le lien Jitsi d'un rendez-vous
 */
export const getJitsiLinkFromAppointment = async (appointmentId: string): Promise<string | null> => {
  console.log('🔍 JITSI LINK - Récupération du lien pour RDV:', appointmentId);
  
  try {
    const appointmentDoc = await getDoc(doc(firestore, APPOINTMENTS_COLLECTION, appointmentId));
    
    if (!appointmentDoc.exists()) {
      console.log('🔍 JITSI LINK - RDV introuvable');
      return null;
    }
    
    const appointmentData = appointmentDoc.data();
    const jitsiLink = appointmentData.jitsiLink || null;
    
    console.log('✅ JITSI LINK - Lien récupéré:', jitsiLink ? 'Présent' : 'Absent');
    return jitsiLink;
    
  } catch (error) {
    console.error('❌ JITSI LINK - Erreur récupération lien:', error);
    throw error;
  }
};

/**
 * Génère un QR code unique pour un rendez-vous
 */
export const generateQRCodeForAppointment = async (appointmentId: string): Promise<string> => {
  console.log('📱 QR CODE - Génération pour RDV:', appointmentId);
  
  try {
    // Vérifier d'abord que l'appointment existe et les conditions de temps
    console.log('🔍 QR CODE - Récupération appointment...');
    const appointmentDoc = await getDoc(doc(firestore, APPOINTMENTS_COLLECTION, appointmentId));
    
    if (!appointmentDoc.exists()) {
      console.log('❌ QR CODE - Rendez-vous introuvable');
      throw new Error('Rendez-vous introuvable');
    }
    
    const appointmentData = appointmentDoc.data();
    const appointmentDate = appointmentData.date.toDate();
    
    console.log('📅 QR CODE - Données appointment récupérées:', {
      appointmentDate: appointmentDate.toISOString(),
      hasExistingToken: !!appointmentData.qrToken,
      qrStatus: appointmentData.qrStatus
    });
    
    // Vérifier que nous sommes dans la fenêtre de 30 minutes avant le RDV
    const canGenerate = canGenerateQRCode(appointmentDate);
    console.log('⏰ QR CODE - Vérification timing:', {
      canGenerate,
      now: new Date().toISOString(),
      appointmentDate: appointmentDate.toISOString(),
      thirtyMinsBefore: new Date(appointmentDate.getTime() - 30 * 60 * 1000).toISOString()
    });
    
    if (!canGenerate) {
      console.log('❌ QR CODE - Trop tôt pour générer');
      throw new Error('Trop tôt pour générer le QR code (30 minutes avant requis)');
    }
    
    // Vérifier si un QR code existe déjà
    if (appointmentData.qrToken) {
      console.log('✅ QR CODE - Token existant retourné:', appointmentData.qrToken.substring(0, 20) + '...');
      return appointmentData.qrToken;
    }
    
    // Générer un token unique
    console.log('⚡ QR CODE - Génération nouveau token...');
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const qrToken = `${appointmentId}_${timestamp}_${randomString}`;
    
    console.log('💾 QR CODE - Sauvegarde token...');
    console.log('💾 QR CODE - Sauvegarde token...');
    // Sauvegarder le token dans l'appointment avec expiration
    const appointmentRef = doc(firestore, APPOINTMENTS_COLLECTION, appointmentId);
    
    await updateDoc(appointmentRef, {
      qrToken: qrToken,
      qrGeneratedAt: Timestamp.now(),
      qrStatus: 'generated', // generated, scanned, expired
      updatedAt: Timestamp.now()
    });
    
    console.log('✅ QR CODE - Token généré et sauvegardé avec succès:', qrToken.substring(0, 20) + '...');
    return qrToken;
    
  } catch (error) {
    console.error('❌ QR CODE - Erreur génération token:', error);
    throw error;
  }
};

/**
 * Valide et scanne un QR code
 */
export const scanQRCode = async (qrToken: string, coachId: string): Promise<{
  success: boolean, 
  message: string, 
  appointmentId?: string,
  clientName?: string,
  appointmentTime?: string,
  duration?: number,
  error?: string
}> => {
  console.log('🔍 QR SCAN - Validation du token:', qrToken, 'par coach:', coachId);
  
  try {
    // Extraire l'appointmentId du token
    const appointmentId = qrToken.split('_')[0];
    
    if (!appointmentId) {
      return { success: false, message: 'QR code invalide' };
    }
    
    // Récupérer l'appointment
    const appointmentDoc = await getDoc(doc(firestore, APPOINTMENTS_COLLECTION, appointmentId));
    
    if (!appointmentDoc.exists()) {
      return { success: false, message: 'Rendez-vous introuvable' };
    }
    
    const appointmentData = appointmentDoc.data();
    
    // Vérifier que le QR code correspond
    if (appointmentData.qrToken !== qrToken) {
      return { success: false, message: 'QR code expiré ou invalide' };
    }
    
    // Vérifier que le QR code n'a pas déjà été scanné
    if (appointmentData.qrStatus === 'scanned') {
      return { success: false, message: 'QR code déjà utilisé' };
    }
    
    // Vérifier la fenêtre de temps (30 min avant à fin du RDV)
    const appointmentDate = appointmentData.date.toDate();
    const now = new Date();
    const thirtyMinsBefore = new Date(appointmentDate.getTime() - 30 * 60 * 1000);
    
    // Calculer la fin du RDV (date + durée)
    const duration = appointmentData.duration || 60; // durée par défaut 60 min
    const appointmentEnd = new Date(appointmentDate.getTime() + duration * 60 * 1000);
    
    if (now < thirtyMinsBefore) {
      return { success: false, message: 'Trop tôt pour commencer la séance' };
    }
    
    if (now > appointmentEnd) {
      return { success: false, message: 'Créneau de séance expiré' };
    }
    
    // Vérifier que le coach est bien assigné à ce RDV
    const participantsQuery = query(
      collection(firestore, PARTICIPANTS_COLLECTION),
      where('appointmentId', '==', appointmentId),
      where('userId', '==', coachId),
      where('role', '==', 'coach')
    );
    
    const participantsSnapshot = await getDocs(participantsQuery);
    
    if (participantsSnapshot.empty) {
      return { success: false, message: 'Vous n\'êtes pas assigné à cette séance' };
    }
    
    // Tout est OK, marquer la séance comme commencée
    const batch = writeBatch(firestore);
    
    // Mettre à jour l'appointment
    const appointmentRef = doc(firestore, APPOINTMENTS_COLLECTION, appointmentId);
    batch.update(appointmentRef, {
      qrStatus: 'scanned',
      sessionStartedAt: Timestamp.now(),
      sessionStartedBy: coachId,
      globalStatus: 'started',
      updatedAt: Timestamp.now()
    });
    
    await batch.commit();
    
    console.log('✅ QR SCAN - Séance commencée avec succès');
    
    // Programmer la fin automatique de la séance
    scheduleSessionEnd(appointmentId, duration);
    
    // Récupérer le nom du client
    let clientName = 'Client';
    try {
      const creatorDoc = await getDoc(doc(firestore, 'users', appointmentData.createdBy));
      if (creatorDoc.exists()) {
        const userData = creatorDoc.data();
        clientName = userData.displayName || userData.email || 'Client';
      }
    } catch (error) {
      console.warn('Impossible de récupérer le nom du client:', error);
    }
    
    return { 
      success: true, 
      message: 'Séance commencée avec succès !',
      appointmentId: appointmentId,
      clientName: clientName,
      appointmentTime: appointmentDate.toISOString(),
      duration: duration
    };
    
  } catch (error) {
    console.error('❌ QR SCAN - Erreur validation:', error);
    return { 
      success: false, 
      message: 'Erreur lors de la validation',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
};

/**
 * Marque manuellement la fin d'une séance
 */
export const endSession = async (appointmentId: string, coachId: string): Promise<{success: boolean, message: string}> => {
  console.log('⏹️ END SESSION SERVICE - DÉBUT endSession');
  console.log('⏹️ END SESSION SERVICE - appointmentId:', appointmentId);
  console.log('⏹️ END SESSION SERVICE - coachId:', coachId);
  console.log('⏹️ END SESSION SERVICE - firestore disponible:', !!firestore);
  console.log('⏹️ END SESSION SERVICE - APPOINTMENTS_COLLECTION:', APPOINTMENTS_COLLECTION);
  
  try {
    console.log('⏹️ END SESSION SERVICE - Création référence document...');
    const appointmentRef = doc(firestore, APPOINTMENTS_COLLECTION, appointmentId);
    console.log('⏹️ END SESSION SERVICE - Référence créée:', appointmentRef.path);
    
    console.log('⏹️ END SESSION SERVICE - Tentative mise à jour document...');
    await updateDoc(appointmentRef, {
      sessionEndedAt: Timestamp.now(),
      sessionEndedBy: coachId,
      globalStatus: 'completed',
      updatedAt: Timestamp.now()
    });
    
    console.log('✅ END SESSION SERVICE - Document mis à jour avec succès');
    console.log('✅ END SESSION SERVICE - Retour résultat success');
    return { success: true, message: 'Séance terminée avec succès !' };
    
  } catch (error) {
    console.error('❌ END SESSION SERVICE - Erreur complète:', error);
    console.error('❌ END SESSION SERVICE - Type erreur:', typeof error);
    console.error('❌ END SESSION SERVICE - Message erreur:', error instanceof Error ? error.message : 'Erreur non-Error');
    console.error('❌ END SESSION SERVICE - Stack trace:', error instanceof Error ? error.stack : 'Pas de stack');
    console.error('❌ END SESSION SERVICE - Paramètres:', { appointmentId, coachId });
    
    return { 
      success: false, 
      message: `Erreur lors de la fin de séance: ${error instanceof Error ? error.message : 'Erreur inconnue'}` 
    };
  }
};

/**
 * Vérifie si un QR code peut être généré (30 min avant le RDV)
 */
export const canGenerateQRCode = (appointmentDate: Date): boolean => {
  const now = new Date();
  const thirtyMinsBefore = new Date(appointmentDate.getTime() - 30 * 60 * 1000);
  
  return now >= thirtyMinsBefore;
};

/**
 * Vérifie l'état d'un QR code
 */
export const getQRCodeStatus = async (appointmentId: string): Promise<{
  canGenerate: boolean;
  isGenerated: boolean;
  isScanned: boolean;
  timeUntilGeneration?: number;
  timeUntilExpiration?: number;
}> => {
  console.log('🔍 QR STATUS - Vérification pour RDV:', appointmentId);
  
  try {
    const appointmentDoc = await getDoc(doc(firestore, APPOINTMENTS_COLLECTION, appointmentId));
    
    if (!appointmentDoc.exists()) {
      console.log('❌ QR STATUS - RDV introuvable');
      return { canGenerate: false, isGenerated: false, isScanned: false };
    }
    
    const appointmentData = appointmentDoc.data();
    const appointmentDate = appointmentData.date.toDate();
    const now = new Date();
    const thirtyMinsBefore = new Date(appointmentDate.getTime() - 30 * 60 * 1000);
    
    console.log('📅 QR STATUS - Calculs de temps:', {
      now: now.toISOString(),
      appointmentDate: appointmentDate.toISOString(),
      thirtyMinsBefore: thirtyMinsBefore.toISOString(),
      nowTimestamp: now.getTime(),
      thirtyMinsBeforeTimestamp: thirtyMinsBefore.getTime(),
      canGenerateTime: now >= thirtyMinsBefore
    });
    
    const duration = appointmentData.duration || 60;
    const appointmentEnd = new Date(appointmentDate.getTime() + duration * 60 * 1000);
    
    const canGenerate = now >= thirtyMinsBefore;
    const isGenerated = !!appointmentData.qrToken;
    const isScanned = appointmentData.qrStatus === 'scanned';
    
    console.log('📊 QR STATUS - Données appointment:', {
      hasQrToken: !!appointmentData.qrToken,
      qrStatus: appointmentData.qrStatus,
      qrGeneratedAt: appointmentData.qrGeneratedAt?.toDate?.()?.toISOString?.()
    });
    
    const timeUntilGeneration = canGenerate ? 0 : Math.max(0, thirtyMinsBefore.getTime() - now.getTime());
    const timeUntilExpiration = Math.max(0, appointmentEnd.getTime() - now.getTime());
    
    const result = {
      canGenerate,
      isGenerated,
      isScanned,
      timeUntilGeneration,
      timeUntilExpiration
    };
    
    console.log('✅ QR STATUS - Résultat:', result);
    
    return result;
    
  } catch (error) {
    console.error('❌ QR STATUS - Erreur:', error);
    return { canGenerate: false, isGenerated: false, isScanned: false };
  }
};

/**
 * Programme la fin automatique d'une séance
 */
const scheduleSessionEnd = (appointmentId: string, durationMinutes: number) => {
  console.log(`⏰ SCHEDULE END - Programmation fin auto dans ${durationMinutes} min pour RDV:`, appointmentId);
  
  // Programmer la fin automatique
  const timeoutId = setTimeout(async () => {
    try {
      console.log(`⏰ AUTO END - Vérification fin auto pour RDV:`, appointmentId);
      
      const appointmentRef = doc(firestore, APPOINTMENTS_COLLECTION, appointmentId);
      const appointmentDoc = await getDoc(appointmentRef);
      
      if (appointmentDoc.exists()) {
        const data = appointmentDoc.data();
        
        // Ne terminer automatiquement que si la séance n'a pas déjà été terminée manuellement
        if (data.globalStatus === 'started') {
          await updateDoc(appointmentRef, {
            sessionEndedAt: Timestamp.now(),
            globalStatus: 'completed',
            autoCompleted: true,
            updatedAt: Timestamp.now()
          });
          
          console.log('✅ AUTO END - Séance terminée automatiquement:', appointmentId);
          
          // Notifier les clients connectés si nécessaire
          // TODO: Ajouter notification en temps réel
        } else {
          console.log('ℹ️ AUTO END - Séance déjà terminée manuellement:', appointmentId);
        }
      } else {
        console.log('⚠️ AUTO END - RDV introuvable:', appointmentId);
      }
    } catch (error) {
      console.error('❌ AUTO END - Erreur fin automatique:', error);
    }
  }, durationMinutes * 60 * 1000);
  
  // Stocker l'ID du timeout pour pouvoir l'annuler si nécessaire
  // TODO: Implémenter un système de gestion des timeouts actifs
  console.log(`✅ SCHEDULE END - Timeout programmé avec ID:`, timeoutId);
};

/**
 * Récupère la session active pour un coach
 */
export const getActiveSessionForCoach = async (coachId: string): Promise<any | null> => {
  try {
    // Chercher les appointments où le coach a une session en cours
    const appointmentsQuery = query(
      collection(firestore, APPOINTMENTS_COLLECTION),
      where('globalStatus', '==', 'started'),
      where('sessionStartedBy', '==', coachId)
    );
    
    const snapshot = await getDocs(appointmentsQuery);
    
    if (snapshot.empty) {
      return null;
    }
    
    const docSnapshot = snapshot.docs[0];
    const data = docSnapshot.data();
    
    // Récupérer les infos du client
    let clientName = 'Client';
    try {
      const creatorDoc = await getDoc(doc(firestore, 'users', data.createdBy));
      if (creatorDoc.exists()) {
        const userData = creatorDoc.data() as any;
        clientName = userData.displayName || userData.email || 'Client';
      }
    } catch (error) {
      console.warn('⚠️ Impossible de récupérer le nom du client:', error);
    }
    
    const sessionInfo = {
      appointmentId: docSnapshot.id,
      clientName: clientName,
      startTime: data.date.toDate(),
      expectedDuration: data.duration || 60,
      actualStartTime: data.sessionStartedAt.toDate(),
    };
    
    return sessionInfo;
    
  } catch (error) {
    console.error('❌ ACTIVE SESSION - Erreur:', error);
    return null;
  }
};
console.log('🔍 SERVICE DEBUG - getAppointmentById définie:', typeof getAppointmentById);
