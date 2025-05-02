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

  useEffect(() => {
    // Récupérer les données du coach
    const fetchCoachData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          router.replace('/(tabs)');
          return;
        }

        const userDoc = await getDoc(doc(firestore, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role !== 'coach') {
            router.replace('/(tabs)');
            return;
          }
          setCoachData(userData);
        } else {
          router.replace('/(tabs)');
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des données:", error);
      } finally {
        setLoading(false);
      }
    };

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
          <View style={styles.profileCircle}>
            <Text style={styles.profileText}>Coach 1</Text>
          </View>
        </View>

        {/* Menus principaux */}
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuButton}>
            <View style={styles.iconCircle}>
              <Ionicons name="people" size={24} color="#7667ac" />
            </View>
            <Text style={styles.menuText}>Mes clients</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuButton}>
            <View style={styles.iconCircle}>
              <Ionicons name="calendar" size={24} color="#7667ac" />
            </View>
            <Text style={styles.menuText}>Mon Planning</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuButton}>
            <View style={styles.iconCircle}>
              <Ionicons name="document-text" size={24} color="#7667ac" />
            </View>
            <Text style={styles.menuText}>Mes documents</Text>
          </TouchableOpacity>
        </View>

        {/* Alertes */}
        <Text style={styles.sectionTitle}>Alertes</Text>
        <View style={styles.alertsContainer}>
          <View style={styles.alertBox}>
            <Text style={styles.alertText}>
              5 clients en attente <Ionicons name="alert" size={16} color="orange" />
            </Text>
            <TouchableOpacity style={styles.viewButton}>
              <Text style={styles.viewButtonText}>Voir</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.alertBox}>
            <Text style={styles.alertText}>
              2 séances à valider <Ionicons name="checkmark-circle" size={16} color="green" />
            </Text>
            <TouchableOpacity style={styles.viewButton}>
              <Text style={styles.viewButtonText}>Voir</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Séances du jour */}
        <Text style={styles.sectionTitle}>Mes séances du jour</Text>
        <View style={styles.sessionsContainer}>
          <View style={styles.sessionCard}>
            <View style={styles.sessionImagePlaceholder}></View>
            <Text style={styles.clientName}>Client 1</Text>
            <Text style={styles.sessionTime}>11:00 AM - 12:00 PM</Text>
          </View>
          
          <View style={styles.sessionCard}>
            <View style={styles.sessionImagePlaceholder}></View>
            <Text style={styles.clientName}>Client 3</Text>
            <Text style={styles.sessionTime}>15:00 AM - 16:00 PM</Text>
          </View>
          
          <View style={styles.sessionCard}>
            <View style={styles.sessionImagePlaceholder}></View>
            <Text style={styles.clientName}>Client 6</Text>
            <Text style={styles.sessionTime}>17:00 AM - 1</Text>
          </View>
        </View>

        {/* Voir séances de la semaine */}
        <TouchableOpacity style={styles.weeklySessionsButton}>
          <View style={styles.weeklySessionsContent}>
            <Text style={styles.weeklySessionsText}>Voir mes séances de la semaine</Text>
            <Text style={styles.weeklySessionsCount}>Vous avez 12 séances cette semaine</Text>
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
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  menuButton: {
    alignItems: 'center',
    width: '30%',
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
});