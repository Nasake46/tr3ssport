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
import { AppointmentRequest } from '@/models/appointment';
import { getUserAppointmentRequests } from '@/services/appointmentService';

const UserAppointmentRequestsScreen = () => {
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

  const handleRefresh = async () => {
    if (!currentUserId) return;
    
    setRefreshing(true);
    await loadRequests(currentUserId);
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'confirmed': return '#4CAF50';
      case 'rejected': return '#F44336';
      case 'cancelled': return '#999';
      default: return '#666';
    }
  };

  const getStatusLabel = (status: string) => {
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
      case 'pending': return 'time-outline';
      case 'confirmed': return 'checkmark-circle';
      case 'rejected': return 'close-circle';
      case 'cancelled': return 'ban-outline';
      default: return 'help-circle-outline';
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

  const renderRequestCard = (request: AppointmentRequest) => (
    <View key={request.id} style={styles.requestCard}>
      {/* Header avec statut */}
      <View style={styles.requestHeader}>
        <View style={styles.statusContainer}>
          <Ionicons 
            name={getStatusIcon(request.status)} 
            size={20} 
            color={getStatusColor(request.status)} 
          />
          <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
            {getStatusLabel(request.status)}
          </Text>
        </View>
        <Text style={styles.requestDate}>
          {request.createdAt.toLocaleDateString('fr-FR')}
        </Text>
      </View>

      {/* Coach info */}
      <View style={styles.coachInfo}>
        <Text style={styles.coachLabel}>Coach demandé:</Text>
        <Text style={styles.coachName}>Coach #{request.coachId.slice(-6)}</Text>
      </View>

      {/* Détails de la demande */}
      <View style={styles.requestDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Objectif:</Text>
          <Text style={styles.detailValue}>{request.objective}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Niveau:</Text>
          <Text style={styles.detailValue}>{getSportLevelLabel(request.sportLevel)}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Lieu souhaité:</Text>
          <Text style={styles.detailValue}>{request.preferredLocation}</Text>
        </View>

        {request.preferredDate && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date souhaitée:</Text>
            <Text style={styles.detailValue}>
              {request.preferredDate.toLocaleDateString('fr-FR')}
            </Text>
          </View>
        )}

        {request.preferredTime && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Heure souhaitée:</Text>
            <Text style={styles.detailValue}>{request.preferredTime}</Text>
          </View>
        )}

        {request.additionalNotes && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Notes:</Text>
            <Text style={styles.detailValue}>{request.additionalNotes}</Text>
          </View>
        )}
      </View>

      {/* Réponse du coach */}
      {request.coachResponse && (
        <View style={[
          styles.coachResponse,
          { backgroundColor: request.status === 'confirmed' ? '#e8f5e8' : '#ffeaea' }
        ]}>
          <Text style={styles.responseLabel}>Réponse du coach:</Text>
          <Text style={styles.responseText}>{request.coachResponse}</Text>
        </View>
      )}

      {/* Actions selon le statut */}
      {request.status === 'pending' && (
        <View style={styles.pendingInfo}>
          <Ionicons name="information-circle-outline" size={16} color="#FFA500" />
          <Text style={styles.pendingText}>
            En attente de la réponse du coach
          </Text>
        </View>
      )}

      {request.status === 'confirmed' && (
        <TouchableOpacity style={styles.contactButton}>
          <Ionicons name="call" size={16} color="#4CAF50" />
          <Text style={styles.contactButtonText}>
            Contacter le coach
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7667ac" />
        <Text style={styles.loadingText}>Chargement de vos demandes...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes demandes de RDV</Text>
        <TouchableOpacity onPress={handleRefresh}>
          <Ionicons name="refresh" size={24} color="#7667ac" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#ccc" />
            <Text style={styles.emptyStateTitle}>Aucune demande</Text>
            <Text style={styles.emptyStateText}>
              Vous n'avez pas encore fait de demandes de rendez-vous
            </Text>
            <TouchableOpacity 
              style={styles.newRequestButton}
              onPress={() => router.push('/(tabs)/bookAppointment')}
            >
              <Text style={styles.newRequestButtonText}>Prendre un RDV</Text>
            </TouchableOpacity>
          </View>
        ) : (
          requests.map(renderRequestCard)
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  requestDate: {
    fontSize: 12,
    color: '#999',
  },
  coachInfo: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  coachLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  coachName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  requestDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  coachResponse: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    color: '#666',
  },
  pendingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff8e1',
    padding: 8,
    borderRadius: 6,
    gap: 6,
  },
  pendingText: {
    fontSize: 12,
    color: '#FFA500',
    fontWeight: '500',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  contactButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  newRequestButton: {
    backgroundColor: '#7667ac',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  newRequestButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default UserAppointmentRequestsScreen;
