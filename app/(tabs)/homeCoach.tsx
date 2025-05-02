import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Button, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, firestore } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

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
          // Si l'utilisateur n'est pas connecté, rediriger vers la page de connexion
          router.replace('/(tabs)');
          return;
        }

        const userDoc = await getDoc(doc(firestore, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Vérifier si l'utilisateur est bien un coach
          if (userData.role !== 'coach') {
            console.log("Cet utilisateur n'est pas un coach");
            router.replace('/(tabs)');
            return;
          }
          setCoachData(userData);
        } else {
          console.log("Document utilisateur non trouvé");
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
    <ScrollView>
      <View style={styles.container}>
        <Text style={styles.title}>Tableau de bord Coach</Text>
        
        {coachData && (
          <View style={styles.profileSection}>
            <Text style={styles.subtitle}>Informations personnelles</Text>
            <Text style={styles.infoText}>Nom: {coachData.lastName}</Text>
            <Text style={styles.infoText}>Prénom: {coachData.firstName}</Text>
            <Text style={styles.infoText}>Email: {coachData.email}</Text>
            <Text style={styles.infoText}>Téléphone: {coachData.phoneNumber}</Text>
            
            <Text style={styles.subtitle}>Informations professionnelles</Text>
            <Text style={styles.infoText}>Société: {coachData.companyName}</Text>
            <Text style={styles.infoText}>SIRET: {coachData.siretNumber}</Text>
            <Text style={styles.infoText}>Diplôme: {coachData.diploma}</Text>
          </View>
        )}
        
        <View style={styles.actionsSection}>
          <Text style={styles.subtitle}>Actions</Text>
          <Button title="Créer une séance" onPress={() => console.log("Créer une séance")} />
          <View style={styles.buttonSpacer} />
          <Button title="Voir mes clients" onPress={() => console.log("Voir mes clients")} />
          <View style={styles.buttonSpacer} />
          <Button title="Se déconnecter" onPress={handleLogout} color="#FF6347" />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#0a7ea4',
  },
  profileSection: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 16,
    marginBottom: 8,
  },
  actionsSection: {
    marginBottom: 30,
  },
  buttonSpacer: {
    height: 10,
  }
});