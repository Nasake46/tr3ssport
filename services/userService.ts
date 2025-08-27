import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  query, 
  where, 
  orderBy,
  updateDoc,
  deleteDoc 
} from 'firebase/firestore';
import { firestore, auth } from '@/firebase';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'coach' | 'user' | 'admin' | 'observer';
  createdAt?: any;
  lastLogin?: any;
  isActive?: boolean;
}

export interface UserStats {
  totalUsers: number;
  totalCoaches: number;
  totalClients: number;
  newUsersThisMonth: number;
  activeUsers: number;
}

export interface Appointment {
  id: string;
  date: any;
  sessionType: string;
  status: string;
  duration?: number;
  description?: string;
  location?: string;
  participants?: Array<{
    id?: string;
    userId?: string;
    email?: string;
    role?: string;
    status?: string;
  }>;
  createdBy?: string;
  coachIds?: string[];
  participantsIds?: string[];
}

// Dérive un statut agrégé à partir du document appointment et des participants.
// Règles:
// - Si status/globalStatus explicite et différent de 'pending' on le garde.
// - Sinon: tous participants accepted => confirmed.
// - Si au moins un declined => cancelled.
// - Sinon pending par défaut.
const deriveAppointmentStatus = (raw: any, participants: any[] | undefined): string => {
  const explicit = raw?.status || raw?.globalStatus;
  if (explicit && explicit !== 'pending') return explicit;
  if (participants && participants.length) {
    const statuses = participants.map(p => (p as any).status).filter(Boolean);
    if (statuses.length) {
      if (statuses.every(s => s === 'accepted')) return 'confirmed';
      if (statuses.some(s => s === 'declined')) return 'cancelled';
    }
  }
  return explicit || 'pending';
};

// Récupérer tous les utilisateurs
export const getAllUsers = async (): Promise<User[]> => {
  try {
    console.log('🔍 USER SERVICE - Récupération de tous les utilisateurs');
    const usersSnapshot = await getDocs(collection(firestore, 'users'));
    const users: User[] = [];
    
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      users.push({
        id: doc.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || 'user',
        createdAt: userData.createdAt,
        lastLogin: userData.lastLogin,
        isActive: userData.isActive !== false, // Par défaut true
      });
    });

    console.log(`✅ USER SERVICE - ${users.length} utilisateurs récupérés`);
    return users;
  } catch (error) {
    console.error('❌ USER SERVICE - Erreur récupération utilisateurs:', error);
    throw error;
  }
};

// Récupérer les utilisateurs par rôle
export const getUsersByRole = async (role: 'coach' | 'user' | 'admin'): Promise<User[]> => {
  try {
    console.log(`🔍 USER SERVICE - Récupération utilisateurs rôle: ${role}`);
    const usersQuery = query(
      collection(firestore, 'users'),
      where('role', '==', role)
    );
    
    const usersSnapshot = await getDocs(usersQuery);
    const users: User[] = [];
    
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      users.push({
        id: doc.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        createdAt: userData.createdAt,
        lastLogin: userData.lastLogin,
        isActive: userData.isActive !== false,
      });
    });

    console.log(`✅ USER SERVICE - ${users.length} utilisateurs ${role} récupérés`);
    return users;
  } catch (error) {
    console.error(`❌ USER SERVICE - Erreur récupération ${role}s:`, error);
    throw error;
  }
};

// Récupérer les statistiques des utilisateurs
export const getUserStats = async (): Promise<UserStats> => {
  try {
    console.log('🔍 USER SERVICE - Calcul des statistiques utilisateurs');
    const users = await getAllUsers();
    
    const totalUsers = users.length;
    const totalCoaches = users.filter(user => user.role === 'coach').length;
    const totalClients = users.filter(user => user.role === 'user').length;
    const activeUsers = users.filter(user => user.isActive).length;
    
    // Utilisateurs créés ce mois-ci
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    
    const newUsersThisMonth = users.filter(user => {
      if (!user.createdAt) return false;
      try {
        const userDate = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
        return userDate >= currentMonth;
      } catch {
        return false;
      }
    }).length;

    const stats: UserStats = {
      totalUsers,
      totalCoaches,
      totalClients,
      newUsersThisMonth,
      activeUsers,
    };

    console.log('✅ USER SERVICE - Statistiques calculées:', stats);
    return stats;
  } catch (error) {
    console.error('❌ USER SERVICE - Erreur calcul statistiques:', error);
    throw error;
  }
};

