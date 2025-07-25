import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import QRCodeGenerator from '@/components/qr/QRCodeGenerator';
import QRCodeScannerSimple from '@/components/qr/QRCodeScannerSimple';
import QRCodeScannerCamera from '@/components/qr/QRCodeScannerCamera';
import * as appointmentService from '@/services/appointmentService';

export default function QRCodeTestScreen() {
  const [mode, setMode] = useState<'generator' | 'scanner'>('generator');
  const [useCameraScanner, setUseCameraScanner] = useState(true);
  const [testAppointmentId, setTestAppointmentId] = useState<string>('');
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Données de test - remplacez par de vraies données
  const testAppointment = {
    id: testAppointmentId || 'test-appointment-id',
    date: new Date(Date.now() + 5 * 1000), // Dans 5 secondes pour test rapide
    duration: 60,
  };
  
  const testCoachId = 'test-coach-id';

  useEffect(() => {
    // Créer automatiquement un RDV de test au chargement
    createTestAppointment();
  }, []);

  const createTestAppointment = async () => {
    if (isCreatingTest) return;
    
    setIsCreatingTest(true);
    try {
      console.log('🔨 Création d\'un RDV de test...');
      
      // Créer un faux RDV pour les tests
      const appointmentData = {
        type: 'solo' as const,
        sessionType: 'Coaching individuel',
        description: 'Séance de test pour QR Code',
        location: 'Salle de test',
        date: new Date(Date.now() + 5 * 1000), // Dans 5 secondes
        notes: 'RDV de test automatique',
        coachIds: [testCoachId],
        invitedEmails: []
      };
      
      const appointmentId = await appointmentService.createAppointment(
        appointmentData,
        'test-user-id', // Fake user ID
        'test@example.com' // Fake email
      );
      
      console.log('✅ RDV de test créé:', appointmentId);
      setTestAppointmentId(appointmentId);
      
    } catch (error) {
      console.error('❌ Erreur création RDV test:', error);
      Alert.alert('Erreur', 'Impossible de créer le RDV de test');
    } finally {
      setIsCreatingTest(false);
    }
  };

  const handleQRGenerated = (token: string) => {
    console.log('QR généré:', token);
    Alert.alert('QR Code généré', `Token: ${token.substring(0, 20)}...`);
  };

  const handleSessionStarted = (appointmentId: string) => {
    console.log('Session démarrée:', appointmentId);
    Alert.alert('Session démarrée', `Appointment ID: ${appointmentId}`);
  };

  const handleSessionEnded = (appointmentId: string) => {
    console.log('Session terminée:', appointmentId);
    Alert.alert('Session terminée', `Appointment ID: ${appointmentId}`);
  };

  // Mode plein écran pour la caméra
  if (mode === 'scanner' && useCameraScanner) {
    return (
      <View style={styles.fullScreenContainer}>
        <View style={styles.miniHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setMode('generator')}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.miniTitle}>Scanner QR Code</Text>
          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setUseCameraScanner(false)}
          >
            <Ionicons name="create" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
        
        {testAppointmentId && !isCreatingTest ? (
          <QRCodeScannerCamera
            coachId={testCoachId}
            onSessionStarted={handleSessionStarted}
            onSessionEnded={handleSessionEnded}
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
        )}
      </View>
    );
  }

  // Mode normal avec ScrollView
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Test QR Code System</Text>
        <Text style={styles.subtitle}>
          Testez la génération et le scan des QR codes
        </Text>
      </View>

      {/* Sélecteur de mode */}
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[
            styles.modeButton,
            mode === 'generator' && styles.modeButtonActive
          ]}
          onPress={() => setMode('generator')}
        >
          <Ionicons 
            name="qr-code" 
            size={20} 
            color={mode === 'generator' ? 'white' : '#007AFF'} 
          />
          <Text style={[
            styles.modeButtonText,
            mode === 'generator' && styles.modeButtonTextActive
          ]}>
            Client (Générer)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modeButton,
            mode === 'scanner' && styles.modeButtonActive
          ]}
          onPress={() => setMode('scanner')}
        >
          <Ionicons 
            name="camera" 
            size={20} 
            color={mode === 'scanner' ? 'white' : '#007AFF'} 
          />
          <Text style={[
            styles.modeButtonText,
            mode === 'scanner' && styles.modeButtonTextActive
          ]}>
            Coach (Scanner)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sélecteur de type de scanner */}
      {mode === 'scanner' && (
        <View style={styles.scannerTypeSelector}>
          <Text style={styles.scannerTypeSelectorTitle}>Type de scanner :</Text>
          <View style={styles.scannerModeSelector}>
            <TouchableOpacity
              style={[
                styles.scannerModeButton,
                useCameraScanner && styles.scannerModeButtonActive
              ]}
              onPress={() => setUseCameraScanner(true)}
            >
              <Ionicons 
                name="camera" 
                size={18} 
                color={useCameraScanner ? 'white' : '#007AFF'} 
              />
              <Text style={[
                styles.scannerModeButtonText,
                useCameraScanner && styles.scannerModeButtonTextActive
              ]}>
                Caméra
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.scannerModeButton,
                !useCameraScanner && styles.scannerModeButtonActive
              ]}
              onPress={() => setUseCameraScanner(false)}
            >
              <Ionicons 
                name="create" 
                size={18} 
                color={!useCameraScanner ? 'white' : '#007AFF'} 
              />
              <Text style={[
                styles.scannerModeButtonText,
                !useCameraScanner && styles.scannerModeButtonTextActive
              ]}>
                Manuel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Informations de test */}
      <View style={styles.testInfo}>
        <Text style={styles.testInfoTitle}>
          {mode === 'generator' ? '👤 Mode Client' : '👨‍🏫 Mode Coach'}
        </Text>
        <Text style={styles.testInfoText}>
          {mode === 'generator' 
            ? 'En tant que client, vous pouvez générer un QR code 30 minutes avant votre séance'
            : 'En tant que coach, vous pouvez scanner le QR code du client pour démarrer la séance'
          }
        </Text>
        
        <View style={styles.appointmentInfo}>
          <Text style={styles.appointmentTitle}>📅 Rendez-vous test :</Text>
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
            <>
              <Text style={styles.appointmentDetail}>❌ Erreur création RDV</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={createTestAppointment}
                disabled={isCreatingTest}
              >
                <Text style={styles.retryButtonText}>
                  {isCreatingTest ? 'Création...' : 'Recréer RDV'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Composant approprié selon le mode */}
      {testAppointmentId && !isCreatingTest ? (
        <View style={styles.componentContainer}>
          {mode === 'generator' ? (
            <QRCodeGenerator
              appointmentId={testAppointment.id}
              appointmentDate={testAppointment.date}
              duration={testAppointment.duration}
              onQRGenerated={handleQRGenerated}
            />
          ) : (
            <QRCodeScannerSimple
              coachId={testCoachId}
              onSessionStarted={handleSessionStarted}
              onSessionEnded={handleSessionEnded}
            />
          )}
        </View>
      ) : (
        <View style={styles.componentContainer}>
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
        </View>
      )}

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>🔧 Instructions de test :</Text>
        
        {mode === 'generator' ? (
          <Text style={styles.instructionsText}>
            1. Le QR code sera disponible 30 minutes avant la séance{'\n'}
            2. Pour tester rapidement, le RDV est programmé dans 5 secondes{'\n'}
            3. Le QR code apparaîtra automatiquement{'\n'}
            4. Utilisez le mode Coach pour le scanner
          </Text>
        ) : (
          <Text style={styles.instructionsText}>
            1. Passez en mode Client pour générer un QR code{'\n'}
            2. Revenez en mode Coach pour le scanner{'\n'}
            3. Le scan valide automatiquement la séance{'\n'}
            4. Vous pouvez terminer manuellement si besoin
          </Text>
        )}
      </View>

      {/* Note d'avertissement */}
      <View style={styles.warningBox}>
        <Ionicons name="warning" size={20} color="#856404" />
        <Text style={styles.warningText}>
          Ceci est un écran de test. Les IDs utilisés sont fictifs.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 20,
  },
  miniHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  miniTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  switchButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  modeButtonActive: {
    backgroundColor: '#007AFF',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  modeButtonTextActive: {
    color: 'white',
  },
  scannerTypeSelector: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scannerTypeSelectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  scannerModeSelector: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 3,
  },
  scannerModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  scannerModeButtonActive: {
    backgroundColor: '#007AFF',
  },
  scannerModeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  scannerModeButtonTextActive: {
    color: 'white',
  },
  testInfo: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  testInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  testInfoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 15,
  },
  appointmentInfo: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
  },
  appointmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  appointmentDetail: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  componentContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  waitingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  waitingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  waitingText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  instructions: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  warningText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#856404',
    flex: 1,
  },
});
