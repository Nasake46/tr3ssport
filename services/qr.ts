import { Timestamp, doc, getDoc, updateDoc, addDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { markParticipantPresent } from './attendanceService';
import { firestore } from '../firebase';
import { SCAN_QR_ERROR_CODES, SCAN_PARTICIPANT_ERROR_CODES } from './errors';

const APPOINTMENTS_COLLECTION = 'appointments';
const PARTICIPANTS_COLLECTION = 'appointmentParticipants';

// Fenêtre de génération du QR: de 30 min avant à 15 min après le début
export const canGenerateQRCode = (appointmentDate: Date): boolean => {
  const now = new Date();
  const thirtyMinsBefore = new Date(appointmentDate.getTime() - 30 * 60 * 1000);
  const fifteenMinsAfterStart = new Date(appointmentDate.getTime() + 15 * 60 * 1000);
  return now >= thirtyMinsBefore && now <= fifteenMinsAfterStart;
};

// Nouveau: statut du QR
export const getQRCodeStatus = async (appointmentId: string): Promise<{
  canGenerate: boolean;
  isGenerated: boolean;
  isScanned: boolean;
  timeUntilGeneration?: number; // ms avant fenêtre
  timeUntilExpiration?: number; // ms avant fin fenêtre (+15 min après start)
}> => {
  const snap = await getDoc(doc(firestore, APPOINTMENTS_COLLECTION, appointmentId));
  if (!snap.exists()) {
    return { canGenerate: false, isGenerated: false, isScanned: false };
  }
  const data: any = snap.data();
  if (!data.date) {
    return { canGenerate: false, isGenerated: false, isScanned: false };
  }
  const aptDate: Date = data.date.toDate();
  const now = new Date();
  const thirtyMinsBefore = new Date(aptDate.getTime() - 30 * 60 * 1000);
  const fifteenMinsAfterStart = new Date(aptDate.getTime() + 15 * 60 * 1000);
  const canGenerate = now >= thirtyMinsBefore && now <= fifteenMinsAfterStart;
  const isGenerated = !!data.qrToken;
  const isScanned = data.qrStatus === 'scanned' || data.globalStatus === 'started';
  const timeUntilGeneration = now < thirtyMinsBefore ? (thirtyMinsBefore.getTime() - now.getTime()) : undefined;
  const timeUntilExpiration = now <= fifteenMinsAfterStart ? (fifteenMinsAfterStart.getTime() - now.getTime()) : 0;
  return { canGenerate, isGenerated, isScanned, timeUntilGeneration, timeUntilExpiration };
};

export const generateQRCodeForAppointment = async (appointmentId: string): Promise<string> => {
  const appointmentDoc = await getDoc(doc(firestore, APPOINTMENTS_COLLECTION, appointmentId));
  if (!appointmentDoc.exists()) throw new Error('Rendez-vous introuvable');
  const appointmentData: any = appointmentDoc.data();
  const appointmentDate: Date = appointmentData.date.toDate();
  if (!canGenerateQRCode(appointmentDate)) throw new Error('QR disponible de 30 min avant à 15 min après le début de la séance');
  if (appointmentData.qrToken) return appointmentData.qrToken;
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const qrToken = `${appointmentId}_${timestamp}_${randomString}`;
  await updateDoc(doc(firestore, APPOINTMENTS_COLLECTION, appointmentId), {
    qrToken,
    qrGeneratedAt: Timestamp.now(),
    qrStatus: 'generated',
    updatedAt: Timestamp.now(),
  });
  return qrToken;
};

export const scanQRCode = async (qrToken: string, coachId: string): Promise<{ success: boolean; message: string; appointmentId?: string; clientName?: string; appointmentTime?: string; duration?: number; error?: string; errorCode?: string; presentCount?: number; totalClients?: number; diagnostics?: any; }> => {
  const appointmentId = qrToken.split('_')[0];
  if (!appointmentId) return { success: false, message: 'QR code invalide', errorCode: SCAN_QR_ERROR_CODES.APPT_QR_INVALID };
  const appointmentRef = doc(firestore, APPOINTMENTS_COLLECTION, appointmentId);
  const appointmentDoc = await getDoc(appointmentRef);
  if (!appointmentDoc.exists()) return { success: false, message: 'Rendez-vous introuvable', errorCode: SCAN_QR_ERROR_CODES.APPT_NOT_FOUND };
  const appointmentData: any = appointmentDoc.data();
  if (appointmentData.qrToken !== qrToken) return { success: false, message: 'QR code expiré ou invalide', errorCode: SCAN_QR_ERROR_CODES.APPT_QR_MISMATCH };
  const appointmentDate: Date = appointmentData.date.toDate();
  const now = new Date();
  const thirtyMinsBefore = new Date(appointmentDate.getTime() - 30 * 60 * 1000);
  const fifteenMinsAfterStart = new Date(appointmentDate.getTime() + 15 * 60 * 1000);
  const duration = appointmentData.duration || 60;
  if (now < thirtyMinsBefore) return { success: false, message: 'Trop tôt pour commencer la séance', errorCode: SCAN_QR_ERROR_CODES.APPT_TOO_EARLY };
  if (now > fifteenMinsAfterStart && appointmentData.globalStatus !== 'started') return { success: false, message: 'Délai dépassé, séance considérée comme annulée', errorCode: SCAN_QR_ERROR_CODES.APPT_TOO_LATE };
  // Coach assignment check
  let isAssigned = false; let coachEmail: string | undefined;
  try {
    const participantsSnapshot = await getDocs(query(collection(firestore, PARTICIPANTS_COLLECTION), where('appointmentId','==',appointmentId), where('userId','==',coachId), where('role','==','coach')));
    const isInCoachIds = Array.isArray(appointmentData.coachIds) && appointmentData.coachIds.includes(coachId);
    if (participantsSnapshot.empty && !isInCoachIds) {
      const coachUserSnap = await getDoc(doc(firestore,'users',coachId));
      if (coachUserSnap.exists()) {
        const u:any = coachUserSnap.data();
        coachEmail = u.email;
        if (coachEmail) {
          const byEmailSnap = await getDocs(query(collection(firestore, PARTICIPANTS_COLLECTION), where('appointmentId','==',appointmentId), where('role','==','coach'), where('email','==',coachEmail)));
            isAssigned = !byEmailSnap.empty;
        }
      }
    } else isAssigned = true;
    if (isAssigned && participantsSnapshot.empty) {
      try { await addDoc(collection(firestore, PARTICIPANTS_COLLECTION), { appointmentId, userId: coachId, email: coachEmail || '', role: 'coach', status: 'accepted', joinedAt: Timestamp.now(), createdAt: Timestamp.now(), updatedAt: Timestamp.now() }); } catch {}
    }
  } catch {}
  if (!isAssigned) return { success: false, message: "Vous n'êtes pas assigné à cette séance", errorCode: SCAN_QR_ERROR_CODES.APPT_COACH_NOT_ASSIGNED };
  const clientsSnap = await getDocs(query(collection(firestore, PARTICIPANTS_COLLECTION), where('appointmentId','==',appointmentId), where('role','==','client')));
  let totalClients=0; let presentCount=0; const clientDocs: any[] = []; clientsSnap.forEach(d=>{ const pd:any=d.data(); clientDocs.push({id:d.id,...pd}); if(pd.attendanceStatus==='present') presentCount++; });
  // Si clientIds est présent sur le doc appointment, l'utiliser comme source de vérité pour le total attendu
  if (Array.isArray(appointmentData.clientIds) && appointmentData.clientIds.length>0) {
    totalClients = appointmentData.clientIds.length;
  } else {
    totalClients = clientDocs.length; // fallback
  }
  if (totalClients === 0) {
    // Auto-réparation: créer le participant client pour le créateur si manquant
    try {
      const creatorId = appointmentData.createdBy;
      if (creatorId) {
        const creatorUserSnap = await getDoc(doc(firestore,'users',creatorId));
        const creatorEmail = creatorUserSnap.exists() ? ((creatorUserSnap.data() as any).email || '') : '';
        await addDoc(collection(firestore, PARTICIPANTS_COLLECTION), { appointmentId, userId: creatorId, email: creatorEmail, role:'client', status:'accepted', attendanceStatus:'pending', joinedAt: Timestamp.now(), createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
        await updateDoc(appointmentRef, { clientIds: [creatorId], participantsClientIds:[creatorId], participantsIds: [creatorId, ...(appointmentData.coachIds||[])] });
        return { success:false, message:'Participant créateur reconstruit. Rescanner le QR.', errorCode: SCAN_QR_ERROR_CODES.APPT_NO_CLIENT_PARTICIPANTS, appointmentId, presentCount:0, totalClients:1 };
      }
    } catch {}
    const diagnostics = { appointmentId, hasCreator: !!appointmentData.createdBy };
    return { success:false, message:'Aucun participant client trouvé (auto-réparation échouée)', errorCode: SCAN_QR_ERROR_CODES.APPT_NO_CLIENT_PARTICIPANTS, appointmentId, diagnostics, presentCount, totalClients };
  }
  const allPresent = (presentCount===totalClients && totalClients>0);
  if (appointmentData.globalStatus === 'started') {
    if (appointmentData.qrStatus !== 'scanned') { try { await updateDoc(appointmentRef,{ qrStatus:'scanned', updatedAt:Timestamp.now() }); } catch {} }
    return { success:true, message:'Séance déjà démarrée', appointmentId, appointmentTime: appointmentDate.toISOString(), duration, errorCode: SCAN_QR_ERROR_CODES.APPT_ALREADY_STARTED, presentCount, totalClients };
  }
  if (!allPresent) {
    try { console.log('[DEBUG QR] WAITING_CLIENTS appointmentId', appointmentId, 'presentCount', presentCount, 'totalClients', totalClients, 'clientIds', Array.isArray(appointmentData.clientIds)?appointmentData.clientIds: 'none'); } catch {}
    if (appointmentData.qrStatus !== 'generated') { try { await updateDoc(appointmentRef,{ qrStatus:'generated', updatedAt:Timestamp.now() }); } catch {} }
    return { success:false, message:`Tous les clients ne sont pas encore scannés (${presentCount}/${totalClients}). Démarrez manuellement ou continuez les scans clients.`, errorCode: SCAN_QR_ERROR_CODES.APPT_WAITING_CLIENTS, appointmentId, duration, presentCount, totalClients };
  }
  try {
  await updateDoc(appointmentRef,{ sessionStartedAt:Timestamp.now(), sessionStartedBy:coachId, globalStatus:'started', status:'started', startMode: appointmentData.startMode || 'auto_qr_all_present', qrStatus:'scanned', updatedAt:Timestamp.now() });
  } catch { return { success:false, message:'Erreur démarrage', errorCode: SCAN_QR_ERROR_CODES.APPT_INTERNAL_ERROR }; }
  let clientName='Client';
  try { const creatorDoc = await getDoc(doc(firestore,'users',appointmentData.createdBy)); if (creatorDoc.exists()) { const ud:any=creatorDoc.data(); clientName = ud.displayName || ud.email || 'Client'; } } catch {}
  return { success:true, message:'Séance démarrée automatiquement (tous les clients scannés)', appointmentId, clientName, appointmentTime: appointmentDate.toISOString(), duration, presentCount, totalClients };
};

// Participant QR handling
const PARTICIPANT_QR_VALIDITY_MS = 15 * 60 * 1000; // 15 min
const toB64 = (obj:any):string => { try { const json=JSON.stringify(obj); if (typeof btoa==='function') return btoa(json); // @ts-ignore
  if (typeof Buffer!=='undefined') return Buffer.from(json,'utf8').toString('base64'); return json; } catch { return ''; } };
const fromB64 = (token:string):any|null => { try { if(!token) return null; let json:string; if (typeof atob==='function') json=atob(token); // @ts-ignore
  else if (typeof Buffer!=='undefined') json=Buffer.from(token,'base64').toString('utf8'); else json=token; return JSON.parse(json);} catch {return null;} };

export const generateParticipantQRCode = async (appointmentId:string, userId:string): Promise<{ success:boolean; token?:string; message:string; }> => {
  try {
    const appointmentSnap = await getDoc(doc(firestore, APPOINTMENTS_COLLECTION, appointmentId));
    if (!appointmentSnap.exists()) return { success:false, message:'Séance introuvable' };
    const appointmentData:any = appointmentSnap.data();
    if (['completed','cancelled'].includes(appointmentData.globalStatus)) return { success:false, message:'Séance terminée ou annulée' };
    if (appointmentData.sessionStartedAt || appointmentData.globalStatus==='started') return { success:false, message:'Séance déjà commencée' };
    const aptDate:Date = appointmentData.date.toDate();
    const now = new Date();
    if (now.getTime() < aptDate.getTime() - 30*60*1000) return { success:false, message:'Génération trop tôt' };
    const qPart = query(collection(firestore, PARTICIPANTS_COLLECTION), where('appointmentId','==',appointmentId), where('userId','==',userId), where('role','==','client'));
    let partSnap = await getDocs(qPart);
    let participantDoc:any = partSnap.docs[0];
    let participantData:any = participantDoc ? participantDoc.data() : null;
    if (partSnap.empty) {
      // 1) Tentative correspondance par email (participant pré-créé via invitation sans userId)
      let userEmail = '';
      try { const us = await getDoc(doc(firestore,'users',userId)); if (us.exists()) { const ud:any = us.data(); userEmail = (ud.email||'').toLowerCase(); } } catch {}
      if (userEmail) {
        try {
          const byEmailSnap = await getDocs(query(collection(firestore, PARTICIPANTS_COLLECTION), where('appointmentId','==',appointmentId), where('role','==','client'), where('email','==',userEmail)));
          if (!byEmailSnap.empty) {
            participantDoc = byEmailSnap.docs[0];
            participantData = participantDoc.data();
            // Lier le userId si absent
            try { await updateDoc(doc(firestore, PARTICIPANTS_COLLECTION, participantDoc.id), { userId, updatedAt: Timestamp.now(), status: participantData.status || 'accepted', joinedAt: participantData.joinedAt || Timestamp.now() }); } catch {}
          }
        } catch {}
      }
      // 2) Si toujours pas trouvé -> auto-création inconditionnelle (invité qui se présente la première fois)
      if (!participantDoc) {
        try {
          const newRef = await addDoc(collection(firestore, PARTICIPANTS_COLLECTION), {
            appointmentId,
            userId,
            email: userEmail,
            role:'client',
            status:'accepted',
            attendanceStatus:'pending',
            joinedAt: Timestamp.now(),
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
          participantDoc = await getDoc(newRef);
          participantData = participantDoc.data();
          // Mise à jour des listes agrégées
          const newClientIds = Array.isArray(appointmentData.clientIds) ? Array.from(new Set([...appointmentData.clientIds, userId])) : [userId];
          const newParticipantsIds = Array.isArray(appointmentData.participantsIds) ? Array.from(new Set([...appointmentData.participantsIds, userId])) : [userId];
          const newParticipantsClientIds = Array.isArray(appointmentData.participantsClientIds) ? Array.from(new Set([...appointmentData.participantsClientIds, userId])) : [userId];
          try { await updateDoc(doc(firestore, APPOINTMENTS_COLLECTION, appointmentId), { clientIds: newClientIds, participantsIds: newParticipantsIds, participantsClientIds: newParticipantsClientIds, updatedAt: Timestamp.now() }); } catch {}
        } catch (e) {
          console.warn('[QR] Auto-création participant client échouée (fallback)', e);
          return { success:false, message:'Participant client introuvable' };
        }
      }
    }
    if (participantData.attendanceStatus==='present') return { success:false, message:'Déjà enregistré comme présent' };
    if (participantData.qrToken && participantData.qrGeneratedAt) {
      const genDate:Date = participantData.qrGeneratedAt.toDate();
      if (now.getTime() - genDate.getTime() < 5*60*1000) return { success:true, token:participantData.qrToken, message:'Token réutilisé' };
    }
    const nonce = Math.random().toString(36).slice(2,10);
    const tokenPayload = { a: appointmentId, p: participantDoc.id, t: Date.now(), n: nonce };
    const token = toB64(tokenPayload);
    await updateDoc(doc(firestore, PARTICIPANTS_COLLECTION, participantDoc.id), { qrToken: token, qrGeneratedAt: Timestamp.now(), attendanceStatus: participantData.attendanceStatus || 'pending', updatedAt: Timestamp.now() });
    return { success:true, token, message:'QR généré' };
  } catch { return { success:false, message:'Erreur génération' }; }
};

export const scanParticipantQRCode = async (qrToken:string, coachId:string) => {
  const payload = fromB64(qrToken);
  if (!payload || !payload.a || !payload.p) return { success:false, message:'QR invalide', errorCode: SCAN_PARTICIPANT_ERROR_CODES.PARTICIPANT_QR_INVALID };
  if (!payload.t || Date.now() - payload.t > PARTICIPANT_QR_VALIDITY_MS) return { success:false, message:'QR expiré, régénérer', errorCode: SCAN_PARTICIPANT_ERROR_CODES.PARTICIPANT_QR_EXPIRED };
  const appointmentId:string = payload.a; const participantId:string = payload.p;
  try {
    const [aptSnap, partSnap] = await Promise.all([ getDoc(doc(firestore, APPOINTMENTS_COLLECTION, appointmentId)), getDoc(doc(firestore, PARTICIPANTS_COLLECTION, participantId)) ]);
    if (!aptSnap.exists()) return { success:false, message:'Séance introuvable', errorCode: SCAN_PARTICIPANT_ERROR_CODES.APPOINTMENT_NOT_FOUND };
    if (!partSnap.exists()) return { success:false, message:'Participant introuvable', errorCode: SCAN_PARTICIPANT_ERROR_CODES.PARTICIPANT_NOT_FOUND };
    const aptData:any = aptSnap.data(); const partData:any = partSnap.data();
    if (partData.appointmentId !== appointmentId) return { success:false, message:'QR non lié à cette séance', errorCode: SCAN_PARTICIPANT_ERROR_CODES.PARTICIPANT_APPT_MISMATCH };
    if (partData.role !== 'client') return { success:false, message:'QR non client', errorCode: SCAN_PARTICIPANT_ERROR_CODES.PARTICIPANT_NOT_CLIENT };
    let coachAssigned=false; try { const coachQuery = await getDocs(query(collection(firestore, PARTICIPANTS_COLLECTION), where('appointmentId','==',appointmentId), where('userId','==',coachId), where('role','==','coach'))); coachAssigned = !coachQuery.empty || (Array.isArray(aptData.coachIds) && aptData.coachIds.includes(coachId)); } catch {}
    if (!coachAssigned) return { success:false, message:'Coach non assigné', errorCode: SCAN_PARTICIPANT_ERROR_CODES.COACH_NOT_ASSIGNED };
    if (partData.attendanceStatus === 'present') {
      const cs = await getDocs(query(collection(firestore, PARTICIPANTS_COLLECTION), where('appointmentId','==',appointmentId), where('role','==','client')));
      let presentCount=0; let totalClients=0; cs.forEach(d=>{ const cd:any=d.data(); totalClients++; if(cd.attendanceStatus==='present') presentCount++; });
      return { success:true, message:'Déjà enregistré', participant:{ participantId, role:'client', attendanceOrder: partData.attendanceOrder, name: partData.name || partData.displayName || partData.email, email: partData.email }, presentCount, totalClients, appointmentId, errorCode: SCAN_PARTICIPANT_ERROR_CODES.PARTICIPANT_ALREADY_PRESENT };
    }
  const beforeSnap = await getDocs(query(collection(firestore, PARTICIPANTS_COLLECTION), where('appointmentId','==',appointmentId), where('role','==','client')));
  let presentBefore=0; beforeSnap.forEach(d=>{ const cd:any=d.data(); if (cd.attendanceStatus==='present') presentBefore++; });
  // Utilise le service central pour présence + logs (ignorer order calculé localement, le service recalculera si besoin)
  try { await updateDoc(doc(firestore, PARTICIPANTS_COLLECTION, participantId), { qrToken: null }); } catch {}
  const markRes = await markParticipantPresent(appointmentId, participantId, coachId);
  if (!markRes.success) return { success:false, message: markRes.message || 'Erreur présence', errorCode: 'ATTENDANCE_ERROR' };
  const attendanceOrder = markRes.order;
    const cs2 = await getDocs(query(collection(firestore, PARTICIPANTS_COLLECTION), where('appointmentId','==',appointmentId), where('role','==','client')));
    let presentCount=0; let totalClients=0; let allPresent=true; cs2.forEach(d=>{ const cd:any=d.data(); if(cd.attendanceStatus==='present') presentCount++; if(cd.role==='client'){} else{} });
    // Recalcule du total attendu via clientIds si possible
    if (Array.isArray(aptData.clientIds) && aptData.clientIds.length>0) {
      totalClients = aptData.clientIds.length;
      allPresent = presentCount === totalClients;
    } else {
      totalClients = cs2.size; // fallback approximatif
      allPresent = presentCount === totalClients && totalClients>0;
    }
  let autoStarted=false; if (allPresent && aptData.globalStatus!=='started' && !aptData.sessionStartedAt) { try { await updateDoc(doc(firestore, APPOINTMENTS_COLLECTION, appointmentId), { sessionStartedAt: Timestamp.now(), sessionStartedBy: coachId, globalStatus:'started', status:'started', startMode:'auto_last_participant', updatedAt: Timestamp.now() }); autoStarted=true; } catch {} }
  return { success:true, message:'Présence enregistrée', participant:{ participantId, role:'client', attendanceOrder, name: partData.name || partData.displayName || partData.email, email: partData.email }, presentCount, totalClients, autoStarted, appointmentId };
  } catch { return { success:false, message:'Erreur scan', errorCode: SCAN_PARTICIPANT_ERROR_CODES.PARTICIPANT_INTERNAL_ERROR }; }
};