// Récupérer les rendez-vous d'un utilisateur
export const getUserAppointments = async (
  userId: string, 
  userRole: 'coach' | 'user'
): Promise<Appointment[]> => {
  try {
    console.log(`🔍 USER SERVICE - Récupération RDV pour ${userRole}: ${userId}`);
    
    let appointmentsQuery;
    
    // Nouveau flux: on ne se base plus sur coachId/clientId dans appointments.
    // On fait une seule requête vers appointmentParticipants filtrée par userId, puis hydrate.
    console.log('🔄 USER SERVICE - Nouveau flux getUserAppointments (participants-first)');
    const partSnap = await getDocs(query(
      collection(firestore, 'appointmentParticipants'),
      where('userId', '==', userId)
    ));
    console.log('� USER SERVICE - Participants liés à user:', partSnap.size);
    const appointmentIds: string[] = [];
    partSnap.forEach(p => {
      const d = p.data();
      if (d.appointmentId) appointmentIds.push(d.appointmentId);
    });
    const uniqueIds = Array.from(new Set(appointmentIds));
    console.log('🧮 USER SERVICE - RDV uniques à hydrater:', uniqueIds.length);
      const appointmentsList: Appointment[] = [];
    if (uniqueIds.length) {
      const fetched = await Promise.all(uniqueIds.map(async id => {
        try {
          const aSnap = await getDoc(doc(firestore, 'appointments', id));
          if (!aSnap.exists()) return undefined;
          const data = aSnap.data();
          // Récupérer tous les participants du RDV
          const rdvParticipantsSnap = await getDocs(query(
            collection(firestore, 'appointmentParticipants'),
            where('appointmentId', '==', id)
          ));
          const rdvParticipants: Appointment['participants'] = rdvParticipantsSnap.docs.map(pp => ({ id: pp.id, ...pp.data() } as any));
          return {
            id: aSnap.id,
            date: data.date,
            sessionType: data.sessionType || data.type || 'Non spécifié',
            status: deriveAppointmentStatus(data, rdvParticipants),
            duration: data.duration,
            description: data.description,
            location: data.location,
            participants: rdvParticipants
          } as Appointment;
        } catch (e) {
          console.warn('⚠️ USER SERVICE - Erreur hydratation RDV:', id, e);
          return undefined;
        }
      }));
        appointmentsList.push(...(fetched.filter(Boolean) as Appointment[]));
    }

    // Tri côté client par date décroissante
      appointmentsList.sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });

      console.log(`✅ USER SERVICE - ${appointmentsList.length} RDV récupérés pour ${userId}`);
      return appointmentsList;
  } catch (error) {
    console.error(`❌ USER SERVICE - Erreur récupération RDV pour ${userId}:`, error);
    throw error;
  }
};

