import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { getAppointmentById, generateParticipantQRCode } from '@/services/appointmentService';
import { backOrRoleHome } from '@/services/navigationService';
import { auth } from '@/firebase';

export default function AppointmentQRScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [reusableCountdown, setReusableCountdown] = useState<number>(0);
  const [nowTs, setNowTs] = useState<number>(Date.now());

  const user = auth.currentUser;

  const load = useCallback(async () => {
    if (!appointmentId) {
      Alert.alert('Erreur', 'Identifiant du rendez-vous manquant', [
        { text: 'OK', onPress: () => backOrRoleHome('user') }
      ]);
      return;
    }
    try {
      const apt = await getAppointmentById(appointmentId);
      if (!apt) {
        Alert.alert('Erreur', 'Rendez-vous introuvable', [
          { text: 'OK', onPress: () => backOrRoleHome('user') }
        ]);
        return;
      }
      setAppointment(apt);
    } catch (e) {
      console.error('❌ QR SCREEN - Erreur chargement RDV:', e);
      Alert.alert('Erreur', "Impossible de charger le rendez-vous", [
        { text: 'OK', onPress: () => backOrRoleHome('user') }
      ]);
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const id = setInterval(() => setNowTs(Date.now()), 1000); return () => clearInterval(id); }, []);

  // Gestion du compte à rebours de réutilisation (5 min)
  useEffect(() => {
    if (reusableCountdown <= 0) return;
    const id = setInterval(() => setReusableCountdown(c => c - 1), 1000);
    return () => clearInterval(id);
  }, [reusableCountdown]);

  // Auto régénération silencieuse si fenêtre ouverte et token expiré
  useEffect(() => {
    if (!token) return;
    if (reusableCountdown > 0) return;
    if (generating) return;
    if (!appointment?.date) return;
    const aptDate: Date = appointment.date;
    const earliest = aptDate.getTime() - 30 * 60 * 1000;
    const latest = aptDate.getTime() + 15 * 60 * 1000;
    const now = Date.now();
    if (now < earliest || now > latest) return;
    (async () => {
      try {
        if (!user) return;
        setGenerating(true);
        const res = await generateParticipantQRCode(appointmentId!, user.uid);
        if (res.success && res.token) {
          setToken(res.token);
          setReusableCountdown(300);
          setMessage(res.message === 'Token réutilisé' ? 'Renouvellement automatique du QR' : res.message);
        }
      } finally { setGenerating(false); }
    })();
  }, [token, reusableCountdown, generating, appointment, appointmentId, user]);

  const handleGenerate = async () => {
    if (!appointmentId || !user) return;
    setGenerating(true);
    try {
      const res = await generateParticipantQRCode(appointmentId, user.uid);
      setMessage(res.message);
      if (res.success && res.token) {
        setToken(res.token);
        if (res.message === 'Token réutilisé') {
          setReusableCountdown(prev => prev > 0 ? prev : 300);
        } else {
          setReusableCountdown(300);
        }
      }
    } finally { setGenerating(false); }
  };

  // Calcul des états de fenêtre (30 min avant -> +15 min après le début)
  let windowState: 'too_early' | 'open' | 'closed' | 'ended' = 'open';
  let countdownToOpen = 0; // secondes
  let countdownToClose = 0;
  if (appointment?.date) {
    const aptDate: Date = appointment.date;
    const earliest = aptDate.getTime() - 30 * 60 * 1000;
    const latest = aptDate.getTime() + 15 * 60 * 1000;
    const now = nowTs;
    if (['completed','cancelled'].includes(appointment.globalStatus)) {
      windowState = 'ended';
    } else if (now < earliest) {
      windowState = 'too_early';
      countdownToOpen = Math.max(0, Math.floor((earliest - now)/1000));
    } else if (now > latest) {
      windowState = 'closed';
    } else {
      windowState = 'open';
      countdownToClose = Math.max(0, Math.floor((latest - now)/1000));
    }
  }

  const formatHMS = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600)/60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}h${m.toString().padStart(2,'0')}m${s.toString().padStart(2,'0')}`;
    return `${m}:${s.toString().padStart(2,'0')}`;
  };

  if (loading) {
    return (
      <View style={styles.center}> 
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={styles.center}> 
        <Text style={styles.errorText}>Rendez-vous introuvable</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => backOrRoleHome('user')}>
          <Text style={styles.backBtnText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Connexion requise</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => backOrRoleHome('user')}>
          <Text style={styles.backBtnText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => backOrRoleHome('user')} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>QR Code de la séance</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.title}>{appointment.sessionType || 'Rendez-vous'}</Text>
          <Text style={styles.subtitle}>
            {appointment.date?.toLocaleDateString?.('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            {` à `}
            {appointment.date?.toLocaleTimeString?.('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        <View style={styles.qrBlock}>
          <Text style={styles.sectionTitle}>Mon QR de présence</Text>
          <Text style={styles.smallInfo}>
            {appointment.date && `Séance du ${appointment.date.toLocaleDateString('fr-FR')} à ${appointment.date.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}`}
          </Text>

          {windowState === 'too_early' && (
            <Text style={styles.waitingInfo}>QR disponible dans {formatHMS(countdownToOpen)}</Text>
          )}
          {windowState === 'closed' && (
            <Text style={styles.errorText}>Fenêtre de génération dépassée</Text>
          )}
            {windowState === 'ended' && (
            <Text style={styles.errorText}>Séance terminée / annulée</Text>
          )}
          {windowState === 'open' && token && reusableCountdown > 0 && (
            <Text style={styles.validInfo}>QR valide encore {formatHMS(reusableCountdown)}</Text>
          )}
          {windowState === 'open' && countdownToClose > 0 && (
            <Text style={styles.smallInfo}>Fenêtre se ferme dans {formatHMS(countdownToClose)}</Text>
          )}

          {token && (
            <View style={styles.qrContainer}> 
              <QRCode value={token} size={220} />
              <Text style={styles.qrHint}>Présentez ce QR au coach pour enregistrer votre présence.</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.generateButton, ((generating) || windowState !== 'open') && styles.generateButtonDisabled]}
            disabled={generating || windowState !== 'open'}
            onPress={handleGenerate}
          >
            {generating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.generateButtonText}>
                {windowState === 'too_early' ? 'Trop tôt' : windowState === 'closed' ? 'Fermé' : token ? 'Régénérer' : 'Générer mon QR'}
              </Text>
            )}
          </TouchableOpacity>
          {!!message && <Text style={styles.message}>{message}</Text>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 15, backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: '#e0e0e0'
  },
  backIcon: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  content: { flex: 1, padding: 16 },
  infoCard: {
    backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  subtitle: { marginTop: 6, fontSize: 14, color: '#666' },
  qrBlock: {
    flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3
  },
  sectionTitle: { fontSize:16, fontWeight:'600', color:'#333', textAlign:'center', marginBottom:4 },
  smallInfo: { fontSize:11, color:'#777', textAlign:'center', marginBottom:4 },
  waitingInfo: { fontSize:12, color:'#555', textAlign:'center', marginBottom:8 },
  validInfo: { fontSize:12, color:'#2d7a32', textAlign:'center', marginBottom:4 },
  qrContainer: { backgroundColor:'#fff', padding:16, borderRadius:16, alignItems:'center', marginVertical:12 },
  qrHint: { fontSize:12, color:'#555', marginTop:8, textAlign:'center' },
  generateButton: { backgroundColor:'#7667ac', paddingVertical:14, borderRadius:28, alignItems:'center', marginTop:4 },
  generateButtonDisabled: { opacity:0.5 },
  generateButtonText: { color:'#fff', fontSize:16, fontWeight:'600' },
  message: { marginTop:10, fontSize:12, color:'#333', textAlign:'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { marginTop: 10, color: '#666' },
  errorText: { color: '#e74c3c', fontSize: 16, marginBottom: 12 },
  backBtn: { backgroundColor: '#007AFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  backBtnText: { color: '#fff', fontWeight: '600' },
});
