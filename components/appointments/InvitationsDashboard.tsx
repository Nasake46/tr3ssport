import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { router } from 'expo-router';
import { auth, firestore } from '@/firebase';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

// Types pour les invitations
interface Invitation {
  id: string;
  appointmentId: string;
  invitedUserId: string;
  invitedUserEmail: string;
  invitedUserName: string;
  inviterUserId: string;
  inviterUserEmail: string;
  status: 'pending' | 'accepted' | 'refused';
  createdAt: Date;
  respondedAt?: Date;
  comment?: string;
  // Données du RDV associé
  appointmentData?: {
    sessionType: string;
    description: string;
    location: string;
    date: Date;
    type: 'solo' | 'group';
  };
}

type FilterStatus = 'all' | 'pending' | 'accepted' | 'refused';

export default function InvitationsDashboard() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    refused: 0
  });

  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) {
      console.log('❌ INVITATIONS DASHBOARD - Utilisateur non connecté');
      setLoading(false);
      return;
    }

    loadInvitations();
  }, [currentUser]);

  const loadInvitations = async () => {
    try {
      console.log('🔍 INVITATIONS DASHBOARD - Chargement des invitations pour:', currentUser?.email);
      
      // Récupérer toutes les invitations pour l'utilisateur connecté
      const invitationsQuery = query(
        collection(firestore, 'invitations'),
        where('invitedUserId', '==', currentUser?.uid)
      );

      const snapshot = await getDocs(invitationsQuery);
      
      const invitationsList: Invitation[] = [];
      
      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        
        // Récupérer les données du RDV associé
        let appointmentData = undefined;
        try {
          const appointmentDoc = await getDoc(doc(firestore, 'appointments', data.appointmentId));
          if (appointmentDoc.exists()) {
            const aptData = appointmentDoc.data();
            appointmentData = {
              sessionType: aptData.sessionType,
              description: aptData.description,
              location: aptData.location,
              date: aptData.date?.toDate() || new Date(),
              type: aptData.type
            };
          }
        } catch (error) {
          console.warn('⚠️ Impossible de récupérer les données du RDV:', error);
        }

        const invitation: Invitation = {
          id: docSnapshot.id,
          appointmentId: data.appointmentId,
          invitedUserId: data.invitedUserId,
          invitedUserEmail: data.invitedUserEmail,
          invitedUserName: data.invitedUserName,
          inviterUserId: data.inviterUserId,
          inviterUserEmail: data.inviterUserEmail,
          status: data.status || 'pending',
          createdAt: data.createdAt?.toDate() || new Date(),
          respondedAt: data.respondedAt?.toDate(),
          comment: data.comment || '',
          appointmentData
        };

        invitationsList.push(invitation);
      }

      // Trier les invitations par date (plus récent en premier)
      invitationsList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      console.log(`✅ INVITATIONS DASHBOARD - ${invitationsList.length} invitations chargées`);
      setInvitations(invitationsList);
      
      // Calculer les statistiques
      const newStats = {
        total: invitationsList.length,
        pending: invitationsList.filter(inv => inv.status === 'pending').length,
        accepted: invitationsList.filter(inv => inv.status === 'accepted').length,
        refused: invitationsList.filter(inv => inv.status === 'refused').length
      };
      setStats(newStats);
      
    } catch (error) {
      console.error('❌ INVITATIONS DASHBOARD - Erreur chargement:', error);
      Alert.alert('Erreur', 'Impossible de charger les invitations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadInvitations();
  };

  const getFilteredInvitations = () => {
    if (filterStatus === 'all') return invitations;
    return invitations.filter(invitation => invitation.status === filterStatus);
  };

  const handleResponseAction = (invitation: Invitation, action: 'accept' | 'refuse') => {
    // Directement soumettre la réponse sans modal ni commentaire
    submitResponse(invitation, action);
  };

  const submitResponse = async (invitation: Invitation, action: 'accept' | 'refuse') => {
    try {
      console.log(`📝 INVITATIONS DASHBOARD - ${action} invitation:`, invitation.id);

      // Mettre à jour l'invitation sans commentaire
      await updateDoc(doc(firestore, 'invitations', invitation.id), {
        status: action === 'accept' ? 'accepted' : 'refused',
        comment: '', // Pas de commentaire
        respondedAt: Timestamp.now()
      });

      Alert.alert(
        'Réponse envoyée',
        `Vous avez ${action === 'accept' ? 'accepté' : 'refusé'} l'invitation`
      );

      // Recharger les invitations
      loadInvitations();

    } catch (error) {
      console.error('❌ INVITATIONS DASHBOARD - Erreur réponse:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer la réponse');
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return '#27ae60';
      case 'refused': return '#e74c3c';
      default: return '#f39c12';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'accepted': return 'Accepté';
      case 'refused': return 'Refusé';
      default: return 'En attente';
    }
  };

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[
          styles.filterButton,
          filterStatus === 'pending' && styles.filterButtonActive
        ]}
        onPress={() => setFilterStatus('pending')}
      >
        <Text style={[
          styles.filterButtonText,
          filterStatus === 'pending' && styles.filterButtonTextActive
        ]}>
          En attente ({stats.pending})
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.filterButton,
          filterStatus === 'accepted' && styles.filterButtonActive
        ]}
        onPress={() => setFilterStatus('accepted')}
      >
        <Text style={[
          styles.filterButtonText,
          filterStatus === 'accepted' && styles.filterButtonTextActive
        ]}>
          Acceptés ({stats.accepted})
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.filterButton,
          filterStatus === 'refused' && styles.filterButtonActive
        ]}
        onPress={() => setFilterStatus('refused')}
      >
        <Text style={[
          styles.filterButtonText,
          filterStatus === 'refused' && styles.filterButtonTextActive
        ]}>
          Refusés ({stats.refused})
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.filterButton,
          filterStatus === 'all' && styles.filterButtonActive
        ]}
        onPress={() => setFilterStatus('all')}
      >
        <Text style={[
          styles.filterButtonText,
          filterStatus === 'all' && styles.filterButtonTextActive
        ]}>
          Tous ({stats.total})
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderInvitationCard = (invitation: Invitation) => {
    const statusColor = getStatusColor(invitation.status);
    
    return (
      <View key={invitation.id} style={styles.invitationCard}>
        <View style={styles.cardHeader}>
          <View style={styles.typeContainer}>
            <Ionicons
              name={invitation.appointmentData?.type === 'solo' ? 'person' : 'people'}
              size={16}
              color="#666"
            />
            <Text style={styles.typeText}>
              {invitation.appointmentData?.type === 'solo' ? 'Solo' : 'Groupe'}
            </Text>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>
              {getStatusText(invitation.status)}
            </Text>
          </View>
        </View>
        
        <Text style={styles.sessionType}>
          {invitation.appointmentData?.sessionType || 'Séance'}
        </Text>
        <Text style={styles.inviterName}>
          Invitation de: {invitation.inviterUserEmail}
        </Text>
        
        {invitation.appointmentData && (
          <View style={styles.cardDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar" size={14} color="#666" />
              <Text style={styles.detailText}>
                {formatDate(invitation.appointmentData.date)}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="location" size={14} color="#666" />
              <Text style={styles.detailText}>{invitation.appointmentData.location}</Text>
            </View>
            
            {invitation.appointmentData.description && (
              <View style={styles.detailRow}>
                <Ionicons name="information-circle" size={14} color="#666" />
                <Text style={styles.detailText}>{invitation.appointmentData.description}</Text>
              </View>
            )}
          </View>
        )}
        
        {invitation.status === 'pending' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleResponseAction(invitation, 'accept')}
            >
              <Ionicons name="checkmark" size={16} color="white" />
              <Text style={styles.actionButtonText}>Accepter</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.refuseButton]}
              onPress={() => handleResponseAction(invitation, 'refuse')}
            >
              <Ionicons name="close" size={16} color="white" />
              <Text style={styles.actionButtonText}>Refuser</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <Text style={styles.createdDate}>
          Reçue le {formatDate(invitation.createdAt)}
        </Text>
      </View>
    );
  };

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement des invitations...</Text>
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
        <Text style={styles.title}>Mes Invitations</Text>
        <View style={styles.placeholder} />
      </View>

      {renderFilterButtons()}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {getFilteredInvitations().length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="mail-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>
              {filterStatus === 'all' 
                ? 'Aucune invitation'
                : `Aucune invitation ${filterStatus === 'pending' ? 'en attente' : filterStatus === 'accepted' ? 'acceptée' : 'refusée'}`
              }
            </Text>
            <Text style={styles.emptyText}>
              Les invitations aux rendez-vous apparaîtront ici
            </Text>
          </View>
        ) : (
          getFilteredInvitations().map(renderInvitationCard)
        )}
      </ScrollView>
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
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },
  placeholder: {
    width: 34,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginHorizontal: 2,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  invitationCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
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
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    fontWeight: '600',
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
  sessionType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  inviterName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  cardDetails: {
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
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  acceptButton: {
    backgroundColor: '#27ae60',
  },
  refuseButton: {
    backgroundColor: '#e74c3c',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  createdDate: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 8,
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
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
