import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { router } from 'expo-router';
import { auth } from '@/firebase';
import { getAllAppointmentsForClient } from '@/services/appointmentService';
import AppointmentDetailModal from '@/components/appointments/AppointmentDetailModal';
import { Ionicons } from '@expo/vector-icons';

// Types pour les rendez-vous
interface Appointment {
  id: string;
  type: 'solo' | 'group';
  createdBy: string;
  coachIds: string[];
  sessionType: string;
  location: string;
  description: string;
  date: Date;
  status: 'pending' | 'accepted' | 'refused';
  createdAt: Date;
  decisions: { [coachId: string]: CoachDecision };
  coachesInfo?: CoachInfo[];
  // Optionnel si disponible dans les données d'origine
  duration?: number;
}

interface CoachDecision {
  status: 'accepted' | 'refused';
  comment: string;
  respondedAt: Date;
}

interface CoachInfo {
  id: string;
  name: string;
  status: 'pending' | 'accepted' | 'refused';
}

export default function ClientDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false); // TODO: pourra être retiré si modal supprimée définitivement
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null); // idem

  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) {
      console.log('❌ CLIENT DASHBOARD - Utilisateur non connecté');
      setLoading(false);
      return;
    }

    loadAppointments();
  }, [currentUser]); // eslint-disable-next-line react-hooks/exhaustive-deps

  // Vérifier si l'utilisateur est connecté avant de rendre le composant
  if (!currentUser) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="person-outline" size={64} color="#ccc" />
        <Text style={styles.loadingText}>Vous devez être connecté</Text>
        <TouchableOpacity 
          style={styles.loginButton}
          onPress={() => router.push('/(tabs)/LoginScreen' as any)}
        >
          <Text style={styles.loginButtonText}>Se connecter</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const loadAppointments = async () => {
    if (!currentUser || !currentUser.email) {
      console.log('❌ CLIENT DASHBOARD - Utilisateur non connecté ou email manquant');
      setLoading(false);
      return;
    }

    try {
      console.log('📋 CLIENT DASHBOARD - Chargement des rendez-vous pour client:', currentUser.uid);
      
      // Utiliser le nouveau service pour récupérer tous les rendez-vous (créés + invitations)
      const appointmentsWithParticipants = await getAllAppointmentsForClient(currentUser.uid, currentUser.email);
      console.log('📊 CLIENT DASHBOARD - RDV récupérés:', appointmentsWithParticipants.length);
      
      const appointmentsList: Appointment[] = [];
      
      for (const apt of appointmentsWithParticipants) {
        // Récupérer les informations des coachs
        const coachesInfo: CoachInfo[] = [];
        
        for (const coach of apt.coaches) {
          coachesInfo.push({
            id: coach.userId || coach.id,
            name: `Coach ${coach.userId || coach.id}`, // À améliorer en récupérant le vrai nom
            status: coach.status === 'accepted' ? 'accepted' : coach.status === 'declined' ? 'refused' : 'pending'
          });
        }

        // Déterminer le statut de l'appointment selon la perspective de l'utilisateur
        let userStatus: 'pending' | 'accepted' | 'refused' = 'pending';
        if (apt.createdBy === currentUser.uid) {
          // L'utilisateur est le créateur - utiliser le statut global
          userStatus = apt.globalStatus === 'confirmed' ? 'accepted' : apt.globalStatus === 'declined' ? 'refused' : 'pending';
        } else {
          // L'utilisateur est invité - trouver son statut personnel
          const userParticipant = apt.clients.find(c => c.userId === currentUser.uid || c.email === currentUser.email);
          if (userParticipant) {
            userStatus = userParticipant.status === 'accepted' ? 'accepted' : userParticipant.status === 'declined' ? 'refused' : 'pending';
          }
        }

        const appointment: Appointment = {
          id: apt.id,
          type: apt.type,
          createdBy: apt.createdBy,
          coachIds: apt.coaches.map(c => c.userId || c.id),
          sessionType: apt.sessionType || '',
          location: apt.location || '',
          description: apt.description || '',
          date: apt.date,
          status: userStatus,
          createdAt: apt.createdAt,
          decisions: {}, // Les decisions sont maintenant dans les participants
          coachesInfo
        };

        appointmentsList.push(appointment);
      }

      // Trier les rendez-vous côté client par date (plus récent en premier)
      appointmentsList.sort((a, b) => b.date.getTime() - a.date.getTime());

      console.log(`✅ CLIENT DASHBOARD - ${appointmentsList.length} rendez-vous chargés`);
      setAppointments(appointmentsList);
      
    } catch (error) {
      console.error('❌ CLIENT DASHBOARD - Erreur:', error);
      Alert.alert('Erreur', 'Impossible de charger vos rendez-vous');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAppointments();
  };

  const getStatusColor = (status: string, appointmentDate?: Date) => {
    // Vérifier si le rendez-vous est passé
    if (appointmentDate) {
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      const checkDate = new Date(appointmentDate);
      checkDate.setHours(0, 0, 0, 0);
      
      if (checkDate < currentDate) {
        return '#95a5a6'; // Gris pour rendez-vous passés/terminés
      }
    }
    
    switch (status) {
      case 'pending':
        return '#f39c12';
      case 'accepted':
        return '#27ae60';
      case 'refused':
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  };

  const getStatusText = (status: string, appointmentDate?: Date) => {
    // Vérifier si le rendez-vous est passé
    if (appointmentDate) {
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      const checkDate = new Date(appointmentDate);
      checkDate.setHours(0, 0, 0, 0);
      
      if (checkDate < currentDate) {
        return 'Terminé';
      }
    }
    
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'accepted':
        return 'Accepté';
      case 'refused':
        return 'Refusé';
      default:
        return status;
    }
  };

  const getOverallStatus = (appointment: Appointment) => {
    const totalCoaches = appointment.coachIds.length;
    // Utiliser désormais les statuts réels issus des participants (coachesInfo)
    const coachStatuses = (appointment.coachesInfo || []).map(c => c.status);
    const acceptedCount = coachStatuses.filter(s => s === 'accepted').length;
    const refusedCount = coachStatuses.filter(s => s === 'refused').length;

    if (totalCoaches === 0) {
      return { status: 'accepted', text: '✅ Aucun coach requis' };
    }
    if (acceptedCount === totalCoaches) {
      return { status: 'accepted', text: `✅ Tous acceptés (${acceptedCount})` };
    } else if (refusedCount === totalCoaches) {
      return { status: 'refused', text: `❌ Tous refusés (${refusedCount})` };
    } else if (acceptedCount > 0) {
      return { status: 'partial', text: `⏳ ${acceptedCount} acceptés, ${totalCoaches - acceptedCount - refusedCount} en attente` };
    } else {
      return { status: 'pending', text: `⏳ En attente (${totalCoaches} coachs)` };
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderAppointmentCard = (appointment: Appointment) => {
    const overallStatus = getOverallStatus(appointment);
    
    return (
      <View key={appointment.id} style={styles.appointmentCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.sessionType}>{appointment.sessionType}</Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(overallStatus.status, appointment.date) }
          ]}>
            <Text style={styles.statusText}>
              {getStatusText(overallStatus.status, appointment.date)}
            </Text>
          </View>
        </View>

        <Text style={styles.appointmentType}>
          {appointment.type === 'solo' ? '👤 Individuel' : '👥 Groupe'}
        </Text>

        <View style={styles.appointmentDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={16} color="#666" />
            <Text style={styles.detailText}>{formatDate(appointment.date)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="location" size={16} color="#666" />
            <Text style={styles.detailText}>{appointment.location}</Text>
          </View>
        </View>

        <View style={styles.coachesSection}>
          <Text style={styles.coachesTitle}>Coachs demandés:</Text>
          {appointment.coachesInfo?.map((coach, index) => (
            <View key={coach.id} style={styles.coachRow}>
              <Text style={styles.coachName}>{coach.name}</Text>
              <View style={[
                styles.coachStatusBadge,
                { backgroundColor: getStatusColor(coach.status, appointment.date) }
              ]}>
                <Text style={styles.coachStatusText}>
                  {getStatusText(coach.status, appointment.date)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.overallStatusText}>{overallStatus.text}</Text>

        {/* Bouton Détails/QR */}
        <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end' }}>
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => {
              // Ancien: modal local
              // setSelectedAppointment(appointment);
              // setDetailVisible(true);
              // Nouveau: redirection vers la page QR dédiée
              router.push({ pathname: '/appointments/qr', params: { appointmentId: appointment.id } } as any);
            }}
          >
            <Ionicons name="qr-code-outline" size={18} color="#fff" />
            <Text style={styles.detailsButtonText}>Détails / QR</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const handleCreateAppointment = () => {
    console.log('➕ CLIENT DASHBOARD - Navigation vers création de RDV');
    router.push('/' as any);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement de vos rendez-vous...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Mes Rendez-vous</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.calendarButton}
            onPress={() => router.push('/calendar')}
          >
            <Ionicons name="calendar-outline" size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateAppointment}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {appointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>Aucun rendez-vous</Text>
            <Text style={styles.emptySubtitle}>
              Vous n'avez pas encore créé de rendez-vous.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={handleCreateAppointment}
            >
              <Text style={styles.emptyButtonText}>Créer mon premier RDV</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.appointmentsList}>
            {appointments.map(renderAppointmentCard)}
          </View>
        )}
      </ScrollView>

      {/* Modal de détails/QR */}
      {selectedAppointment && (
        <AppointmentDetailModal
          visible={false}
          onClose={() => setDetailVisible(false)}
          appointment={{
            id: selectedAppointment.id,
            title: selectedAppointment.sessionType || 'Rendez-vous',
            date: selectedAppointment.date,
            duration: selectedAppointment.duration,
            status: selectedAppointment.status as any,
            coachName: selectedAppointment.coachesInfo?.map(c => c.name).join(', '),
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calendarButton: {
    backgroundColor: '#f8f9fa',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  createButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  appointmentsList: {
    padding: 20,
  },
  appointmentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  appointmentType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  appointmentDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
  },
  coachesSection: {
    marginBottom: 12,
  },
  coachesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  coachRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  coachName: {
    fontSize: 14,
    color: '#666',
  },
  coachStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  coachStatusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  overallStatusText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailsButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailsButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
  },
});
