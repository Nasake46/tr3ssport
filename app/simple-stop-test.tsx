import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { useActiveSession } from '@/hooks/useActiveSession';

export default function SimpleStopTest() {
  const [coachId, setCoachId] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  
  const { 
    activeSession, 
    loading, 
    loadActiveSession, 
    endSession 
  } = useActiveSession(coachId);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      setCoachId(user.uid);
      addLog(`Coach connecté: ${user.uid}`);
    }
  }, []);

  useEffect(() => {
    if (coachId) {
      loadActiveSession();
    }
  }, [coachId, loadActiveSession]);

  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString();
    const log = `[${time}] ${message}`;
    setLogs(prev => [...prev, log]);
    console.log(log);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const testStopButton = async () => {
    addLog('🚀 DÉBUT TEST - Appui bouton STOP');
    
    if (!activeSession) {
      addLog('❌ Pas de session active');
      Alert.alert('Erreur', 'Pas de session active');
      return;
    }
    
    addLog(`📋 Session ID: ${activeSession.appointmentId}`);
    addLog(`👤 Client: ${activeSession.clientName}`);
    addLog(`🆔 Coach: ${coachId}`);
    
    try {
      addLog('🔄 Appel endSession()...');
      const result = await endSession();
      
      addLog(`📤 Résultat reçu: ${JSON.stringify(result)}`);
      
      if (result && result.success) {
        addLog('✅ SUCCÈS!');
        Alert.alert('Succès', 'Session terminée!');
      } else {
        addLog(`❌ ÉCHEC: ${result ? result.message : 'Pas de résultat'}`);
        Alert.alert('Échec', result ? result.message : 'Pas de résultat');
      }
    } catch (error) {
      addLog(`💥 EXCEPTION: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      Alert.alert('Exception', error instanceof Error ? error.message : 'Erreur inconnue');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="stop-circle" size={48} color="#dc3545" />
        <Text style={styles.title}>Test Stop Simple</Text>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>État</Text>
        <Text style={styles.statusText}>Coach: {coachId || 'Non défini'}</Text>
        <Text style={styles.statusText}>Session: {activeSession ? `✅ ${activeSession.clientName}` : '❌ Aucune'}</Text>
        <Text style={styles.statusText}>Loading: {loading ? '⏳' : '✅'}</Text>
      </View>

      <View style={styles.buttonSection}>
        <TouchableOpacity 
          style={[styles.stopButton, (!activeSession || loading) && styles.disabledButton]} 
          onPress={testStopButton}
          disabled={!activeSession || loading}
        >
          <Text style={styles.buttonText}>🛑 ARRÊTER SESSION</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.refreshButton} onPress={loadActiveSession}>
          <Text style={styles.buttonText}>🔄 Recharger</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.clearButton} onPress={clearLogs}>
          <Text style={styles.buttonText}>🗑️ Effacer Logs</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.logsSection}>
        <Text style={styles.logsTitle}>📋 Logs Live</Text>
        <ScrollView style={styles.logsContainer}>
          {logs.map((log, index) => (
            <Text key={index} style={styles.logText}>{log}</Text>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginTop: 10,
  },
  statusCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  buttonSection: {
    marginBottom: 20,
  },
  stopButton: {
    backgroundColor: '#dc3545',
    padding: 20,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  refreshButton: {
    backgroundColor: '#17a2b8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#6c757d',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logsSection: {
    flex: 1,
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  logsContainer: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 10,
    flex: 1,
  },
  logText: {
    color: '#00ff00',
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});
