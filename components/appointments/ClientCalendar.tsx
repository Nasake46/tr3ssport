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
import * as appointmentService from '../../services/appointmentService';
import * as appointmentServiceSimple from '../../services/appointmentServiceSimple';
import JitsiMeetingManager from '../meetings/JitsiMeetingManager';
import * as appointmentServiceMinimal from '../../services/appointmentServiceMinimal';
import * as appointmentServiceFirebaseOnly from '../../services/appointmentServiceFirebaseOnly';
import * as testService from '../../services/testService';

// Logs de debug pour les imports
console.log('🔍 DEBUG IMPORT - appointmentService:', appointmentService);
console.log('🔍 DEBUG IMPORT - appointmentService keys:', Object.keys(appointmentService));
console.log('🔍 DEBUG IMPORT - appointmentServiceSimple:', appointmentServiceSimple);
console.log('🔍 DEBUG IMPORT - appointmentServiceSimple keys:', Object.keys(appointmentServiceSimple));
console.log('🔍 DEBUG IMPORT - appointmentServiceMinimal:', appointmentServiceMinimal);
console.log('🔍 DEBUG IMPORT - appointmentServiceMinimal keys:', Object.keys(appointmentServiceMinimal));
console.log('🔍 DEBUG IMPORT - testService:', testService);
console.log('🔍 DEBUG IMPORT - testService keys:', Object.keys(testService));
console.log('🔍 DEBUG IMPORT - linkUserToEmailInvitations type:', typeof appointmentService.linkUserToEmailInvitations);
console.log('🔍 DEBUG IMPORT - testFunction type:', typeof appointmentService.testFunction);

interface Appointment {
  id: string;
  sessionType: string;
  description: string;
  location: string;
  date: Date;
  startTime: string;
  endTime: string;
  type: 'solo' | 'group';
  coachId: string;
  coachName?: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'accepted' | 'rejected';
  invitationStatus?: 'pending' | 'accepted' | 'refused';
}

interface MarkedDates {
  [key: string]: {
    marked: boolean;
    dotColor: string;
    selectedColor?: string;
  };
}

