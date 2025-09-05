import { 
  collection, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  doc, 
  query, 
  where, 
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { firestore } from '../firebase';
import { 
  Appointment,
  AppointmentParticipant,
  AppointmentFormData,
  AppointmentWithParticipants
} from '../models/appointment';
import { 
  canGenerateQRCode as _canGenerateQRCode,
  generateQRCodeForAppointment as _generateQRCodeForAppointment,
  scanQRCode as _scanQRCode,
  generateParticipantQRCode as _generateParticipantQRCode,
  scanParticipantQRCode as _scanParticipantQRCode,
  getQRCodeStatus as _getQRCodeStatus,
} from './qr';
// DEBUG flag central (mettez true en dev pour réactiver les logs verbeux de ce module)
const DEBUG_APT = false;
const logApt = (...args: any[]) => { if (DEBUG_APT) console.log(...args); };
const warnApt = (...args: any[]) => { if (DEBUG_APT) console.warn(...args); };

const APPOINTMENTS_COLLECTION = 'appointments';
const PARTICIPANTS_COLLECTION = 'appointmentParticipants';

// Fenêtre de génération du QR: de 30 min avant à 15 min après le début (DÉPLACÉ -> qr.ts)
// export const canGenerateQRCode = (...) { ... }
export const canGenerateQRCode = _canGenerateQRCode; // proxy

/**
 * Backfill des champs participantsIds et coachIds pour les anciens rendez-vous
 * Parcourt tous les appointments, récupère leurs participants et met à jour.
 * A exécuter ponctuellement (ex: depuis un écran admin caché ou script).
 */
export const backfillParticipantsIds = async (): Promise<{ updated: number; skipped: number; errors: number; }> => {
  logApt('🛠️ BACKFILL - Début participantsIds');
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
        warnApt('⚠️ BACKFILL - Erreur sur appointment', appDoc.id, e);
        errors++;
      }
    }
    logApt('🛠️ BACKFILL - Terminé', { updated, skipped, errors });
    return { updated, skipped, errors };
  } catch (e) {
    warnApt('❌ BACKFILL - Echec global:', e);
    throw e;
  }
};