// Récupérer tous les rendez-vous d'un utilisateur par son ID (peu importe le rôle)
export const getUserAppointmentsByUserId = async (userId: string): Promise<Appointment[]> => {
  try {
  console.log(`🔍 USER SERVICE - Récupération RDV (participants-first) pour utilisateur ID: ${userId}`);
    const participantSnap = await getDocs(query(
      collection(firestore, 'appointmentParticipants'),
      where('userId', '==', userId)
    ));
  console.log('👥 USER SERVICE - Participants liés à user:', participantSnap.size);
    const ids: string[] = [];
    participantSnap.forEach(p => { const d = p.data(); if (d.appointmentId) ids.push(d.appointmentId); });
    const unique = Array.from(new Set(ids));
    console.log('🧮 USER SERVICE - RDV uniques à hydrater:', unique.length);
  const appointments: Appointment[] = [];
    if (unique.length) {
      const fetched = await Promise.all(unique.map(async id => {
        try {
          const aSnap = await getDoc(doc(firestore, 'appointments', id));
          if (!aSnap.exists()) return undefined;
          const data = aSnap.data();
          const rdvParticipantsSnap = await getDocs(query(
            collection(firestore, 'appointmentParticipants'),
            where('appointmentId', '==', id)
          ));
          const rdvParticipants: Appointment['participants'] = rdvParticipantsSnap.docs.map(pp => ({ id: pp.id, ...pp.data() } as any));
          return {
            id: aSnap.id,
            date: data.date,
            sessionType: data.sessionType || data.type || 'Non spécifié',
            status: deriveAppointmentStatus(data, rdvParticipants),
            duration: data.duration,
            description: data.description,
            location: data.location,
            participants: rdvParticipants
          } as Appointment;
        } catch (e) {
          console.warn('⚠️ USER SERVICE - Erreur hydratation RDV (byUserId):', id, e);
          return undefined;
        }
      }));
  appointments.push(...(fetched.filter(Boolean) as Appointment[]));
    }
  // Tri
  appointments.sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
  console.log(`✅ USER SERVICE - ${appointments.length} RDV trouvés pour ${userId} (participants-first)`);
  return appointments;
  } catch (error) {
    console.error(`❌ USER SERVICE - Erreur récupération RDV pour ${userId}:`, error);
    throw error;
  }
};

// Nouvelle méthode rapide utilisant les champs indexés (createdBy, coachIds, participantsIds)
// selon disponibilité. Fallback sur participants-first.
export const getUserAppointmentsFast = async (userId: string): Promise<Appointment[]> => {
  console.log('⚡ USER SERVICE - getUserAppointmentsFast pour', userId);
  const results: Record<string, Appointment> = {};
  try {
    // 1. RDV créés par l'utilisateur
    try {
      const createdSnap = await getDocs(query(collection(firestore, 'appointments'), where('createdBy', '==', userId)));
      createdSnap.forEach(a => { results[a.id] = { id: a.id, ...(a.data() as any) }; });
      console.log('⚡ Fast - créés par user:', createdSnap.size);
    } catch (e) { console.warn('⚡ Fast - createdBy fail', e); }

    // 2. RDV où il est coach (coachIds array-contains)
    try {
      const coachSnap = await getDocs(query(collection(firestore, 'appointments'), where('coachIds', 'array-contains', userId)));
      coachSnap.forEach(a => { results[a.id] = { id: a.id, ...(a.data() as any) }; });
      console.log('⚡ Fast - coachIds hits:', coachSnap.size);
    } catch (e) { console.warn('⚡ Fast - coachIds fail', e); }

    // 3. RDV où il est listé dans participantsIds (si champ présent et différent du précédent)
    try {
      const partSnap = await getDocs(query(collection(firestore, 'appointments'), where('participantsIds', 'array-contains', userId)));
      partSnap.forEach(a => { results[a.id] = { id: a.id, ...(a.data() as any) }; });
      console.log('⚡ Fast - participantsIds hits:', partSnap.size);
    } catch (e) { console.warn('⚡ Fast - participantsIds fail', e); }

    // Si rien trouvé, fallback participants-first
    const arr = Object.values(results);
    if (!arr.length) {
      console.log('⚡ Fast - Aucun via index, fallback participants-first');
      return getUserAppointmentsByUserId(userId);
    }

    // Hydrater participants pour cohérence UI
    const hydrated: Appointment[] = [];
    for (const app of arr) {
      try {
        const participantsSnap = await getDocs(query(
          collection(firestore, 'appointmentParticipants'),
          where('appointmentId', '==', app.id)
        ));
        const rdvParticipants: Appointment['participants'] = participantsSnap.docs.map(pp => ({ id: pp.id, ...pp.data() } as any));
  hydrated.push({ ...app, participants: rdvParticipants, status: deriveAppointmentStatus(app, rdvParticipants) });
      } catch (e) {
  hydrated.push({ ...app, status: deriveAppointmentStatus(app, (app as any).participants) });
      }
    }

    hydrated.sort((a, b) => {
      const dateA = (a as any).date?.toDate ? (a as any).date.toDate() : new Date((a as any).date);
      const dateB = (b as any).date?.toDate ? (b as any).date.toDate() : new Date((b as any).date);
      return dateB.getTime() - dateA.getTime();
    });
    console.log('✅ USER SERVICE - getUserAppointmentsFast total:', hydrated.length);
    return hydrated;
  } catch (e) {
    console.warn('⚡ USER SERVICE - Fast retrieval erreur, fallback:', e);
    return getUserAppointmentsByUserId(userId);
  }
};

