
import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, Modal, TextInput } from 'react-native';

import { useRouter } from 'expo-router';
// Remplacer alias pour compat
import { auth, firestore } from '../../firebase';
import { signOut } from 'firebase/auth';
import {
  onSnapshot,
  limit as fbLimit,
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  getCountFromServer,
  Timestamp,
} from 'firebase/firestore';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import QRCodeScannerOptimized from '@/components/qr/QRCodeScannerOptimized';

export default function CoachHomeScreen() {
  const router = useRouter();
  const [coachData, setCoachData] = useState<any>(null); // conservé pour future utilisation affichage
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRouterReady, setIsRouterReady] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showOpenAttendanceById, setShowOpenAttendanceById] = useState(false);
  const [appointmentIdInput, setAppointmentIdInput] = useState('');

  type AppointmentLite = {
    id: string;
    sessionType?: string;
    location?: string;
    date?: any;           // Firestore Timestamp
    createdBy?: string;   // uid
    userEmail?: string;
    createdAt?: any;
  };
  const [pendingReqs, setPendingReqs] = useState<AppointmentLite[]>([]);
  const [pendingErr, setPendingErr] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsRouterReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  type Review = { id: string; rating: number; comment: string; authorName: string; createdAt?: any };
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [avg, setAvg] = useState<string>('—');

  const [stats, setStats] = useState<{ week: number; month: number }>({ week: 0, month: 0 });

  // --- Helpers dates (semaine Lundi->Dimanche) ---
  const startOfWeek = (d = new Date()) => {
    const x = new Date(d);
    const day = (x.getDay() + 6) % 7; // 0 = lundi
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - day);
    return x;
  };
  const endOfWeek = (d = new Date()) => {
    const s = startOfWeek(d);
    const e = new Date(s);
    e.setDate(s.getDate() + 7);
    return e;
  };
  const startOfMonth = (d = new Date()) => {
    const x = new Date(d.getFullYear(), d.getMonth(), 1);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const endOfMonth = (d = new Date()) => {
    const x = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  const loadMyReviews = async (coachUid: string) => {
    try {
      const qReviews = query(
        collection(firestore, 'coachReviews'),
        where('coachId', '==', coachUid),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(qReviews);
      const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setMyReviews(list);
      setAvg(list.length ? (list.reduce((s, r) => s + (r.rating || 0), 0) / list.length).toFixed(1) : '—');
    } catch (e) {
      console.log('loadMyReviews error', e);
    }
  };

  // Fallback de comptage si index manquant
  const safeCount = async (qRef: any) => {
    try {
      const snap = await getCountFromServer(qRef);
      return snap.data().count;
    } catch (e: any) {
      if (e?.code === 'failed-precondition') {
        // index composite pas encore créé -> fallback one-shot
        const docs = await getDocs(qRef);
        return docs.size;
      }
      throw e;
    }
  };

  const loadStats = async (coachUid: string) => {
    try {
      const weekStart = Timestamp.fromDate(startOfWeek());
      const weekEnd = Timestamp.fromDate(endOfWeek());
      const monthStart = Timestamp.fromDate(startOfMonth());
      const monthEnd = Timestamp.fromDate(endOfMonth());

      const base = collection(firestore, 'appointments');

      const qWeek = query(
        base,
        where('coachIds', 'array-contains', coachUid),
        where('sessionStartedAt', '>=', weekStart),
        where('sessionStartedAt', '<', weekEnd)
      );

      const qMonth = query(
        base,
        where('coachIds', 'array-contains', coachUid),
        where('sessionStartedAt', '>=', monthStart),
        where('sessionStartedAt', '<', monthEnd)
      );

      const [cWeek, cMonth] = await Promise.all([safeCount(qWeek), safeCount(qMonth)]);
      setStats({ week: cWeek, month: cMonth });
    } catch (e) {
      console.log('loadStats error', e);
      // Fallback silencieux (on garde la dernière valeur connue)
      setStats(s => s);
    }
  };

  const navigateToPage = (path: string) => {
    if (!isRouterReady) {
      setTimeout(() => navigateToPage(path), 100);
      return;
    }
    try { router.push(path as any); } catch (error) { console.error('Erreur de navigation:', error); }
  };

  const fetchCoachData = useCallback(async () => {

    try {
      const user = auth.currentUser;
      if (!user) { router.replace('/(tabs)'); return; }
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = (userData.role || '').toLowerCase();
        if (role !== 'coach' && role !== 'admin') { router.replace('/(tabs)'); return; }
        setCoachData(userData);
        const admin = role === 'admin';
        setIsAdmin(admin);
        await Promise.all([loadMyReviews(user.uid), loadStats(user.uid)]);
      } else {
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('❌ COACH HOME - Erreur lors de la récupération des données:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Abonnement en temps réel aux demandes en attente
  useEffect(() => {
    fetchCoachData();
  }, [fetchCoachData]);

    const user = auth.currentUser;
    if (!user) return;
    const coachUid = user.uid;

    const base = collection(firestore, 'appointments');
    const qLive = query(
      base,
      where('coachIds', 'array-contains', coachUid),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc'),
      fbLimit(25)
    );

    const unsub = onSnapshot(
      qLive,
      (snap) => {
        setPendingErr(null);
        setPendingReqs(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
      },
      async (err) => {
        console.warn('Notifications pending onSnapshot error', err);
        setPendingErr('Index en cours de création…');

        // Fallback sans orderBy
        try {
          const qFallback = query(
            base,
            where('coachIds', 'array-contains', coachUid),
            where('status', '==', 'pending')
          );
          const s2 = await getDocs(qFallback);
          setPendingReqs(s2.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
        } catch (e) {
          console.error('Fallback pending fetch error', e);
        }
      }
    );

    return () => unsub();
  }, [router]);

  useEffect(() => { fetchCoachData(); }, [router]);

  const handleLogout = async () => {
    try { await signOut(auth); router.replace('/(tabs)'); }
    catch (error) { console.error('Erreur lors de la déconnexion:', error); }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        {/* En-tête */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mon tableau de bord</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profilCoach')} style={{ alignItems: 'center' }}>
            <View style={styles.profileCircle}>
              <Text style={styles.profileText}>
                {(coachData?.firstName?.[0] ?? 'C') + (coachData?.lastName?.[0] ?? '')}
              </Text>
            </View>
            <Text style={styles.profileName}>
              {`${coachData?.firstName ?? ''} ${coachData?.lastName ?? ''}`.trim() || 'Coach'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Menus principaux */}
        <View style={styles.menuContainer}>

          {/* Bouton Séance active retiré */}
          
          <TouchableOpacity style={styles.menuButton}>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => router.push('/ClientsScreen' as any)}
          >

            <View style={styles.iconCircle}>
              <Ionicons name="people" size={24} color="#fff" />
            </View>
            <Text style={styles.menuText}>Mes clients</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuButton}>
            <View style={styles.iconCircle}>
              <Ionicons name="stats-chart" size={24} color="#7667ac" />
            </View>
            <Text style={styles.menuText}>Statistiques</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuButton}>
            <View style={styles.iconCircle}>
              <Ionicons name="document-text" size={24} color="#7667ac" />
            </View>
            <Text style={styles.menuText}>Mes documents</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => setShowScanner(true)}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="qr-code" size={24} color="#7667ac" />
            </View>
            <Text style={styles.menuText}>Scanner QR</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => router.push({ pathname: '../EditCoachScreen', params: { edit: '1' } } as any)}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="create-outline" size={24} color="#7667ac" />
            </View>
            <Text style={styles.menuText}>Modifier ma page</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuButton} onPress={() => router.push('/messaging' as any)}>
            <View style={styles.iconCircle}>
              <Ionicons name="chatbubbles-outline" size={24} color="#fff" />
            </View>
            <Text style={styles.menuText}>Messages</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuButton} onPress={() => router.push('/qr-scanner' as any)}>
            <View style={styles.iconCircle}>
              <Ionicons name="qr-code" size={24} color="#7667ac" />
            </View>
            <Text style={styles.menuText}>Scanner QR</Text>
          </TouchableOpacity>

          {/* ===== Admin only ===== */}
          {isAdmin && (
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => navigateToPage('/pay-coach')}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#0E6B5A' }]}>
                <Ionicons name="card" size={24} color="#fff" />
              </View>
              <Text style={styles.menuText}>Rémunérer un coach</Text>
            </TouchableOpacity>
          )}

          {isAdmin && (
            <TouchableOpacity style={styles.menuButton} onPress={() => router.push('/simple-stop-test' as any)}>
              <View style={styles.iconCircle}>
                <Ionicons name="stop-circle" size={24} color="#e74c3c" />
              </View>
              <Text style={styles.menuText}>Test Stop Simple</Text>
            </TouchableOpacity>
          )}

          {isAdmin && (
            <TouchableOpacity style={styles.menuButton} onPress={() => router.push('/debug-end-session' as any)}>
              <View style={styles.iconCircle}>
                <Ionicons name="bug" size={24} color="#e74c3c" />
              </View>
              <Text style={styles.menuText}>Debug Session</Text>
            </TouchableOpacity>
          )}

          {isAdmin && (
            <TouchableOpacity style={styles.menuButton} onPress={() => router.push('/test-services' as any)}>
              <View style={styles.iconCircle}>
                <Ionicons name="flask" size={24} color="#f39c12" />
              </View>
              <Text style={styles.menuText}>Test Services</Text>
            </TouchableOpacity>
          )}

          {isAdmin && (
            <TouchableOpacity style={styles.menuButton} onPress={() => navigateToPage('/admin-dashboard')}>
              <View style={[styles.iconCircle, { backgroundColor: '#ff6b6b' }]}>
                <Ionicons name="shield-checkmark" size={24} color="#fff" />
              </View>
              <Text style={styles.menuText}>Admin</Text>
            </TouchableOpacity>
          )}

          {isAdmin && (
            <TouchableOpacity style={styles.menuButton} onPress={() => navigateToPage('/admin-setup')}>
              <View style={[styles.iconCircle, { backgroundColor: '#ffc107' }]}>
                <Ionicons name="settings" size={24} color="#fff" />
              </View>
              <Text style={styles.menuText}>Setup Admin</Text>
            </TouchableOpacity>
          )}
          {/* ====================== */}

          {/* Refresh */}
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => {
              setLoading(true);
              fetchCoachData();
            }}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#17a2b8' }]}>
              <Ionicons name="refresh" size={24} color="#fff" />
            </View>
            <Text style={styles.menuText}>Rafraîchir</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuButton} onPress={() => router.push('/pastSessions' as any)}>
            <View style={styles.iconCircle}>
              <Ionicons name="time" size={24} color="#7667ac" />
            </View>
            <Text style={styles.menuText}>Séances passées</Text>
          </TouchableOpacity>
          {/* Lien vers la page d'assiduité sans ID (affiche l'état vide + scan) */}
          <TouchableOpacity style={styles.menuButton} onPress={() => router.push('/sessionAttendance' as any)}>
            <View style={styles.iconCircle}>
              <Ionicons name="list" size={24} color="#7667ac" />
            </View>
            <Text style={styles.menuText}>Assiduité</Text>
          </TouchableOpacity>

          {/* Ouvrir assiduité par ID */}
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => setShowOpenAttendanceById(true)}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="key" size={24} color="#7667ac" />
            </View>
            <Text style={styles.menuText}>Assiduité par ID</Text>
          </TouchableOpacity>
        </View>

        {/* Menu secondaire */}
        <View style={[styles.secondaryMenuContainer, { flexDirection: 'row', gap: 12 }]}>
          <TouchableOpacity
            style={[styles.appointmentButton, { flex: 1 }]}
            onPress={() => router.push('/coachDashboard')}
          >
            <View style={styles.appointmentIconCircle}>
              <Ionicons name="calendar-outline" size={24} color="#7667ac" />
            </View>
            <Text style={styles.appointmentText}>Mes rendez-vous</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.appointmentButton, { flex: 1 }]}
            onPress={() => router.push('/appointments/create')}
          >
            <View style={styles.appointmentIconCircle}>
              <Ionicons name="add-circle-outline" size={24} color="#0E6B5A" />
            </View>
            <Text style={styles.appointmentText}>Créer une séance</Text>
          </TouchableOpacity>
        </View>


        {/* Séances du jour */}
        <Text style={styles.sectionTitle}>Mes clients du jour</Text>
        <View style={styles.sessionsContainer}>

              {/* Modal Scanner: ouvre la caméra directement sans changer de page */}
              <Modal
                visible={showScanner}
                animationType="none"
                onRequestClose={() => setShowScanner(false)}
              >
                <View style={{ flex: 1, backgroundColor: '#000' }}>
                  <QRCodeScannerOptimized
                    coachId={auth.currentUser?.uid || ''}
                    mode="scanOnly"
                    autoOpenCamera
                    onClose={() => setShowScanner(false)}
                    onParticipantScanned={(res: any) => {
                      if (res?.appointmentId) {
                        setShowScanner(false);
                        router.replace({ pathname: '/sessionAttendance/[appointmentId]', params: { appointmentId: res.appointmentId } } as any);
                      }
                    }}
                    onSessionStarted={(appointmentId: string) => {
                      setShowScanner(false);
                      router.replace({ pathname: '/sessionAttendance/[appointmentId]', params: { appointmentId } } as any);
                    }}
                  />
                </View>
              </Modal>
              {/* Modal pour ouvrir /sessionAttendance/[appointmentId] depuis un ID saisi */}
              <Modal
                visible={showOpenAttendanceById}
                transparent
                animationType="fade"
                onRequestClose={() => setShowOpenAttendanceById(false)}
              >
                <View style={styles.modalBackdrop}>
                  <View style={styles.modalCard}>
                    <Text style={styles.modalTitle}>Ouvrir l'assiduité</Text>
                    <Text style={styles.modalSubtitle}>Saisissez l'identifiant de la séance</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="appointmentId"
                      value={appointmentIdInput}
                      onChangeText={setAppointmentIdInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.modalButtonSecondary]}
                        onPress={() => {
                          setShowOpenAttendanceById(false);
                          setAppointmentIdInput('');
                        }}
                      >
                        <Text style={styles.modalButtonTextSecondary}>Annuler</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.modalButtonPrimary, !appointmentIdInput.trim() && { opacity: 0.5 }]}
                        disabled={!appointmentIdInput.trim()}
                        onPress={() => {
                          const id = appointmentIdInput.trim();
                          if (!id) return;
                          setShowOpenAttendanceById(false);
                          setAppointmentIdInput('');
                          router.push({ pathname: '/sessionAttendance/[appointmentId]', params: { appointmentId: id } } as any);
                        }}
                      >
                        <Text style={styles.modalButtonTextPrimary}>Ouvrir</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
          <View style={styles.sessionCard}>
            <View style={styles.sessionImagePlaceholder}></View>
            <Text style={styles.clientName}>Client 1</Text>
            <Text style={styles.sessionTime}>Programme personnalisé</Text>
          </View>
          
          <View style={styles.sessionCard}>
            <View style={styles.sessionImagePlaceholder}></View>
            <Text style={styles.clientName}>Client 3</Text>
            <Text style={styles.sessionTime}>Suivi progression</Text>
          </View>
          
          <View style={styles.sessionCard}>
            <View style={styles.sessionImagePlaceholder}></View>
            <Text style={styles.clientName}>Client 6</Text>
            <Text style={styles.sessionTime}>Conseil nutrition</Text>
          </View>
        </View>

        {/* Notifications */}
        <Text style={styles.sectionTitle}>Notifications</Text>


        {pendingReqs.length > 0 ? (
          <View style={{ gap: 10 }}>
            {pendingReqs.map((r) => {
              const when = (() => {
                try {
                  const d = r.date?.toDate ? r.date.toDate() : null;
                  return d
                    ? `${d.toLocaleDateString('fr-FR')} • ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                    : '';
                } catch { return ''; }
              })();

              return (
                <TouchableOpacity
                  key={r.id}
                  style={styles.alertBox}
                  onPress={() => navigateToPage(`/appointments/manage/${r.id}`)}
                >
                  <View style={styles.alertTextContainer}>
                    <Text style={[styles.alertText, { fontWeight: '700', marginBottom: 4 }]}>
                      Demande de séance en attente
                    </Text>
                  </View>
                  <Text style={{ color: '#667085' }}>
                    {r.sessionType || 'Séance'} • {r.location || 'Lieu à préciser'}
                  </Text>
                  {!!when && <Text style={{ color: '#667085', marginTop: 2 }}>{when}</Text>}
                  {!!r.userEmail && <Text style={{ color: '#999', marginTop: 2 }}>{r.userEmail}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.alertsContainer}>
            <View style={styles.alertBox}>
              <View style={styles.alertTextContainer}>
                <Text style={styles.alertText}>Bienvenue dans votre espace coach</Text>
                <Ionicons name="checkmark-circle" size={16} color="green" style={styles.alertIcon} />
              </View>
              {!!pendingErr && (
                <Text style={{ color: '#999', marginTop: 6, fontStyle: 'italic' }}>
                  {pendingErr}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Avis et recommandations */}
        <Text style={styles.sectionTitle}>Avis et recommandations</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="star" size={18} color="#f5a623" />
          <Text style={{ marginLeft: 6, fontWeight: '700', color: COLORS.oxford }}>{avg} / 5</Text>
          <Text style={{ marginLeft: 6, color: '#667085' }}>({myReviews.length} avis)</Text>
        </View>

        {myReviews.length === 0 ? (
          <Text style={{ color: '#667085', marginBottom: 10 }}>Pas encore d’avis.</Text>
        ) : (
          <View style={styles.reviewsContainer}>
            {myReviews.slice(0, 4).map(r => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerCircle}>
                    <Text style={styles.reviewerInitial}>
                      {(r.authorName || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.reviewerName}>{r.authorName || 'Utilisateur'}</Text>
                  <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <FontAwesome
                        key={n}
                        name={n <= (r.rating || 0) ? 'star' : 'star-o'}
                        size={12}
                        color="#f5a623"
                      />
                    ))}
                  </View>
                </View>
                <Text style={styles.reviewText}>{r.comment}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Partenaires de santé */}
        <View style={styles.partnersSection}>
          <Text style={styles.sectionTitle}>Partenaires de santé</Text>
          <View style={styles.partnersIcon}>
            <Ionicons name="fitness" size={24} color="#7667ac" />
          </View>
        </View>

        {/* Déconnexion */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const COLORS = {
  oxford: '#121631',
  bone: '#E1DDCC',
};

const styles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, padding: 16, paddingBottom: 30 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.oxford },
  profileCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F0F0F5', justifyContent: 'center', alignItems: 'center' },
  profileText: { fontSize: 12, color: '#7667ac' },
  menuContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginVertical: 20 },
  menuButton: { alignItems: 'center', width: '22%', marginBottom: 10 },
  iconCircle: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.oxford,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  menuText: { fontSize: 12, color: COLORS.oxford, textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#7667ac', marginTop: 20, marginBottom: 10 },
  alertsContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  profileName: { marginTop: 4, fontSize: 12, fontWeight: '600', color: '#7667ac', textAlign: 'center' },
  alertBox: {
    flex: 1, backgroundColor: 'white', borderRadius: 10, padding: 15,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, alignItems: 'center',
  },
  alertText: { fontSize: 14, marginBottom: 15, textAlign: 'center' },
  alertTextContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  alertIcon: { marginLeft: 8 },
  sessionsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  sessionCard: { backgroundColor: '#F0F0F5', borderRadius: 10, padding: 10, width: '32%', alignItems: 'center' },
  sessionImagePlaceholder: { width: 60, height: 60, backgroundColor: '#E0E0E5', borderRadius: 8, marginBottom: 5 },
  clientName: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
  sessionTime: { fontSize: 10, color: '#666' },
  weeklySessionsButton: {
    backgroundColor: COLORS.bone, borderRadius: 10, padding: 15, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', marginVertical: 10, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1,
  },
  weeklySessionsContent: { flex: 1 },
  weeklySessionsText: { fontSize: 15, fontWeight: '500', color: '#7667ac' },
  weeklySessionsCount: { fontSize: 12, color: '#666', marginTop: 4 },
  reviewsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, gap: 10 },
  reviewCard: {
    flex: 1, backgroundColor: 'white', padding: 15, borderRadius: 10,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  reviewerCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F0F0F5', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  reviewerInitial: { fontSize: 12, color: '#7667ac' },
  reviewerName: { fontSize: 12, flex: 1 },
  starsContainer: { flexDirection: 'row' },
  reviewText: { fontSize: 11, color: '#666', lineHeight: 16 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10, gap: 10, flexWrap: 'wrap' },
  statBox: { flexBasis: '32%', backgroundColor: '#F0F0F5', padding: 15, borderRadius: 10, alignItems: 'center' },
  statTitle: { fontSize: 14, color: '#7667ac', marginBottom: 10, textAlign: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#7667ac' },
  statSubValue: { fontSize: 12, color: '#666', marginTop: 5, textAlign: 'center' },
  statStars: { flexDirection: 'row', marginTop: 5 },
  partnersSection: { marginTop: 15, flexDirection: 'row', justifyContent: 'space-between' },
  partnersIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F0F5', justifyContent: 'center', alignItems: 'center' },
  logoutButton: { backgroundColor: '#ff6347', marginTop: 30, padding: 15, borderRadius: 10, alignItems: 'center' },
  logoutText: { color: 'white', fontWeight: 'bold' },
  secondaryMenuContainer: { alignItems: 'center', marginVertical: 15 },
  appointmentButton: {
    alignItems: 'center', backgroundColor: COLORS.oxford, borderRadius: 15, padding: 15, minWidth: 140,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3,
  },
  appointmentIconCircle: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: '#F0F0F5', borderWidth: 1, borderColor: '#E5E5EA',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },

  // Modal styles for opening attendance by ID
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  modalSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#666',
  },
  modalInput: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  modalActions: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalButtonSecondary: {
    backgroundColor: '#f0f0f0',
  },
  modalButtonPrimary: {
    backgroundColor: '#007AFF',
  },
  modalButtonTextSecondary: {
    color: '#333',
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    color: '#fff',
    fontWeight: '700',
  },
});
  appointmentText: { fontSize: 13, color: '#fff', textAlign: 'center', fontWeight: '500' },
});

