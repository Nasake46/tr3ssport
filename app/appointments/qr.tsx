import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCodeGenerator from '@/components/qr/QRCodeGenerator';
import { getAppointmentById } from '@/services/appointmentService';
import { backOrRoleHome } from '@/services/navigationService';

export default function AppointmentQRScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
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
    };
    load();
  }, [appointmentId]);

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
          <QRCodeGenerator 
            appointmentId={appointment.id}
            appointmentDate={appointment.date}
            duration={appointment.duration || 60}
            onQRGenerated={(t) => console.log('QR généré:', t.substring(0, 20) + '...')}
          />
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { marginTop: 10, color: '#666' },
  errorText: { color: '#e74c3c', fontSize: 16, marginBottom: 12 },
  backBtn: { backgroundColor: '#007AFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  backBtnText: { color: '#fff', fontWeight: '600' },
});
