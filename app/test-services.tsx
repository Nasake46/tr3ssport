import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as appointmentService from '@/services/appointmentService';

export default function TestEndSessionScreen() {
  const testServiceFunctions = async () => {
    try {
      // Test 1: Vérifier si endSession existe
      console.log('🧪 TEST - endSession existe:', typeof appointmentService.endSession);
      
      // Test 2: Appeler endSession avec des paramètres bidons (juste pour voir l'erreur)
      console.log('🧪 TEST - Tentative d\'appel endSession...');
      const result = await appointmentService.endSession('test-id', 'test-coach');
      console.log('🧪 TEST - Résultat:', result);
      
      Alert.alert('Test', `endSession appelé. Type: ${typeof appointmentService.endSession}`);
    } catch (error) {
      console.error('🧪 TEST - Erreur:', error);
      Alert.alert('Erreur', `${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const testGetActiveSession = async () => {
    try {
      console.log('🧪 TEST - getActiveSessionForCoach existe:', typeof appointmentService.getActiveSessionForCoach);
      
      const session = await appointmentService.getActiveSessionForCoach('test-coach-id');
      console.log('🧪 TEST - Session résultat:', session);
      
      Alert.alert('Test', `getActiveSessionForCoach appelé. Résultat: ${session ? 'Session trouvée' : 'Aucune session'}`);
    } catch (error) {
      console.error('🧪 TEST - Erreur getActiveSession:', error);
      Alert.alert('Erreur', `${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Test - Services</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.info}>Tests des fonctions du service</Text>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={testServiceFunctions}
        >
          <Text style={styles.buttonText}>Test endSession</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button}
          onPress={testGetActiveSession}
        >
          <Text style={styles.buttonText}>Test getActiveSession</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.infoButton]}
          onPress={() => {
            console.log('🔍 SERVICE INFO - Toutes les fonctions disponibles:');
            console.log(Object.keys(appointmentService));
            Alert.alert('Info', `Fonctions disponibles: ${Object.keys(appointmentService).join(', ')}`);
          }}
        >
          <Text style={styles.buttonText}>Liste fonctions service</Text>
        </TouchableOpacity>
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
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoButton: {
    backgroundColor: '#28a745',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
});
