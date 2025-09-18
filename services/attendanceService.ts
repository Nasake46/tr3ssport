import { collection, doc, getDoc, getDocs, query, Timestamp, updateDoc, addDoc, where } from 'firebase/firestore';
import { firestore } from '../firebase';

const APPOINTMENTS_COLLECTION = 'appointments';
const PARTICIPANTS_COLLECTION = 'appointmentParticipants';

// Sous-collection d'historique: /appointments/{appointmentId}/attendanceLogs/{logId}
const attendanceLogsCol = (appointmentId: string) => collection(firestore, APPOINTMENTS_COLLECTION, appointmentId, 'attendanceLogs');

/**
 * Ajoute un évènement d'appel (présent, absent, start, end, manual_start, auto_start)
 */
const logAttendanceEvent = async (appointmentId: string, payload: Record<string, any>) => {
  try {
    await addDoc(attendanceLogsCol(appointmentId), { createdAt: Timestamp.now(), ...payload });
  } catch (e) {
    console.warn('⚠️ ATTENDANCE LOG - Échec écriture', e);
  }
};

/** Calcule le prochain ordre de présence */
const computeNextAttendanceOrder = async (appointmentId: string): Promise<number> => {
  try {
    const snap = await getDocs(query(collection(firestore, PARTICIPANTS_COLLECTION), where('appointmentId','==',appointmentId), where('role','==','client')));
    let maxOrder = 0;
    snap.forEach(d => { const data:any = d.data(); if (typeof data.attendanceOrder === 'number' && data.attendanceOrder > maxOrder) maxOrder = data.attendanceOrder; });
    return maxOrder + 1;
  } catch { return 1; }
};

export const markParticipantPresent = async (appointmentId: string, participantId: string, coachId?: string) => {
  try {
    const partRef = doc(firestore, PARTICIPANTS_COLLECTION, participantId);
    const partSnap = await getDoc(partRef);
    if (!partSnap.exists()) return { success:false, message:'Participant introuvable' };
    const partData:any = partSnap.data();
    if (partData.attendanceStatus === 'present') return { success:true, message:'Déjà présent', already:true };
    const order = await computeNextAttendanceOrder(appointmentId);
    await updateDoc(partRef, { attendanceStatus:'present', attendanceOrder: order, qrScannedAt: Timestamp.now(), updatedAt: Timestamp.now() });
    await logAttendanceEvent(appointmentId, { action:'present', participantId, userId: partData.userId || null, coachId: coachId||null, order });
    return { success:true, message:'Présence enregistrée', order };
  } catch (e) {
    return { success:false, message:'Erreur présence' };
  }
};

export const markParticipantAbsent = async (appointmentId: string, participantId: string, coachId?: string) => {
  try {
    const partRef = doc(firestore, PARTICIPANTS_COLLECTION, participantId);
    const partSnap = await getDoc(partRef);
    if (!partSnap.exists()) return { success:false, message:'Participant introuvable' };
    const partData:any = partSnap.data();
    if (partData.attendanceStatus === 'present') return { success:false, message:'Déjà présent (ne peut pas être marqué absent)' };
    if (partData.attendanceStatus === 'absent') return { success:true, message:'Déjà absent', already:true };
    await updateDoc(partRef, { attendanceStatus:'absent', updatedAt: Timestamp.now() });
    await logAttendanceEvent(appointmentId, { action:'absent', participantId, userId: partData.userId || null, coachId: coachId||null });
    return { success:true, message:'Absent enregistré' };
  } catch { return { success:false, message:'Erreur absence' }; }
};

export const startSessionManually = async (appointmentId: string, coachId: string) => {
  try {
    const aptRef = doc(firestore, APPOINTMENTS_COLLECTION, appointmentId);
    const snap = await getDoc(aptRef);
    if (!snap.exists()) return { success:false, message:'Séance introuvable' };
    const data:any = snap.data();
    if (data.globalStatus === 'started') return { success:true, message:'Déjà démarrée' };
    await updateDoc(aptRef, { globalStatus:'started', status:'started', sessionStartedAt: Timestamp.now(), sessionStartedBy: coachId, startMode:'manual', updatedAt: Timestamp.now() });
    await logAttendanceEvent(appointmentId, { action:'manual_start', coachId });
    return { success:true, message:'Séance démarrée' };
  } catch { return { success:false, message:'Erreur démarrage' }; }
};

export const finalizeSession = async (appointmentId: string, coachId: string) => {
  try {
    const aptRef = doc(firestore, APPOINTMENTS_COLLECTION, appointmentId);
    const snap = await getDoc(aptRef);
    if (!snap.exists()) return { success:false, message:'Séance introuvable' };
    const qClients = query(collection(firestore, PARTICIPANTS_COLLECTION), where('appointmentId','==',appointmentId), where('role','==','client'));
    const clientsSnap = await getDocs(qClients);
    let newlyAbsent = 0; let present = 0; let total = 0;
    for (const d of clientsSnap.docs) {
      const data:any = d.data(); total++;
      if (data.attendanceStatus === 'present') { present++; continue; }
      if (data.attendanceStatus !== 'absent') {
        await updateDoc(doc(firestore, PARTICIPANTS_COLLECTION, d.id), { attendanceStatus:'absent', updatedAt: Timestamp.now() });
        await logAttendanceEvent(appointmentId, { action:'auto_absent', participantId: d.id, userId: data.userId || null, coachId });
        newlyAbsent++;
      }
    }
    await updateDoc(aptRef, { globalStatus:'completed', status:'completed', sessionEndedAt: Timestamp.now(), sessionEndedBy: coachId, updatedAt: Timestamp.now(), attendanceSummary:{ present, total, absent: total-present } });
    await logAttendanceEvent(appointmentId, { action:'end', coachId, present, total });
    return { success:true, message:'Séance terminée', present, total, newlyAbsent };
  } catch { return { success:false, message:'Erreur fin séance' }; }
};

export const getAttendanceHistory = async (appointmentId: string) => {
  try {
    const snap = await getDocs(attendanceLogsCol(appointmentId));
    return snap.docs.map(d=>({ id:d.id, ...(d.data() as any) })).sort((a,b)=> (a.createdAt?.toMillis()||0) - (b.createdAt?.toMillis()||0));
  } catch { return []; }
};
