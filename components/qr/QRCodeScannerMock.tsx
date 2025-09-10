// QRCodeScannerMock.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
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
  onSessionEnded,
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
    // Demande la permission si jamais non récupérée
    if (!permission) requestPermission();
    loadActiveSession();

    const timer = setInterval(() => {
      if (activeSession) updateSessionTime();
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachId, activeSession]);

  const loadActiveSession = async () => {
    try {
      const session = await appointmentService.getActiveSessionForCoach(coachId);
      if (session) {
        setActiveSession(session);
        // console.log('✅ QR SCANNER - Session chargée:', session);
      } else {
        setActiveSession(null);
      }
    } catch (error) {
      console.error('❌ QR SCANNER - Erreur chargement session:', error);
    }
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

  const handleBarcodeScanned = async (result: { type: string; data: string }) => {
    if (scanned || loading) return;

    // Optionnel: ignore si ce n'est pas un QR
    if (!String(result.type).toLowerCase().includes('qr')) return;

    setScanned(true);
    setScanningActive(false);
    setLoading(true);

    try {
      const scan = await appointmentService.scanQRCode(result.data, coachId);

      if (scan.success && scan.appointmentId) {
        Alert.alert(
          'Séance commencée !',
          `Séance démarrée pour ${scan.clientName}. Durée prévue: ${scan.duration} minutes.`,
          [{ text: 'OK', onPress: () => setScanned(false) }],
        );

        await loadActiveSession();
        onSessionStarted?.(scan.appointmentId);
      } else {
        Alert.alert('Erreur', scan.message || 'QR code invalide', [
          { text: 'OK', onPress: () => setScanned(false) },
        ]);
      }
    } catch (error) {
      console.error('❌ QR SCANNER - Erreur scan:', error);
      Alert.alert(
        'Erreur',
        `Impossible de scanner le QR code: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        [{ text: 'OK', onPress: () => setScanned(false) }],
      );
    } finally {
      setLoading(false);
    }
  };

  const handleManualScan = async () => {
    if (!manualToken.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un token QR');
      return;
    }
    setLoading(true);
    try {
      const result = await appointmentService.scanQRCode(manualToken, coachId);
      if (result.success && result.appointmentId) {
        Alert.alert(
          'Séance commencée !',
          `Séance démarrée pour ${result.clientName}. Durée prévue: ${result.duration} minutes.`,
        );
        await loadActiveSession();
        onSessionStarted?.(result.appointmentId);
        setManualToken('');
      } else {
        Alert.alert('Erreur', result.message || 'QR invalide');
      }
    } catch (error) {
      console.error('❌ QR SCANNER - Erreur scan manuel:', error);
      Alert.alert(
        'Erreur',
        `Impossible de scanner le QR code: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const endCurrentSession = async () => {
    if (!activeSession) return;
    Alert.alert('Terminer la séance', 'Êtes-vous sûr de vouloir terminer cette séance ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Terminer',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await appointmentService.endSession(activeSession.appointmentId, coachId);
            Alert.alert('Séance terminée', 'La séance a été terminée avec succès.');
            const ended = activeSession.appointmentId;
            setActiveSession(null);
            onSessionEnded?.(ended);
          } catch (error) {
            console.error('❌ QR SCANNER - Erreur fin de session:', error);
            Alert.alert(
              'Erreur',
              `Impossible de terminer la séance: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
            );
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const startScanning = () => {
    setScanned(false);
    setScanningActive(true);
  };

  const stopScanning = () => {
    setScanningActive(false);
    setScanned(false);
  };

  const getStatusColor = () => (activeSession ? '#28a745' : '#007AFF');
  const getStatusText = () => (activeSession ? 'Séance en cours' : 'Prêt à scanner');

  // Écrans de permission
  if (!permission) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 12, color: '#666' }}>Préparation de la caméra…</Text>
      </View>
    );
  }

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

            <TouchableOpacity style={styles.endButton} onPress={endCurrentSession} disabled={loading}>
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
          {!permission.granted || useManualMode ? (
            <View>
              <View style={styles.mockCameraContainer}>
                <Ionicons name="close" size={64} color="#ccc" />
                <Text style={styles.mockCameraText}>
                  {!permission.granted
                    ? 'Permission caméra refusée\nMode manuel uniquement'
                    : 'Mode manuel'}
                </Text>

                {permission.granted && (
                  <TouchableOpacity style={styles.switchModeButton} onPress={() => setUseManualMode(false)}>
                    <Ionicons name="camera" size={20} color="#007AFF" />
                    <Text style={styles.switchModeText}>Utiliser la caméra</Text>
                  </TouchableOpacity>
                )}

                {!permission.granted && (
                  <TouchableOpacity style={styles.switchModeButton} onPress={requestPermission}>
                    <Ionicons name="key" size={20} color="#007AFF" />
                    <Text style={styles.switchModeText}>Autoriser la caméra</Text>
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
                  <CameraView
                    style={styles.camera}
                    facing="back"
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                  />

                  <View style={styles.scanOverlay}>
                    <View style={styles.scanFrame} />
                    <Text style={styles.scanInstructions}>
                      Placez le QR code dans le cadre pour le scanner
                    </Text>
                  </View>

                  <View style={styles.cameraControls}>
                    <TouchableOpacity style={styles.controlButton} onPress={stopScanning}>
                      <Ionicons name="close" size={24} color="white" />
                      <Text style={styles.controlButtonText}>Arrêter</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.controlButton} onPress={() => setUseManualMode(true)}>
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
                  <Text style={styles.startScanTitle}>
                    Appuyez pour ouvrir la caméra et scanner le QR code du client
                  </Text>

                  <TouchableOpacity style={styles.scanButton} onPress={startScanning}>
                    <Ionicons name="camera" size={24} color="white" />
                    <Text style={styles.scanButtonText}>Ouvrir la caméra</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.manualModeButton} onPress={() => setUseManualMode(true)}>
                    <Ionicons name="keypad-outline" size={20} color="#666" />
                    <Text style={styles.manualModeButtonText}>Mode manuel</Text>
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
            : '• Scannez le QR code du client\n• La séance commencera automatiquement\n• Vous pouvez l\'arrêter manuellement si besoin'}
        </Text>
      </View>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 12,
    fontWeight: 'bold',
  },
  startScanContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: 24,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  startScanTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },

  header: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginTop: 10 },
  subtitle: { fontSize: 16, color: '#666', marginTop: 5 },

  activeSessionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  statusBadgeText: { color: 'white', fontWeight: 'bold', marginLeft: 6, fontSize: 12 },
  clientName: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  sessionTime: { fontSize: 32, fontWeight: 'bold', color: '#007AFF', marginBottom: 10 },
  sessionInfo: { fontSize: 14, color: '#666', marginBottom: 30 },
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
  endButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },

  scannerContainer: { flex: 1, justifyContent: 'center' },

  // Caméra (expo-camera)
  cameraContainer: { flex: 1, justifyContent: 'center' },
  cameraWrapper: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  camera: { flex: 1 },

  scanOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: 250, height: 250, borderWidth: 2, borderColor: 'white', borderRadius: 20, backgroundColor: 'transparent' },
  scanInstructions: { color: 'white', fontSize: 14, marginTop: 16, textAlign: 'center' },

  cameraControls: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  controlButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButtonText: { color: 'white', fontWeight: '600', marginLeft: 8 },

  // Mode manuel
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
  mockCameraText: { marginTop: 20, fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24 },
  switchModeButton: {
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(0,122,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchModeText: { color: '#007AFF', fontWeight: '600' },

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
  manualInputLabel: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },
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
  scanButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },

  manualModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  manualModeButtonText: {
    color: '#666',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },

  // Infos
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
  infoTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  infoText: { fontSize: 14, color: '#666', lineHeight: 20 },
});
