// Script de migration des participants legacy vers la collection normalisée "appointmentParticipants"
// Usage (dans un contexte où firestore est initialisé):
// import { runMigration } from '@/scripts/migrateParticipants';
// await runMigration({ dryRun: true }); // pour tester
// await runMigration(); // pour exécuter réellement

import { firestore } from '@/firebase';
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  updateDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';

interface MigrationOptions {
  dryRun?: boolean;
  targetCoachOnlyUserId?: string; // si fourni, ne migre que les appointments où ce user est impliqué
}

interface LegacyParticipantDoc {
  id: string;
  appointmentId?: string;
  userId?: string;
  email?: string;
  role?: string; // coach | client
  status?: string; // pending | accepted | declined
  createdAt?: any;
}

const TARGET_COLLECTION = 'appointmentParticipants';
const LEGACY_COLLECTIONS = ['appointment_participants', 'participants'];
const APPOINTMENTS = 'appointments';

/**
 * Construit une clé unique permettant d'éviter les doublons.
 */
const participantKey = (p: { appointmentId?: string; userId?: string; email?: string; role?: string }) => {
  return [p.appointmentId || 'noApp', p.userId || p.email || 'noUser', p.role || 'norole'].join('|');
};

/**
 * Charge tous les documents d'une collection (simple helper).
 */
const loadAll = async (colName: string) => {
  const snap = await getDocs(collection(firestore, colName));
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
};

/**
 * Migration principale.
 */
export const runMigration = async (options: MigrationOptions = {}) => {
  const { dryRun = false, targetCoachOnlyUserId } = options;
  console.log('🚀 MIGRATION PARTICIPANTS - Début', { dryRun, targetCoachOnlyUserId });

  // 1. Charger tous les appointments (filtrer si cible spécifique)
  const appointmentsSnap = await getDocs(collection(firestore, APPOINTMENTS));
  console.log('🗂️ MIGRATION - Appointments trouvés:', appointmentsSnap.size);

  // 2. Charger legacy collections
  const legacyData: LegacyParticipantDoc[] = [];
  for (const legacyCol of LEGACY_COLLECTIONS) {
    try {
      const docs = await loadAll(legacyCol);
      console.log(`📥 MIGRATION - Legacy ${legacyCol}:`, docs.length);
      legacyData.push(...docs.map(d => ({ ...d, _source: legacyCol })));
    } catch (e) {
      console.warn(`⚠️ MIGRATION - Impossible de lire ${legacyCol}:`, e);
    }
  }

  // 3. Charger participants déjà normalisés
  const normalizedSnap = await getDocs(collection(firestore, TARGET_COLLECTION));
  const existingMap = new Set<string>();
  normalizedSnap.forEach(docu => {
    const data: any = docu.data();
    existingMap.add(participantKey(data));
  });
  console.log('📊 MIGRATION - Participants normalisés existants:', existingMap.size);

  let created = 0;
  let skipped = 0;
  let errors = 0;
  let updatedAppointments = 0;

  // 4. Index legacy participants par appointmentId
  const legacyByAppointment: Record<string, LegacyParticipantDoc[]> = {};
  for (const lp of legacyData) {
    if (!lp.appointmentId) continue;
    if (!legacyByAppointment[lp.appointmentId]) legacyByAppointment[lp.appointmentId] = [];
    legacyByAppointment[lp.appointmentId].push(lp);
  }

  // 5. Parcourir chaque appointment
  for (const appDoc of appointmentsSnap.docs) {
    const appData: any = appDoc.data();
    const appointmentId = appDoc.id;

    if (targetCoachOnlyUserId) {
      // Si option restreinte, vérifier si l'utilisateur est impliqué (createdBy ou coachIds)
      const coachIds: string[] = appData.coachIds || [];
      if (appData.createdBy !== targetCoachOnlyUserId && !coachIds.includes(targetCoachOnlyUserId)) {
        continue; // ignorer
      }
    }

    const participantsToEnsure: LegacyParticipantDoc[] = [];

    // Ajouter créateur comme client si absent
    if (appData.createdBy) {
      participantsToEnsure.push({
        id: 'virtual-createdBy-' + appointmentId,
        appointmentId,
        userId: appData.createdBy,
        email: appData.userEmail || '',
        role: 'client',
        status: 'accepted'
      });
    }

    // Ajouter coachIds
    if (Array.isArray(appData.coachIds)) {
      for (const cid of appData.coachIds) {
        participantsToEnsure.push({
          id: 'virtual-coach-' + appointmentId + '-' + cid,
          appointmentId,
          userId: cid,
          role: 'coach',
          status: 'pending'
        });
      }
    }

    // Ajouter invités (emails) si group
    if (Array.isArray(appData.invitedEmails)) {
      for (const email of appData.invitedEmails) {
        participantsToEnsure.push({
          id: 'virtual-invite-' + appointmentId + '-' + email,
            appointmentId,
            email,
            role: 'client',
            status: 'pending'
        });
      }
    }

    // Ajouter legacy déjà existants
    const legacyForThis = legacyByAppointment[appointmentId] || [];
    participantsToEnsure.push(...legacyForThis);

    // Dédupliquer par clé
    const dedup: Record<string, LegacyParticipantDoc> = {};
    for (const p of participantsToEnsure) {
      const k = participantKey(p);
      if (!dedup[k]) dedup[k] = p;
    }

    // Vérifier existence dans la collection normalisée et créer si manquant
    const finalParticipantsIds: Set<string> = new Set();
    const finalCoachIds: Set<string> = new Set(appData.coachIds || []);

    for (const k of Object.keys(dedup)) {
      const p = dedup[k];
      if (p.userId) finalParticipantsIds.add(p.userId);
      if (p.role === 'coach' && p.userId) finalCoachIds.add(p.userId);
      if (existingMap.has(k)) {
        skipped++;
        continue;
      }
      if (dryRun) {
        created++;
        continue; // ne pas écrire
      }
      try {
        await addDoc(collection(firestore, TARGET_COLLECTION), {
          appointmentId,
          userId: p.userId || null,
          email: p.email || '',
          role: p.role || 'client',
          status: p.status || 'pending',
          migratedAt: Timestamp.now(),
        });
        existingMap.add(k);
        created++;
      } catch (e) {
        console.warn('⚠️ MIGRATION - Erreur création participant', appointmentId, p, e);
        errors++;
      }
    }

    // Mettre à jour l'appointment avec participantsIds / coachIds si nécessaire
    const participantsIdsArr = Array.from(finalParticipantsIds);
    const coachIdsArr = Array.from(finalCoachIds);
    const needUpdate = !dryRun && (
      !Array.isArray(appData.participantsIds) ||
      appData.participantsIds.length !== participantsIdsArr.length ||
      !Array.isArray(appData.coachIds) ||
      appData.coachIds.length !== coachIdsArr.length
    );

    if (needUpdate) {
      try {
        await updateDoc(doc(firestore, APPOINTMENTS, appointmentId), {
          participantsIds: participantsIdsArr,
          coachIds: coachIdsArr,
          updatedAt: Timestamp.now(),
        });
        updatedAppointments++;
      } catch (e) {
        console.warn('⚠️ MIGRATION - Erreur update appointment', appointmentId, e);
        errors++;
      }
    }
  }

  const summary = { created, skipped, updatedAppointments, errors, dryRun };
  console.log('✅ MIGRATION - Terminé:', summary);
  return summary;
};

export default { runMigration };