// Récupérer un rendez-vous spécifique par son ID
export const getAppointmentById = async (appointmentId: string): Promise<Appointment | null> => {
  try {
    console.log(`🔍 USER SERVICE - Récupération RDV ID: ${appointmentId}`);
    const appointmentDoc = await getDoc(doc(firestore, 'appointments', appointmentId));
    
    if (!appointmentDoc.exists()) {
      console.log(`❌ USER SERVICE - RDV ${appointmentId} non trouvé`);
      return null;
    }

    const data = appointmentDoc.data();
    const rdvParticipantsSnap = await getDocs(query(
      collection(firestore, 'appointmentParticipants'),
      where('appointmentId', '==', appointmentId)
    ));
    const rdvParticipants: Appointment['participants'] = rdvParticipantsSnap.docs.map(pp => ({ id: pp.id, ...pp.data() } as any));
    const appointment: Appointment = {
      id: appointmentDoc.id,
      date: data.date,
      sessionType: data.sessionType || 'Non spécifié',
      status: deriveAppointmentStatus(data, rdvParticipants),
      duration: data.duration,
      description: data.description,
      location: data.location,
      participants: rdvParticipants
    };

    console.log(`✅ USER SERVICE - RDV ${appointmentId} récupéré`);
    return appointment;
  } catch (error) {
    console.error(`❌ USER SERVICE - Erreur récupération RDV ${appointmentId}:`, error);
    throw error;
  }
};

// Récupérer TOUS les rendez-vous d'un utilisateur (en tant que coach ET client) - DÉPRÉCIÉ
// Utilisez getUserAppointmentsByUserId à la place
export const getAllUserAppointments = async (userId: string): Promise<Appointment[]> => {
  console.warn('⚠️ getAllUserAppointments est déprécié, utilisez getUserAppointmentsByUserId');
  return getUserAppointmentsByUserId(userId);
};

// Récupérer les détails d'un utilisateur
export const getUserDetails = async (userId: string): Promise<User | null> => {
  try {
    console.log(`🔍 USER SERVICE - Récupération détails utilisateur: ${userId}`);
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    
    if (!userDoc.exists()) {
      console.log(`❌ USER SERVICE - Utilisateur ${userId} non trouvé`);
      return null;
    }

    const userData = userDoc.data();
    const user: User = {
      id: userDoc.id,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role || 'user',
      createdAt: userData.createdAt,
      lastLogin: userData.lastLogin,
      isActive: userData.isActive !== false,
    };

    console.log(`✅ USER SERVICE - Détails utilisateur ${userId} récupérés`);
    return user;
  } catch (error) {
    console.error(`❌ USER SERVICE - Erreur récupération détails ${userId}:`, error);
    throw error;
  }
};