// Logs de debug au chargement du module
logApt('🔍 SERVICE DEBUG - Module appointmentService chargé');
logApt('🔍 SERVICE DEBUG - APPOINTMENTS_COLLECTION:', APPOINTMENTS_COLLECTION);
logApt('🔍 SERVICE DEBUG - PARTICIPANTS_COLLECTION:', PARTICIPANTS_COLLECTION);

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
  logApt('🏗️ CRÉATION RDV - Début avec données:', {
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
    
    logApt('📝 CRÉATION RDV - Données appointment préparées:', appointmentData);
    
    const appointmentRef = await addDoc(collection(firestore, APPOINTMENTS_COLLECTION), appointmentData);
    const appointmentId = appointmentRef.id;
    
    logApt('✅ CRÉATION RDV - Appointment créé avec ID:', appointmentId);
    
    // 2. Ajouter le créateur comme participant client
    const creatorParticipant: Omit<AppointmentParticipant, 'id'> = {
      appointmentId,
      userId,
      email: userEmail,
      role: 'client',
      status: 'accepted', // Le créateur est automatiquement accepté
      joinedAt: Timestamp.now() as any,
      attendanceStatus: 'pending', // Phase 2: initialize attendance
    } as any;
    
    await addDoc(collection(firestore, PARTICIPANTS_COLLECTION), creatorParticipant);
    logApt('✅ CRÉATION RDV - Créateur ajouté comme participant');
    
    // 3. Ajouter les coaches sélectionnés un par un
    for (let i = 0; i < formData.coachIds.length; i++) {
      const coachId = formData.coachIds[i];
      
      const coachParticipant: Omit<AppointmentParticipant, 'id'> = {
        appointmentId,
        userId: coachId,
        email: '', // On récupérera l'email plus tard si nécessaire
        role: 'coach',
        status: 'pending',
        attendanceStatus: 'pending', // normalize for coaches too (may help future stats)
      } as any;
      
      await addDoc(collection(firestore, PARTICIPANTS_COLLECTION), coachParticipant);
      logApt(`✅ CRÉATION RDV - Coach ${i + 1}/${formData.coachIds.length} ajouté:`, coachId);
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
            attendanceStatus: 'pending',
          } as any;
          
          await addDoc(collection(firestore, PARTICIPANTS_COLLECTION), invitedClient);
          logApt(`✅ CRÉATION RDV - Client invité ${i + 1}/${formData.invitedEmails.length}:`, email);
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
      logApt('🔄 CRÉATION RDV - participantsIds mis à jour:', unique.length);
    } catch (e) {
      warnApt('⚠️ CRÉATION RDV - Impossible de mettre à jour participantsIds:', e);
    }
    
    logApt('🎉 CRÉATION RDV - Succès complet! ID:', appointmentId);

    // Armer l’annulation automatique no-show (+15 min si pas scanné)
    // TODO: déplacer scheduleNoShowCancellation dans un module sessionControl.ts
    // try {
    //   scheduleNoShowCancellation(appointmentId, (cleanedFormData.date as Date));
    // } catch (e) {
    //   warnApt('⚠️ Planification no-show non armée:', e);
    // }

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
  logApt('📋 RÉCUPÉRATION RDV CLIENT - Début pour:', userId);
  
  try {
    // Récupérer tous les rendez-vous créés par le client
    const appointmentsQuery = query(
      collection(firestore, APPOINTMENTS_COLLECTION),
      where('createdBy', '==', userId)
      // orderBy('date', 'desc') // Temporairement retiré car nécessite un index
    );
    
    const appointmentsSnapshot = await getDocs(appointmentsQuery);
    logApt(`📋 RÉCUPÉRATION RDV CLIENT - ${appointmentsSnapshot.size} rendez-vous trouvés`);
    
    if (appointmentsSnapshot.empty) {
      logApt('📋 RÉCUPÉRATION RDV CLIENT - Aucun rendez-vous trouvé');
      return [];
    }
    
    const appointments: AppointmentWithParticipants[] = [];
    
    for (const appointmentDoc of appointmentsSnapshot.docs) {
      const appointmentData = appointmentDoc.data();
      const appointmentId = appointmentDoc.id;
      
      logApt(`📋 RÉCUPÉRATION RDV CLIENT - Traitement RDV:`, appointmentId);
      logApt(`📋 RÉCUPÉRATION RDV CLIENT - Données brutes appointmentData:`, appointmentData);
      logApt(`📋 RÉCUPÉRATION RDV CLIENT - startTime brut:`, appointmentData.startTime);
      logApt(`📋 RÉCUPÉRATION RDV CLIENT - endTime brut:`, appointmentData.endTime);
      
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
      const effectiveStatus = await recomputeGlobalStatusIfNeeded(appointmentId, appointmentData, participants);
      const appointment: AppointmentWithParticipants = {
        id: appointmentId,
        ...appointmentData,
        globalStatus: effectiveStatus,
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
      logApt(`📋 RÉCUPÉRATION RDV CLIENT - RDV ajouté avec ${participants.length} participants et heures:`, {
        startTime: appointmentData.startTime,
        endTime: appointmentData.endTime
      });
    }
    
    // Trier par date côté client (du plus récent au plus ancien)
    appointments.sort((a, b) => b.date.getTime() - a.date.getTime());
    
    logApt(`📋 RÉCUPÉRATION RDV CLIENT - Succès! ${appointments.length} rendez-vous traités`);
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
  logApt('👨‍⚕️ RÉCUPÉRATION RDV COACH - Début pour:', coachId);
  
  try {
    // Trouver tous les participants où ce coach est en attente
    const participantsQuery = query(
      collection(firestore, PARTICIPANTS_COLLECTION),
      where('userId', '==', coachId),
      where('role', '==', 'coach'),
      where('status', '==', 'pending')
    );
    
    const participantsSnapshot = await getDocs(participantsQuery);
    logApt(`👨‍⚕️ RÉCUPÉRATION RDV COACH - ${participantsSnapshot.size} participations en attente`);
    
    if (participantsSnapshot.empty) {
      logApt('👨‍⚕️ RÉCUPÉRATION RDV COACH - Aucune demande en attente');
      return [];
    }
    
    const appointments: AppointmentWithParticipants[] = [];
    
    for (const participantDoc of participantsSnapshot.docs) {
      const participantData = participantDoc.data();
      const appointmentId = participantData.appointmentId;
      
      logApt(`👨‍⚕️ RÉCUPÉRATION RDV COACH - Traitement RDV:`, appointmentId);
      
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
      logApt(`👨‍⚕️ RÉCUPÉRATION RDV COACH - RDV ajouté avec ${participants.length} participants`);
    }
    
    logApt(`👨‍⚕️ RÉCUPÉRATION RDV COACH - Succès! ${appointments.length} demandes trouvées`);
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
  logApt('🔄 MAJ STATUT PARTICIPANT - Début:', { participantId, status });
  try {
    const participantRef = doc(firestore, PARTICIPANTS_COLLECTION, participantId);
    const participantSnap = await getDoc(participantRef);
    if (!participantSnap.exists()) {
      warnApt('⚠️ MAJ STATUT PARTICIPANT - Introuvable:', participantId);
      return;
    }
    const participantData: any = participantSnap.data();
    const appointmentId: string = participantData.appointmentId;
    const role: string = participantData.role;

    await updateDoc(participantRef, {
      status,
      joinedAt: status === 'accepted' ? Timestamp.now() : participantData.joinedAt || undefined,
      updatedAt: Timestamp.now()
    });
    logApt('✅ MAJ STATUT PARTICIPANT - Succès');

    if (role === 'coach') {
      try {
        const coachesSnap = await getDocs(query(
          collection(firestore, PARTICIPANTS_COLLECTION),
          where('appointmentId', '==', appointmentId),
          where('role', '==', 'coach')
        ));
        let allAccepted = true; let anyCoach = false; let anyDeclined = false;
        coachesSnap.forEach(c => { const cd:any = c.data(); anyCoach = true; if (cd.status !== 'accepted') { allAccepted = false; } if (cd.status === 'declined') anyDeclined = true; });
        if (anyCoach) {
          const aptRef = doc(firestore, APPOINTMENTS_COLLECTION, appointmentId);
          const aptSnap = await getDoc(aptRef);
          if (aptSnap.exists()) {
            const aptData:any = aptSnap.data();
            let newStatus: string | null = null;
            if (allAccepted && aptData.globalStatus !== 'confirmed') newStatus = 'confirmed';
            else if (anyDeclined && aptData.globalStatus !== 'declined') newStatus = 'declined';
            if (newStatus) {
              await updateDoc(aptRef, { globalStatus: newStatus, updatedAt: Timestamp.now() });
              logApt('🔁 MAJ STATUT GLOBAL - Nouveau statut:', newStatus, 'appointmentId:', appointmentId);
            }
          }
        }
      } catch (e) {
        warnApt('⚠️ MAJ STATUT GLOBAL - Erreur recalcul:', e);
      }
    }
  } catch (error) {
    console.error('❌ MAJ STATUT PARTICIPANT - Erreur:', error);
    throw error;
  }
};

/**
 * Récupère un rendez-vous spécifique avec ses participants
 */
export const getAppointmentById = async (appointmentId: string): Promise<AppointmentWithParticipants | null> => {
  logApt('🔍 RÉCUPÉRATION RDV UNIQUE - Début pour:', appointmentId);
  
  try {
    const appointmentDoc = await getDoc(doc(firestore, APPOINTMENTS_COLLECTION, appointmentId));
    
    if (!appointmentDoc.exists()) {
      logApt('🔍 RÉCUPÉRATION RDV UNIQUE - RDV introuvable');
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
    const effectiveStatus = await recomputeGlobalStatusIfNeeded(appointmentId, appointmentData, participants);
    const appointment: AppointmentWithParticipants = {
      id: appointmentId,
      ...appointmentData,
      globalStatus: effectiveStatus,
      date: appointmentData.date?.toDate() || new Date(),
      createdAt: appointmentData.createdAt?.toDate() || new Date(),
      updatedAt: appointmentData.updatedAt?.toDate() || new Date(),
      participants,
      coaches: participants.filter(p => p.role === 'coach'),
      clients: participants.filter(p => p.role === 'client'),
    } as AppointmentWithParticipants;
    
    logApt(`🔍 RÉCUPÉRATION RDV UNIQUE - Succès avec ${participants.length} participants`);
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
  logApt('📋 RÉCUPÉRATION RDV PARTICIPANT - Début pour:', { userId, userEmail });
  
  try {
    // Trouver tous les participants où cet utilisateur est invité
    const participantsQuery = query(
      collection(firestore, PARTICIPANTS_COLLECTION),
      where('userId', '==', userId),
      where('role', '==', 'client')
    );
    
    const participantsSnapshot = await getDocs(participantsQuery);
    logApt(`📋 RÉCUPÉRATION RDV PARTICIPANT - ${participantsSnapshot.size} participations trouvées par userId`);
    
    // Également chercher par email pour les invitations où userId n'est pas encore défini
    const participantsByEmailQuery = query(
      collection(firestore, PARTICIPANTS_COLLECTION),
      where('email', '==', userEmail),
      where('role', '==', 'client')
    );
    
    const participantsByEmailSnapshot = await getDocs(participantsByEmailQuery);
    logApt(`📋 RÉCUPÉRATION RDV PARTICIPANT - ${participantsByEmailSnapshot.size} participations trouvées par email`);
    
    // Combiner les résultats et éliminer les doublons
    const allParticipantDocs = [
      ...participantsSnapshot.docs,
      ...participantsByEmailSnapshot.docs.filter(emailDoc => 
        !participantsSnapshot.docs.find(userDoc => userDoc.id === emailDoc.id)
      )
    ];
    
    if (allParticipantDocs.length === 0) {
      logApt('📋 RÉCUPÉRATION RDV PARTICIPANT - Aucune participation trouvée');
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
      
      logApt(`📋 RÉCUPÉRATION RDV PARTICIPANT - Traitement RDV:`, appointmentId);
      
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
      const effectiveStatus = await recomputeGlobalStatusIfNeeded(appointmentId, appointmentData, participants);
      const appointment: AppointmentWithParticipants = {
        id: appointmentId,
        ...appointmentData,
        globalStatus: effectiveStatus,
        date: appointmentData.date?.toDate() || new Date(),
        createdAt: appointmentData.createdAt?.toDate() || new Date(),
        updatedAt: appointmentData.updatedAt?.toDate() || new Date(),
        participants,
        coaches: participants.filter(p => p.role === 'coach'),
        clients: participants.filter(p => p.role === 'client'),
      } as AppointmentWithParticipants;
      
      appointments.push(appointment);
      logApt(`📋 RÉCUPÉRATION RDV PARTICIPANT - RDV ajouté avec ${participants.length} participants`);
    }
    
    logApt(`📋 RÉCUPÉRATION RDV PARTICIPANT - Succès! ${appointments.length} rendez-vous trouvés`);
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
  logApt('📋 RÉCUPÉRATION TOUS RDV CLIENT - Début pour:', { userId, userEmail });
  
  try {
    // Récupérer les rendez-vous créés par le client
    const createdAppointments = await getAppointmentsByClient(userId);
    logApt(`📋 RÉCUPÉRATION TOUS RDV CLIENT - ${createdAppointments.length} RDV créés`);
    
    // Récupérer les invitations depuis la collection 'invitations' (comme /invitations)
    const invitedAppointments = await getInvitationsForCalendar(userId);
    logApt(`📋 RÉCUPÉRATION TOUS RDV CLIENT - ${invitedAppointments.length} RDV invités (depuis collection invitations)`);
    
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
    
    logApt(`📋 RÉCUPÉRATION TOUS RDV CLIENT - Total: ${allAppointments.length} RDV (${createdAppointments.length} créés + ${invitedAppointments.length} invités)`);
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
          const effectiveStatus = await recomputeGlobalStatusIfNeeded(data.appointmentId, aptData, participants);
          const appointment: AppointmentWithParticipants = {
            id: data.appointmentId,
            ...aptData,
            globalStatus: effectiveStatus,
            date: aptData.date?.toDate() || new Date(),
            createdAt: aptData.createdAt?.toDate() || new Date(),
            updatedAt: aptData.updatedAt?.toDate() || new Date(),
            participants,
            coaches: participants.filter(p => p.role === 'coach'),
            clients: participants.filter(p => p.role === 'client'),
            invitationStatus: data.status,
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
 * Génère un QR code unique pour un rendez-vous (déplacé dans qr.ts)
 */
export const generateQRCodeForAppointment = _generateQRCodeForAppointment; // proxy

/**
 * Valide et scanne un QR code rendez-vous (déplacé dans qr.ts)
 */
export const scanQRCode = _scanQRCode; // proxy

/**************************** PHASE 1 - MULTI PARTICIPANT QR (restored / déplacé) ****************************/
// Proxys vers module qr.ts
export const generateParticipantQRCode = _generateParticipantQRCode;
export const scanParticipantQRCode = _scanParticipantQRCode;
export const getQRCodeStatus = _getQRCodeStatus;

// --- TEMP session helpers (to refactor into sessionControl.ts) ---
// Récupère la session active pour un coach (globalStatus started sur une séance qu'il a créée ou où il est coach)
export const getActiveSessionForCoach = async (coachId: string): Promise<any|null> => {
  try {
    const q = query(collection(firestore, APPOINTMENTS_COLLECTION), where('globalStatus','==','started'));
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      const data: any = d.data();
      if (data.sessionStartedBy === coachId || (Array.isArray(data.coachIds) && data.coachIds.includes(coachId))) {
        return {
          appointmentId: d.id,
            clientName: 'Client',
            startTime: data.date?.toDate?.() || new Date(),
            expectedDuration: data.duration || 60,
            actualStartTime: data.sessionStartedAt?.toDate?.() || new Date(),
        };
      }
    }
    return null;
  } catch (e) { console.warn('⚠️ getActiveSessionForCoach erreur', e); return null; }
};

export const manualStartSession = async (appointmentId: string, coachId: string) => {
  try {
    const ref = doc(firestore, APPOINTMENTS_COLLECTION, appointmentId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return { success:false, message:'Séance introuvable' };
    const data:any = snap.data();
    if (data.globalStatus === 'started') return { success:true, message:'Déjà démarrée' };
    await updateDoc(ref,{ globalStatus:'started', sessionStartedAt: Timestamp.now(), sessionStartedBy: coachId, startMode:'manual', updatedAt: Timestamp.now() });
    return { success:true, message:'Séance démarrée manuellement' };
  } catch { return { success:false, message:'Erreur démarrage manuel' }; }
};

export const subscribeToAttendanceProgress = (appointmentId: string, cb:(data:any)=>void) => {
  // Placeholder no-op (implementation temps réel à ajouter si besoin)
  console.warn('subscribeToAttendanceProgress placeholder - no realtime listener implemented');
  cb({ appointmentId, presentCount:0, totalClients:0 });
  return () => {};
};

export const getSessionAttendanceDetails = async (appointmentId: string) => {
  try {
    const partsSnap = await getDocs(query(collection(firestore, PARTICIPANTS_COLLECTION), where('appointmentId','==',appointmentId), where('role','==','client')));
    const clients:any[] = []; let present=0; partsSnap.forEach(p=>{ const d:any=p.data(); if(d.attendanceStatus==='present') present++; clients.push({ id:p.id, ...d }); });
    return { appointmentId, presentCount: present, totalClients: clients.length, clients };
  } catch { return { appointmentId, presentCount:0, totalClients:0, clients:[] }; }
};

export const setParticipantAttendanceStatus = async (participantId: string, status:'present'|'absent') => {
  try { await updateDoc(doc(firestore, PARTICIPANTS_COLLECTION, participantId), { attendanceStatus: status, updatedAt: Timestamp.now() }); return { success:true }; } catch { return { success:false }; }
};

export const endSession = async (appointmentId: string, coachId: string) => {
  try {
    const ref = doc(firestore, APPOINTMENTS_COLLECTION, appointmentId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return { success:false, message:'Séance introuvable' };
    const data:any = snap.data();
    if (data.globalStatus !== 'started') return { success:false, message:'Séance non démarrée' };
    await updateDoc(ref,{ globalStatus:'completed', sessionEndedAt: Timestamp.now(), sessionEndedBy: coachId, updatedAt: Timestamp.now() });
    return { success:true, message:'Séance terminée' };
  } catch { return { success:false, message:'Erreur fin séance' }; }
};

const recomputeGlobalStatusIfNeeded = async (appointmentId: string, appointmentData: any, participants: any[]) => {
  try {
    if (!appointmentData) return appointmentData?.globalStatus || 'pending';
    const current = appointmentData.globalStatus;
    if (current !== 'pending') return current; // only auto-upgrade from pending
    const coachParticipants = participants.filter(p => p.role === 'coach');
    if (coachParticipants.length === 0) return current; // no coaches -> keep pending
    const anyDeclined = coachParticipants.some(c => c.status === 'declined');
    if (anyDeclined) return 'declined';
    const allAccepted = coachParticipants.every(c => c.status === 'accepted');
    if (allAccepted) {
      try {
        await updateDoc(doc(firestore, APPOINTMENTS_COLLECTION, appointmentId), { globalStatus: 'confirmed', updatedAt: Timestamp.now() });
        logApt('🔁 RECOMPUTE STATUS - Auto passage à confirmed pour', appointmentId);
        return 'confirmed';
      } catch (e) { warnApt('⚠️ RECOMPUTE STATUS - Echec update', appointmentId, e); }
      return 'confirmed';
    }
    return current;
  } catch (e) { warnApt('⚠️ RECOMPUTE STATUS - Erreur générale', appointmentId, e); return appointmentData?.globalStatus || 'pending'; }
};
