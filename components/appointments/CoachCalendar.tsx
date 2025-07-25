import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { auth, firestore } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

interface Appointment {
  id: string;
  sessionType: string;
  description: string;
  location: string;
  date: Date;
  startTime: string;
  endTime: string;
  duration?: number;
  type: 'solo' | 'group';
  clientId: string;
  clientName?: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'accepted' | 'rejected';
  invitationStatus?: 'pending' | 'accepted' | 'refused';
}

interface MarkedDates {
  [key: string]: {
    marked: boolean;
    dotColor?: string;
  };
}

export default function CoachCalendar() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [dayAppointments, setDayAppointments] = useState<Appointment[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // Format YYYY-MM

  // Fonction utilitaire pour convertir les dates de manière sécurisée
  const convertToDate = (dateValue: any): Date | null => {
    try {
      if (!dateValue) {
        console.log('⚠️ CALENDRIER COACH - Date null ou undefined');
        return null;
      }

      if (dateValue instanceof Date) {
        return dateValue;
      }

      if (typeof dateValue.toDate === 'function') {
        return dateValue.toDate();
      }

      if (typeof dateValue === 'string') {
        const parsed = new Date(dateValue);
        return isNaN(parsed.getTime()) ? null : parsed;
      }

      if (typeof dateValue === 'number') {
        return new Date(dateValue);
      }

      console.log('⚠️ CALENDRIER COACH - Format de date non reconnu:', typeof dateValue, dateValue);
      return null;
    } catch (error) {
      console.log('⚠️ CALENDRIER COACH - Erreur conversion date:', error);
      return null;
    }
  };

  useEffect(() => {
    console.log('🔍 CALENDRIER COACH - Initialisation du listener d\'authentification');
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔄 CALENDRIER COACH - État d\'authentification changé:', user ? 'Connecté' : 'Déconnecté');
      setCurrentUser(user);
      setAuthLoading(false);
      
      if (user) {
        console.log('✅ CALENDRIER COACH - Utilisateur connecté, chargement des RDV');
        loadCoachAppointments(user);
      } else {
        console.log('❌ CALENDRIER COACH - Utilisateur déconnecté');
        setAppointments([]);
        setMarkedDates({});
        setLoading(false);
      }
    });

    return () => {
      console.log('🧹 CALENDRIER COACH - Nettoyage du listener d\'authentification');
      unsubscribe();
    };
  }, []);

  const loadCoachAppointments = async (user?: User | null) => {
    const userToUse = user || currentUser;
    
    if (!userToUse) {
      console.log('❌ CALENDRIER COACH - Utilisateur non connecté');
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 CALENDRIER COACH - Chargement des RDV pour:', userToUse.email);
      
      const appointmentsData: Appointment[] = [];

      // Récupérer tous les rendez-vous où le coach est impliqué
      console.log('🔍 CALENDRIER COACH - Recherche des RDV pour coachId:', userToUse.uid);
      const coachAppointmentsQuery = query(
        collection(firestore, 'appointments'),
        where('coachIds', 'array-contains', userToUse.uid)
      );

      const coachSnapshot = await getDocs(coachAppointmentsQuery);
      console.log('📅 CALENDRIER COACH - RDV trouvés:', coachSnapshot.docs.length);
      
      for (const appointmentDoc of coachSnapshot.docs) {
        const appointmentInfo = appointmentDoc.data();
        console.log('📋 CALENDRIER COACH - Traitement RDV:', appointmentInfo);
        
        // Vérifier que les données requises existent
        const appointmentDate = convertToDate(appointmentInfo.date);
        if (!appointmentDate) {
          console.log('⚠️ CALENDRIER COACH - RDV sans date valide, ignoré:', appointmentDoc.id);
          continue;
        }
        
        console.log('🕐 CALENDRIER COACH - Heures récupérées de la BDD:', {
          startTime: appointmentInfo.startTime,
          endTime: appointmentInfo.endTime,
          duration: appointmentInfo.duration,
          typeStartTime: typeof appointmentInfo.startTime,
          typeEndTime: typeof appointmentInfo.endTime
        });

        // Récupérer les infos du client
        let clientData = null;
        let clientName = 'Client inconnu';
        if (appointmentInfo.createdBy) {
          const clientRef = doc(firestore, 'users', appointmentInfo.createdBy);
          const clientDoc = await getDoc(clientRef);
          if (clientDoc.exists()) {
            clientData = clientDoc.data();
            clientName = `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim() || clientData.email?.split('@')[0] || 'Client';
          }
        }
        
        // Déterminer le statut pour ce coach
        let appointmentStatus = appointmentInfo.status || 'pending';
        const coachDecision = appointmentInfo.decisions?.[userToUse.uid];
        if (coachDecision && coachDecision.status) {
          appointmentStatus = coachDecision.status;
          console.log('📊 CALENDRIER COACH - Statut coach trouvé:', coachDecision.status, 'pour coach:', userToUse.uid);
        }

        console.log('📊 CALENDRIER COACH - Statut final du RDV:', appointmentStatus);

        appointmentsData.push({
          id: appointmentDoc.id,
          sessionType: appointmentInfo.sessionType || 'Session',
          description: appointmentInfo.description || '',
          location: appointmentInfo.location || '',
          date: appointmentDate,
          startTime: appointmentInfo.startTime || '00:00',
          endTime: appointmentInfo.endTime || '01:00',
          duration: appointmentInfo.duration,
          type: appointmentInfo.type || 'solo',
          clientId: appointmentInfo.createdBy || '',
          clientName: clientName,
          status: appointmentStatus
        });
      }

      // Trier par date
      appointmentsData.sort((a, b) => a.date.getTime() - b.date.getTime());

      console.log('📊 CALENDRIER COACH - RDV finaux:', appointmentsData);
      setAppointments(appointmentsData);
      generateMarkedDates(appointmentsData);
      
      console.log('✅ CALENDRIER COACH - RDV chargés:', appointmentsData.length);
      
    } catch (error) {
      console.error('❌ CALENDRIER COACH - Erreur lors du chargement:', error);
      Alert.alert('Erreur', 'Impossible de charger les rendez-vous');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateMarkedDates = (appointmentsData: Appointment[]) => {
    console.log('🗓️ CALENDRIER COACH - Génération des dates marquées pour:', appointmentsData.length, 'RDV');
    const marked: MarkedDates = {};
    const dateStatuses: { [key: string]: string[] } = {};
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
    
    // Grouper les statuts par date
    appointmentsData.forEach(appointment => {
      const dateKey = appointment.date.toISOString().split('T')[0];
      console.log('📅 CALENDRIER COACH - Marquage date:', dateKey, 'pour RDV:', appointment.sessionType, 'statut:', appointment.status);
      
      // Vérifier si le rendez-vous est passé
      const appointmentDate = new Date(appointment.date);
      appointmentDate.setHours(0, 0, 0, 0);
      const isPastAppointment = appointmentDate < currentDate;
      
      if (!dateStatuses[dateKey]) {
        dateStatuses[dateKey] = [];
      }
      
      // Si le rendez-vous est passé, on le marque comme "finished"
      if (isPastAppointment) {
        dateStatuses[dateKey].push('finished');
      } else {
        dateStatuses[dateKey].push(appointment.status);
      }
    });

    // Définir la couleur par ordre de priorité pour chaque date
    Object.keys(dateStatuses).forEach(dateKey => {
      const statuses = dateStatuses[dateKey];
      let dotColor = '#95a5a6'; // Gris par défaut
      
      // Si tous les RDV de cette date sont terminés (passés), utiliser gris
      if (statuses.every(status => status === 'finished')) {
        dotColor = '#95a5a6'; // Gris pour rendez-vous terminés
      } else {
        // Ordre de priorité : accepted/confirmed > pending > rejected/cancelled
        if (statuses.includes('accepted') || statuses.includes('confirmed')) {
          dotColor = '#27ae60'; // Vert pour accepté/confirmé (priorité haute)
        } else if (statuses.includes('pending')) {
          dotColor = '#f39c12'; // Orange pour en attente (priorité moyenne)
        } else if (statuses.includes('rejected') || statuses.includes('cancelled')) {
          dotColor = '#e74c3c'; // Rouge pour refusé/annulé (priorité basse)
        }

        // Si mixte (accepté + pending), utiliser une couleur spéciale
        if ((statuses.includes('accepted') || statuses.includes('confirmed')) && 
            statuses.includes('pending')) {
          dotColor = '#9b59b6'; // Violet pour statut mixte (partiellement accepté)
        }
      }

      console.log('🎨 CALENDRIER COACH - Couleur finale pour', dateKey, ':', dotColor, 'statuts:', statuses);

      marked[dateKey] = {
        marked: true,
        dotColor: dotColor
      };
    });

    console.log('🎯 CALENDRIER COACH - Dates marquées finales:', marked);
    setMarkedDates(marked);
  };

  const onDayPress = (day: DateData) => {
    const selectedDateStr = day.dateString;
    console.log('📅 CALENDRIER COACH - Jour sélectionné:', selectedDateStr);
    
    // Filtrer les RDV pour le jour sélectionné
    const appointmentsForDay = appointments.filter(appointment => {
      const appointmentDateStr = appointment.date.toISOString().split('T')[0];
      return appointmentDateStr === selectedDateStr;
    });

    console.log('📋 CALENDRIER COACH - RDV pour le jour:', appointmentsForDay);
    
    setSelectedDate(selectedDateStr);
    setDayAppointments(appointmentsForDay);
    setModalVisible(true);
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '00:00';
    
    // Si c'est déjà au format HH:MM, on le retourne tel quel
    if (timeString.length === 5 && timeString.includes(':')) {
      return timeString;
    }
    
    // Si c'est un timestamp ou une date, on extrait l'heure
    try {
      const date = new Date(timeString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
      }
    } catch (error) {
      console.log('⚠️ CALENDRIER COACH - Erreur formatage heure:', error);
    }
    
    // Par défaut, garde seulement les 5 premiers caractères
    return timeString.slice(0, 5);
  };

  const getMonthlyStats = () => {
    // Filtrer les rendez-vous du mois courant
    const monthlyAppointments = appointments.filter(appointment => {
      const appointmentMonth = appointment.date.toISOString().slice(0, 7);
      return appointmentMonth === currentMonth;
    });

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // Séparer les rendez-vous terminés des rendez-vous futurs
    const finishedAppointments = monthlyAppointments.filter(appointment => {
      const appointmentDate = new Date(appointment.date);
      appointmentDate.setHours(0, 0, 0, 0);
      return appointmentDate < currentDate;
    });

    const futureAppointments = monthlyAppointments.filter(appointment => {
      const appointmentDate = new Date(appointment.date);
      appointmentDate.setHours(0, 0, 0, 0);
      return appointmentDate >= currentDate;
    });

    const total = monthlyAppointments.length;
    const finished = finishedAppointments.length;
    // Seuls les rendez-vous futurs peuvent être "confirmés" ou "en attente"
    const confirmed = futureAppointments.filter(a => 
      a.status === 'confirmed' || a.status === 'accepted'
    ).length;
    const pending = futureAppointments.filter(a => a.status === 'pending').length;

    return { total, finished, confirmed, pending };
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
      case 'confirmed':
      case 'accepted': return '#27ae60'; // Vert pour confirmé/accepté
      case 'pending': return '#f39c12';  // Orange pour en attente
      case 'cancelled':
      case 'rejected': return '#e74c3c'; // Rouge pour annulé/refusé
      default: return '#95a5a6';         // Gris pour inconnu
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
      case 'confirmed': return 'Confirmé';
      case 'accepted': return 'Accepté';
      case 'pending': return 'En attente';
      case 'cancelled': return 'Annulé';
      case 'rejected': return 'Refusé';
      default: return 'Inconnu';
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCoachAppointments(currentUser);
  };

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!currentUser) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="person-outline" size={64} color="#ccc" />
        <Text style={styles.loadingText}>Vous devez être connecté</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Chargement du calendrier...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.push('/')}
        >
          <Ionicons name="arrow-back" size={24} color="#3498db" />
        </TouchableOpacity>
        <Ionicons name="calendar" size={24} color="#3498db" />
        <Text style={styles.headerTitle}>Planning Coach</Text>
      </View>

      {/* Statistiques */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{getMonthlyStats().total}</Text>
          <Text style={styles.statLabel}>Total RDV</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#95a5a6' }]}>
            {getMonthlyStats().finished}
          </Text>
          <Text style={styles.statLabel}>Terminés</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#27ae60' }]}>
            {getMonthlyStats().confirmed}
          </Text>
          <Text style={styles.statLabel}>Confirmés</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#f39c12' }]}>
            {getMonthlyStats().pending}
          </Text>
          <Text style={styles.statLabel}>En attente</Text>
        </View>
      </View>

      {/* Calendrier */}
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.calendarContainer}>
          <Calendar
            onDayPress={onDayPress}
            onMonthChange={(month: { month: number; year: number }) => {
              console.log('📅 CALENDRIER COACH - Changement de mois:', month);
              setCurrentMonth(`${month.year}-${month.month.toString().padStart(2, '0')}`);
            }}
            markedDates={markedDates}
            theme={{
              backgroundColor: '#ffffff',
              calendarBackground: '#ffffff',
              textSectionTitleColor: '#b6c1cd',
              selectedDayBackgroundColor: '#3498db',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#3498db',
              dayTextColor: '#2d4150',
              textDisabledColor: '#d9e1e8',
              dotColor: '#3498db',
              selectedDotColor: '#ffffff',
              arrowColor: '#3498db',
              monthTextColor: '#3498db',
              indicatorColor: '#3498db',
              textDayFontFamily: 'System',
              textMonthFontFamily: 'System',
              textDayHeaderFontFamily: 'System',
              textDayFontWeight: '300',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '300',
              textDayFontSize: 16,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 13
            }}
          />
        </View>

        {/* Légende des couleurs */}
        <View style={styles.legendContainer}>
          <Text style={styles.legendTitle}>Légende :</Text>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#e74c3c' }]} />
              <Text style={styles.legendText}>En attente</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#27ae60' }]} />
              <Text style={styles.legendText}>Confirmé</Text>
            </View>
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#9b59b6' }]} />
              <Text style={styles.legendText}>Partiel</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#95a5a6' }]} />
              <Text style={styles.legendText}>Terminé</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modal pour les RDV du jour */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Rendez-vous du {selectedDate ? formatDate(new Date(selectedDate)) : ''}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {dayAppointments.length === 0 ? (
                <View style={styles.noAppointmentsContainer}>
                  <Ionicons name="calendar-outline" size={64} color="#ccc" />
                  <Text style={styles.noAppointmentsText}>
                    Aucun rendez-vous ce jour
                  </Text>
                </View>
              ) : (
                dayAppointments.map((appointment) => (
                  <View key={appointment.id} style={styles.appointmentCard}>
                    <View style={styles.appointmentHeader}>
                      <Text style={styles.appointmentTitle}>
                        {appointment.sessionType}
                      </Text>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(appointment.status, appointment.date) }
                      ]}>
                        <Text style={styles.statusText}>
                          {getStatusText(appointment.status, appointment.date)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.appointmentDetails}>
                      <View style={styles.appointmentRow}>
                        <Ionicons name="time" size={16} color="#666" />
                        <Text style={styles.appointmentText}>
                          {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                          {appointment.duration && ` (${appointment.duration} min)`}
                        </Text>
                      </View>

                      <View style={styles.appointmentRow}>
                        <Ionicons name="person" size={16} color="#666" />
                        <Text style={styles.appointmentText}>
                          Client : {appointment.clientName}
                        </Text>
                      </View>

                      <View style={styles.appointmentRow}>
                        <Ionicons name="location" size={16} color="#666" />
                        <Text style={styles.appointmentText}>
                          {appointment.location}
                        </Text>
                      </View>

                      {appointment.description && (
                        <View style={styles.appointmentRow}>
                          <Ionicons name="document-text" size={16} color="#666" />
                          <Text style={styles.appointmentText}>
                            {appointment.description}
                          </Text>
                        </View>
                      )}

                      <View style={styles.appointmentRow}>
                        <Ionicons name="people" size={16} color="#666" />
                        <Text style={styles.appointmentText}>
                          Type : {appointment.type === 'solo' ? 'Individuel' : 'Groupe'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 20,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3498db',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  calendarContainer: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  modalScrollView: {
    flex: 1,
    padding: 16,
  },
  noAppointmentsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noAppointmentsText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  appointmentCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  appointmentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  appointmentDetails: {
    gap: 8,
  },
  appointmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appointmentText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  legendContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#666',
  },
});