// Mettre à jour le statut d'un utilisateur (actif/inactif)
export const updateUserStatus = async (userId: string, isActive: boolean): Promise<void> => {
  try {
    console.log(`🔄 USER SERVICE - Mise à jour statut utilisateur ${userId}: ${isActive ? 'actif' : 'inactif'}`);
    await updateDoc(doc(firestore, 'users', userId), {
      isActive,
      updatedAt: new Date(),
    });
    console.log(`✅ USER SERVICE - Statut utilisateur ${userId} mis à jour`);
  } catch (error) {
    console.error(`❌ USER SERVICE - Erreur mise à jour statut ${userId}:`, error);
    throw error;
  }
};

// Mettre à jour le rôle d'un utilisateur (fonction admin critique)
export const updateUserRole = async (
  userId: string, 
  newRole: 'coach' | 'user' | 'admin'
): Promise<void> => {
  try {
    console.log(`🔄 USER SERVICE - Mise à jour rôle utilisateur ${userId}: ${newRole}`);
    await updateDoc(doc(firestore, 'users', userId), {
      role: newRole,
      updatedAt: new Date(),
    });
    console.log(`✅ USER SERVICE - Rôle utilisateur ${userId} mis à jour vers ${newRole}`);
  } catch (error) {
    console.error(`❌ USER SERVICE - Erreur mise à jour rôle ${userId}:`, error);
    throw error;
  }
};

// Supprimer un utilisateur (fonction admin critique)
export const deleteUser = async (userId: string): Promise<void> => {
  try {
    console.log(`🗑️ USER SERVICE - Suppression utilisateur: ${userId}`);
    
    // Note: En production, il serait mieux de marquer comme supprimé plutôt que de supprimer
    await updateDoc(doc(firestore, 'users', userId), {
      isActive: false,
      deletedAt: new Date(),
      updatedAt: new Date(),
    });
    
    console.log(`✅ USER SERVICE - Utilisateur ${userId} marqué comme supprimé`);
  } catch (error) {
    console.error(`❌ USER SERVICE - Erreur suppression utilisateur ${userId}:`, error);
    throw error;
  }
};

// Rechercher des utilisateurs par terme
export const searchUsers = async (searchTerm: string): Promise<User[]> => {
  try {
    console.log(`🔍 USER SERVICE - Recherche utilisateurs: "${searchTerm}"`);
    
    // Pour l'instant, récupérer tous et filtrer côté client
    // En production, utiliser des solutions comme Algolia pour la recherche avancée
    const allUsers = await getAllUsers();
    
    const searchLower = searchTerm.toLowerCase();
    const filteredUsers = allUsers.filter(user => 
      user.email.toLowerCase().includes(searchLower) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchLower) ||
      (user.firstName && user.firstName.toLowerCase().includes(searchLower)) ||
      (user.lastName && user.lastName.toLowerCase().includes(searchLower))
    );

    console.log(`✅ USER SERVICE - ${filteredUsers.length} utilisateurs trouvés pour "${searchTerm}"`);
    return filteredUsers;
  } catch (error) {
    console.error(`❌ USER SERVICE - Erreur recherche "${searchTerm}":`, error);
    throw error;
  }
};

