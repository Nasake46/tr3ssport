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
import { BarCodeScanner } from 'expo-barcode-scanner';
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

export default function QRCodeScannerMock({ 
  coachId, 
  onSessionStarted, 
  onSessionEnded 
}: QRCodeScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanningActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [sessionTime, setSessionTime] = useState<string>('00:00');
  const [manualToken, setManualToken] = useState('');
  const [useManualMode, setUseManualMode] = useState(false);

  useEffect(() => {
    getCameraPermissions();
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
      if (session) {
        setActiveSession(session);
        console.log('✅ QR SCANNER - Session chargée:', {
          appointmentId: session.appointmentId,
          clientName: session.clientName,
          startTime: session.startTime.toISOString()
        });
      }
    } catch (error) {
      console.error('❌ QR SCANNER - Erreur chargement session:', error);
    }
  };

  const getCameraPermissions = async () => {
    console.log('📷 QR SCANNER - Demande permissions caméra');
    try {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      console.log('📷 QR SCANNER - Status permissions:', status);
      setHasPermission(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'L\'accès à la caméra est nécessaire pour scanner les QR codes.',
          [
            { text: 'Mode manuel', onPress: () => setUseManualMode(true) },
            { text: 'Réessayer', onPress: getCameraPermissions }
          ]
        );
      }
    } catch (error) {
      console.error('❌ QR SCANNER - Erreur permissions caméra:', error);
      setUseManualMode(true);
    }
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
          `Séance démarrée pour ${result.clientName}. Durée prévue: ${result.duration} minutes.`,
          [{ text: 'OK', onPress: () => setScanned(false) }]
        );
        
        await loadActiveSession();
        onSessionStarted?.(result.appointmentId);
      } else {
        Alert.alert(
          'Erreur', 
          result.message,
          [{ text: 'OK', onPress: () => setScanned(false) }]
        );
      }
    } catch (error) {
      console.error('❌ QR SCANNER - Erreur scan:', error);
      Alert.alert(
        'Erreur', 
        `Impossible de scanner le QR code: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
    } finally {
      setLoading(false);
    }
  };

  const startScanning = () => {
    console.log('🎯 QR SCANNER - Démarrage scan');
    setScanned(false);
    setScanningActive(true);
  };

  const stopScanning = () => {
    console.log('⏹️ QR SCANNER - Arrêt scan');
    setScanningActive(false);
    setScanned(false);
  };

  const updateSessionTime = () => {
    if (!activeSession) return;
    
    const now = new Date();
    const startTime = new Date(activeSession.actualStartTime || activeSession.startTime);
    const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    setSessionTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
  };

  const handleManualScan = async () => {
    if (!manualToken.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un token QR');
      return;
    }

    console.log('🎯 QR SCANNER - Scan manuel du token:', manualToken.substring(0, 20) + '...');
    setLoading(true);
    
    try {
      const result = await appointmentService.scanQRCode(manualToken, coachId);
      console.log('✅ QR SCANNER - Résultat scan:', result);
      
      if (result.success && result.appointmentId) {
        Alert.alert(
          'Séance commencée !', 
          `Séance démarrée pour ${result.clientName}. Durée prévue: ${result.duration} minutes.`
        );
        
        // Recharger la session active
        await loadActiveSession();
        onSessionStarted?.(result.appointmentId);
        setManualToken('');
      } else {
        Alert.alert('Erreur', result.message);
      }
    } catch (error) {
      console.error('❌ QR SCANNER - Erreur scan manuel:', error);
      Alert.alert('Erreur', `Impossible de scanner le QR code: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  const endCurrentSession = async () => {
    if (!activeSession) return;
    
    console.log('🛑 QR SCANNER - Fin de session manuelle:', activeSession.appointmentId);
    Alert.alert(
      'Terminer la séance',
      'Êtes-vous sûr de vouloir terminer cette séance ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Terminer', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await appointmentService.endSession(activeSession.appointmentId, coachId);
              console.log('✅ QR SCANNER - Session terminée avec succès');
              Alert.alert('Séance terminée', 'La séance a été terminée avec succès.');
              setActiveSession(null);
              onSessionEnded?.(activeSession.appointmentId);
            } catch (error) {
              console.error('❌ QR SCANNER - Erreur fin de session:', error);
              Alert.alert('Erreur', `Impossible de terminer la séance: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const getStatusColor = () => {
    return activeSession ? '#28a745' : '#007AFF';
  };

  const getStatusText = () => {
    return activeSession ? 'Séance en cours' : 'Prêt à scanner';
  };

  const getStatusIcon = () => {
    return activeSession ? 'play-circle' : 'scan';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="scan" size={32} color={getStatusColor()} />
        <Text style={styles.title}>Scanner QR Code</Text>
        <Text style={styles.subtitle}>{getStatusText()}</Text>
      </View>

      {activeSession ? (
        <View style={styles.activeSessionContainer}>
          <View style={styles.sessionCard}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
              <Ionicons name="play-circle" size={16} color="white" />
              <Text style={styles.statusBadgeText}>En cours</Text>
            </View>
            
            <Text style={styles.clientName}>{activeSession.clientName}</Text>
            <Text style={styles.sessionTime}>{sessionTime}</Text>
            <Text style={styles.sessionInfo}>
              Durée prévue: {activeSession.expectedDuration} minutes
            </Text>
            
            <TouchableOpacity
              style={styles.endButton}
              onPress={endCurrentSession}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="stop-circle" size={20} color="white" />
                  <Text style={styles.endButtonText}>Terminer la séance</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.scannerContainer}>
          {hasPermission === null ? (
            <View style={styles.permissionContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.permissionText}>Demande d'autorisation caméra...</Text>
            </View>
          ) : hasPermission === false || useManualMode ? (
            <View>
              <View style={styles.mockCameraContainer}>
                <Ionicons name="camera-off" size={64} color="#ccc" />
                <Text style={styles.mockCameraText}>
                  {hasPermission === false 
                    ? 'Permission caméra refusée\nMode manuel uniquement' 
                    : 'Mode manuel'}
                </Text>
                {hasPermission !== false && (
                  <TouchableOpacity 
                    style={styles.switchModeButton}
                    onPress={() => setUseManualMode(false)}
                  >
                    <Ionicons name="camera" size={20} color="#007AFF" />
                    <Text style={styles.switchModeText}>Utiliser la caméra</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.manualInputContainer}>
                <Text style={styles.manualInputLabel}>Saisie manuelle du token QR :</Text>
                <TextInput
                  style={styles.manualInput}
                  value={manualToken}
                  onChangeText={setManualToken}
                  placeholder="Entrez le token QR ici..."
                  multiline
                />
                
                <TouchableOpacity
                  style={[styles.scanButton, { opacity: manualToken.trim() ? 1 : 0.6 }]}
                  onPress={handleManualScan}
                  disabled={!manualToken.trim() || loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Ionicons name="scan" size={20} color="white" />
                      <Text style={styles.scanButtonText}>Scanner le QR Code</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.cameraContainer}>
              {scanning ? (
                <View style={styles.cameraWrapper}>
                  <BarCodeScanner
                    onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
                    style={styles.camera}
                  />
                  
                  <View style={styles.scanOverlay}>
                    <View style={styles.scanFrame} />
                    <Text style={styles.scanInstructions}>
                      Placez le QR code dans le cadre pour le scanner
                    </Text>
                  </View>
                  
                  <View style={styles.cameraControls}>
                    <TouchableOpacity 
                      style={styles.controlButton}
                      onPress={stopScanning}
                    >
                      <Ionicons name="close" size={24} color="white" />
                      <Text style={styles.controlButtonText}>Arrêter</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.controlButton}
                      onPress={() => setUseManualMode(true)}
                    >
                      <Ionicons name="keypad" size={24} color="white" />
                      <Text style={styles.controlButtonText}>Manuel</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {loading && (
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator size="large" color="white" />
                      <Text style={styles.loadingText}>Traitement...</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.startScanContainer}>
                  <Ionicons name="qr-code-outline" size={80} color="#007AFF" />
                  <Text style={styles.startScanTitle}>Scanner QR Code</Text>
                  <Text style={styles.startScanSubtitle}>
                    Appuyez pour ouvrir la caméra et scanner le QR code du client
                  </Text>
                  
                  <TouchableOpacity 
                    style={styles.startScanButton}
                    onPress={startScanning}
                  >
                    <Ionicons name="camera" size={24} color="white" />
                    <Text style={styles.startScanButtonText}>Ouvrir la caméra</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.manualModeButton}
                    onPress={() => setUseManualMode(true)}
                  >
                    <Ionicons name="keypad-outline" size={20} color="#666" />
                    <Text style={styles.manualModeButtonText}>Mode manuel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
              disabled={!manualToken.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="scan" size={20} color="white" />
                  <Text style={styles.scanButtonText}>Scanner le QR Code</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
          )}
        </View>
      )}

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Instructions</Text>
        <Text style={styles.infoText}>
          {activeSession 
            ? '• Surveillez le temps de la séance\n• Appuyez sur "Terminer" quand c\'est fini\n• La séance se termine automatiquement après la durée prévue'
            : '• Scannez le QR code du client\n• La séance commencera automatiquement\n• Vous pouvez l\'arrêter manuellement si besoin'
          }
        </Text>
      </View>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
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
  activeSessionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionCard: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    width: width - 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  statusBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 12,
  },
  clientName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  sessionTime: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 10,
  },
  sessionInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
  },
  endButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc3545',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 180,
  },
  endButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  scannerContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  mockCameraContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  mockCameraText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  manualInputContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  manualInputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  manualInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  infoSection: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
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
