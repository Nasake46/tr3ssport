import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { AppointmentRequest, SportLevel } from '@/models/appointment';
import { getUserAppointmentRequests } from '@/services/appointmentService';

const MyAppointmentsScreen = () => {
  const router = useRouter();
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUserId(user.uid);
        await loadRequests(user.uid);
      } else {
        Alert.alert(
          'Connexion requise',
          'Vous devez être connecté pour voir vos demandes',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    });

    return unsubscribe;
  }, []);

  const loadRequests = async (userId: string) => {
    try {
      setLoading(true);
      const appointmentRequests = await getUserAppointmentRequests(userId);
      setRequests(appointmentRequests);
    } catch (error) {
      console.error('Erreur lors du chargement des demandes:', error);
      Alert.alert('Erreur', 'Impossible de charger vos demandes de rendez-vous');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    if (!currentUserId) return;
    
    setRefreshing(true);
    await loadRequests(currentUserId);
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#4CAF50';
      case 'rejected': return '#F44336';
      case 'cancelled': return '#9E9E9E';
      default: return '#FF9800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'confirmed': return 'Confirmé';
      case 'rejected': return 'Refusé';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return 'checkmark-circle';
      case 'rejected': return 'close-circle';
      case 'cancelled': return 'ban';
      default: return 'time';
    }
  };

  const getSportLevelText = (level: SportLevel) => {
    switch (level) {
      case 'débutant': return 'Débutant';
      case 'confirmé': return 'Confirmé';
      case 'expert': return 'Expert';
      default: return level;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Non spécifiée';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Date invalide';
    }
  };

  const renderRequestCard = (request: AppointmentRequest) => (
    <View key={request.id} style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.statusContainer}>
          <Ionicons 
            name={getStatusIcon(request.status)} 
            size={20} 
            color={getStatusColor(request.status)} 
          />
          <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
            {getStatusText(request.status)}
          </Text>
        </View>
        <Text style={styles.dateText}>
          {formatDate(request.createdAt)}
        </Text>
      </View>

      <View style={styles.requestBody}>
        <Text style={styles.coachName}>Coach: {request.coachName}</Text>
        
        <View style={styles.detailRow}>
          <Ionicons name="target" size={16} color="#666" />
          <Text style={styles.detailText}>Objectif: {request.objective}</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="trophy" size={16} color="#666" />
          <Text style={styles.detailText}>Niveau: {getSportLevelText(request.sportLevel)}</Text>
        </View>

        {request.preferredLocation && (
          <View style={styles.detailRow}>
            <Ionicons name="location" size={16} color="#666" />
            <Text style={styles.detailText}>Lieu préféré: {request.preferredLocation}</Text>
          </View>
        )}

        {request.preferredDate && (
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={16} color="#666" />
            <Text style={styles.detailText}>Date souhaitée: {formatDate(request.preferredDate)}</Text>
          </View>
        )}

        {request.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Notes:</Text>
            <Text style={styles.notesText}>{request.notes}</Text>
          </View>
        )}

        {request.coachResponse && (
          <View style={styles.responseContainer}>
            <Text style={styles.responseLabel}>Réponse du coach:</Text>
            <Text style={styles.responseText}>{request.coachResponse}</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5D5A88" />
          <Text style={styles.loadingText}>Chargement de vos demandes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#5D5A88" />
        </TouchableOpacity>
        <Text style={styles.title}>Mes Rendez-vous</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/bookAppointment')} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#5D5A88" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {requests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>Aucune demande de rendez-vous</Text>
            <Text style={styles.emptyText}>
              Vous n'avez pas encore fait de demande de rendez-vous.
            </Text>
            <TouchableOpacity 
              style={styles.bookButton}
              onPress={() => router.push('/(tabs)/bookAppointment')}
            >
              <Text style={styles.bookButtonText}>Prendre rendez-vous</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.requestsList}>
            {requests.map(renderRequestCard)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5D5A88',
  },
  addButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 40,
  },
  bookButton: {
    backgroundColor: '#5D5A88',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  requestsList: {
    gap: 15,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 12,
    color: '#666',
  },
  requestBody: {
    gap: 8,
  },
  coachName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  notesContainer: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
  },
  responseContainer: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    color: '#2E7D32',
  },
});

export default MyAppointmentsScreen;