export default function ClientCalendar() {
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
        console.log('⚠️ CALENDRIER - Date null ou undefined');
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

      console.log('⚠️ CALENDRIER - Format de date non reconnu:', typeof dateValue, dateValue);
      return null;
    } catch (error) {
      console.log('⚠️ CALENDRIER - Erreur conversion date:', error);
      return null;
    }
  };

  useEffect(() => {
    console.log('🔍 CALENDRIER - Initialisation du listener d\'authentification');
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔄 CALENDRIER - État d\'authentification changé:', user ? 'Connecté' : 'Déconnecté');
      setCurrentUser(user);
      setAuthLoading(false);
      
      if (user) {
        console.log('✅ CALENDRIER - Utilisateur connecté, chargement des RDV');
        loadClientAppointments(user);
      } else {
        console.log('❌ CALENDRIER - Utilisateur déconnecté');
        setAppointments([]);
        setMarkedDates({});
        setLoading(false);
      }
    });

    return () => {
      console.log('🧹 CALENDRIER - Nettoyage du listener d\'authentification');
      unsubscribe();
    };
  }, []);

  const loadClientAppointments = async (user?: User | null) => {
    const userToUse = user || currentUser;
    
    if (!userToUse) {
      console.log('❌ CALENDRIER CLIENT - Utilisateur non connecté');
      setLoading(false);
      return;
    }

    if (!userToUse.email) {
      console.log('❌ CALENDRIER CLIENT - Email utilisateur manquant');
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 CALENDRIER CLIENT - Chargement des RDV pour:', userToUse.email);
      console.log('🔍 DEBUG - appointmentService disponible:', !!appointmentService);
      console.log('🔍 DEBUG - testService disponible:', !!testService);
      console.log('🔍 DEBUG - testService.simpleTestFunction disponible:', !!testService.simpleTestFunction);
      console.log('🔍 DEBUG - appointmentService.testFunction disponible:', !!appointmentService.testFunction);
      console.log('🔍 DEBUG - appointmentService.linkUserToEmailInvitations disponible:', !!appointmentService.linkUserToEmailInvitations);
      
      // Test du service simple d'abord
      try {
        console.log('🧪 SIMPLE TEST - Tentative d\'appel simpleTestFunction...');
        await testService.simpleTestFunction();
        console.log('✅ SIMPLE TEST - simpleTestFunction réussie');
      } catch (simpleError) {
        console.error('❌ SIMPLE TEST - Erreur simpleTestFunction:', simpleError);
      }
      
      // Test de la fonction simple d'abord
      try {
        console.log('🧪 TEST - Tentative d\'appel testFunction...');
        await appointmentService.testFunction();
        console.log('✅ TEST - testFunction réussie');
      } catch (testError) {
        console.error('❌ TEST - Erreur testFunction:', testError);
      }
      
      // D'abord, lier les invitations par email à cet utilisateur
      try {
        console.log('🔗 LIAISON - Tentative d\'appel linkUserToEmailInvitations...');
        await appointmentService.linkUserToEmailInvitations(userToUse.uid, userToUse.email);
        console.log('✅ LIAISON - linkUserToEmailInvitations réussie');
      } catch (linkError) {
        console.error('❌ LIAISON - Erreur linkUserToEmailInvitations:', linkError);
      }
      
      // Utiliser le nouveau service pour récupérer tous les rendez-vous (créés + invitations)
      const appointmentsWithParticipants = await appointmentService.getAllAppointmentsForClient(userToUse.uid, userToUse.email);
      console.log('📊 CALENDRIER CLIENT - RDV récupérés:', appointmentsWithParticipants.length);
      
      const appointmentsData: Appointment[] = [];

      for (const apt of appointmentsWithParticipants) {
        // Vérifier que les données requises existent
        const appointmentDate = apt.date;
        if (!appointmentDate) {
          console.log('⚠️ CALENDRIER - RDV sans date valide, ignoré:', apt.id);
          continue;
        }
        
        // Déterminer le statut et les infos du coach
        let coachName = 'Coach inconnu';
        let appointmentStatus: 'confirmed' | 'pending' | 'cancelled' | 'accepted' | 'rejected' = apt.globalStatus === 'confirmed' ? 'confirmed' : 'pending';
        
        console.log(`📅 CALENDRIER DEBUG - RDV ${apt.id}:`, {
          startTime: (apt as any).startTime,
          endTime: (apt as any).endTime,
          date: appointmentDate.toISOString()
        });
        
        if (apt.coaches && apt.coaches.length > 0) {
          const firstCoach = apt.coaches[0];
          coachName = `Coach ${firstCoach.id}`;
          
          // Si l'utilisateur est le créateur, on prend le statut global
          // Si l'utilisateur est invité, on prend son statut personnel
          const userParticipant = apt.clients.find(c => c.userId === userToUse.uid || c.email === userToUse.email);
          if (userParticipant && apt.createdBy !== userToUse.uid) {
            // Mapper les statuts des participants vers les statuts des appointments
            switch (userParticipant.status) {
              case 'accepted':
                appointmentStatus = 'accepted';
                break;
              case 'declined':
                appointmentStatus = 'rejected';
                break;
              case 'pending':
                appointmentStatus = 'pending';
                break;
              default:
                appointmentStatus = 'pending';
            }
          }
        }

        appointmentsData.push({
          id: apt.id,
          sessionType: apt.sessionType || 'Session',
          description: apt.description || '',
          location: apt.location || '',
          date: appointmentDate,
          startTime: (apt as any).startTime || '09:00', // Utiliser l'heure réelle ou défaut si manquante
          endTime: (apt as any).endTime || '10:00',     // Utiliser l'heure réelle ou défaut si manquante
          type: apt.type || 'solo',
          coachId: apt.coaches[0]?.userId || '',
          coachName: coachName,
          status: appointmentStatus
        });
      }

      // Trier par date
      appointmentsData.sort((a, b) => a.date.getTime() - b.date.getTime());

      console.log('📊 CALENDRIER CLIENT - RDV finaux:', appointmentsData);
      setAppointments(appointmentsData);
      generateMarkedDates(appointmentsData);
      
      console.log('✅ CALENDRIER CLIENT - RDV chargés:', appointmentsData.length);
      
    } catch (error) {
      console.error('❌ CALENDRIER CLIENT - Erreur lors du chargement:', error);
      Alert.alert('Erreur', 'Impossible de charger les rendez-vous');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateMarkedDates = (appointmentsData: Appointment[]) => {
    console.log('🗓️ CALENDRIER - Génération des dates marquées pour:', appointmentsData.length, 'RDV');
    const marked: MarkedDates = {};
    const dateStatuses: { [key: string]: string[] } = {};
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
    
    // Grouper les statuts par date
    appointmentsData.forEach(appointment => {
      const dateKey = appointment.date.toISOString().split('T')[0];
      console.log('📅 CALENDRIER - Marquage date:', dateKey, 'pour RDV:', appointment.sessionType, 'statut:', appointment.status);
      
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

      console.log('🎨 CALENDRIER - Couleur finale pour', dateKey, ':', dotColor, 'statuts:', statuses);

      marked[dateKey] = {
        marked: true,
        dotColor: dotColor
      };
    });

    console.log('🎯 CALENDRIER - Dates marquées finales:', marked);
    setMarkedDates(marked);
  };

  const onDayPress = (day: DateData) => {
    const selectedDateStr = day.dateString;
    setSelectedDate(selectedDateStr);
    
    // Filtrer les RDV pour cette date
    const appointmentsForDay = appointments.filter(appointment => {
      const appointmentDateStr = appointment.date.toISOString().split('T')[0];
      return appointmentDateStr === selectedDateStr;
    });
    
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
      console.log('⚠️ CALENDRIER - Erreur formatage heure:', error);
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
    loadClientAppointments(currentUser);
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
        <Text style={styles.headerTitle}>Mon Calendrier</Text>
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
        <Calendar
          onDayPress={onDayPress}
          onMonthChange={(month: { month: number; year: number }) => {
            console.log('📅 CALENDRIER - Changement de mois:', month);
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
            monthTextColor: '#2d4150',
            indicatorColor: '#3498db',
            textDayFontFamily: 'System',
            textMonthFontFamily: 'System',
            textDayHeaderFontFamily: 'System',
            textDayFontSize: 16,
            textMonthFontSize: 18,
            textDayHeaderFontSize: 14
          }}
        />

        {/* Légende */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Légende :</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#27ae60' }]} />
              <Text style={styles.legendText}>Confirmé</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#f39c12' }]} />
              <Text style={styles.legendText}>En attente</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#9b59b6' }]} />
              <Text style={styles.legendText}>Partiel</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#e74c3c' }]} />
              <Text style={styles.legendText}>Annulé</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#95a5a6' }]} />
              <Text style={styles.legendText}>Terminé</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modal des détails du jour */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedDate ? formatDate(new Date(selectedDate)) : ''}
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
                <View style={styles.noAppointments}>
                  <Ionicons name="calendar-outline" size={48} color="#ccc" />
                  <Text style={styles.noAppointmentsText}>
                    Aucun rendez-vous ce jour
                  </Text>
                </View>
              ) : (
                dayAppointments.map((appointment, index) => (
                  <View key={index} style={styles.appointmentCard}>
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
                        </Text>
                      </View>

                      <View style={styles.appointmentRow}>
                        <Ionicons name="person" size={16} color="#666" />
                        <Text style={styles.appointmentText}>
                          Coach : {appointment.coachName}
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

                    {/* Composant Jitsi Meeting */}
                    <JitsiMeetingManager
                      appointmentId={appointment.id}
                      appointmentTitle={appointment.sessionType}
                      isCreator={currentUser?.uid === appointment.createdBy}
                    />
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
  legend: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
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
    padding: 4,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  noAppointments: {
    alignItems: 'center',
    padding: 40,
  },
  noAppointmentsText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  appointmentCard: {
    backgroundColor: '#f8f9fa',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  appointmentTitle: {
    fontSize: 18,
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
  },
  appointmentText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
});
