import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Platform, ActivityIndicator, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebase';
import QRCodeScannerOptimized from '../components/qr/QRCodeScannerOptimized';
import { subscribeToAttendanceProgress, setParticipantAttendanceStatus } from '../services/appointmentService';
import { useActiveSession } from '../hooks/useActiveSession';
import { useSessionTimer } from '../hooks/useSessionTimer';
import { doc, onSnapshot } from 'firebase/firestore';
import { firestore } from '../firebase';

interface ClientItem {
  id: string;
  name?: string;
  email?: string;
  attendanceStatus?: string;
  attendanceOrder?: number;
}

interface AttendanceSnapshot {
  present: number;
  total: number;
  absent: number;
  clients: ClientItem[];
}

export default function CoachActiveSessionScreen() {
  const user = auth.currentUser;
  const coachId = user?.uid || '';
  const { activeSession, loadActiveSession, endSessionWithConfirmation } = useActiveSession(coachId);
  const { sessionTime, totalSeconds } = useSessionTimer(activeSession); // timer hook

  const [attSnapshot, setAttSnapshot] = useState<AttendanceSnapshot | null>(null);
  const [subscribedAppointment, setSubscribedAppointment] = useState<string | null>(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [lastScanned, setLastScanned] = useState<any>(null); // participant payload du scan
  const [loadingInit, setLoadingInit] = useState(true);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [appointmentMeta, setAppointmentMeta] = useState<any | null>(null);

  // Charger session active initiale
  useEffect(() => {
    const init = async () => {
      await loadActiveSession();
      setLoadingInit(false);
    };
    init();
  }, [loadActiveSession]);

  // Gérer abonnement attendance lorsque session active change
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (activeSession && activeSession.appointmentId && subscribedAppointment !== activeSession.appointmentId) {
      // nettoyer précédent
      if (unsubscribe) unsubscribe();
      const aptId = activeSession.appointmentId;
      unsubscribe = subscribeToAttendanceProgress(aptId, (data: any) => {
        setAttSnapshot(data as AttendanceSnapshot);
      });
      setSubscribedAppointment(aptId);
    }
    return () => { if (unsubscribe) unsubscribe(); };
  }, [activeSession, subscribedAppointment]);

  // Gérer métadonnées du rendez-vous (présence globale, mode de début/fin)
  useEffect(() => {
    if (!activeSession?.appointmentId) { setAppointmentMeta(null); return; }
    const ref = doc(firestore, 'appointments', activeSession.appointmentId);
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) setAppointmentMeta(snap.data());
    });
    return () => unsub();
  }, [activeSession?.appointmentId]);

  const openScanner = () => setScannerVisible(true);
  const closeScanner = () => setScannerVisible(false);

  const handleParticipantScanned = useCallback((res: any) => {
    setLastScanned(res.participant ? {
      ...res.participant,
      presentCount: res.presentCount,
      totalClients: res.totalClients,
      autoStarted: res.autoStarted,
      message: res.message,
    } : null);
  }, []);

  const handleManualToggle = useCallback(async (participantId: string, currentStatus?: string) => {
    if (!activeSession?.appointmentId || !coachId || updatingIds.has(participantId)) return;
    const next: 'present' | 'absent' = currentStatus === 'present' ? 'absent' : 'present';
    setUpdatingIds(prev => new Set(prev).add(participantId));
    try {
      const res = await setParticipantAttendanceStatus(
        activeSession.appointmentId,
        participantId,
        coachId,
        next
      );
      if (res.success) {
        setFeedbackMsg(`Statut mis à jour: ${next}`);
      } else {
        setFeedbackMsg(res.message || 'Erreur mise à jour');
      }
    } catch {
      setFeedbackMsg('Erreur réseau');
    } finally {
      setUpdatingIds(prev => { const n = new Set(prev); n.delete(participantId); return n; });
      setTimeout(() => setFeedbackMsg(null), 3000);
    }
  }, [activeSession?.appointmentId, coachId, updatingIds]);

  const renderClient = ({ item }: { item: ClientItem }) => {
    const status = item.attendanceStatus || 'pending';
    const present = status === 'present';
    const absent = status === 'absent';
    const loading = updatingIds.has(item.id);
    return (
      <TouchableOpacity onPress={() => handleManualToggle(item.id, status)} disabled={loading} style={styles.row}>
        <View style={styles.rowLeft}>
          {loading && <ActivityIndicator size={18} color="#463C78" />}
          {!loading && present && <Ionicons name="checkmark-circle" size={20} color="#1e8e3e" />}
          {!loading && absent && !present && <Ionicons name="close-circle" size={20} color="#d93025" />}
          {!loading && !present && !absent && <Ionicons name="time" size={20} color="#888" />}
          <Text style={styles.clientName} numberOfLines={1}>{item.name || item.email || 'Client'}</Text>
        </View>
        <View style={styles.rightActions}>
          <Text style={[styles.statusBadge, present ? styles.badgePresent : absent ? styles.badgeAbsent : styles.badgePending]}>
            {present ? 'présent' : absent ? 'absent' : 'en attente'}
          </Text>
          <Ionicons name="swap-vertical" size={18} color="#463C78" style={{ marginLeft: 8 }} />
        </View>
      </TouchableOpacity>
    );
  };

  if (!coachId) {
    return (
      <View style={styles.center}> 
        <Text style={styles.error}>Vous devez être connecté comme coach.</Text>
      </View>
    );
  }

  if (loadingInit) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#7667ac" />
        <Text style={{ marginTop: 8, color: '#555' }}>Chargement session...</Text>
      </View>
    );
  }

  const started = appointmentMeta?.globalStatus === 'started';
  const completed = appointmentMeta?.globalStatus === 'completed';
  const startMode = appointmentMeta?.startMode; // manual | auto_all_scanned
  const endMode = appointmentMeta?.endMode; // auto_timer | manual | no_show_timeout
  const modeLabel = startMode === 'auto_all_scanned' ? 'Auto (tous scannés)' : startMode === 'manual' ? 'Manuel' : '—';
  const endModeLabel = endMode === 'auto_timer' ? 'Auto (timer)' : endMode === 'manual' ? 'Manuel' : endMode === 'no_show_timeout' ? 'No-show' : completed ? 'Terminé' : '';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <Text style={styles.title}>Séance en cours</Text>
        {!activeSession && (
          <View style={styles.card}> 
            <Text style={styles.cardTitle}>Aucune séance démarrée</Text>
            <Text style={styles.cardText}>Scannez un QR code de séance ou démarrez manuellement depuis un autre écran.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={openScanner}>
              <Ionicons name="qr-code" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Scanner un QR code</Text>
            </TouchableOpacity>
          </View>
        )}
        {activeSession && (
          <View style={[styles.sessionHeader, completed && { opacity: 0.85 }]}> 
            <Text style={styles.sessionName}>{activeSession.clientName}</Text>
            <Text style={styles.sessionMeta}>
              Début: {activeSession.actualStartTime.toLocaleTimeString().slice(0,5)} • Durée: {activeSession.expectedDuration} min
            </Text>
            <View style={styles.timerRow}>
              <Ionicons name="time" size={14} color="#463C78" />
              <Text style={styles.timerText}>Chrono: {sessionTime}</Text>
              {activeSession.expectedDuration > 0 && (
                <Text style={styles.timerSub}> ({Math.min(100, Math.round((totalSeconds / (activeSession.expectedDuration*60)) * 100))}%)</Text>
              )}
            </View>
            <View style={styles.modeRow}>
              {startMode && <Text style={styles.modeBadge}>Départ: {modeLabel}</Text>}
              {completed && <Text style={[styles.modeBadge, styles.endBadge]}>Fin: {endModeLabel}</Text>}
            </View>
            {completed && appointmentMeta && (
              <Text style={styles.completedNote}>Séance terminée {appointmentMeta.sessionEndedAt?.toDate?.()?.toLocaleTimeString?.().slice(0,5)} • Présents {appointmentMeta.presentCount ?? 0}/{appointmentMeta.totalClients ?? 0}</Text>
            )}
          </View>
        )}
        {activeSession && (
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Présents</Text>
              <Text style={[styles.statValue, { color: '#1e8e3e' }]}>{attSnapshot?.present ?? 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total</Text>
              <Text style={styles.statValue}>{attSnapshot?.total ?? 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Restant</Text>
              <Text style={[styles.statValue, { color: '#d97706' }]}>{(attSnapshot?.total ?? 0) - (attSnapshot?.present ?? 0)}</Text>
            </View>
          </View>
        )}
        {completed && appointmentMeta && (
          <View style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>Récapitulatif</Text>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Présents</Text><Text style={styles.summaryVal}>{appointmentMeta.presentCount ?? 0}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Absents</Text><Text style={styles.summaryVal}>{appointmentMeta.absentCount ?? ((appointmentMeta.totalClients ?? 0) - (appointmentMeta.presentCount ?? 0))}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Total</Text><Text style={styles.summaryVal}>{appointmentMeta.totalClients ?? 0}</Text></View>
            {endModeLabel ? <Text style={styles.summaryMode}>Mode fin: {endModeLabel}</Text> : null}
          </View>
        )}
        {activeSession && lastScanned && (
          <View style={styles.lastScannedCard}>
            <Text style={styles.sectionTitle}>Dernier scanné</Text>
            <Text style={styles.lastName}>{lastScanned.name || lastScanned.email}</Text>
            <Text style={styles.lastDetail}>{lastScanned.message}</Text>
            <Text style={styles.lastDetail}>Ordre: {lastScanned.attendanceOrder} • {lastScanned.presentCount}/{lastScanned.totalClients}</Text>
            {!!lastScanned.email && <Text style={styles.lastEmail}>{lastScanned.email}</Text>}
            <View style={styles.inlineBtns}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={openScanner}>
                <Ionicons name="qr-code" size={16} color="#7667ac" />
                <Text style={styles.secondaryBtnText}>Rescanner</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setLastScanned(null)}>
                <Ionicons name="close" size={16} color="#444" />
                <Text style={styles.secondaryBtnText}>Effacer</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {activeSession && (
          <View style={styles.listContainer}>
            <Text style={styles.sectionTitle}>Participants</Text>
            {attSnapshot?.clients?.length ? (
              <FlatList
                data={[...attSnapshot.clients].sort((a,b) => (a.name||a.email||'').localeCompare(b.name||b.email||'', 'fr', {sensitivity:'base'}))}
                keyExtractor={item => item.id}
                renderItem={renderClient}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            ) : (
              <Text style={styles.empty}>Aucun participant</Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* FAB scan uniquement si séance active non terminée */}
      {activeSession && started && !completed && (
        <TouchableOpacity style={styles.fab} onPress={openScanner}>
          <Ionicons name="qr-code" size={26} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Stop si démarrée et non terminée */}
      {activeSession && started && !completed && (
        <TouchableOpacity style={[styles.fab, { bottom: 90, backgroundColor: '#d93025' }]} onPress={endSessionWithConfirmation}>
          <Ionicons name="stop" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      <Modal visible={scannerVisible} animationType="slide" onRequestClose={closeScanner}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeScanner} style={styles.closeBtn}>
              <Ionicons name="chevron-back" size={24} color="#333" />
              <Text style={styles.closeText}>Retour</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Scanner QR</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={{ flex: 1 }}>
            <QRCodeScannerOptimized
              coachId={coachId}
              onParticipantScanned={(res) => {
                handleParticipantScanned(res);
              }}
              onSessionStarted={async () => { await loadActiveSession(); }}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {feedbackMsg && (
        <View style={styles.feedbackToast}>
          <Text style={styles.feedbackText}>{feedbackMsg}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F8' },
  title: { fontSize: 24, fontWeight: '700', color: '#463C78', paddingHorizontal: 16, marginTop: 8, marginBottom: 12 },
  sessionHeader: { paddingHorizontal: 16, paddingVertical: 8 },
  sessionName: { fontSize: 18, fontWeight: '600', color: '#222' },
  sessionMeta: { fontSize: 12, color: '#666', marginTop: 2 },
  timerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  timerText: { marginLeft: 4, fontSize: 12, fontWeight: '600', color: '#463C78' },
  timerSub: { marginLeft: 4, fontSize: 11, color: '#666' },
  statsBar: { flexDirection: 'row', marginHorizontal: 16, marginTop: 8, backgroundColor: '#fff', borderRadius: 14, padding: 14, elevation: 2, shadowColor: '#00000020', shadowOpacity: 0.1, shadowRadius: 8, gap: 24, justifyContent: 'space-around' },
  statItem: { alignItems: 'center', minWidth: 70 },
  statLabel: { fontSize: 12, color: '#666' },
  statValue: { fontSize: 20, fontWeight: '700', color: '#333', marginTop: 2 },
  listContainer: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 18, shadowColor: '#00000010', shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#463C78', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  clientName: { fontSize: 14, color: '#222', flexShrink: 1 },
  statusBadge: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, overflow: 'hidden', fontWeight: '600' },
  badgePresent: { backgroundColor: '#1e8e3e22', color: '#1e8e3e' },
  badgeAbsent: { backgroundColor: '#d9302522', color: '#d93025' },
  badgePending: { backgroundColor: '#77777722', color: '#555' },
  separator: { height: 1, backgroundColor: '#EEE' },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#463C78', width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#00000040', shadowOpacity: 0.2, shadowRadius: 6 },
  modalContainer: { flex: 1, backgroundColor: '#F5F5F8' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: Platform.OS === 'android' ? 8 : 0, paddingBottom: 8 },
  closeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  closeText: { fontSize: 14, color: '#333' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#222' },
  lastScannedCard: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 18, shadowColor: '#00000010', shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  lastName: { fontSize: 18, fontWeight: '600', color: '#222', marginBottom: 4 },
  lastDetail: { fontSize: 12, color: '#555' },
  lastEmail: { fontSize: 12, color: '#666', marginTop: 6 },
  inlineBtns: { flexDirection: 'row', gap: 12, marginTop: 14 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#463C78', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginTop: 14 },
  primaryBtnText: { color: '#fff', fontWeight: '600' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EEE', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  secondaryBtnText: { color: '#463C78', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#666', paddingVertical: 20 },
  card: { backgroundColor: '#fff', marginHorizontal: 16, padding: 18, borderRadius: 18, shadowColor: '#00000010', shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#222' },
  cardText: { fontSize: 13, color: '#555', marginTop: 6 },
  error: { color: '#d93025', fontSize: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  rightActions: { flexDirection: 'row', alignItems: 'center' },
  feedbackToast: { position: 'absolute', bottom: 160, left: 20, right: 20, backgroundColor: '#463C78', padding: 12, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  feedbackText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  modeRow: { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  modeBadge: { backgroundColor: '#463C7815', color: '#463C78', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, fontSize: 11, fontWeight: '600' },
  endBadge: { backgroundColor: '#1e8e3e22', color: '#1e8e3e' },
  completedNote: { fontSize: 11, color: '#1e293b', marginTop: 6 },
  summaryCard: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 18, shadowColor: '#00000010', shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  summaryLabel: { fontSize: 13, color: '#555' },
  summaryVal: { fontSize: 14, fontWeight: '600', color: '#222' },
  summaryMode: { marginTop: 10, fontSize: 12, color: '#463C78' },
});
