import { addDoc, collection, deleteDoc, doc, getDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { auth, firestore } from '@/firebase';

export type BanRecord = {
  id?: string;
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  roleAtBan?: string;
  reason: string;
  bannedBy: string; // admin uid
  bannedByEmail?: string;
  bannedAt: any; // Timestamp
};

/**
 * Ban a user:
 * - Read user doc to capture info
 * - Write a record into `bans` collection
 * - Delete the user document from `users/{uid}`
 * Note: Deleting the Firebase Auth account requires Admin SDK (server). Not handled here.
 */
export async function banUser(userId: string, reason: string): Promise<BanRecord> {
  if (!auth.currentUser) throw new Error('Non authentifié');
  const adminUid = auth.currentUser.uid;
  const adminEmail = auth.currentUser.email || undefined;

  // Fetch user doc
  const userRef = doc(firestore, 'users', userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    throw new Error('Utilisateur introuvable');
  }
  const u = snap.data() as any;

  const record: Omit<BanRecord, 'bannedAt'> & { bannedAt: any } = {
    userId,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    roleAtBan: u.role,
    reason,
    bannedBy: adminUid,
    bannedByEmail: adminEmail,
    bannedAt: serverTimestamp(),
  };

  // Write ban record
  const created = await addDoc(collection(firestore, 'bans'), record as any);

  // Delete user document
  await deleteDoc(userRef);

  return { id: created.id, ...(record as BanRecord) };
}

export async function getAllBans(): Promise<BanRecord[]> {
  const snap = await getDocs(collection(firestore, 'bans'));
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
}
