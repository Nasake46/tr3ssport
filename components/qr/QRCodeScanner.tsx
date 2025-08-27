import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Modal,
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

export default function QRCodeScanner({ 
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

  useEffect(() => {
    getCameraPermissions();
    loadActiveSession();
  }, [coachId]);

  // Timer séparé pour le temps de session
  useEffect(() => {
    if (!activeSession) return;
    
    const timer = setInterval(() => {
      updateSessionTime();
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSession]);

  const getCameraPermissions = async () => {
    const { status } = await BarCodeScanner.requestPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const loadActiveSession = async () => {
    try {
      const session = await appointmentService.getActiveSessionForCoach(coachId);
      if (session && (!activeSession || session.appointmentId !== activeSession.appointmentId)) {
        setActiveSession(session);
      } else if (!session && activeSession) {
        setActiveSession(null);
      }
    } catch (error) {
      console.error('❌ QR SCANNER - Erreur chargement session active:', error);
    }
  };

  const updateSessionTime = () => {
    if (!activeSession) return;
    
    const now = new Date();
    const elapsed = now.getTime() - activeSession.actualStartTime.getTime();
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    setSessionTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || loading) return;
    
    setScanned(true);
    setLoading(true);
    
    try {
      const result = await appointmentService.scanQRCode(data, coachId);
      
      if (result.success) {
        // Session démarrée avec succès
        const newSession: ActiveSession = {
          appointmentId: result.appointmentId!,
          clientName: result.clientName || 'Client',
          startTime: new Date(result.appointmentTime!),
          expectedDuration: result.duration || 60,
          actualStartTime: new Date()
        };
        
        setActiveSession(newSession);
        setScanningActive(false);
        onSessionStarted?.(result.appointmentId!);
        
        Alert.alert(
          'Séance commencée ! ✅',
          `Session avec ${newSession.clientName} démarrée.\nDurée prévue: ${newSession.expectedDuration} minutes`,
          [{ text: 'OK' }]
        );
        
        // Programmer la fin automatique
        setTimeout(() => {
          handleAutoEndSession();
        }, newSession.expectedDuration * 60 * 1000);
        
      } else {
        // Erreur de validation
        Alert.alert(
          'Erreur de validation',
          result.error || result.message || 'QR code invalide',
          [{ text: 'OK', onPress: () => setScanned(false) }]
        );
      }
    } catch (error) {
      console.error('Erreur scan QR:', error);
      Alert.alert(
        'Erreur',
        'Impossible de valider le QR code',
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAutoEndSession = async () => {
    if (!activeSession) return;
    
    Alert.alert(
      'Fin de séance',
      `La séance de ${activeSession.expectedDuration} minutes est terminée. Voulez-vous l'arrêter maintenant ?`,
      [
        {
          text: 'Continuer',
          style: 'cancel'
        },
        {
          text: 'Terminer',
          onPress: () => endSession(true)
        }
      ]
    );
  };

  const endSession = async (automatic = false) => {
    if (!activeSession) return;
    
    setLoading(true);
    try {
      await appointmentService.endSession(activeSession.appointmentId, coachId);
      
      const endedSession = activeSession;
      setActiveSession(null);
      onSessionEnded?.(endedSession.appointmentId);
      
      Alert.alert(
        'Séance terminée ✅',
        `Session avec ${endedSession.clientName} terminée ${automatic ? 'automatiquement' : 'manuellement'}.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Erreur fin de session:', error);
      Alert.alert('Erreur', 'Impossible de terminer la session');
    } finally {
      setLoading(false);
    }
  };

  const startScanning = () => {
    setScanned(false);
    setScanningActive(true);
  };

  const stopScanning = () => {
    setScanningActive(false);
    setScanned(false);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.permissionText}>Demande d'autorisation caméra...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
                    <Ionicons name="camera-outline" size={64} color="#999" />
        <Text style={styles.permissionText}>Accès caméra refusé</Text>
        <TouchableOpacity style={styles.retryButton} onPress={getCameraPermissions}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Session active */}
      {activeSession ? (
        <View style={styles.activeSessionContainer}>
          <View style={styles.sessionHeader}>
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionTitle}>Séance en cours</Text>
              <Text style={styles.clientName}>{activeSession.clientName}</Text>
              <Text style={styles.sessionTime}>{sessionTime}</Text>
            </View>
            <View style={styles.sessionBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.badgeText}>ACTIF</Text>
            </View>
          </View>
          
          <View style={styles.sessionDetails}>
            <View style={styles.timeInfo}>
              <Ionicons name="time" size={16} color="#666" />
              <Text style={styles.timeText}>
                Début: {activeSession.actualStartTime.toLocaleTimeString()}
              </Text>
            </View>
            <View style={styles.timeInfo}>
              <Ionicons name="timer" size={16} color="#666" />
              <Text style={styles.timeText}>
                Durée prévue: {activeSession.expectedDuration} min
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.endButton}
            onPress={() => endSession(false)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="stop-circle" size={20} color="white" />
                <Text style={styles.endButtonText}>Terminer la séance</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        /* Scanner QR */
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <Ionicons name="qr-code-outline" size={32} color="#007AFF" />
            <Text style={styles.scannerTitle}>Scanner QR Code</Text>
            <Text style={styles.scannerSubtitle}>
              Scannez le QR code du client pour commencer la séance
            </Text>
          </View>

          <TouchableOpacity
            style={styles.scanButton}
            onPress={startScanning}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="camera" size={24} color="white" />
                <Text style={styles.scanButtonText}>Commencer le scan</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.instructions}>
            <Text style={styles.instructionsTitle}>Instructions :</Text>
            <Text style={styles.instructionsText}>
              • Demandez au client de générer son QR code{'\n'}
              • Pointez la caméra vers le QR code{'\n'}
              • La séance démarrera automatiquement{'\n'}
              • Vous pourrez la terminer manuellement si besoin
            </Text>
          </View>
        </View>
      )}

      {/* Modal Scanner */}
      <Modal
        visible={scanning}
        animationType="slide"
        onRequestClose={stopScanning}
      >
        <View style={styles.scannerModal}>
          <View style={styles.scannerTopBar}>
            <TouchableOpacity onPress={stopScanning} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.scannerModalTitle}>Scanner QR Code</Text>
            <View style={{ width: 24 }} />
          </View>

          <BarCodeScanner
            onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame} />
            <Text style={styles.scannerInstructions}>
              Centrez le QR code dans le cadre
            </Text>
          </View>

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="white" />
              <Text style={styles.loadingText}>Validation en cours...</Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Session active
  activeSessionContainer: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 8,
  },
  sessionTime: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#28a745',
  },
  sessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  activeDot: {
    width: 8,
    height: 8,
    backgroundColor: 'white',
    borderRadius: 4,
    marginRight: 6,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sessionDetails: {
    marginBottom: 20,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  endButton: {
    backgroundColor: '#dc3545',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  endButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },

  // Scanner
  scannerContainer: {
    padding: 20,
  },
  scannerHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  scannerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  scannerSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  scanButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 30,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  instructions: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
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
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },

  // Modal Scanner
  scannerModal: {
    flex: 1,
    backgroundColor: 'black',
  },
  scannerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 10,
  },
  closeButton: {
    padding: 8,
  },
  scannerModalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  scannerInstructions: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 30,
    paddingHorizontal: 40,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
  },
});