// Vérifier si un utilisateur est admin
export const isUserAdmin = async (userId: string): Promise<boolean> => {
  try {
    console.log('🔐 USER SERVICE - Début vérification rôle admin pour', userId);

    // 1. Lecture Firestore (détails formatés)
    const user = await getUserDetails(userId);

    // 2. Lecture brute Firestore pour voir le champ exact
    let rawRole: any = undefined;
    let rawData: any = undefined;
    try {
      const snap = await getDoc(doc(firestore, 'users', userId));
      if (snap.exists()) {
        rawData = snap.data();
        rawRole = rawData?.role;
      } else {
        console.log('🔐 USER SERVICE - Document Firestore utilisateur introuvable pour', userId);
      }
    } catch (e) {
      console.warn('🔐 USER SERVICE - Impossible de lire le doc Firestore brut:', e);
    }

    // 3. Claims Auth (custom claims)
    let claimsRole: any = undefined;
    let claimAdminFlag: any = undefined;
    try {
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.uid === userId) {
        const tokenResult = await currentUser.getIdTokenResult(true); // force refresh
        claimsRole = (tokenResult.claims as any)?.role;
        claimAdminFlag = (tokenResult.claims as any)?.admin;
      }
    } catch (e) {
      console.warn('🔐 USER SERVICE - Lecture des custom claims échouée:', e);
    }

    // 4. Normalisation rôle Firestore
    const normalizedRole = rawRole ? String(rawRole).trim().toLowerCase() : (user?.role ? String(user.role).trim().toLowerCase() : 'user');

    // 5. Décision finale (plusieurs sources)
    const isAdmin = normalizedRole === 'admin' || claimsRole === 'admin' || claimAdminFlag === true;
    const decisionSources = {
      normalizedRoleEqualsAdmin: normalizedRole === 'admin',
      claimsRoleEqualsAdmin: claimsRole === 'admin',
      claimAdminFlagTrue: claimAdminFlag === true
    };

    console.log('🔐 USER SERVICE - Diagnostic rôle admin:', {
      userId,
      userServiceRole: user?.role,
      rawRole,
      normalizedRole,
      claimsRole,
      claimAdminFlag,
      decisionSources,
      isAdmin
    });

    return isAdmin;
  } catch (error) {
    console.error(`❌ USER SERVICE - Erreur vérification admin ${userId}:`, error);
    return false;
  }
};

// Vérifier si un utilisateur est admin OU observateur (accès lecture seule admin)
export const isUserAdminOrObserver = async (userId: string): Promise<{ allowed: boolean; role: 'admin' | 'observer' | 'other' }> => {
  try {
    const user = await getUserDetails(userId);
    const normalizedRole = user?.role ? String(user.role).trim().toLowerCase() : 'user';
    if (normalizedRole === 'admin') return { allowed: true, role: 'admin' };
    if (normalizedRole === 'observer') return { allowed: true, role: 'observer' };
    return { allowed: false, role: 'other' };
  } catch {
    return { allowed: false, role: 'other' };
  }
};

// Compter rapidement les RDV liés à un utilisateur (tous rôles confondus) via participants
export const getUserAppointmentCount = async (userId: string): Promise<number> => {
  try {
    const snap = await getDocs(query(
      collection(firestore, 'appointmentParticipants'),
      where('userId', '==', userId)
    ));
    return snap.size;
  } catch (e) {
    console.warn('⚠️ USER SERVICE - Erreur getUserAppointmentCount:', userId, e);
    return 0;
  }
};

// Fonctions utilitaires pour formater les données
export const formatUserName = (user: User): string => {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  return user.email;
};

export const formatDate = (dateData: any): string => {
  if (!dateData) return 'Date inconnue';
  
  try {
    let date;
    if (dateData.toDate) {
      date = dateData.toDate();
    } else if (dateData instanceof Date) {
      date = dateData;
    } else {
      date = new Date(dateData);
    }
    
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return 'Date invalide';
  }
};

export const getRoleDisplayName = (role: string): string => {
  switch (role) {
    case 'coach': return 'Coach';
    case 'user': return 'Client';
    case 'admin': return 'Administrateur';
  case 'observer': return 'Observateur';
    default: return 'Utilisateur';
  }
};

export const getStatusDisplayName = (status: string): string => {
  switch (status) {
    case 'confirmed': return 'Confirmé';
    case 'pending': return 'En attente';
    case 'cancelled': return 'Annulé';
    case 'completed': return 'Terminé';
  case 'accepted': return 'Accepté';
  case 'declined': return 'Refusé';
    default: return 'Inconnu';
  }
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'confirmed': return '#28a745';
    case 'pending': return '#ffc107';
    case 'cancelled': return '#dc3545';
    case 'completed': return '#007AFF';
  case 'accepted': return '#28a745';
  case 'declined': return '#dc3545';
    default: return '#6c757d';
  }
};
