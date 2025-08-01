import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as appointmentService from '@/services/appointmentService';

interface QRCodeScannerProps {
  coachId: string;
  onSessionStarted?: (appointmentId: string) => void;
  onSessionEnded?: (appointmentId: string) => void;
}

interface ActiveSession {
  appointmentId: string;
  clientName: string;
  startTime: Date;
  expectedDuration: number;
  actualStartTime: Date;
}

export default function QRCodeScannerCamera({ 
  coachId, 
  onSessionStarted, 
  onSessionEnded 
}: QRCodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanningActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [sessionTime, setSessionTime] = useState<string>('00:00');
  const [manualToken, setManualToken] = useState('');
  const [useManualMode, setUseManualMode] = useState(false);

  useEffect(() => {
    loadActiveSession();
    
    // Timer pour mettre à jour le temps de session
    const timer = setInterval(() => {
      if (activeSession) {
        updateSessionTime();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSession]);

  const loadActiveSession = async () => {
    console.log('🔍 QR SCANNER - Chargement session active pour coach:', coachId);
    try {
      const session = await appointmentService.getActiveSessionForCoach(coachId);
      console.log('📊 QR SCANNER - Session active trouvée:', session ? 'Oui' : 'Non');
      setActiveSession(session);
    } catch (error) {
      console.error('❌ QR SCANNER - Erreur chargement session:', error);
    }
  };

  const updateSessionTime = () => {
    if (!activeSession) return;
    
    const now = new Date();
    const startTime = new Date(activeSession.actualStartTime);
    const diff = now.getTime() - startTime.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    setSessionTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    
    console.log('📱 QR SCANNER - Code scanné:', { type, data: data.substring(0, 50) + '...' });
    setScanned(true);
    setScanningActive(false);
    setLoading(true);

    try {
      const result = await appointmentService.scanQRCode(data, coachId);
      console.log('✅ QR SCANNER - Résultat scan:', result);
      
      if (result.success && result.appointmentId) {
        Alert.alert(
          'Séance commencée !',
          `La séance avec ${result.clientName} a commencé.`,
          [{ text: 'OK', onPress: () => {
            loadActiveSession();
            onSessionStarted?.(result.appointmentId!);
          }}]
        );
      } else {
        Alert.alert(
          'Erreur', 
          result.message || 'Code QR invalide ou expiré',
          [{ text: 'OK', onPress: () => setScanned(false) }]
        );
      }
    } catch (error) {
      console.error('❌ QR SCANNER - Erreur scan:', error);
      Alert.alert(
        'Erreur', 
        `Erreur lors du scan: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleManualScan = async () => {
    if (!manualToken.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un code QR');
      return;
    }
    
    await handleBarCodeScanned({ type: 'manual', data: manualToken });
    setManualToken('');
  };

  const startScanning = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Permission requise',
          'L\'accès à la caméra est nécessaire pour scanner les QR codes.',
          [
            { text: 'Mode manuel', onPress: () => setUseManualMode(true) },
            { text: 'Réessayer', onPress: startScanning }
          ]
        );
        return;
      }
    }
    
    setScanned(false);
    setScanningActive(true);
    setUseManualMode(false);
  };

  const stopScanning = () => {
    setScanningActive(false);
    setScanned(false);
  };

  const endSession = async () => {
    if (!activeSession) return;
    
    Alert.alert(
      'Terminer la séance',
      `Voulez-vous terminer la séance avec ${activeSession.clientName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Terminer', 
          style: 'destructive',
          onPress: async () => {
            console.log('🔚 QR SCANNER - Fin de session manuelle pour:', activeSession.appointmentId);
            setLoading(true);
            try {
              await appointmentService.endSession(activeSession.appointmentId, coachId);
              console.log('✅ QR SCANNER - Session terminée');
              Alert.alert('Terminé', 'La séance a été terminée avec succès');
              setActiveSession(null);
              onSessionEnded?.(activeSession.appointmentId);
            } catch (error) {
              console.error('❌ QR SCANNER - Erreur fin session:', error);
              Alert.alert('Erreur', 'Impossible de terminer la séance');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Si une séance est active
  if (activeSession) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="fitness" size={32} color="#28a745" />
          <Text style={styles.title}>Séance en cours</Text>
          <Text style={styles.subtitle}>Avec {activeSession.clientName}</Text>
        </View>

        <View style={styles.sessionCard}>
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionTime}>{sessionTime}</Text>
            <Text style={styles.sessionLabel}>Temps écoulé</Text>
          </View>
          
          <View style={styles.sessionDetails}>
            <Text style={styles.detailText}>
              Durée prévue: {activeSession.expectedDuration} minutes
            </Text>
            <Text style={styles.detailText}>
              Début: {new Date(activeSession.actualStartTime).toLocaleTimeString()}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.endButton, loading && styles.buttonDisabled]}
          onPress={endSession}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="stop-circle" size={24} color="white" />
              <Text style={styles.endButtonText}>Terminer la séance</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // Interface de scan
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="scan" size={32} color="#007AFF" />
        <Text style={styles.title}>Scanner QR Code</Text>
        <Text style={styles.subtitle}>Commencer une nouvelle séance</Text>
      </View>

      {/* Mode sélection */}
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[styles.modeButton, !useManualMode && styles.modeButtonActive]}
          onPress={() => setUseManualMode(false)}
        >
          <Ionicons name="camera" size={20} color={!useManualMode ? "white" : "#007AFF"} />
          <Text style={[styles.modeButtonText, !useManualMode && styles.modeButtonTextActive]}>
            Caméra
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.modeButton, useManualMode && styles.modeButtonActive]}
          onPress={() => setUseManualMode(true)}
        >
          <Ionicons name="create" size={20} color={useManualMode ? "white" : "#007AFF"} />
          <Text style={[styles.modeButtonText, useManualMode && styles.modeButtonTextActive]}>
            Manuel
          </Text>
        </TouchableOpacity>
      </View>

      {useManualMode ? (
        // Mode manuel
        <View style={styles.manualSection}>
          <Text style={styles.sectionTitle}>Saisie manuelle</Text>
          <Text style={styles.instructions}>
            Demandez au client de vous montrer son QR code et saisissez le code ci-dessous :
          </Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={manualToken}
              onChangeText={setManualToken}
              placeholder="Code QR du client..."
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
              multiline
            />
          </View>

          <TouchableOpacity
            style={[
              styles.scanButton,
              !manualToken.trim() && styles.buttonDisabled,
              loading && styles.buttonDisabled
            ]}
            onPress={handleManualScan}
            disabled={!manualToken.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.scanButtonText}>Valider le QR Code</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        // Mode caméra
        <View style={styles.cameraSection}>
          {scanning ? (
            <View style={styles.cameraContainer}>
              <View style={styles.cameraWrapper}>
                <CameraView
                  style={styles.camera}
                  facing="back"
                  onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                  barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                  }}
                />
                
                <View style={styles.scanOverlay}>
                  <View style={styles.scanFrame} />
                  <Text style={styles.scanInstructions}>
                    Placez le QR code dans le cadre pour le scanner
                  </Text>
                </View>
              </View>
              
              <View style={styles.cameraControls}>
                <TouchableOpacity
                  style={styles.stopButton}
                  onPress={stopScanning}
                >
                  <Ionicons name="stop" size={24} color="white" />
                  <Text style={styles.stopButtonText}>Arrêter</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.startScanSection}>
              <TouchableOpacity
                style={styles.startScanButton}
                onPress={startScanning}
              >
                <Ionicons name="camera" size={32} color="white" />
                <Text style={styles.startScanButtonText}>Démarrer le scan</Text>
              </TouchableOpacity>
              
              <Text style={styles.permissionText}>
                {!permission?.granted 
                  ? 'Permission caméra requise pour scanner'
                  : 'Appuyez pour démarrer la caméra'
                }
              </Text>
            </View>
          )}
        </View>
      )}

      {!activeSession && (
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Instructions</Text>
          <Text style={styles.infoText}>
            1. Le client génère son QR code 30 minutes avant la séance{'\n'}
            2. Scannez le code avec la caméra ou saisissez-le manuellement{'\n'}
            3. La séance commence automatiquement après validation{'\n'}
            4. Vous pouvez terminer la séance manuellement si nécessaire
          </Text>
        </View>
      )}
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  sessionCard: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 16,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sessionInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  sessionTime: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#28a745',
    fontFamily: 'monospace',
  },
  sessionLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  sessionDetails: {
    gap: 8,
  },
  detailText: {
    fontSize: 16,
    color: '#333',
  },
  endButton: {
    backgroundColor: '#dc3545',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  endButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    color: '#007AFF',
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: 'white',
  },
  manualSection: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cameraSection: {
    flex: 1,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  instructions: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  scanButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black',
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 400,
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
    minHeight: 350,
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  scanInstructions: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  cameraControls: {
    padding: 15,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  stopButton: {
    backgroundColor: '#dc3545',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  stopButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  startScanSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 30,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 250,
  },
  startScanButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    gap: 12,
    marginBottom: 20,
  },
  startScanButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  permissionText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  infoSection: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
