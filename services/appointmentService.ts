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

// Fenêtre de génération du QR: de 30 min avant à 15 min après le début
export const canGenerateQRCode = (appointmentDate: Date): boolean => {
  const now = new Date();
  const thirtyMinsBefore = new Date(appointmentDate.getTime() - 30 * 60 * 1000);
  const fifteenMinsAfterStart = new Date(appointmentDate.getTime() + 15 * 60 * 1000);
  return now >= thirtyMinsBefore && now <= fifteenMinsAfterStart;
};

/**
 * Backfill des champs participantsIds et coachIds pour les anciens rendez-vous
 * Parcourt tous les appointments, récupère leurs participants et met à jour.
 * A exécuter ponctuellement (ex: depuis un écran admin caché ou script).
 */
export const backfillParticipantsIds = async (): Promise<{ updated: number; skipped: number; errors: number; }> => {
  console.log('🛠️ BACKFILL - Début participantsIds');
  let updated = 0, skipped = 0, errors = 0;
  try {
    const allAppointments = await getDocs(collection(firestore, APPOINTMENTS_COLLECTION));
    for (const appDoc of allAppointments.docs) {
      const data: any = appDoc.data();
      if (Array.isArray(data.participantsIds) && data.participantsIds.length) {
        skipped++;
        continue; // déjà rempli
      }
      try {
        const partsSnap = await getDocs(query(
          collection(firestore, PARTICIPANTS_COLLECTION),
          where('appointmentId', '==', appDoc.id)
        ));
        const userIds: string[] = [];
        const coachIds: string[] = [];
        partsSnap.forEach(p => {
          const pd: any = p.data();
            if (pd.userId) userIds.push(pd.userId);
            if (pd.role === 'coach' && pd.userId) coachIds.push(pd.userId);
        });
        const base = new Set<string>();
        if (data.createdBy) base.add(data.createdBy);
        userIds.forEach(id => base.add(id));
        coachIds.forEach(id => base.add(id));
        const participantsIds = Array.from(base);
        await updateDoc(doc(firestore, APPOINTMENTS_COLLECTION, appDoc.id), {
          participantsIds,
          coachIds: Array.from(new Set(coachIds.concat(data.coachIds || [])))
        });
        updated++;
      } catch (e) {
        console.warn('⚠️ BACKFILL - Erreur sur appointment', appDoc.id, e);
        errors++;
      }
    }
    console.log('🛠️ BACKFILL - Terminé', { updated, skipped, errors });
    return { updated, skipped, errors };
  } catch (e) {
    console.error('❌ BACKFILL - Echec global:', e);
    throw e;
  }
};

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
      coachIds: [...cleanedFormData.coachIds],
      participantsIds: [userId, ...cleanedFormData.coachIds], // sera enrichi après ajout éventuel d'invités enregistrés
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

    // Tentative d'enrichir participantsIds avec les userId déjà connus via appointmentParticipants créés (ceux avec userId défini)
    try {
      const participantsSnap = await getDocs(query(
        collection(firestore, PARTICIPANTS_COLLECTION),
        where('appointmentId', '==', appointmentId)
      ));
      const userIds: string[] = [];
      participantsSnap.forEach(p => { const d: any = p.data(); if (d.userId) userIds.push(d.userId); });
      const unique = Array.from(new Set([userId, ...formData.coachIds, ...userIds]));
      await updateDoc(doc(firestore, APPOINTMENTS_COLLECTION, appointmentId), {
        participantsIds: unique,
      });
      console.log('🔄 CRÉATION RDV - participantsIds mis à jour:', unique.length);
    } catch (e) {
      console.warn('⚠️ CRÉATION RDV - Impossible de mettre à jour participantsIds:', e);
    }
    
    console.log('🎉 CRÉATION RDV - Succès complet! ID:', appointmentId);

    // Armer l’annulation automatique no-show (+15 min si pas scanné)
    try {
      scheduleNoShowCancellation(appointmentId, (cleanedFormData.date as Date));
    } catch (e) {
      console.warn('⚠️ Planification no-show non armée:', e);
    }

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
    
    // Vérifier que nous sommes dans la fenêtre d'autorisation (-30 min → +15 min)
    const canGenerate = canGenerateQRCode(appointmentDate);
    console.log('⏰ QR CODE - Vérification timing:', {
      canGenerate,
      now: new Date().toISOString(),
      appointmentDate: appointmentDate.toISOString(),
      generationWindowStart: new Date(appointmentDate.getTime() - 30 * 60 * 1000).toISOString(),
      generationWindowEnd: new Date(appointmentDate.getTime() + 15 * 60 * 1000).toISOString()
    });
    
    if (!canGenerate) {
      console.log('❌ QR CODE - Hors fenêtre de génération');
      throw new Error('QR disponible de 30 min avant à 15 min après le début de la séance');
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
    const appointmentId = qrToken.split('_')[0];
    if (!appointmentId) {
      return { success: false, message: 'QR code invalide' };
    }

    const appointmentDoc = await getDoc(doc(firestore, APPOINTMENTS_COLLECTION, appointmentId));
    if (!appointmentDoc.exists()) {
      return { success: false, message: 'Rendez-vous introuvable' };
    }

    const appointmentData = appointmentDoc.data();
    console.log('🗂️ QR SCAN DEBUG - Données appointment:', {
      id: appointmentId,
      coachIds: (appointmentData as any)?.coachIds || [],
      createdBy: (appointmentData as any)?.createdBy || null,
      qrStatus: (appointmentData as any)?.qrStatus || null,
    });

    // 🧪 DEBUG: lister les coaches assignés à ce RDV et logguer le coach connecté
    let assignedCoachDetails: Array<{ participantId: string; userId: string | null; email: string | null; status: string | null }> = [];
    try {
      const coachListQuery = query(
        collection(firestore, PARTICIPANTS_COLLECTION),
        where('appointmentId', '==', appointmentId),
        where('role', '==', 'coach')
      );
      const coachListSnap = await getDocs(coachListQuery);
      assignedCoachDetails = coachListSnap.docs.map(d => {
        const pd: any = d.data();
        return {
          participantId: d.id,
          userId: pd.userId || null,
          email: pd.email || null,
          status: pd.status || null,
        };
      });
      console.log('🧑‍🤝‍🧑 QR SCAN DEBUG - Coaches assignés à ce RDV:', assignedCoachDetails);
      console.log('🧑‍🏫 QR SCAN DEBUG - Coach connecté (scanneur):', coachId);
    } catch (e) {
      console.warn('⚠️ QR SCAN DEBUG - Impossible de lister les coaches assignés:', e);
    }

    // 👥 DEBUG: lister tous les participants de ce RDV (tous rôles)
    try {
      const allPartsSnap = await getDocs(
        query(collection(firestore, PARTICIPANTS_COLLECTION), where('appointmentId', '==', appointmentId))
      );
      const allParts = allPartsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      const roleStats = allParts.reduce((acc: Record<string, number>, p: any) => {
        const r = p.role || 'unknown';
        acc[r] = (acc[r] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('👥 QR SCAN DEBUG - Tous les participants de ce RDV:', allParts);
      console.log('📊 QR SCAN DEBUG - Statistiques par rôle:', roleStats);
    } catch (e) {
      console.warn('⚠️ QR SCAN DEBUG - Impossible de lister tous les participants:', e);
    }

    if (appointmentData.qrToken !== qrToken) {
      return { success: false, message: 'QR code expiré ou invalide' };
    }

    if (appointmentData.qrStatus === 'scanned') {
      return { success: false, message: 'QR code déjà utilisé' };
    }

    const appointmentDate = appointmentData.date.toDate();
    const now = new Date();
    const thirtyMinsBefore = new Date(appointmentDate.getTime() - 30 * 60 * 1000);
    const fifteenMinsAfterStart = new Date(appointmentDate.getTime() + 15 * 60 * 1000);
    const duration = appointmentData.duration || 60;

    if (now < thirtyMinsBefore) {
      return { success: false, message: 'Trop tôt pour commencer la séance' };
    }

    // Refuser scan après +15 min si la séance n’a pas commencé
    if (now > fifteenMinsAfterStart) {
      return { success: false, message: 'Délai dépassé, séance considérée comme annulée' };
    }

    // Vérifier que le coach est bien assigné
    // 1) recherche stricte par participant (userId + rôle)
    const participantsQuery = query(
      collection(firestore, PARTICIPANTS_COLLECTION),
      where('appointmentId', '==', appointmentId),
      where('userId', '==', coachId),
      where('role', '==', 'coach')
    );
    const participantsSnapshot = await getDocs(participantsQuery);

    // 2) fallback: vérifier champ coachIds[] sur le document appointment (compat anciens RDV)
    const coachIdsFromApt: string[] = Array.isArray((appointmentData as any).coachIds)
      ? (appointmentData as any).coachIds
      : [];
    const isInCoachIds = coachIdsFromApt.includes(coachId);

    // 3) fallback: si pas trouvé, tenter par email (si certains participants stockés par email)
    let isAssignedByEmail = false;
    let coachEmail: string | undefined;
    if (participantsSnapshot.empty && !isInCoachIds) {
      try {
        const coachUserSnap = await getDoc(doc(firestore, 'users', coachId));
        if (coachUserSnap.exists()) {
          const u = coachUserSnap.data() as any;
          coachEmail = u.email;
          if (coachEmail) {
            const byEmailSnap = await getDocs(
              query(
                collection(firestore, PARTICIPANTS_COLLECTION),
                where('appointmentId', '==', appointmentId),
                where('role', '==', 'coach'),
                where('email', '==', coachEmail)
              )
            );
            isAssignedByEmail = !byEmailSnap.empty;
          }
        }
      } catch (e) {
        console.warn('⚠️ QR SCAN DEBUG - Fallback email échoué:', e);
      }
    }

    const isAssigned = !participantsSnapshot.empty || isInCoachIds || isAssignedByEmail;

    console.log('🧪 QR SCAN DEBUG - Vérification assignation coach:', {
      coachId,
      isAssigned,
      byParticipantDoc: !participantsSnapshot.empty,
      byCoachIdsArray: isInCoachIds,
      byEmail: isAssignedByEmail,
      coachIdsFromApt,
      coachEmail: coachEmail || null,
    });

    // Si assigné mais aucun document participant, on crée un participant coach pour cohérence
    if (isAssigned && participantsSnapshot.empty) {
      try {
        await addDoc(collection(firestore, PARTICIPANTS_COLLECTION), {
          appointmentId,
          userId: coachId,
          email: coachEmail || '',
          role: 'coach',
          status: 'accepted',
          joinedAt: Timestamp.now(),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        console.log('🧩 QR SCAN DEBUG - Participant coach créé automatiquement (normalisation des données)');
      } catch (e) {
        console.warn('⚠️ QR SCAN DEBUG - Impossible de créer automatiquement le participant coach:', e);
      }
    }

    if (!isAssigned) {
      console.warn("🚫 QR SCAN DEBUG - Coach non assigné à ce RDV", {
        coachId,
        assignedCoachIds: assignedCoachDetails.map(c => c.userId),
        assignedCoachDetails,
        coachIdsFromApt,
      });
      return { success: false, message: "Vous n'êtes pas assigné à cette séance" };
    }

    // OK, démarrer la séance
    const batch = writeBatch(firestore);
    const appointmentRef = doc(firestore, APPOINTMENTS_COLLECTION, appointmentId);
    batch.update(appointmentRef, {
      qrStatus: 'scanned',
      sessionStartedAt: Timestamp.now(),
      sessionStartedBy: coachId,
      globalStatus: 'started',
      updatedAt: Timestamp.now()
    });
    await batch.commit();

    console.log('✅ QR SCAN - Séance commencée');
    scheduleSessionEnd(appointmentId, duration);

    let clientName = 'Client';
    try {
      const creatorDoc = await getDoc(doc(firestore, 'users', appointmentData.createdBy));
      if (creatorDoc.exists()) {
        const userData = creatorDoc.data();
        clientName = userData.displayName || userData.email || 'Client';
      }
    } catch {}

    return { 
      success: true, 
      message: 'Séance commencée avec succès !',
      appointmentId,
      clientName,
      appointmentTime: appointmentDate.toISOString(),
      duration
    };
  } catch (error) {
    console.error('❌ QR SCAN - Erreur validation:', error);
    return { success: false, message: 'Erreur lors de la validation', error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
};

// Programmer la détection de no-show: à +15 min si pas scanné → annulé
const scheduleNoShowCancellation = (appointmentId: string, appointmentDate: Date) => {
  const timeout = appointmentDate.getTime() + 15 * 60 * 1000 - Date.now();
  if (timeout <= 0) return;
  setTimeout(async () => {
    try {
      const ref = doc(firestore, APPOINTMENTS_COLLECTION, appointmentId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const data = snap.data();
      // Si non scanné et pas démarré => annuler
      if (data.qrStatus !== 'scanned' && data.globalStatus !== 'started') {
        await updateDoc(ref, {
          globalStatus: 'cancelled',
          cancellationReason: 'no-show',
          cancelledAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        console.log('🚫 NO-SHOW - Séance annulée (QR non scanné sous 15 min):', appointmentId);
      }
    } catch (e) {
      console.warn('⚠️ NO-SHOW - Erreur d’annulation automatique:', e);
    }
  }, timeout);
};

// À appeler après création de RDV pour armer l’annulation no-show
export const armNoShowForAppointment = async (appointmentId: string) => {
  try {
    const snap = await getDoc(doc(firestore, APPOINTMENTS_COLLECTION, appointmentId));
    if (!snap.exists()) return;
    const data = snap.data();
    const appointmentDate = data.date.toDate();
    scheduleNoShowCancellation(appointmentId, appointmentDate);
  } catch {}
};

// Programme la fin automatique d'une séance (à la durée prévue)
const scheduleSessionEnd = (appointmentId: string, durationMinutes: number) => {
  console.log(`⏰ SCHEDULE END - Programmation fin auto dans ${durationMinutes} min pour RDV:`, appointmentId);
  const timeoutId = setTimeout(async () => {
    try {
      const appointmentRef = doc(firestore, APPOINTMENTS_COLLECTION, appointmentId);
      const appointmentDoc = await getDoc(appointmentRef);
      if (appointmentDoc.exists()) {
        const data = appointmentDoc.data();
        if (data.globalStatus === 'started') {
          await updateDoc(appointmentRef, {
            sessionEndedAt: Timestamp.now(),
            globalStatus: 'completed',
            autoCompleted: true,
            updatedAt: Timestamp.now()
          });
          console.log('✅ AUTO END - Séance terminée automatiquement:', appointmentId);
        } else {
          console.log('ℹ️ AUTO END - Séance déjà terminée manuellement:', appointmentId);
        }
      }
    } catch (error) {
      console.error('❌ AUTO END - Erreur fin automatique:', error);
    }
  }, durationMinutes * 60 * 1000);
  console.log('✅ SCHEDULE END - Timeout programmé avec ID:', timeoutId);
};

export const getQRCodeStatus = async (
  appointmentId: string
): Promise<{
  canGenerate: boolean;
  isGenerated: boolean;
  isScanned: boolean;
  timeUntilGeneration?: number;
  timeUntilExpiration?: number;
}> => {
  try {
    console.log('🔎 QR STATUS - Vérification pour RDV:', appointmentId);
    const snap = await getDoc(doc(firestore, APPOINTMENTS_COLLECTION, appointmentId));
    if (!snap.exists()) {
      console.warn('⚠️ QR STATUS - RDV introuvable:', appointmentId);
      return { canGenerate: false, isGenerated: false, isScanned: false };
    }

    const data = snap.data() as any;
    const appointmentDate: Date = data?.date?.toDate ? data.date.toDate() : new Date(data?.date || Date.now());
    const duration: number = data?.duration || 60;

    const now = new Date();
    const windowStart = new Date(appointmentDate.getTime() - 30 * 60 * 1000);
    const windowEnd = new Date(appointmentDate.getTime() + 15 * 60 * 1000);
    const appointmentEnd = new Date(appointmentDate.getTime() + duration * 60 * 1000);

    const canGenerate = now >= windowStart && now <= windowEnd; // -30 min → +15 min
    const isScanned = data?.qrStatus === 'scanned';
    const isGenerated = !!data?.qrToken && (data?.qrStatus === 'generated' || isScanned);

    const status = {
      canGenerate,
      isGenerated,
      isScanned,
      timeUntilGeneration: now < windowStart ? windowStart.getTime() - now.getTime() : undefined,
      timeUntilExpiration: isGenerated && now <= appointmentEnd ? appointmentEnd.getTime() - now.getTime() : undefined,
    };

    console.log('✅ QR STATUS - Résultat:', {
      ...status,
      now: now.toISOString(),
      appointmentDate: appointmentDate.toISOString(),
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      appointmentEnd: appointmentEnd.toISOString(),
    });

    return status;
  } catch (error) {
    console.error('❌ QR STATUS - Erreur:', error);
    return { canGenerate: false, isGenerated: false, isScanned: false };
  }
};

console.log('🔍 SERVICE DEBUG - getAppointmentById définie:', typeof getAppointmentById);

/**
 * Récupère la session active pour un coach
 */
export const getActiveSessionForCoach = async (
  coachId: string
): Promise<{
  appointmentId: string;
  clientName: string;
  startTime: Date;
  expectedDuration: number;
  actualStartTime: Date;
  clientId?: string;
} | null> => {
  console.log('🔎 ACTIVE SESSION - Recherche session active pour coach:', coachId);
  try {
    if (!coachId) return null;

    // Récupérer les RDV démarrés par ce coach (filtrage côté client pour éviter les index composites)
    const q = query(collection(firestore, APPOINTMENTS_COLLECTION), where('sessionStartedBy', '==', coachId));
    const snap = await getDocs(q);

    if (snap.empty) {
      console.log('🔎 ACTIVE SESSION - Aucune séance démarrée par ce coach');
      return null;
    }

    // Filtrer ceux réellement actifs (globalStatus === 'started' et pas encore terminés)
    const candidates = snap.docs
      .map(d => ({ id: d.id, data: d.data() as any }))
      .filter(x => x.data.globalStatus === 'started' && !x.data.sessionEndedAt);

    if (candidates.length === 0) {
      console.log('🔎 ACTIVE SESSION - Aucune séance active en cours');
      return null;
    }

    // Prendre la plus récente par sessionStartedAt
    candidates.sort((a, b) => {
      const aTs = a.data.sessionStartedAt?.toDate?.()?.getTime?.() || 0;
      const bTs = b.data.sessionStartedAt?.toDate?.()?.getTime?.() || 0;
      return bTs - aTs;
    });

    const chosen = candidates[0];
    const data = chosen.data;

    const appointmentId = chosen.id;
    const startTime: Date = data.date?.toDate?.() || new Date();
    const actualStartTime: Date = data.sessionStartedAt?.toDate?.() || new Date();
    const expectedDuration: number = data.duration || 60;
    const clientId: string | undefined = data.createdBy;

    // Récupérer nom du client
    let clientName = 'Client';
    try {
      if (clientId) {
        const userSnap = await getDoc(doc(firestore, 'users', clientId));
        if (userSnap.exists()) {
          const u = userSnap.data() as any;
          clientName = u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'Client';
        }
      }
    } catch (e) {
      console.warn('⚠️ ACTIVE SESSION - Impossible de charger infos client:', e);
    }

    const result = {
      appointmentId,
      clientName,
      startTime,
      expectedDuration,
      actualStartTime,
      clientId,
    };

    console.log('✅ ACTIVE SESSION - Trouvée:', result);
    return result;
  } catch (error) {
    console.error('❌ ACTIVE SESSION - Erreur:', error);
    return null;
  }
};

/**
 * Termine une session manuellement
 */
export const endSession = async (
  appointmentId: string,
  coachId: string
): Promise<{ success: boolean; message: string }> => {
  console.log('🛑 END SESSION - Demande d\'arrêt pour RDV:', { appointmentId, coachId });
  try {
    if (!appointmentId || !coachId) {
      return { success: false, message: 'Paramètres manquants' };
    }

    const ref = doc(firestore, APPOINTMENTS_COLLECTION, appointmentId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return { success: false, message: 'Rendez-vous introuvable' };
    }

    const data = snap.data() as any;

    if (data.globalStatus !== 'started') {
      return { success: false, message: 'Aucune séance en cours pour ce rendez-vous' };
    }

    // Vérifier que le coach qui arrête est bien celui qui a démarré (ou ignorer si pas nécessaire)
    if (data.sessionStartedBy && data.sessionStartedBy !== coachId) {
      return { success: false, message: "Vous ne pouvez pas terminer cette séance" };
    }

    await updateDoc(ref, {
      sessionEndedAt: Timestamp.now(),
      sessionEndedBy: coachId,
      globalStatus: 'completed',
      updatedAt: Timestamp.now(),
      autoCompleted: false,
    });

    console.log('✅ END SESSION - Séance terminée manuellement');
    return { success: true, message: 'Séance terminée' };
  } catch (error) {
    console.error('❌ END SESSION - Erreur:', error);
    return { success: false, message: 'Erreur lors de la fin de séance' };
  }
};
