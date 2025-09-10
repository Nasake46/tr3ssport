// QRCodeScannerOptimized.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useActiveSession } from '@/hooks/useActiveSession';
import { useSessionTimer } from '@/hooks/useSessionTimer';

interface QRCodeScannerOptimizedProps {
  coachId: string;
  onSessionStarted?: (appointmentId: string) => void;
  onSessionEnded?: (appointmentId: string) => void;
}

export default function QRCodeScannerOptimized({
  coachId,
  onSessionStarted,
  onSessionEnded,
}: QRCodeScannerOptimizedProps) {
  const [manualToken, setManualToken] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Permissions caméra via expo-camera
  const [permission, requestPermission] = useCameraPermissions();
  const hasPermission = !!permission?.granted;

  const [showEndConfirmModal, setShowEndConfirmModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [modalMessage, setModalMessage] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'success' | 'error',
  });

  const isWeb = Platform.OS === 'web';
  const [cameraFacing, setCameraFacing] = useState<'back' | 'front'>('back');

  // Hooks custom
  const {
    activeSession,
    loading,
    loadActiveSession,
    startSession,
    endSession,
  } = useActiveSession(coachId);

  const { sessionTime, totalSeconds } = useSessionTimer(activeSession);

  useEffect(() => {
    loadActiveSession();
    // Demande la permission si pas encore déterminée
    (async () => {
      if (!permission) {
        await requestPermission();
      }
      await checkCameraAvailability(); // renseigne cameraError au besoin
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachId]);

  const showMessage = (
    title: string,
    message: string,
    type: 'info' | 'success' | 'error' = 'info'
  ) => {
    setModalMessage({ title, message, type });
    setShowMessageModal(true);
  };

  const checkCameraAvailability = async () => {
    try {
      // HTTPS requis sur web (hors localhost)
      if (isWeb && typeof window !== 'undefined') {
        const host = window.location.hostname;
        const isLocal =
          host === 'localhost' || host === '127.0.0.1' || host === '::1';
        if (!window.isSecureContext && !isLocal) {
          setCameraError(
            "Le navigateur bloque la caméra car le site n'est pas en HTTPS. Ouvrez le site en HTTPS (ou en localhost)."
          );
          return false;
        }
      }

      if (typeof window !== 'undefined' && navigator.mediaDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((d) => d.kind === 'videoinput');
        if (cameras.length === 0) {
          setCameraError('Aucune caméra détectée');
          return false;
        }
      }
      setCameraError(null);
      return true;
    } catch (e) {
      setCameraError(
        `Erreur caméra: ${e instanceof Error ? e.message : 'Erreur inconnue'}`
      );
      return false;
    }
  };

  const handleCameraScan = async () => {
    if (!permission) {
      const res = await requestPermission();
      if (!res.granted) {
        showMessage(
          'Permission refusée',
          "Veuillez autoriser l'accès à la caméra dans les réglages.",
          'error'
        );
        return;
      }
    } else if (!permission.granted) {
      showMessage(
        'Permission refusée',
        "Veuillez autoriser l'accès à la caméra dans les réglages.",
        'error'
      );
      return;
    }

    const cameraOk = await checkCameraAvailability();
    if (!cameraOk) {
      showMessage(
        'Caméra non disponible',
        cameraError || "Impossible d'accéder à la caméra. Utilisez la saisie manuelle.",
        'error'
      );
      return;
    }

    setScanned(false);
    setScanning(true);
  };

  const handleBarCodeScanned = async (payload: { type: string; data: string }) => {
    if (scanned || loading) return;
    // Option : filtrer non-QR si besoin
    if (!String(payload.type).toLowerCase().includes('qr')) return;

    setScanned(true);
    setScanning(false);

    const result = await startSession(payload.data);

    if (result.success) {
      showMessage(
        'Séance commencée !',
        `La séance avec ${result.clientName} a commencé.\nDurée prévue: ${result.duration} minutes`,
        'success'
      );
      onSessionStarted?.(result.appointmentId!);
    } else {
      showMessage('Erreur', result.message, 'error');
      setScanned(false);
    }
  };

  const handleManualScan = async () => {
    if (!manualToken.trim()) {
      showMessage('Erreur', 'Veuillez saisir un code QR', 'error');
      return;
    }
    const result = await startSession(manualToken);
    if (result.success) {
      showMessage(
        'Séance commencée !',
        `La séance avec ${result.clientName} a commencé.\nDurée prévue: ${result.duration} minutes`,
        'success'
      );
      setManualToken('');
      onSessionStarted?.(result.appointmentId!);
    } else {
      showMessage('Erreur', result.message, 'error');
    }
  };

  const handleEndSession = () => {
    if (!activeSession) {
      showMessage('Erreur', 'Aucune session active à terminer', 'error');
      return;
    }
    setShowEndConfirmModal(true);
  };

  const confirmEndSession = async () => {
    setShowEndConfirmModal(false);
    try {
      const result = await endSession();
      if (result?.success) {
        showMessage('Séance terminée', 'La séance a été terminée avec succès', 'success');
        onSessionEnded?.(activeSession!.appointmentId);
      } else {
        showMessage('Erreur', result?.message || 'Erreur lors de la fin de session', 'error');
      }
    } catch (e) {
      showMessage(
        'Erreur',
        `Erreur inattendue: ${e instanceof Error ? e.message : 'Erreur inconnue'}`,
        'error'
      );
    }
  };

  const cancelEndSession = () => setShowEndConfirmModal(false);

  // ——— UI session active
  if (activeSession) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="fitness" size={32} color="#28a745" />
          <Text style={styles.title}>Séance en cours</Text>
          <Text style={styles.subtitle}>Avec {activeSession.clientName}</Text>
        </View>

        <View style={styles.sessionCard}>
          <View style={styles.timerContainer}>
            <Text style={styles.sessionTime}>{sessionTime}</Text>
            <Text style={styles.sessionLabel}>Temps écoulé</Text>
            <Text style={styles.sessionSeconds}>{totalSeconds} secondes</Text>
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
          onPress={handleEndSession}
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

        {/* (Debug) */}
        {__DEV__ && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugText}>
              DEBUG - Modal Confirm: {showEndConfirmModal ? 'VISIBLE' : 'MASQUÉ'}
            </Text>
            <Text style={styles.debugText}>
              DEBUG - Modal Message: {showMessageModal ? 'VISIBLE' : 'MASQUÉ'}
            </Text>
          </View>
        )}

        {/* Modal Confirmation */}
        <Modal
          visible={showEndConfirmModal}
          animationType="slide"
          transparent
          onRequestClose={cancelEndSession}
        >
          <View style={styles.modalBackground}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Terminer la séance</Text>
              <Text style={styles.modalMessage}>
                Voulez-vous terminer la séance avec {activeSession.clientName} ?
              </Text>

              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#dc3545' }]}
                  onPress={confirmEndSession}
                >
                  <Text style={styles.modalButtonText}>Oui, terminer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#007AFF' }]}
                  onPress={cancelEndSession}
                >
                  <Text style={styles.modalButtonText}>Annuler</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal Message */}
        <Modal
          visible={showMessageModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowMessageModal(false)}
        >
          <View style={styles.modalBackground}>
            <View style={styles.modalContainer}>
              <Text
                style={[
                  styles.modalTitle,
                  { color: modalMessage.type === 'success' ? '#28a745' : modalMessage.type === 'error' ? '#dc3545' : '#333' },
                ]}
              >
                {modalMessage.title}
              </Text>
              <Text style={styles.modalMessage}>{modalMessage.message}</Text>
              <TouchableOpacity style={styles.modalButton} onPress={() => setShowMessageModal(false)}>
                <Text style={styles.modalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ——— UI scan / manuel
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="scan" size={32} color="#007AFF" />
        <Text style={styles.title}>Scanner QR Code</Text>
        <Text style={styles.subtitle}>Commencer une nouvelle séance</Text>
      </View>

      {/* Option 1 — caméra */}
      <View style={styles.scanSection}>
        <Text style={styles.sectionTitle}>Scanner avec la caméra</Text>

        <TouchableOpacity
          style={[
            styles.cameraButton,
            { opacity: permission?.granted !== false && !loading ? 1 : 0.6 },
          ]}
          onPress={handleCameraScan}
          disabled={permission?.granted === false || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="camera" size={24} color="white" />
              <Text style={styles.cameraButtonText}>Ouvrir la caméra</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Diagnostic web */}
        {typeof window !== 'undefined' && (
          <TouchableOpacity
            style={styles.diagnosticButton}
            onPress={async () => {
              try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                stream.getTracks().forEach((t) => t.stop());
                Alert.alert(
                  'Diagnostic',
                  'Caméra web accessible ! Le problème vient peut-être du scanner QR.'
                );
              } catch (error) {
                Alert.alert(
                  'Diagnostic',
                  `Erreur caméra: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
                );
              }
            }}
          >
            <Ionicons name="bug" size={16} color="#fff" />
            <Text style={styles.diagnosticButtonText}>Test caméra</Text>
          </TouchableOpacity>
        )}

        {permission?.granted === false && (
          <Text style={styles.permissionText}>
            Autorisez l'accès à la caméra dans les paramètres pour utiliser cette fonction
          </Text>
        )}
        {cameraError && <Text style={styles.errorText}>⚠️ {cameraError}</Text>}
      </View>

      {/* Séparateur */}
      <View style={styles.separator}>
        <View style={styles.separatorLine} />
        <Text style={styles.separatorText}>OU</Text>
        <View style={styles.separatorLine} />
      </View>

      {/* Option 2 — manuel */}
      <View style={styles.scanSection}>
        <Text style={styles.sectionTitle}>Saisie manuelle du QR Code</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={manualToken}
            onChangeText={setManualToken}
            placeholder="Collez le token QR ici..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity
          style={[styles.scanButton, { opacity: manualToken.trim() && !loading ? 1 : 0.6 }]}
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

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Instructions</Text>
        <Text style={styles.infoText}>
          1. Le client génère son QR code 30 minutes avant la séance{'\n'}
          2. Utilisez la caméra pour scanner directement OU{'\n'}
          3. Copiez et collez le code dans le champ de saisie{'\n'}
          4. Le chronomètre démarrera automatiquement{'\n'}
          5. Vous pouvez terminer la séance manuellement
        </Text>
      </View>

      {/* Modal Scanner (expo-camera partout) */}
      <Modal visible={scanning} animationType="slide" onRequestClose={() => setScanning(false)}>
        <View style={styles.scannerModal}>
          <View className="scannerTopBar" style={styles.scannerTopBar}>
            <TouchableOpacity onPress={() => setScanning(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.scannerModalTitle}>Scanner QR Code</Text>
            <TouchableOpacity
              onPress={() => setCameraFacing((prev) => (prev === 'back' ? 'front' : 'back'))}
              style={styles.closeButton}
            >
              <Ionicons name="camera-reverse" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing={cameraFacing}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            // @ts-ignore (selon versions)
            onMountError={(e: any) => {
              if (cameraFacing === 'back') {
                setCameraFacing('front');
                setCameraError(
                  "Impossible d'ouvrir la caméra arrière, tentative avec la caméra avant…"
                );
              } else {
                setCameraError(e?.message || 'Erreur caméra inconnue');
              }
            }}
            // @ts-ignore (selon versions)
            onCameraReady={() => setCameraError(null)}
          />

          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame} />
            <Text style={styles.scannerInstructions}>Centrer le QR code dans le cadre</Text>
          </View>

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="white" />
              <Text style={styles.loadingText}>Validation en cours...</Text>
            </View>
          )}

          {!!cameraError && (
            <View style={styles.loadingOverlay}>
              <Text style={styles.loadingText}>⚠️ {cameraError}</Text>
              <TouchableOpacity
                style={[styles.modalButton, { marginTop: 16 }]}
                onPress={() => setScanning(false)}
              >
                <Text style={styles.modalButtonText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* Modal Message */}
      <Modal
        visible={showMessageModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowMessageModal(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text
              style={[
                styles.modalTitle,
                { color: modalMessage.type === 'success' ? '#28a745' : modalMessage.type === 'error' ? '#dc3545' : '#333' },
              ]}
            >
              {modalMessage.title}
            </Text>
            <Text style={styles.modalMessage}>{modalMessage.message}</Text>

            <TouchableOpacity style={styles.modalButton} onPress={() => setShowMessageModal(false)}>
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  header: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginTop: 10 },
  subtitle: { fontSize: 16, color: '#666', marginTop: 5 },
  sessionCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  timerContainer: { alignItems: 'center', marginBottom: 20 },
  sessionTime: { fontSize: 48, fontWeight: 'bold', color: '#28a745', fontFamily: 'monospace' },
  sessionLabel: { fontSize: 16, color: '#666', marginTop: 5 },
  sessionSeconds: { fontSize: 12, color: '#999', marginTop: 2 },
  sessionDetails: { alignItems: 'center' },
  detailText: { fontSize: 14, color: '#666', marginBottom: 5 },
  endButton: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  endButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  buttonDisabled: { opacity: 0.6 },

  scanSection: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  inputContainer: { marginBottom: 15 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  scanButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },

  infoSection: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  infoText: { fontSize: 14, color: '#666', lineHeight: 20 },

  cameraButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cameraButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  permissionText: { fontSize: 12, color: '#dc3545', textAlign: 'center', marginTop: 5, fontStyle: 'italic' },
  errorText: { fontSize: 12, color: '#dc3545', textAlign: 'center', marginTop: 5, fontWeight: 'bold', backgroundColor: '#ffe6e6', padding: 8, borderRadius: 4 },
  diagnosticButton: {
    backgroundColor: '#6c757d',
    padding: 8,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },
  diagnosticButtonText: { color: 'white', fontSize: 12, marginLeft: 4 },

  separator: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  separatorLine: { flex: 1, height: 1, backgroundColor: '#ddd' },
  separatorText: { marginHorizontal: 15, fontSize: 14, color: '#666', fontWeight: 'bold' },

  // Scanner modal
  scannerModal: { flex: 1, backgroundColor: 'black' },
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
  closeButton: { padding: 8 },
  scannerModalTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  scannerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  scannerFrame: { width: 250, height: 250, borderWidth: 2, borderColor: 'white', borderRadius: 20, backgroundColor: 'transparent' },
  scannerInstructions: { color: 'white', fontSize: 16, textAlign: 'center', marginTop: 30, paddingHorizontal: 40 },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: 'white', fontSize: 16, marginTop: 16 },

  modalBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: 'white', borderRadius: 12, padding: 20, width: '80%', maxWidth: 300 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  modalMessage: { fontSize: 14, color: '#333', marginBottom: 20, textAlign: 'center' },
  modalButton: { backgroundColor: '#007AFF', padding: 12, borderRadius: 8, alignItems: 'center', margin: 5, flex: 1 },
  modalButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  modalButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },

  // Debug
  debugContainer: { backgroundColor: '#ffeb3b', padding: 10, borderRadius: 4, marginTop: 10, borderWidth: 1, borderColor: '#ff9800' },
  debugText: { fontSize: 12, color: '#333', fontWeight: 'bold' },
});
