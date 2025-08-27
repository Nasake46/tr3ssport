import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { auth } from '@/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useActiveSession } from '@/hooks/useActiveSession';
import { useSessionTimer } from '@/hooks/useSessionTimer';

export default function TestStopButtonScreen() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);

  // Gérer l'authentification
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      addLog(`Auth: ${user ? `Connecté (${user.email})` : 'Non connecté'}`);
    });
    return () => unsubscribe();
  }, []);

  const {
    activeSession,
    loading,
    loadActiveSession,
    endSession,
    endSessionWithConfirmation
  } = useActiveSession(currentUser?.uid || '');

  const { sessionTime, totalSeconds } = useSessionTimer(activeSession);

  // Charger la session active au démarrage
  useEffect(() => {
    if (currentUser?.uid) {
      addLog('Chargement session active...');
      loadActiveSession();
    }
  }, [currentUser?.uid, loadActiveSession]);

  // Logger les changements de session
  useEffect(() => {
    if (activeSession) {
      addLog(`Session active détectée: ${activeSession.clientName} (${activeSession.appointmentId})`);
    } else {
      addLog('Aucune session active');
    }
  }, [activeSession]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
    console.log(`🧪 TEST STOP - ${message}`);
  };

  const testDirectEndSession = async () => {
    addLog('Test Direct EndSession - DÉBUT');
    
    if (!activeSession || !currentUser?.uid) {
      addLog('❌ Pas de session active ou utilisateur');
      Alert.alert('Erreur', 'Pas de session active ou utilisateur non connecté');
      return;
    }

    try {
      addLog('Appel direct endSession...');
      const result = await endSession();
      addLog(`Résultat: ${JSON.stringify(result)}`);
      
      if (result && result.success) {
        addLog('✅ Succès!');
        Alert.alert('Succès', result.message);
      } else {
        addLog('❌ Échec');
        Alert.alert('Erreur', result ? result.message : 'Pas de résultat');
      }
    } catch (error) {
      addLog(`❌ Exception: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      Alert.alert('Exception', `${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const testEndSessionWithConfirmation = () => {
    addLog('Test EndSession With Confirmation - DÉBUT');
    
    if (!activeSession) {
      addLog('❌ Pas de session active');
      Alert.alert('Erreur', 'Pas de session active');
      return;
    }

    addLog('Appel endSessionWithConfirmation...');
    endSessionWithConfirmation();
  };

  const clearLogs = () => {
    setLogs([]);
  };

  if (authLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.text}>Chargement...</Text>
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
        <Text style={styles.title}>Test Bouton Stop</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Statut */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>Statut</Text>
          <Text style={styles.statusText}>
            Utilisateur: {currentUser?.email || 'Non connecté'}
          </Text>
          <Text style={styles.statusText}>
            Session: {activeSession ? `${activeSession.clientName} (${sessionTime})` : 'Aucune'}
          </Text>
          <Text style={styles.statusText}>
            Loading: {loading ? 'Oui' : 'Non'}
          </Text>
        </View>

        {/* Boutons de test */}
        <View style={styles.buttonsSection}>
          <Text style={styles.sectionTitle}>Tests</Text>
          
          <TouchableOpacity 
            style={[styles.button, styles.refreshButton]}
            onPress={() => {
              addLog('Rechargement session manuelle...');
              loadActiveSession();
            }}
          >
            <Text style={styles.buttonText}>Recharger Session</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.testButton]}
            onPress={testDirectEndSession}
            disabled={!activeSession || loading}
          >
            <Text style={styles.buttonText}>Test Direct EndSession</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.testButton]}
            onPress={testEndSessionWithConfirmation}
            disabled={!activeSession || loading}
          >
            <Text style={styles.buttonText}>Test EndSession + Confirmation</Text>
          </TouchableOpacity>
        </View>

        {/* Logs */}
        <View style={styles.logsSection}>
          <View style={styles.logsHeader}>
            <Text style={styles.sectionTitle}>Logs</Text>
            <TouchableOpacity onPress={clearLogs} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Effacer</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.logsContainer}>
            {logs.length === 0 ? (
              <Text style={styles.noLogsText}>Aucun log</Text>
            ) : (
              logs.map((log, index) => (
                <Text key={index} style={styles.logText}>{log}</Text>
              ))
            )}
          </View>
        </View>
      </ScrollView>
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
  text: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  statusSection: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
  },
  testButton: {
    backgroundColor: '#28a745',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  logsSection: {
    flex: 1,
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  logsContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    minHeight: 200,
    maxHeight: 300,
  },
  logText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  noLogsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
});
