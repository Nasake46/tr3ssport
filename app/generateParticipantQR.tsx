import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { auth } from '../firebase';
import { getAppointmentById, generateParticipantQRCode } from '../services/appointmentService';
import QRCode from 'react-native-qrcode-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';

/**
 * Screen where a client can generate their personal participation QR code.
 * Route expects ?appointmentId=...
 */
export default function GenerateParticipantQRScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [canGenerate, setCanGenerate] = useState<boolean>(true);
  const [reusableCountdown, setReusableCountdown] = useState<number>(0);
  const [aptDate, setAptDate] = useState<Date | null>(null);
  const [apt, setApt] = useState<any | null>(null);
  const [nowTs, setNowTs] = useState<number>(Date.now());

  const user = auth.currentUser;

  const load = useCallback(async () => {
    if (!appointmentId || !user) { setLoading(false); return; }
    try {
      const aptFetched = await getAppointmentById(appointmentId);
      if (aptFetched) {
        setApt(aptFetched);
        setAptDate(aptFetched.date);
      }
    } catch {}
    setLoading(false);
  }, [appointmentId, user]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const id = setInterval(() => setNowTs(Date.now()), 1000); return () => clearInterval(id); }, []);

  // Countdown for token reuse window (5 min) if we reused an existing token
  useEffect(() => {
    if (reusableCountdown <= 0) return;
    const id = setInterval(() => setReusableCountdown(c => c - 1), 1000);
    return () => clearInterval(id);
  }, [reusableCountdown]);

  // Auto régénération du QR quand la fenêtre est ouverte et que le token expire (fin du délai de réutilisation)
  useEffect(() => {
    if (!token) return;
    if (reusableCountdown > 0) return; // encore valide
    if (generating) return;
    if (!aptDate) return;
    const earliest = aptDate.getTime() - 30 * 60 * 1000;
    const latest = aptDate.getTime() + 15 * 60 * 1000;
    const now = Date.now();
    if (now < earliest || now > latest) return; // fenêtre fermée, ne pas régénérer
    // lancer une régénération silencieuse
    (async () => {
      try {
        setGenerating(true);
        const res = await generateParticipantQRCode(appointmentId!, user!.uid);
        setMessage(res.message === 'Token réutilisé' ? 'Renouvellement automatique du QR' : res.message);
        if (res.success && res.token) {
          setToken(res.token);
          setReusableCountdown(300); // nouvelle validité locale
        }
      } finally {
        setGenerating(false);
      }
    })();
  }, [reusableCountdown, token, generating, aptDate, appointmentId, user]);

  const handleGenerate = async () => {
    if (!appointmentId || !user) return;
    setGenerating(true);
    try {
      const res = await generateParticipantQRCode(appointmentId, user.uid);
      setMessage(res.message);
      if (res.success && res.token) {
        setToken(res.token);
        if (res.message === 'Token réutilisé') {
          // 5 min reuse window, approximate remaining if first reuse
          setReusableCountdown(prev => prev > 0 ? prev : 300);
        } else {
          setReusableCountdown(300);
        }
      } else if (!res.success) {
        // Block further attempts briefly
        setCanGenerate(false);
        setTimeout(() => setCanGenerate(true), 5000);
      }
    } finally {
      setGenerating(false);
    }
  };

  // Calcul des états de fenêtre
  let windowState: 'too_early' | 'open' | 'closed' | 'ended' = 'open';
  let countdownToOpen = 0; // en secondes
  let countdownToClose = 0;
  if (aptDate) {
    const earliest = aptDate.getTime() - 30 * 60 * 1000; // -30 min
    const latest = aptDate.getTime() + 15 * 60 * 1000;   // +15 min
    const now = nowTs;
    if (apt && ['completed','cancelled'].includes(apt.globalStatus)) {
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

  if (!appointmentId) {
    return <View style={styles.center}><Text style={styles.error}>AppointmentId manquant</Text></View>;
  }
  if (!user) {
    return <View style={styles.center}><Text style={styles.error}>Connexion requise</Text></View>;
  }
  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#7667ac" /><Text style={styles.loading}>Chargement...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mon QR de présence</Text>
      {aptDate && <Text style={styles.subtitle}>Séance du {aptDate.toLocaleDateString()} à {aptDate.toLocaleTimeString().slice(0,5)}</Text>}

      {windowState === 'too_early' && (
        <Text style={styles.info}>QR disponible dans {formatHMS(countdownToOpen)}</Text>
      )}
      {windowState === 'closed' && (
        <Text style={styles.error}>Fenêtre de génération dépassée</Text>
      )}
      {windowState === 'ended' && (
        <Text style={styles.error}>Séance terminée / annulée</Text>
      )}
      {windowState === 'open' && token && reusableCountdown > 0 && (
        <Text style={styles.info}>QR valide encore {formatHMS(reusableCountdown)}</Text>
      )}
      {windowState === 'open' && countdownToClose > 0 && (
        <Text style={styles.smallInfo}>Fenêtre se ferme dans {formatHMS(countdownToClose)}</Text>
      )}

      {token && (
        <View style={styles.qrWrapper}>
          <QRCode value={token} size={220} />
          <Text style={styles.qrHint}>Présentez ce QR au coach pour enregistrer votre présence.</Text>
          {reusableCountdown > 0 && (
            <Text style={styles.countdown}>Réutilisable encore {Math.floor(reusableCountdown/60)}:{(reusableCountdown%60).toString().padStart(2,'0')}</Text>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[styles.genBtn, ((!canGenerate) || generating || windowState !== 'open') && styles.disabled]}
        onPress={handleGenerate}
        disabled={!canGenerate || generating || windowState !== 'open'}
      >
        {generating ? <ActivityIndicator color="#fff" /> : (
          <Text style={styles.genBtnText}>
            {windowState === 'too_early' ? 'Trop tôt' : windowState === 'closed' ? 'Fermé' : token ? 'Regénérer' : 'Générer mon QR'}
          </Text>
        )}
      </TouchableOpacity>

      {!!message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:'#F5F5F8', padding:20, alignItems:'center' },
  center: { flex:1, alignItems:'center', justifyContent:'center', padding:20 },
  title: { fontSize:22, fontWeight:'700', color:'#7667ac', marginBottom:4 },
  subtitle: { fontSize:12, color:'#666', marginBottom:20 },
  qrWrapper: { backgroundColor:'#fff', padding:16, borderRadius:16, alignItems:'center', marginBottom:20, shadowColor:'#000', shadowOpacity:0.05, shadowRadius:6, shadowOffset:{width:0,height:2}, elevation:3 },
  qrHint: { fontSize:12, color:'#555', marginTop:12, textAlign:'center' },
  countdown: { fontSize:12, color:'#7667ac', marginTop:6 },
  genBtn: { backgroundColor:'#7667ac', paddingHorizontal:30, paddingVertical:14, borderRadius:30, minWidth:180, alignItems:'center' },
  disabled: { opacity:0.5 },
  genBtnText: { color:'#fff', fontSize:16, fontWeight:'600' },
  message: { marginTop:16, fontSize:12, color:'#333' },
  loading: { marginTop:8, color:'#555' },
  error: { color:'#d93025' },
  info: { fontSize:12, color:'#333', marginBottom:8, textAlign:'center' },
  smallInfo: { fontSize:11, color:'#777', marginBottom:12, textAlign:'center' },
});
