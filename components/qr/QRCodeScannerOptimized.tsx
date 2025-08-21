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
import { BarCodeScanner } from 'expo-barcode-scanner';
import { CameraView, Camera } from 'expo-camera';
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
  onSessionEnded 
}: QRCodeScannerOptimizedProps) {
  const [manualToken, setManualToken] = useState('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showEndConfirmModal, setShowEndConfirmModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [modalMessage, setModalMessage] = useState({ title: '', message: '', type: 'info' as 'info' | 'success' | 'error' });
  const isWeb = Platform.OS === 'web';
  // Ajout: orientation caméra avec fallback (web/desktop)
  const [cameraFacing, setCameraFacing] = useState<'back' | 'front'>('back');
  
  // Utilisation des hooks personnalisés
  const {
    activeSession,
    loading,
    loadActiveSession,
    startSession,
    endSession,
    endSessionWithConfirmation
  } = useActiveSession(coachId);
  
  const { sessionTime, totalSeconds } = useSessionTimer(activeSession);

  // Debug pour surveiller l'état du modal
  useEffect(() => {
    console.log('🔍 MODAL DEBUG - showEndConfirmModal:', showEndConfirmModal);
    console.log('🔍 MODAL DEBUG - showMessageModal:', showMessageModal);
  }, [showEndConfirmModal, showMessageModal]);

  // Fonction helper pour afficher des messages
  const showMessage = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setModalMessage({ title, message, type });
    setShowMessageModal(true);
  };

  // Charger la session active au montage du composant
  useEffect(() => {
    loadActiveSession();
    
    // Vérifier les permissions immédiatement
    const initCamera = async () => {
      await getCameraPermissions();
      await checkCameraAvailability();
    };
    
    initCamera();
  }, [loadActiveSession]);

  const getCameraPermissions = async () => {
    try {
      console.log('📷 CAMÉRA - Demande de permissions...');
      let status: string | undefined;

      if (isWeb) {
        const result = await Camera.requestCameraPermissionsAsync();
        status = result.status;
      } else {
        const result = await BarCodeScanner.requestPermissionsAsync();
        status = result.status;
      }

      console.log('📷 CAMÉRA - Statut permission:', status);
      setHasPermission(status === 'granted');

      if (status === 'granted') {
        console.log('✅ CAMÉRA - Permissions accordées');
        setCameraError(null);
      } else {
        console.log('❌ CAMÉRA - Permissions refusées');
        setCameraError('Permissions caméra refusées');
      }
    } catch (error) {
      console.error('❌ CAMÉRA - Erreur permissions:', error);
      setHasPermission(false);
      setCameraError(`Erreur permissions: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const checkCameraAvailability = async () => {
    try {
      console.log('📷 CAMÉRA - Vérification basique...');
      
      // Vérifier le contexte sécurisé sur le web (HTTPS requis hors localhost)
      if (isWeb && typeof window !== 'undefined') {
        const host = window.location.hostname;
        const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1';
        if (!window.isSecureContext && !isLocal) {
          const msg = 'Le navigateur bloque la caméra car le site n\'est pas en HTTPS. Ouvrez le site en HTTPS (ou en localhost).';
          console.warn('⚠️ CAMÉRA - Contexte non sécurisé:', { host, isSecureContext: window.isSecureContext });
          setCameraError(msg);
          return false;
        }
      }
      
      // Test simple pour voir si on peut utiliser la caméra
      if (typeof window !== 'undefined' && navigator.mediaDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');
        console.log('📷 CAMÉRA - Caméras détectées:', cameras.length);
        
        if (cameras.length === 0) {
          setCameraError('Aucune caméra détectée');
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ CAMÉRA - Erreur vérification:', error);
      setCameraError(`Erreur caméra: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      return false;
    }
  };

  const handleCameraScan = async () => {
    console.log('📷 CAMÉRA - Début handleCameraScan');
    
    if (hasPermission === null) {
      showMessage('Permission', 'Demande d\'autorisation caméra en cours...', 'info');
      return;
    }
    if (hasPermission === false) {
      showMessage(
        'Permission refusée', 
        'Veuillez autoriser l\'accès à la caméra dans les paramètres',
        'error'
      );
      return;
    }
    
    // Vérifier la disponibilité de la caméra
    const cameraOk = await checkCameraAvailability();
    if (!cameraOk) {
      showMessage(
        'Caméra non disponible', 
        cameraError || 'Impossible d\'accéder à la caméra. Utilisez la saisie manuelle.',
        'error'
      );
      return;
    }
    
    console.log('📷 CAMÉRA - Ouverture du scanner...');
    setScanned(false);
    setScanning(true);
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || loading) return;
    
    console.log('📷 CAMÉRA - QR Code scanné:', { type, data: data.substring(0, 50) + '...' });
    
    setScanned(true);
    setScanning(false);
    
    const result = await startSession(data);
    
    if (result.success) {
      showMessage(
        'Séance commencée !',
        `La séance avec ${result.clientName} a commencé.\nDurée prévue: ${result.duration} minutes`,
        'success'
      );
      onSessionStarted?.(result.appointmentId!);
    } else {
      showMessage('Erreur', result.message, 'error');
      setScanned(false); // Permettre de réessayer
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
    console.log('🎯 QR OPTIMIZED - DÉBUT handleEndSession');
    console.log('🎯 QR OPTIMIZED - activeSession:', !!activeSession);
    console.log('🎯 QR OPTIMIZED - loading:', loading);
    console.log('🎯 QR OPTIMIZED - coachId:', coachId);
    
    if (!activeSession) {
      console.log('❌ QR OPTIMIZED - Pas de session active');
      showMessage('Erreur', 'Aucune session active à terminer', 'error');
      return;
    }
    
    const sessionId = activeSession.appointmentId;
    const clientName = activeSession.clientName;
    console.log('🎯 QR OPTIMIZED - Session ID:', sessionId);
    console.log('🎯 QR OPTIMIZED - Client:', clientName);
    
    console.log('🎯 QR OPTIMIZED - Affichage dialogue confirmation...');
    
    // Utiliser notre modal personnalisé au lieu d'Alert
    console.log('🎯 QR OPTIMIZED - Tentative d\'affichage modal...');
    setShowEndConfirmModal(true);
    console.log('🎯 QR OPTIMIZED - setShowEndConfirmModal(true) appelé');
    
    // Fallback temporaire pour debug avec window.confirm
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        console.log('🎯 QR OPTIMIZED - Test fallback window.confirm...');
        const confirmed = window.confirm(`Voulez-vous vraiment terminer la séance avec ${activeSession?.clientName || 'le client'} ?`);
        if (confirmed) {
          console.log('🎯 QR OPTIMIZED - Confirmation via window.confirm');
          confirmEndSession();
        } else {
          console.log('🎯 QR OPTIMIZED - Annulation via window.confirm');
        }
      }
    }, 1000); // Délai pour permettre au modal de s'afficher en premier
  };

  const confirmEndSession = async () => {
    console.log('🎯 QR OPTIMIZED - CONFIRMATION UTILISATEUR');
    console.log('🎯 QR OPTIMIZED - Début de la séquence d\'arrêt...');
    
    if (!activeSession) return;
    
    const sessionId = activeSession.appointmentId;
    const clientName = activeSession.clientName;
    
    setShowEndConfirmModal(false);
    
    try {
      console.log('🎯 QR OPTIMIZED - Appel endSession() du hook...');
      console.log('🎯 QR OPTIMIZED - Paramètres:', { sessionId, coachId });
      
      const result = await endSession();
      console.log('🎯 QR OPTIMIZED - Résultat endSession reçu:', result);
      console.log('🎯 QR OPTIMIZED - Type de résultat:', typeof result);
      console.log('🎯 QR OPTIMIZED - Résultat stringifié:', JSON.stringify(result, null, 2));
      
      if (result && result.success) {
        console.log('🎯 QR OPTIMIZED - SUCCÈS! Affichage message succès');
        showMessage('Séance terminée', 'La séance a été terminée avec succès', 'success');
        console.log('🎯 QR OPTIMIZED - Appel callback onSessionEnded avec ID:', sessionId);
        onSessionEnded?.(sessionId);
        console.log('🎯 QR OPTIMIZED - Callback onSessionEnded appelé');
      } else if (result && !result.success) {
        console.log('🎯 QR OPTIMIZED - ÉCHEC avec message:', result.message);
        showMessage('Erreur', result.message || 'Erreur lors de la fin de session', 'error');
      } else {
        console.log('🎯 QR OPTIMIZED - RÉSULTAT INATTENDU:', result);
        showMessage('Erreur', 'Résultat inattendu de la fin de session', 'error');
      }
    } catch (error) {
      console.error('🎯 QR OPTIMIZED - EXCEPTION dans confirmEndSession:', error);
      console.error('🎯 QR OPTIMIZED - Message erreur:', error instanceof Error ? error.message : 'Erreur inconnue');
      console.error('🎯 QR OPTIMIZED - Stack trace:', error instanceof Error ? error.stack : 'Pas de stack');
      showMessage('Erreur', `Erreur inattendue: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, 'error');
    }
  };

  const cancelEndSession = () => {
    console.log('🎯 QR OPTIMIZED - Annulation par utilisateur');
    setShowEndConfirmModal(false);
  };

  // Interface pour session active
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
        
        {/* Debug modal state */}
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
      </View>
    );
  }

  // Interface de scan QR
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="scan" size={32} color="#007AFF" />
        <Text style={styles.title}>Scanner QR Code</Text>
        <Text style={styles.subtitle}>Commencer une nouvelle séance</Text>
      </View>

      {/* Option 1: Scanner par caméra */}
      <View style={styles.scanSection}>
        <Text style={styles.sectionTitle}>Scanner avec la caméra</Text>
        
        <TouchableOpacity
          style={[styles.cameraButton, { opacity: hasPermission !== false && !loading ? 1 : 0.6 }]}
          onPress={handleCameraScan}
          disabled={hasPermission === false || loading}
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
        
        {/* Bouton de diagnostic pour le web */}
        {typeof window !== 'undefined' && (
          <TouchableOpacity
            style={styles.diagnosticButton}
            onPress={async () => {
              try {
                console.log('🔍 DIAGNOSTIC - Test caméra web...');
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                console.log('✅ DIAGNOSTIC - Caméra web accessible:', stream);
                stream.getTracks().forEach(track => track.stop());
                Alert.alert('Diagnostic', 'Caméra web accessible ! Le problème vient peut-être du scanner QR.');
              } catch (error) {
                console.error('❌ DIAGNOSTIC - Erreur caméra web:', error);
                Alert.alert('Diagnostic', `Erreur caméra: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
              }
            }}
          >
            <Ionicons name="bug" size={16} color="#666" />
            <Text style={styles.diagnosticButtonText}>Test caméra</Text>
          </TouchableOpacity>
        )}

        {hasPermission === false && (
          <Text style={styles.permissionText}>
            Autorisez l'accès à la caméra dans les paramètres pour utiliser cette fonction
          </Text>
        )}
        
        {cameraError && (
          <Text style={styles.errorText}>
            ⚠️ {cameraError}
          </Text>
        )}
      </View>

      {/* Séparateur */}
      <View style={styles.separator}>
        <View style={styles.separatorLine} />
        <Text style={styles.separatorText}>OU</Text>
        <View style={styles.separatorLine} />
      </View>

      {/* Option 2: Saisie manuelle */}
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

      {/* Modal Scanner */}
      <Modal
        visible={scanning}
        animationType="slide"
        onRequestClose={() => setScanning(false)}
      >
        <View style={styles.scannerModal}>
          <View style={styles.scannerTopBar}>
            <TouchableOpacity onPress={() => setScanning(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.scannerModalTitle}>Scanner QR Code</Text>
            {/* Ajout: bouton flip caméra en web */}
            {isWeb ? (
              <TouchableOpacity onPress={() => setCameraFacing(prev => prev === 'back' ? 'front' : 'back')} style={styles.closeButton}>
                <Ionicons name="camera-reverse" size={24} color="white" />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 24 }} />
            )}
          </View>

          {isWeb ? (
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing={cameraFacing}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              // @ts-ignore - onMountError n'est pas toujours typé
              onMountError={(e: any) => {
                console.error('❌ CAMÉRA (web) - Erreur montage:', e);
                // Fallback: essayer la caméra frontale si la back échoue
                if (cameraFacing === 'back') {
                  console.warn('🔁 CAMÉRA (web) - Fallback vers la caméra frontale');
                  setCameraFacing('front');
                  setCameraError('Impossible d\'ouvrir la caméra arrière, tentative avec la caméra avant...');
                } else {
                  setCameraError(e?.message || 'Erreur caméra inconnue');
                }
              }}
              // @ts-ignore - onCameraReady non typé selon versions
              onCameraReady={() => {
                console.log('✅ CAMÉRA (web) - Prête, facing =', cameraFacing);
                setCameraError(null);
              }}
            />
          ) : (
            <BarCodeScanner
              onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
              style={StyleSheet.absoluteFillObject}
            />
          )}

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
            <Text style={[styles.modalTitle, { color: modalMessage.type === 'success' ? '#28a745' : '#dc3545' }]}>
              {modalMessage.title}
            </Text>
            <Text style={styles.modalMessage}>
              {modalMessage.message}
            </Text>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowMessageModal(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Confirmation Fin de Séance */}
      <Modal
        visible={showEndConfirmModal}
        animationType="slide"
        transparent
        onRequestClose={cancelEndSession}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              Terminer la séance
            </Text>
            <Text style={styles.modalMessage}>
              {activeSession 
                ? `Voulez-vous terminer la séance avec ${(activeSession as any).clientName || 'le client'} ?`
                : 'Êtes-vous sûr de vouloir terminer la séance en cours ?'
              }
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
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
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  sessionTime: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#28a745',
    fontFamily: 'monospace',
  },
  sessionLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  sessionSeconds: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  sessionDetails: {
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  endButton: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  endButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  scanButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
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
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  // Nouveaux styles pour le scanner
  cameraButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cameraButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  permissionText: {
    fontSize: 12,
    color: '#dc3545',
    textAlign: 'center',
    marginTop: 5,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 12,
    color: '#dc3545',
    textAlign: 'center',
    marginTop: 5,
    fontWeight: 'bold',
    backgroundColor: '#ffe6e6',
    padding: 8,
    borderRadius: 4,
  },
  diagnosticButton: {
    backgroundColor: '#6c757d',
    padding: 8,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },
  diagnosticButtonText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 4,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  separatorText: {
    marginHorizontal: 15,
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
  },
  // Styles pour le modal scanner
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
  // Styles pour les modals
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    margin: 5,
    flex: 1,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  // Styles de debug
  debugContainer: {
    backgroundColor: '#ffeb3b',
    padding: 10,
    borderRadius: 4,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#ff9800',
  },
  debugText: {
    fontSize: 12,
    color: '#333',
    fontWeight: 'bold',
  },
});
