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
import { 
  getCoachAppointmentRequests, 
  updateAppointmentRequestStatus 
} from '@/services/appointmentService';
import AcceptAppointmentModal from '@/components/AcceptAppointmentModal';

const CoachAppointmentRequestsScreen = () => {
  const router = useRouter();  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentCoachId, setCurrentCoachId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<AppointmentRequest | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentCoachId(user.uid);
        await loadRequests(user.uid);
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
  const loadRequests = async (coachId: string) => {
    try {
      setLoading(true);
      const appointmentRequests = await getCoachAppointmentRequests(coachId);
      
      // Filtrer pour ne garder que les demandes en attente et refusées
      // Les demandes confirmées vont dans l'emploi du temps
      const pendingRequests = appointmentRequests.filter(req => 
        req.status === 'pending' || req.status === 'rejected'
      );
      
      setRequests(pendingRequests);
    } catch (error) {
      console.error('Erreur lors du chargement des demandes:', error);
      Alert.alert('Erreur', 'Impossible de charger les demandes de rendez-vous');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!currentCoachId) return;
    
    setRefreshing(true);
    await loadRequests(currentCoachId);
    setRefreshing(false);
  };
  const handleAcceptRequest = (request: AppointmentRequest) => {
    setSelectedRequest(request);
    setModalVisible(true);
  };
  const handleRejectRequest = (request: AppointmentRequest) => {
    Alert.prompt(
      'Refuser la demande',
      'Motif du refus (optionnel):',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Refuser',
          onPress: (reason) => updateRequestStatus(request.id!, 'rejected', reason || 'Demande refusée')
        }
      ],
      'plain-text',
      '',
      'default'
    );
  };

  const handleModalAccept = async (
    requestId: string,
    response: string,
    confirmedDate?: Date,
    confirmedTime?: string,
    confirmedLocation?: string
  ) => {
    await updateRequestStatus(requestId, 'confirmed', response, confirmedDate, confirmedTime, confirmedLocation);
    setModalVisible(false);
    setSelectedRequest(null);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedRequest(null);
  };
  const updateRequestStatus = async (
    requestId: string, 
    status: 'confirmed' | 'rejected', 
    response: string,
    confirmedDate?: Date,
    confirmedTime?: string,
    confirmedLocation?: string
  ) => {
    try {
      await updateAppointmentRequestStatus(
        requestId, 
        status, 
        response, 
        confirmedDate, 
        confirmedTime, 
        confirmedLocation
      );
        // Mettre à jour la liste locale
      if (status === 'confirmed') {
        // Si confirmé, retirer de la liste des demandes en attente
        setRequests(prev => prev.filter(req => req.id !== requestId));
      } else {
        // Si rejeté, mettre à jour le statut
        setRequests(prev => 
          prev.map(req => 
            req.id === requestId 
              ? { 
                  ...req, 
                  status, 
                  coachResponse: response, 
                  updatedAt: new Date() 
                }
              : req
          )
        );
      }

      Alert.alert(
        'Succès',
        status === 'confirmed' 
          ? 'Demande acceptée avec succès' 
          : 'Demande refusée'
      );
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour la demande');
    }
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
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {request.userFirstName} {request.userLastName}
          </Text>
          <Text style={styles.userEmail}>{request.userEmail}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
          <Text style={styles.statusText}>{getStatusLabel(request.status)}</Text>
        </View>
      </View>

      {/* Informations de contact */}
      <View style={styles.contactInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="call" size={16} color="#666" />
          <Text style={styles.infoText}>{request.userPhone}</Text>
        </View>
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
        <View style={styles.coachResponse}>
          <Text style={styles.responseLabel}>Votre réponse:</Text>
          <Text style={styles.responseText}>{request.coachResponse}</Text>
        </View>
      )}

      {/* Actions */}
      {request.status === 'pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleRejectRequest(request)}
          >
            <Ionicons name="close" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Refuser</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleAcceptRequest(request)}
          >
            <Ionicons name="checkmark" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Accepter</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Date de création */}
      <Text style={styles.createdAt}>
        Reçu le {request.createdAt.toLocaleDateString('fr-FR')} à {request.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7667ac" />
        <Text style={styles.loadingText}>Chargement des demandes...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Demandes en attente</Text>
        <TouchableOpacity onPress={handleRefresh}>
          <Ionicons name="refresh" size={24} color="#7667ac" />
        </TouchableOpacity>
      </View>      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#ccc" />
            <Text style={styles.emptyStateTitle}>Aucune demande en attente</Text>
            <Text style={styles.emptyStateText}>
              Vous n'avez pas de nouvelles demandes de rendez-vous en attente. Les rendez-vous confirmés apparaissent dans votre emploi du temps.
            </Text>
          </View>
        ) : (
          requests.map(renderRequestCard)
        )}
      </ScrollView>

      <AcceptAppointmentModal
        visible={modalVisible}
        request={selectedRequest}
        onClose={handleModalClose}
        onAccept={handleModalAccept}
      />
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  contactInfo: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
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
    backgroundColor: '#f8f9fa',
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
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  createdAt: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
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
  },
});

export default CoachAppointmentRequestsScreen;
