import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { AppointmentRequest } from '@/models/appointment';
import { getCoachAppointmentRequests } from '@/services/appointmentService';

const { width: screenWidth } = Dimensions.get('window');

interface ScheduleEvent {
  id: string;
  title: string;
  date: Date;
  time: string;
  client: string;
  phone: string;
  objective: string;
  location: string;
  level: string;
  notes?: string;
}

const CoachScheduleScreen = () => {
  const router = useRouter();
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentCoachId, setCurrentCoachId] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentCoachId(user.uid);
        await loadSchedule(user.uid);
      } else {
        Alert.alert(
          'Connexion requise',
          'Vous devez être connecté en tant que coach',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    });

    return unsubscribe;
  }, []);

  const loadSchedule = async (coachId: string) => {
    try {
      setLoading(true);
      const appointmentRequests = await getCoachAppointmentRequests(coachId);
        // Filtrer seulement les demandes confirmées avec une date
      const confirmedAppointments = appointmentRequests
        .filter(req => req.status === 'confirmed' && (req.confirmedDate || req.preferredDate))
        .map(req => ({
          id: req.id!,
          title: `RDV - ${req.userFirstName} ${req.userLastName}`,
          date: req.confirmedDate || req.preferredDate!,
          time: req.confirmedTime || req.preferredTime || 'Heure à définir',
          client: `${req.userFirstName} ${req.userLastName}`,
          phone: req.userPhone,
          objective: req.objective,
          location: req.confirmedLocation || req.preferredLocation,
          level: getSportLevelLabel(req.sportLevel),
          notes: req.additionalNotes
        }));

      setEvents(confirmedAppointments);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'emploi du temps:', error);
      Alert.alert('Erreur', 'Impossible de charger l\'emploi du temps');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    if (currentCoachId) {
      setRefreshing(true);
      await loadSchedule(currentCoachId);
      setRefreshing(false);
    }
  };

  const getSportLevelLabel = (level: string) => {
    switch (level) {
      case 'debutant': return 'Débutant';
      case 'confirme': return 'Confirmé';
      case 'expert': return 'Expert';
      default: return level;
    }
  };

  const getWeekDates = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Lundi comme premier jour
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      event.date.toDateString() === date.toDateString()
    );
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(selectedWeek);
    newWeek.setDate(selectedWeek.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedWeek(newWeek);
  };

  const renderWeekView = () => {
    const weekDates = getWeekDates(selectedWeek);
    const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

    return (
      <View style={styles.weekContainer}>
        {/* Navigation de semaine */}
        <View style={styles.weekNavigation}>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => navigateWeek('prev')}
          >
            <Ionicons name="chevron-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          
          <Text style={styles.weekTitle}>
            {weekDates[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - {' '}
            {weekDates[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
          
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => navigateWeek('next')}
          >
            <Ionicons name="chevron-forward" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Grille de la semaine */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.weekGrid}>
            {/* En-têtes des jours */}
            <View style={styles.dayHeaders}>
              {weekDates.map((date, index) => {
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                  <View key={index} style={[styles.dayHeader, isToday && styles.todayHeader]}>
                    <Text style={[styles.dayName, isToday && styles.todayText]}>
                      {dayNames[index]}
                    </Text>
                    <Text style={[styles.dayNumber, isToday && styles.todayText]}>
                      {date.getDate()}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Événements pour chaque jour */}
            <View style={styles.daysContainer}>
              {weekDates.map((date, index) => {
                const dayEvents = getEventsForDate(date);
                return (
                  <View key={index} style={styles.dayColumn}>
                    {dayEvents.map(event => (
                      <TouchableOpacity 
                        key={event.id}
                        style={styles.eventCard}
                        onPress={() => showEventDetails(event)}
                      >
                        <Text style={styles.eventTime}>{event.time}</Text>
                        <Text style={styles.eventTitle} numberOfLines={2}>
                          {event.client}
                        </Text>
                        <Text style={styles.eventObjective} numberOfLines={1}>
                          {event.objective}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderListView = () => {
    const today = new Date();
    const upcomingEvents = events
      .filter(event => event.date >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (upcomingEvents.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Aucun rendez-vous confirmé</Text>
          <Text style={styles.emptySubtext}>
            Les demandes acceptées apparaîtront ici
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.listContainer}>
        {upcomingEvents.map(event => (
          <TouchableOpacity 
            key={event.id}
            style={styles.listEventCard}
            onPress={() => showEventDetails(event)}
          >
            <View style={styles.eventDateBadge}>
              <Text style={styles.eventDateDay}>
                {event.date.getDate()}
              </Text>
              <Text style={styles.eventDateMonth}>
                {event.date.toLocaleDateString('fr-FR', { month: 'short' })}
              </Text>
            </View>
            
            <View style={styles.eventInfo}>
              <Text style={styles.listEventTitle}>{event.client}</Text>
              <Text style={styles.listEventTime}>{event.time}</Text>
              <Text style={styles.listEventObjective}>{event.objective}</Text>
              <View style={styles.eventMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={14} color="#666" />
                  <Text style={styles.metaText}>{event.location}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="fitness-outline" size={14} color="#666" />
                  <Text style={styles.metaText}>{event.level}</Text>
                </View>
              </View>
            </View>
            
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const showEventDetails = (event: ScheduleEvent) => {
    Alert.alert(
      'Détails du rendez-vous',
      `Client: ${event.client}\n` +
      `Date: ${event.date.toLocaleDateString('fr-FR')}\n` +
      `Heure: ${event.time}\n` +
      `Téléphone: ${event.phone}\n` +
      `Objectif: ${event.objective}\n` +
      `Lieu: ${event.location}\n` +
      `Niveau: ${event.level}` +
      (event.notes ? `\n\nNotes: ${event.notes}` : ''),
      [
        { text: 'Appeler', onPress: () => {} }, // TODO: Implémenter l'appel
        { text: 'Fermer', style: 'cancel' }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Chargement de l'emploi du temps...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        
        <Text style={styles.title}>Emploi du temps</Text>
        
        <View style={styles.viewToggle}>
          <TouchableOpacity 
            style={[styles.toggleButton, viewMode === 'week' && styles.activeToggle]}
            onPress={() => setViewMode('week')}
          >
            <Ionicons name="calendar-outline" size={20} color={viewMode === 'week' ? '#fff' : '#007AFF'} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleButton, viewMode === 'month' && styles.activeToggle]}
            onPress={() => setViewMode('month')}
          >
            <Ionicons name="list-outline" size={20} color={viewMode === 'month' ? '#fff' : '#007AFF'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Statistiques */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{events.length}</Text>
          <Text style={styles.statLabel}>RDV confirmés</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {events.filter(e => e.date >= new Date()).length}
          </Text>
          <Text style={styles.statLabel}>À venir</Text>
        </View>
      </View>

      {/* Contenu */}
      <View style={styles.content}>
        {viewMode === 'week' ? renderWeekView() : renderListView()}
      </View>

      {/* Refresh Control pour la vue liste */}
      {viewMode === 'month' && (
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    padding: 8,
    borderRadius: 6,
  },
  activeToggle: {
    backgroundColor: '#007AFF',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  weekContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  navButton: {
    padding: 8,
  },
  weekTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  weekGrid: {
    minWidth: screenWidth,
  },
  dayHeaders: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dayHeader: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    minWidth: screenWidth / 7,
  },
  todayHeader: {
    backgroundColor: '#007AFF20',
  },
  dayName: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  todayText: {
    color: '#007AFF',
  },
  daysContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  dayColumn: {
    flex: 1,
    minWidth: screenWidth / 7,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    padding: 4,
  },
  eventCard: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    padding: 8,
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500',
  },
  eventTitle: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    marginTop: 2,
  },
  eventObjective: {
    fontSize: 10,
    color: '#fff',
    opacity: 0.8,
    marginTop: 2,
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  listEventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventDateBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  eventDateDay: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  eventDateMonth: {
    fontSize: 12,
    color: '#fff',
    textTransform: 'uppercase',
  },
  eventInfo: {
    flex: 1,
  },
  listEventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  listEventTime: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 2,
  },
  listEventObjective: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  eventMeta: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default CoachScheduleScreen;