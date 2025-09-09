import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, firestore } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Ionicons, FontAwesome } from '@expo/vector-icons';

export default function CoachHomeScreen() {
  const router = useRouter();
  const [coachData, setCoachData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRouterReady, setIsRouterReady] = useState(false);
  
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
  const fetchCoachData = async () => {
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
  };

  useEffect(() => {
    fetchCoachData();
  }, [router]);

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
          <TouchableOpacity style={styles.menuButton}>
            <View style={styles.iconCircle}>
              <Ionicons name="people" size={24} color="#fff"/>
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
          {/* Modifier ma page (ouvre profilCoach en mode édition) */}
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() =>
              router.push({ pathname: '/(tabs)/profilCoach', params: { edit: '1' } } as any)
            }
          >
            <View className="icon" style={styles.iconCircle}>
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

          
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => router.push('/qr-scanner' as any)}
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
        </View>

                 {/* Menu secondaire avec rendez-vous + créer séance */}
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


const COLORS = {
  oxford: '#121631',   // bleu foncé
  bone:   '#E1DDCC',   // beige
  };
const styles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: "#FFFFFF" },
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
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.oxford },
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
   width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.oxford,
   borderWidth: 1,
   borderColor: 'rgba(255,255,255,0.18)',
   justifyContent: 'center',
   alignItems: 'center',
   marginBottom: 8,
 },
  menuText: {
    fontSize: 12,
    color: COLORS.oxford,
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
  profileName: { marginTop: 4, fontSize: 12, fontWeight: '600', color: '#7667ac', textAlign: 'center' },

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
    backgroundColor: COLORS.bone,
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
    backgroundColor: COLORS.oxford,
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
    color: '#fff',
    textAlign: 'center',
    fontWeight: '500',
  },
});