import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { auth } from '@/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import * as appointmentService from '@/services/appointmentService';

export default function DebugEndSessionScreen() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Gérer l'authentification
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Charger la session active
  useEffect(() => {
    if (currentUser?.uid) {
      loadActiveSession();
    }
  }, [currentUser?.uid]);

  const loadActiveSession = async () => {
    if (!currentUser?.uid) return;
    
    try {
      console.log('🔍 DEBUG - Chargement session active pour coach:', currentUser.uid);
      const session = await appointmentService.getActiveSessionForCoach(currentUser.uid);
      console.log('📊 DEBUG - Session trouvée:', session);
      setActiveSession(session);
    } catch (error) {
      console.error('❌ DEBUG - Erreur chargement session:', error);
    }
  };

  const testEndSession = async () => {
    if (!activeSession || !currentUser?.uid) {
      Alert.alert('Erreur', 'Aucune session active ou utilisateur non connecté');
      return;
    }

    Alert.alert(
      'Test - Terminer la séance',
      `Voulez-vous tester la fin de session pour ${activeSession.clientName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Terminer', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              console.log('🧪 DEBUG - Test endSession avec:', {
                appointmentId: activeSession.appointmentId,
                coachId: currentUser.uid
              });
              
              const result = await appointmentService.endSession(
                activeSession.appointmentId, 
                currentUser.uid
              );
              
              console.log('✅ DEBUG - Résultat endSession:', result);
              
              if (result.success) {
                Alert.alert('Succès', result.message);
                setActiveSession(null);
              } else {
                Alert.alert('Erreur', result.message);
              }
            } catch (error) {
              console.error('❌ DEBUG - Erreur endSession:', error);
              Alert.alert('Erreur', `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (authLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.text}>Chargement...</Text>
      </View>
    );
  }

  if (!currentUser) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Vous devez être connecté</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Debug - Fin de Session</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.info}>Utilisateur: {currentUser.email}</Text>
        <Text style={styles.info}>UID: {currentUser.uid}</Text>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={loadActiveSession}
        >
          <Text style={styles.buttonText}>Recharger Session Active</Text>
        </TouchableOpacity>

        {activeSession ? (
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionTitle}>Session Active Trouvée:</Text>
            <Text style={styles.sessionDetail}>ID: {activeSession.appointmentId}</Text>
            <Text style={styles.sessionDetail}>Client: {activeSession.clientName}</Text>
            <Text style={styles.sessionDetail}>Durée: {activeSession.expectedDuration} min</Text>
            
            <TouchableOpacity 
              style={[styles.endButton, loading && styles.buttonDisabled]}
              onPress={testEndSession}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="stop-circle" size={20} color="white" />
                  <Text style={styles.endButtonText}>TEST - Terminer Session</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noSession}>
            <Text style={styles.noSessionText}>Aucune session active trouvée</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingTop: 50,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  info: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  text: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginVertical: 16,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  sessionInfo: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 12,
  },
  sessionDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  endButton: {
    backgroundColor: '#dc3545',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  endButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  noSession: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  noSessionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
