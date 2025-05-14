import React, { useState, useEffect } from 'react';
import { Button, StyleSheet, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, firestore } from '@/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function HomeScreen() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        // Utilisateur connecté, récupérer son rôle
        try {
          const userDoc = await getDoc(doc(firestore, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role);
          } else {
            setUserRole("Rôle inconnu");
          }
        } catch (error) {
          console.error("Erreur lors de la récupération du rôle:", error);
          setUserRole("Erreur");
        }
      } else {
        // Utilisateur déconnecté
        setUserRole(null);
      }
      setLoading(false);
    });

    // Nettoyer l'abonnement à la déconnexion
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserRole(null);
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <Text>Chargement...</Text>
      ) : userRole ? (
        <>
          <Text style={styles.welcomeText}>Bienvenue !</Text>
          <Text style={styles.roleText}>Votre rôle : {userRole}</Text>
          <Button title="Se déconnecter" onPress={handleLogout} />
        </>
      ) : (
        <>
          <View style={styles.buttonContainer}>
            <Text style={styles.sectionTitle}>Espace Utilisateur</Text>
            <Button title="Se connecter" onPress={() => router.push('/auth/LoginScreen')} />
            <Button title="S'inscrire" onPress={() => router.push('/auth/registerScreen')} />
            <Button title='Profil' onPress={() => router.push('/(tabs)/ProfileScreen')} />
          </View>
          
          {/* <View style={styles.buttonContainer}>
            <Text style={styles.sectionTitle}>Espace Coach</Text>
            <Button 
              title="Inscription Coach" 
              onPress={() => router.push('/(tabs)/registerCoachScreen')} 
            />
          </View> */}
        </>
      )}
      {/* <Button title="Login" onPress={() => router.push('/(tabs)/LoginScreen')} />
      <Button title="Register" onPress={() => router.push('/(tabs)/registerScreen')} />
      <Button title="Home" onPress={() => router.push('/(tabs)/HomeScreen')} /> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    padding: 16,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  roleText: {
    fontSize: 18,
    marginBottom: 20,
  }
});