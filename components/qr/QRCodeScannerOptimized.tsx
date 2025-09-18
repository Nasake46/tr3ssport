import React, { useState, useEffect, useCallback } from 'react';
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
import { scanParticipantQRCode, manualStartSession, subscribeToAttendanceProgress, markParticipantAbsent, getSessionAttendanceDetails } from '../../services/appointmentService';
import { getAttendanceHistory } from '../../services/attendanceService';

interface QRCodeScannerOptimizedProps {
  coachId: string;
  mode?: 'full' | 'scanOnly';
  autoOpenCamera?: boolean;
  onSessionStarted?: (appointmentId: string) => void;
  onSessionEnded?: (appointmentId: string) => void;
  onParticipantScanned?: (res: any) => void; // NEW: callback lorsqu'un participant est scanné
  onClose?: () => void; // NEW: fermeture (retour)
}

export default function QRCodeScannerOptimized({ 
  coachId, 
  mode = 'full',
  autoOpenCamera = false,
  onSessionStarted, 
  onSessionEnded,
  onParticipantScanned,
  onClose
}: QRCodeScannerOptimizedProps) {
  // Déterminer tôt si on est en mode scanOnly pour adapter le rendu/comportement
  const isScanOnly = mode === 'scanOnly';
  // Hooks & state declarations FIRST
  const [manualToken, setManualToken] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Permissions caméra via expo-camera
  const [permission, requestPermission] = useCameraPermissions();
  const hasPermission = !!permission?.granted;

  const [showEndConfirmModal, setShowEndConfirmModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [modalMessage, setModalMessage] = useState({ title: '', message: '', type: 'info' as 'info' | 'success' | 'error' });
  const [scanProgress, setScanProgress] = useState<{ appointmentId: string; presentCount: number; totalClients: number; started: boolean } | null>(null);
  const [manualStarting, setManualStarting] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]); // liste clients pour marquage absence
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [activeSummary, setActiveSummary] = useState<{present:number; total:number}>({present:0,total:0});
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const isWeb = Platform.OS === 'web';
  const [cameraFacing, setCameraFacing] = useState<'back' | 'front'>('back');
  const hasAutoOpenedRef = React.useRef(false);
  
  // Custom hooks AFTER state
  const {
    activeSession,
    loading,
    loadActiveSession,
    // startSession retiré (on ne démarre plus via QR global)
    endSession
  } = useActiveSession(coachId);

  const { sessionTime, totalSeconds } = useSessionTimer(activeSession);

  const getCameraPermissions = useCallback(async () => {
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
  }, [isWeb]);


  const checkCameraAvailability = useCallback(async () => {
    try {
      console.log('📷 CAMÉRA - Vérification basique...');
      if (isWeb && typeof window !== 'undefined') {
        const host = window.location.hostname;
        const isLocal =
          host === 'localhost' || host === '127.0.0.1' || host === '::1';
        if (!window.isSecureContext && !isLocal) {

          const msg = 'Le navigateur bloque la caméra car le site n\'est pas en HTTPS. Ouvrez le site en HTTPS (ou en localhost).';
            console.warn('⚠️ CAMÉRA - Contexte non sécurisé:', { host, isSecureContext: (window as any).isSecureContext });
          setCameraError(msg);
          return false;
        }
      }
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
    } catch (e) {
      setCameraError(
        `Erreur caméra: ${e instanceof Error ? e.message : 'Erreur inconnue'}`
      );
      return false;
    }
  }, [isWeb]);

  // Debug pour surveiller l'état du modal
  useEffect(() => {
    console.log('🔍 MODAL DEBUG - showEndConfirmModal:', showEndConfirmModal);
    console.log('🔍 MODAL DEBUG - showMessageModal:', showMessageModal);
  }, [showEndConfirmModal, showMessageModal]);

  // Fonction helper pour afficher des messages (désactivée en mode scanOnly)
  const showMessage = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info') => {
    if (isScanOnly) {
      // En mode scanOnly, pas de boîte de dialogue intermédiaire
      console.log('[scanOnly] Message ignoré:', { title, message, type });
      return;
    }
    setModalMessage({ title, message, type });
    setShowMessageModal(true);
  };

  // Charger la session active au montage du composant
  useEffect(() => {
    // encapsuler fonctions dans effet pour éviter warnings dépendances
    const init = async () => {
      await loadActiveSession();
      await getCameraPermissions();
      await checkCameraAvailability();
    };
    init();
  }, [loadActiveSession, getCameraPermissions, checkCameraAvailability]);

  // Auto-ouverture de la caméra si demandé, dès que la permission est accordée
  useEffect(() => {
    if (!autoOpenCamera) return;
    if (hasAutoOpenedRef.current) return;
    if (hasPermission === true) {
      hasAutoOpenedRef.current = true;
      // Ouvre la caméra directement
      handleCameraScan();
    }
  }, [autoOpenCamera, hasPermission]);

  // Chargement participants quand on a une séance identifiée via scanProgress (avant démarrage ou en cours via activeSession)
  const refreshParticipants = useCallback(async (appointmentId: string) => {
    setLoadingParticipants(true);
    try {
      const details = await getSessionAttendanceDetails(appointmentId);
      const raw = details.clients || [];
      // Déduplication par id pour éviter le warning "Encountered two children with the same key"
      const seen = new Set<string>();
      const deduped: any[] = [];
      for (const c of raw) {
        if (!c) continue;
        const pid = c.id || c.participantId || c.userId;
        if (!pid) { deduped.push(c); continue; }
        if (seen.has(pid)) continue; // ignore duplicata
        seen.add(pid);
        deduped.push(c);
      }
      if (deduped.length !== raw.length) {
        console.log(`♻️ Déduplication participants: ${raw.length} -> ${deduped.length}`);
      }
      setParticipants(deduped);
      setScanProgress(prev => prev && prev.appointmentId === appointmentId ? { ...prev, presentCount: details.present, totalClients: details.total } : prev);
      if (activeSession && activeSession.appointmentId === appointmentId) {
        setActiveSummary({present: details.present, total: details.total});
      }
    } catch (e) {
      console.warn('⚠️ REFRESH PARTICIPANTS erreur', e);
    } finally { setLoadingParticipants(false); }
  }, [activeSession]);

  const refreshHistory = useCallback(async (appointmentId: string) => {
    setLoadingHistory(true);
    try { const hist = await getAttendanceHistory(appointmentId); setAttendanceHistory(hist); }
    catch (e) { console.warn('⚠️ REFRESH HISTORY erreur', e); }
    finally { setLoadingHistory(false); }
  }, []);

  const formatHistoryLine = (ev: any) => {
    const ts = ev.createdAt?.toDate ? ev.createdAt.toDate() : (ev.createdAt?.toMillis ? new Date(ev.createdAt.toMillis()) : null);
    const time = ts ? ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    switch(ev.action) {
      case 'present': return `${time} - Présent (participant ${ev.participantId?.slice(0,6)})`;
      case 'absent': return `${time} - Absent (manuel)`;
      case 'auto_absent': return `${time} - Absent (auto)`;
      case 'manual_start': return `${time} - Démarrage manuel`;
      case 'end': return `${time} - Fin séance (présents ${ev.present}/${ev.total})`;
      default: return `${time} - ${ev.action}`;
    }
  };

  useEffect(()=>{
    if (scanProgress?.appointmentId) { refreshParticipants(scanProgress.appointmentId); refreshHistory(scanProgress.appointmentId); }
  }, [scanProgress?.appointmentId, refreshParticipants, refreshHistory]);

  useEffect(()=>{
    if (activeSession?.appointmentId) { refreshParticipants(activeSession.appointmentId); refreshHistory(activeSession.appointmentId);} 
  }, [activeSession?.appointmentId, refreshParticipants, refreshHistory]);

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


  const isParticipantToken = (token: string): boolean => {
    if (!token || token.length > 500) return false;
    try {
      let json = '';
      if (typeof atob === 'function') json = atob(token);
      else if (typeof Buffer !== 'undefined') json = Buffer.from(token, 'base64').toString('utf8');
      else return false;
      const obj = JSON.parse(json);
      return obj && typeof obj === 'object' && obj.a && obj.p;
    } catch { return false; }
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || loading) return;
    console.log('📷 CAMÉRA - QR Participant scanné tentative:', { type, sample: data.substring(0, 30) + '...' });
    if (!isParticipantToken(data)) {
      showMessage('QR invalide', 'Ce QR n\'est pas un QR participant valide.', 'error');
      return;
    }
    setScanned(true);
    setScanning(false);
    const res = await scanParticipantQRCode(data, coachId);
    if (res.success) {
      try { onParticipantScanned?.(res); } catch (e) { console.warn('onParticipantScanned callback error', e); }
      showMessage('Présence', res.message + (res.presentCount !== undefined && res.totalClients !== undefined ? ` (${res.presentCount}/${res.totalClients})` : ''), 'success');
      if (res.presentCount !== undefined && res.totalClients !== undefined && res.appointmentId) {
        setScanProgress({ appointmentId: res.appointmentId, presentCount: res.presentCount, totalClients: res.totalClients, started: !!res.autoStarted || (activeSession?.appointmentId === res.appointmentId) });
      }
      if (res.autoStarted && res.appointmentId) onSessionStarted?.(res.appointmentId);
      if (res.appointmentId) { refreshParticipants(res.appointmentId); refreshHistory(res.appointmentId); }
      setTimeout(() => setScanned(false), 500);
    } else {
      if (res.message && res.message.toLowerCase().includes('expiré')) {
        showMessage('QR expiré', 'Le QR participant a expiré (>15 min). Demandez au participant de régénérer son QR.', 'error');
      } else showMessage('Erreur scan', res.message, 'error');
      setTimeout(() => setScanned(false), 400);
    }
  };

  const handleManualScan = async () => {
    if (!manualToken.trim()) {
      showMessage('Erreur', 'Veuillez saisir un token', 'error');
      return;
    }
    if (!isParticipantToken(manualToken.trim())) {
      showMessage('QR invalide', 'Le token fourni n\'est pas un QR participant valide.', 'error');
      return;
    }
    const res = await scanParticipantQRCode(manualToken.trim(), coachId);
    if (res.success) {
      try { onParticipantScanned?.(res); } catch {}
      showMessage('Présence', res.message + (res.presentCount!=null && res.totalClients!=null ? ` (${res.presentCount}/${res.totalClients})` : ''), 'success');
      if (res.appointmentId) { setScanProgress({ appointmentId: res.appointmentId, presentCount: res.presentCount||0, totalClients: res.totalClients||0, started: !!res.autoStarted }); refreshParticipants(res.appointmentId); refreshHistory(res.appointmentId); }

      setManualToken('');
      if (res.autoStarted && res.appointmentId) onSessionStarted?.(res.appointmentId);
    } else {
      showMessage('Erreur scan', res.message, 'error');
    }
  };

  const handleManualStart = async () => {
    if (!scanProgress || scanProgress.started) return;
    setManualStarting(true);
    try {
      const res = await manualStartSession(scanProgress.appointmentId, coachId);
      if (res.success) {
        showMessage('Séance démarrée', res.message, 'success');
        setScanProgress(prev => prev ? { ...prev, started: true } : prev);
        onSessionStarted?.(scanProgress.appointmentId);
        refreshParticipants(scanProgress.appointmentId);
        refreshHistory(scanProgress.appointmentId);
      } else {
        showMessage('Erreur', res.message, 'error');
      }
    } catch {
      showMessage('Erreur', 'Démarrage manuel impossible', 'error');
    } finally { setManualStarting(false); }
  };

  const handleMarkAbsent = async (participantId: string) => {
    if (!scanProgress?.appointmentId && !activeSession?.appointmentId) return;
    const appointmentId = scanProgress?.appointmentId || activeSession?.appointmentId!;
    const res = await markParticipantAbsent(appointmentId, participantId, coachId);
    if (res.success) {
      showMessage('Absent', res.message, res.already ? 'info' : 'success');
      refreshParticipants(appointmentId);
      refreshHistory(appointmentId);
    } else {
      showMessage('Erreur', res.message || 'Impossible de marquer absent', 'error');
    }
  };

  const handleEndSession = () => {
    if (!activeSession) {
      showMessage('Erreur', 'Aucune session active à terminer', 'error');
      return;
    }
    
    const sessionId = activeSession.appointmentId;
    console.log('🎯 QR OPTIMIZED - Session ID:', sessionId);
    
    console.log('🎯 QR OPTIMIZED - Affichage dialogue confirmation...');
    
    // Utiliser notre modal personnalisé au lieu d'Alert
    console.log('🎯 QR OPTIMIZED - Tentative d\'affichage modal...');
    setShowEndConfirmModal(true);
  };

  const confirmEndSession = async () => {
    console.log('🎯 QR OPTIMIZED - CONFIRMATION UTILISATEUR');
    console.log('🎯 QR OPTIMIZED - Début de la séquence d\'arrêt...');
    
    if (!activeSession) return;
    
    const sessionId = activeSession.appointmentId;

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

  // Interface pour session active

  if (activeSession && !isScanOnly) {
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
            <Text style={[styles.detailText,{fontWeight:'600'}]}>Présents: {activeSummary.present}/{activeSummary.total}</Text>
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

        {/* Liste participants (marquage absent) */}
        <View style={[styles.scanSection,{marginTop:20}]}> 
          <Text style={styles.sectionTitle}>Participants</Text>
          {loadingParticipants && <ActivityIndicator size="small" color="#007AFF" />}
          {!loadingParticipants && participants.map((p, idx) => (
            <View key={(p.id || p.participantId || p.userId || 'unknown') + '-' + idx} style={{flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:6, borderBottomWidth:1, borderBottomColor:'#eee'}}>
              <View style={{flex:1, paddingRight:8}}>
                <Text style={{fontSize:14, fontWeight:'600'}}>{p.displayName || p.email || p.userId || 'Client'}</Text>
                <Text style={{fontSize:12, color:'#666'}}>Statut: {p.attendanceStatus || '—'}</Text>
              </View>
              {p.attendanceStatus !== 'present' && p.attendanceStatus !== 'absent' && (
                <TouchableOpacity style={{backgroundColor:'#dc3545', paddingHorizontal:10, paddingVertical:6, borderRadius:6}} onPress={()=>handleMarkAbsent(p.id)}>
                  <Text style={{color:'#fff', fontSize:12, fontWeight:'600'}}>Absent</Text>
                </TouchableOpacity>
              )}
              {p.attendanceStatus === 'absent' && <Text style={{color:'#dc3545', fontSize:12, fontWeight:'700'}}>ABSENT</Text>}
              {p.attendanceStatus === 'present' && <Text style={{color:'#28a745', fontSize:12, fontWeight:'700'}}>PRÉSENT</Text>}
            </View>
          ))}
        </View>

        <View style={[styles.scanSection,{marginTop:20}]}> 
          <Text style={styles.sectionTitle}>Historique</Text>
          {loadingHistory && <ActivityIndicator size="small" color="#007AFF" />}
          {!loadingHistory && attendanceHistory.length === 0 && <Text style={{fontSize:12, color:'#666'}}>Aucun évènement</Text>}
          {!loadingHistory && attendanceHistory.slice().reverse().map(ev => (
            <View key={ev.id} style={{paddingVertical:4, borderBottomWidth:1, borderBottomColor:'#eee'}}>
              <Text style={{fontSize:12, color:'#333'}}>{formatHistoryLine(ev)}</Text>
            </View>
          ))}
          <TouchableOpacity onPress={()=> activeSession && refreshHistory(activeSession.appointmentId)} style={{marginTop:8, alignSelf:'flex-start'}}>
            <Text style={{fontSize:12, color:'#007AFF', fontWeight:'600'}}>Rafraîchir</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Rendu spécial: mode scanOnly => pas de dialogues ni de modal interne, caméra directe
  if (isScanOnly) {
    // Si permissions non encore résolues, afficher un écran neutre discret
    if (hasPermission === null) {
      return (
        <View style={[styles.scannerModal, { alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      );
    }
    // Permission refusée => message minimal (sans modal)
    if (hasPermission === false) {
      return (
        <View style={[styles.scannerModal, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ color: '#fff', padding: 16, textAlign: 'center' }}>
            Autorisez l'accès à la caméra dans les paramètres pour scanner
          </Text>
        </View>
      );
    }

    // Caméra directe (inline) sans passer par le Modal interne
    return (
      <View style={styles.scannerModal}>
        {/* Bouton retour (overlay) */}
        <TouchableOpacity
          onPress={() => onClose && onClose()}
          style={styles.backButtonOverlay}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        {isWeb ? (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing={cameraFacing}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            // @ts-ignore
            onMountError={(e: any) => {
              console.error('❌ CAMÉRA (web) - Erreur montage:', e);
              if (cameraFacing === 'back') {
                setCameraFacing('front');
                setCameraError('Impossible d\'ouvrir la caméra arrière, tentative avec la caméra avant...');
              } else {
                setCameraError(e?.message || 'Erreur caméra inconnue');
              }
            }}
            // @ts-ignore
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

        {/* Optionnel: cadre visuel */}
        <View style={styles.scannerOverlay}>
          <View style={styles.scannerFrame} />
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
          </View>
        )}

      </View>
    );
  }

  // Interface de scan QR (mode complet)
  return (
    <View style={styles.container}>
      {/* Progress multi-participant (en haut) */}
  {!isScanOnly && scanProgress && (
        <View style={styles.progressBarContainer}>
          <Text style={styles.progressText}>Présents: {scanProgress.presentCount}/{scanProgress.totalClients} {scanProgress.started ? '(démarrée)' : ''}</Text>
          {!scanProgress.started && (
            <TouchableOpacity style={styles.manualStartBtn} onPress={handleManualStart} disabled={manualStarting}>
              <Text style={styles.manualStartText}>{manualStarting ? '...' : 'Démarrer maintenant'}</Text>
            </TouchableOpacity>
          )}
          {scanProgress.started && !activeSession && (
            <Text style={{marginTop:4, fontSize:12, color:'#555'}}>Séance démarrée (scannez les derniers ou démarrez l'interface de session)</Text>
          )}
        </View>
      )}

      <View style={styles.header}>
        <Ionicons name="scan" size={32} color="#007AFF" />
  <Text style={styles.title}>Scanner QR Participant</Text>
  <Text style={styles.subtitle}>Chaque QR client enregistre la présence</Text>
      </View>

      {/* Option 1: Scanner par caméra */}
  <View style={styles.scanSection}>
  <Text style={styles.sectionTitle}>Scanner un QR participant</Text>
        
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
        
        {/* Bouton de diagnostic pour le web */}
  {!isScanOnly && typeof window !== 'undefined' && (
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


  {hasPermission === false && (
          <Text style={styles.permissionText}>
            Autorisez l'accès à la caméra dans les paramètres pour utiliser cette fonction
          </Text>
        )}
        
  {!isScanOnly && cameraError && (
          <Text style={styles.errorText}>
            ⚠️ {cameraError}
          </Text>
        )}

      </View>

      {/* Séparateur */}
  {!isScanOnly && (
  <View style={styles.separator}>
        <View style={styles.separatorLine} />
        <Text style={styles.separatorText}>OU</Text>
        <View style={styles.separatorLine} />
  </View>
  )}

  {/* Option 2: Saisie manuelle */}
  {!isScanOnly && (
  <View style={styles.scanSection}>
  <Text style={styles.sectionTitle}>Saisie manuelle (token participant)</Text>
        
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
  )}

  {!isScanOnly && (
  <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Instructions</Text>
        <Text style={styles.infoText}>
          1. Chaque client génère son QR dans l'application (≤30 min avant){'\n'}
          2. Scannez tous les QR participants (caméra ou collage){'\n'}
          3. La séance démarre automatiquement quand tous les clients sont présents{'\n'}
          4. Vous pouvez forcer le démarrage si besoin (bouton) puis continuer les scans{'\n'}
          5. Terminez la séance pour figer les absents restants
        </Text>
      </View>
  )}

      {/* Modal Scanner - seulement en mode complet */}
      {!isScanOnly && (
      <Modal
        visible={scanning}
        animationType="slide"
        onRequestClose={() => setScanning(false)}
      >
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
      )}

      {/* Modal Message - pas en mode scanOnly */}
      {!isScanOnly && (
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
      )}

      {/* Modal Confirmation Fin de Séance - pas en mode scanOnly */}
      {!isScanOnly && (
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
      )}

      {/* Progress multi-participant */}
  {!isScanOnly && scanProgress && (
        <View style={styles.progressBarContainer}>
          <Text style={styles.progressText}>Présents: {scanProgress.presentCount}/{scanProgress.totalClients} {scanProgress.started ? '(démarrée)' : ''}</Text>
          {!scanProgress.started && (
            <TouchableOpacity style={styles.manualStartBtn} onPress={handleManualStart} disabled={manualStarting}>
              <Text style={styles.manualStartText}>{manualStarting ? '...' : 'Démarrer maintenant'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Liste participants (avant démarrage) */}
  {!isScanOnly && scanProgress?.appointmentId && (
        <View style={[styles.scanSection,{marginTop:10}]}> 
          <Text style={styles.sectionTitle}>Historique</Text>
          {loadingHistory && <ActivityIndicator size="small" color="#007AFF" />}
          {!loadingHistory && attendanceHistory.length === 0 && <Text style={{fontSize:12, color:'#666'}}>Aucun évènement</Text>}
          {!loadingHistory && attendanceHistory.slice().reverse().map(ev => (
            <View key={ev.id} style={{paddingVertical:4, borderBottomWidth:1, borderBottomColor:'#eee'}}>
              <Text style={{fontSize:12, color:'#333'}}>{formatHistoryLine(ev)}</Text>
            </View>
          ))}
          <TouchableOpacity onPress={()=> scanProgress && refreshHistory(scanProgress.appointmentId)} style={{marginTop:8, alignSelf:'flex-start'}}>
            <Text style={{fontSize:12, color:'#007AFF', fontWeight:'600'}}>Rafraîchir</Text>
          </TouchableOpacity>
        </View>
      )}
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
  wrapper: { flex:1 },
  progressBarContainer: { backgroundColor:'#fff', padding:10, borderBottomColor:'#eee', borderBottomWidth:1, marginBottom:8, borderRadius:8 },
  progressText: { fontSize:14, fontWeight:'600', color:'#333' },
  manualStartBtn: { marginTop:6, alignSelf:'flex-start', backgroundColor:'#7667ac', paddingHorizontal:12, paddingVertical:6, borderRadius:6 },
  manualStartText: { color:'#fff', fontSize:12, fontWeight:'600' },
  backButtonOverlay: {
    position: 'absolute',
    top: 50,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
    zIndex: 20,
  },
});
