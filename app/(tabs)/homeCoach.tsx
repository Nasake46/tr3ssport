import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
// Remplacer alias pour compat
import { auth, firestore } from '../../firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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

  useEffect(() => {
    // Attendre que le router soit prêt
    const timer = setTimeout(() => {
      setIsRouterReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const navigateToPage = (path: string) => {
    if (!isRouterReady) {
      setTimeout(() => navigateToPage(path), 100);
      return;
    }
    try {
      router.push(path as any);
    } catch (error) {
      console.error('Erreur de navigation:', error);
    }
  };

  // Récupérer les données du coach
  const fetchCoachData = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace('/(tabs)');
        return;
      }        
      
      console.log('🔄 COACH HOME - Récupération données utilisateur:', user.uid);
      const userDoc = await getDoc(doc(firestore, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('📋 COACH HOME - Données utilisateur:', userData);
        console.log('🎭 COACH HOME - Rôle utilisateur:', userData.role);
        
        if (userData.role !== 'coach' && userData.role !== 'admin') {
          router.replace('/(tabs)');
          return;
        }
        setCoachData(userData);
        // Vérifier si l'utilisateur est admin
        setIsAdmin(userData.role === 'admin');
        console.log('🔐 COACH HOME - Est admin:', userData.role === 'admin');
      } else {
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error("❌ COACH HOME - Erreur lors de la récupération des données:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchCoachData();
  }, [fetchCoachData]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/(tabs)');
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
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
          <TouchableOpacity onPress={() => router.push('/(tabs)/profilCoach')}>
            <View style={styles.profileCircle}>
              <Text style={styles.profileText}>Coach 1</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Menus principaux */}
        <View style={styles.menuContainer}>
          {/* Bouton Séance active retiré */}
          
          <TouchableOpacity style={styles.menuButton}>
            <View style={styles.iconCircle}>
              <Ionicons name="people" size={24} color="#7667ac" />
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
            onPress={() => router.push('/simple-stop-test' as any)}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="stop-circle" size={24} color="#e74c3c" />
            </View>
            <Text style={styles.menuText}>Test Stop Simple</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => router.push('/debug-end-session' as any)}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="bug" size={24} color="#e74c3c" />
            </View>
            <Text style={styles.menuText}>Debug Session</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => router.push('/test-services' as any)}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="flask" size={24} color="#f39c12" />
            </View>
            <Text style={styles.menuText}>Test Services</Text>
          </TouchableOpacity>
          
          {/* Bouton Admin - visible uniquement pour les admins */}
          {isAdmin && (
            <TouchableOpacity 
              style={styles.menuButton}
              onPress={() => navigateToPage('/admin-dashboard')}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#ff6b6b' }]}>
                <Ionicons name="shield-checkmark" size={24} color="#fff" />
              </View>
              <Text style={styles.menuText}>Admin</Text>
            </TouchableOpacity>
          )}
          
          {/* Utilitaire Setup Admin - temporaire pour tests */}
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => navigateToPage('/admin-setup')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#ffc107' }]}>
              <Ionicons name="settings" size={24} color="#fff" />
            </View>
            <Text style={styles.menuText}>Setup Admin</Text>
          </TouchableOpacity>

          {/* Bouton Refresh - pour recharger les données */}
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

        {/* Menu secondaire avec rendez-vous */}
        <View style={styles.secondaryMenuContainer}>
          <TouchableOpacity 
            style={styles.appointmentButton}
            onPress={() => router.push('/coachDashboard')}
          >
            <View style={styles.appointmentIconCircle}>
              <Ionicons name="calendar-outline" size={24} color="#7667ac" />
            </View>
            <Text style={styles.appointmentText}>Mes rendez-vous</Text>
          </TouchableOpacity>
        </View>

        {/* Alertes */}
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.alertsContainer}>          
          <View style={styles.alertBox}>
            <View style={styles.alertTextContainer}>
              <Text style={styles.alertText}>
                Bienvenue dans votre espace coach
              </Text>
              <Ionicons name="checkmark-circle" size={16} color="green" style={styles.alertIcon} />
            </View>
          </View>
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

        {/* Voir séances de la semaine */}
        <TouchableOpacity style={styles.weeklySessionsButton}>
          <View style={styles.weeklySessionsContent}>
            <Text style={styles.weeklySessionsText}>Voir mes clients de la semaine</Text>
            <Text style={styles.weeklySessionsCount}>Vous suivez 12 clients cette semaine</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#7667ac" />
        </TouchableOpacity>

        {/* Avis et recommendations */}
        <Text style={styles.sectionTitle}>Avis et recommandations</Text>
        <View style={styles.reviewsContainer}>
          <View style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <View style={styles.reviewerCircle}>
                <Text style={styles.reviewerInitial}>J</Text>
              </View>
              <Text style={styles.reviewerName}>Johanna</Text>
              <View style={styles.starsContainer}>
                {[...Array(5)].map((_, i) => (
                  <FontAwesome key={i} name="star" size={12} color="#7667ac" />
                ))}
              </View>
            </View>
            <Text style={styles.reviewText}>Lorem ipsum dolor sit amet, consectetur adipiscing elit mattis</Text>
          </View>
          
          <View style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <View style={styles.reviewerCircle}>
                <Text style={styles.reviewerInitial}>G</Text>
              </View>
              <Text style={styles.reviewerName}>Grégoire</Text>
              <View style={styles.starsContainer}>
                {[...Array(3)].map((_, i) => (
                  <FontAwesome key={i} name="star" size={12} color="#7667ac" />
                ))}
                {[...Array(2)].map((_, i) => (
                  <FontAwesome key={i} name="star-o" size={12} color="#7667ac" />
                ))}
              </View>
            </View>
            <Text style={styles.reviewText}>Lorem ipsum dolor sit amet, consectetur adipiscing elit mattis</Text>
          </View>
        </View>

        {/* Statistiques */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statTitle}>Séances assurés</Text>
            <Text style={styles.statValue}>56</Text>
            <Text style={styles.statSubValue}>+15% cette semaine</Text>
          </View>
          
          <View style={styles.statBox}>
            <Text style={styles.statTitle}>Avis moyen</Text>
            <Text style={styles.statValue}>4.8</Text>
            <View style={styles.statStars}>
              {[...Array(5)].map((_, i) => (
                <FontAwesome 
                  key={i} 
                  name={i < 4 ? "star" : i === 4 ? "star-half-o" : "star-o"} 
                  size={16} 
                  color="#7667ac" 
                />
              ))}
            </View>
          </View>
        </View>

        {/* Partenaires de santé */}
        <View style={styles.partnersSection}>
          <Text style={styles.sectionTitle}>Partenaires de santé</Text>
          <View style={styles.partnersIcon}>
            <Ionicons name="fitness" size={24} color="#7667ac" />
          </View>
        </View>

        {/* Bouton de déconnexion - en bas de page pour faciliter l'accès */}
        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: "#F5F5F8",
  },
  container: {
    flex: 1,
    padding: 16,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#7667ac',
  },
  profileCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F0F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    fontSize: 12,
    color: '#7667ac',
  },
  menuContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  menuButton: {
    alignItems: 'center',
    width: '22%',
    marginBottom: 10,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F0F5',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuText: {
    fontSize: 12,
    color: '#7667ac',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7667ac',
    marginTop: 20,
    marginBottom: 10,
  },
  alertsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  alertBox: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    alignItems: 'center',
  },
  alertText: {
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
  },
  alertTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertIcon: {
    marginLeft: 8,
  },
  viewButton: {
    backgroundColor: '#7667ac',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  viewButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  sessionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  sessionCard: {
    backgroundColor: '#F0F0F5',
    borderRadius: 10,
    padding: 10,
    width: '32%',
    alignItems: 'center',
  },
  sessionImagePlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: '#E0E0E5',
    borderRadius: 8,
    marginBottom: 5,
  },
  clientName: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  sessionTime: {
    fontSize: 10,
    color: '#666',
  },
  weeklySessionsButton: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  weeklySessionsContent: {
    flex: 1,
  },
  weeklySessionsText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#7667ac',
  },
  weeklySessionsCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  reviewsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },
  reviewCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewerCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0F0F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  reviewerInitial: {
    fontSize: 12,
    color: '#7667ac',
  },
  reviewerName: {
    fontSize: 12,
    flex: 1,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  reviewText: {
    fontSize: 11,
    color: '#666',
    lineHeight: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F0F0F5',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  statTitle: {
    fontSize: 14,
    color: '#7667ac',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7667ac',
  },
  statSubValue: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 5,
  },
  statStars: {
    flexDirection: 'row',
    marginTop: 5,
  },
  partnersSection: {
    marginTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  partnersIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: '#ff6347',
    marginTop: 30,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutText: {
    color: 'white',
    fontWeight: 'bold',
  },
  secondaryMenuContainer: {
    alignItems: 'center',
    marginVertical: 15,
  },
  appointmentButton: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  appointmentIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F0F5',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  appointmentText: {
    fontSize: 13,
    color: '#7667ac',
    textAlign: 'center',
    fontWeight: '500',
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