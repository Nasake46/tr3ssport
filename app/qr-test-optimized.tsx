import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCodeScannerOptimized from '@/components/qr/QRCodeScannerOptimized';
import QRCodeGenerator from '@/components/qr/QRCodeGenerator';
import * as appointmentService from '@/services/appointmentService';
import { AppointmentFormData } from '@/models/appointment';

export default function QRTestOptimizedScreen() {
  const [mode, setMode] = useState<'generator' | 'scanner'>('scanner');
  const [testAppointmentId, setTestAppointmentId] = useState<string>('');
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const [currentToken, setCurrentToken] = useState<string>(''); // Nouveau état pour le token

  // Données de test
  const testAppointment = {
    id: testAppointmentId || 'test-appointment-id',
    date: new Date(Date.now() + 5 * 1000), // Dans 5 secondes pour test rapide
    duration: 60,
  };

  const testCoachId = 'test-coach-id-optimized';

  React.useEffect(() => {
    createTestAppointment();
  }, []);

  const createTestAppointment = async () => {
    setIsCreatingTest(true);
    try {
      console.log('🔧 TEST - Création d\'un RDV de test pour l\'optimisation...');
      
      // Créer un RDV de test rapide
      const testData: AppointmentFormData = {
        type: 'solo' as const,
        sessionType: 'in-person' as const,
        description: 'Rendez-vous de test pour vérifier le chronomètre et l\'arrêt de session',
        location: 'Test Location',
        date: testAppointment.date,
        notes: '', // Ajouter notes comme chaîne vide
        coachIds: [testCoachId],
        invitedEmails: []
      };

      const createdId = await appointmentService.createAppointment(
        testData, 
        'test-client-id',
        'test-client@example.com'
      );
      setTestAppointmentId(createdId);
      
      console.log('✅ TEST - RDV de test créé avec succès:', createdId);
      
    } catch (error) {
      console.error('❌ TEST - Erreur création RDV:', error);
      Alert.alert('Erreur', 'Impossible de créer le RDV de test');
    } finally {
      setIsCreatingTest(false);
    }
  };

  const handleSessionStarted = (appointmentId: string) => {
    console.log('🎉 TEST - Session démarrée:', appointmentId);
    Alert.alert(
      'Test réussi !', 
      'Le chronomètre devrait maintenant fonctionner correctement.\nVérifiez que le temps s\'incrémente chaque seconde.'
    );
  };

  const handleSessionEnded = (appointmentId: string) => {
    console.log('🏁 TEST - Session terminée:', appointmentId);
    Alert.alert(
      'Test réussi !', 
      'L\'arrêt de session fonctionne correctement.\nLe chronomètre devrait s\'être arrêté.'
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🧪 Test QR Code Optimisé</Text>
        <Text style={styles.subtitle}>Test du chronomètre et de l'arrêt de session</Text>
      </View>

      {/* Mode Selector */}
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'generator' && styles.modeButtonActive]}
          onPress={() => setMode('generator')}
        >
          <Ionicons 
            name="qr-code" 
            size={20} 
            color={mode === 'generator' ? 'white' : '#007AFF'} 
          />
          <Text style={[styles.modeButtonText, mode === 'generator' && styles.modeButtonTextActive]}>
            Client (Générer QR)
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.modeButton, mode === 'scanner' && styles.modeButtonActive]}
          onPress={() => setMode('scanner')}
        >
          <Ionicons 
            name="scan" 
            size={20} 
            color={mode === 'scanner' ? 'white' : '#007AFF'} 
          />
          <Text style={[styles.modeButtonText, mode === 'scanner' && styles.modeButtonTextActive]}>
            Coach (Scanner QR)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Status du RDV */}
      <View style={styles.appointmentInfo}>
        <Text style={styles.title}>📅 Rendez-vous test :</Text>
        {isCreatingTest ? (
          <Text style={styles.appointmentDetail}>⏳ Création du RDV en cours...</Text>
        ) : testAppointmentId ? (
          <>
            <Text style={styles.appointmentDetail}>
              ✅ RDV créé - ID: {testAppointmentId.substring(0, 8)}...
            </Text>
            <Text style={styles.appointmentDetail}>
              Date: {testAppointment.date.toLocaleString()}
            </Text>
            <Text style={styles.appointmentDetail}>
              Durée: {testAppointment.duration} minutes
            </Text>
          </>
        ) : (
          <Text style={styles.appointmentDetail}>❌ Erreur création RDV</Text>
        )}
      </View>

      {/* Composant principal */}
      <View style={styles.mainContent}>
        {mode === 'generator' ? (
          testAppointmentId ? (
            <QRCodeGenerator
              appointmentId={testAppointmentId}
              appointmentDate={testAppointment.date}
              duration={testAppointment.duration}
              onQRGenerated={(token) => {
                console.log('📱 TEST - QR généré:', token.substring(0, 20) + '...');
              }}
              onTokenAvailable={(token) => {
                console.log('🎯 TEST - Token disponible immédiatement:', token.substring(0, 20) + '...');
                setCurrentToken(token);
              }}
            />
          ) : (
            <View style={styles.waitingContainer}>
              <Text style={styles.waitingTitle}>
                {isCreatingTest ? '⏳ Préparation...' : '❌ RDV requis'}
              </Text>
              <Text style={styles.waitingText}>
                {isCreatingTest 
                  ? 'Création du rendez-vous de test en cours...'
                  : 'Un rendez-vous doit être créé avant de tester le QR code'
                }
              </Text>
            </View>
          )
        ) : (
          <QRCodeScannerOptimized
            coachId={testCoachId}
            onSessionStarted={handleSessionStarted}
            onSessionEnded={handleSessionEnded}
          />
        )}
      </View>

      {/* Affichage du token actuel */}
      {currentToken && (
        <View style={styles.tokenDisplay}>
          <Text style={styles.tokenDisplayTitle}>🔑 Token QR disponible :</Text>
          <Text style={styles.tokenDisplayText} numberOfLines={2} ellipsizeMode="middle">
            {currentToken}
          </Text>
          <TouchableOpacity 
            style={styles.tokenCopyButton}
            onPress={() => {
              if (typeof navigator !== 'undefined' && navigator.clipboard) {
                navigator.clipboard.writeText(currentToken);
                Alert.alert('Copié !', 'Token copié dans le presse-papier');
              } else {
                Alert.alert('Token QR', currentToken);
              }
            }}
          >
            <Text style={styles.tokenCopyButtonText}>📋 Copier le token</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Points à tester */}
      <View style={styles.testPoints}>
        <Text style={styles.testPointsTitle}>🔍 Points à vérifier :</Text>
        <Text style={styles.testPointText}>
          ✓ Le chronomètre démarre dès que la session commence{'\n'}
          ✓ Le temps s'incrémente chaque seconde (format MM:SS){'\n'}
          ✓ Le bouton "Terminer la séance" fonctionne{'\n'}
          ✓ Le chronomètre s'arrête quand la session se termine{'\n'}
          ✓ L'interface se remet à l'état initial après la fin
        </Text>
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>📋 Instructions :</Text>
        
        {mode === 'generator' ? (
          <Text style={styles.instructionsText}>
            1. Le QR code sera disponible immédiatement (pour le test){'\n'}
            2. Copiez le token QR généré{'\n'}
            3. Passez en mode Coach pour le tester{'\n'}
            4. Vérifiez que le chronomètre fonctionne
          </Text>
        ) : (
          <Text style={styles.instructionsText}>
            1. Passez en mode Client pour générer un QR code{'\n'}
            2. Copiez le token et collez-le ici{'\n'}
            3. Appuyez sur "Valider le QR Code"{'\n'}
            4. Vérifiez le chronomètre et testez l'arrêt manuel
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  modeSelector: {
    flexDirection: 'row',
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 6,
  },
  modeButtonActive: {
    backgroundColor: '#007AFF',
  },
  modeButtonText: {
    color: '#007AFF',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modeButtonTextActive: {
    color: 'white',
  },
  appointmentInfo: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 0,
    padding: 15,
    borderRadius: 8,
  },
  appointmentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  appointmentDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  mainContent: {
    flex: 1,
    marginHorizontal: 20,
  },
  waitingContainer: {
    backgroundColor: 'white',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  waitingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 10,
  },
  waitingText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  tokenDisplay: {
    backgroundColor: 'white',
    margin: 20,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  tokenDisplayTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  tokenDisplayText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  tokenCopyButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  tokenCopyButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  testPoints: {
    backgroundColor: 'white',
    margin: 20,
    padding: 15,
    borderRadius: 8,
  },
  testPointsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  testPointText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  instructions: {
    backgroundColor: 'white',
    margin: 20,
    marginBottom: 40,
    padding: 15,
    borderRadius: 8,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
