import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { auth } from '@/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import * as userService from '@/services/userService';
import * as banService from '@/services/banService';
import { backOrRoleHome } from '@/services/navigationService';

export default function AdminUsersManagement() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isObserver, setIsObserver] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [users, setUsers] = useState<userService.User[]>([]);
  const [coaches, setCoaches] = useState<userService.User[]>([]);
  const [clients, setClients] = useState<userService.User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'coaches' | 'clients'>('coaches');
  const [selectedUser, setSelectedUser] = useState<userService.User | null>(null);
  const [userAppointments, setUserAppointments] = useState<userService.Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  // Ban modal
  const [banModalVisible, setBanModalVisible] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [banLoading, setBanLoading] = useState(false);
  const [banError, setBanError] = useState<string | null>(null);

  // Attendre que Firebase fournisse l'utilisateur (auth.currentUser peut être null au 1er rendu)
  useEffect(() => {
    console.log('🔐 ADMIN PAGE - Installation listener onAuthStateChanged');
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      console.log('🔐 ADMIN PAGE - onAuthStateChanged déclenché:', fbUser?.uid, fbUser?.email);
      if (!fbUser) {
        // Pas connecté: afficher refus mais arrêter le loading
        setIsAdmin(false);
        setLoading(false);
      } else {
        checkAdminAccess(fbUser);
      }
    });
    return () => {
      console.log('🔐 ADMIN PAGE - Cleanup listener onAuthStateChanged');
      unsubscribe();
    };
  }, []);

  useEffect(() => {
  if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const checkAdminAccess = async (user: FirebaseUser) => {
    try {
      console.log('🔐 ADMIN PAGE - Vérification accès pour:', user.uid, user.email);
      // Double-check si user toujours présent
      if (!user) {
        console.log('🔐 ADMIN PAGE - User disparu avant vérification');
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      console.log('🔐 ADMIN PAGE - Vérification rôle Firestore...');
      const access = await userService.isUserAdminOrObserver(user.uid);
      console.log('🔐 ADMIN PAGE - Accès:', access);
      if (access.allowed) {
        setIsAdmin(true);
        setIsObserver(access.role === 'observer');
      } else {
        setIsAdmin(false);
        // Ne pas naviguer immédiatement si on veut juste afficher l'erreur locale
        Alert.alert(
          'Accès refusé', 
          'Vous n\'avez pas les permissions nécessaires.',
          [{ text: 'OK', onPress: () => backOrRoleHome('user') }]
        );
      }
    } catch (error) {
      console.error('Erreur vérification admin:', error);
      Alert.alert('Erreur', 'Impossible de vérifier vos permissions.');
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const allUsers = await userService.getAllUsers();
      setUsers(allUsers);
      setCoaches(allUsers.filter(user => user.role === 'coach'));
      setClients(allUsers.filter(user => user.role === 'user'));
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
      Alert.alert('Erreur', 'Impossible de charger les utilisateurs');
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadUserAppointments = async (userId: string) => {
    console.log('🔄 ADMIN USERS - Chargement RDV pour:', userId, '(fast puis fallback)');
    setLoadingAppointments(true);
    try {
      // 1. Fast path (createdBy / coachIds / participantsIds)
      const fast = await userService.getUserAppointmentsFast(userId);
      console.log('⚡ ADMIN USERS - Fast count:', fast.length);
      if (fast.length > 0) {
        setUserAppointments(fast);
        console.log('✅ ADMIN USERS - Utilisation fast retrieval');
      } else {
        // 2. Fallback participants-first
        console.log('↩️ ADMIN USERS - Fallback participants-first (fast vide)');
        const participantsFirst = await userService.getUserAppointmentsByUserId(userId);
        console.log('✅ ADMIN USERS - Fallback count:', participantsFirst.length);
        setUserAppointments(participantsFirst);
      }
    } catch (error) {
      console.error('❌ ADMIN USERS - Erreur chargement appointments (fast+fallback):', error);
      // setAppointmentsError('Impossible de charger les rendez-vous');
    } finally {
      setLoadingAppointments(false);
    }
  };

  const openUserDetails = (user: userService.User) => {
    setSelectedUser(user);
    setModalVisible(true);
    loadUserAppointments(user.id);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedUser(null);
    setUserAppointments([]);
  };

  const openBanModal = () => {
    if (isObserver) {
      Alert.alert('Lecture seule', 'Action non autorisée pour les observateurs');
      return;
    }
    setBanReason('');
    setBanError(null);
    setBanModalVisible(true);
  };

  const closeBanModal = () => {
    setBanModalVisible(false);
  };

  const confirmBan = async () => {
    if (!selectedUser) return;
    if (!banReason.trim()) { setBanError('Veuillez saisir un motif.'); return; }
    setBanLoading(true);
    setBanError(null);
    try {
      await banService.banUser(selectedUser.id, banReason.trim());
      Alert.alert('Utilisateur banni', `${selectedUser.email} a été banni.`);
      // Rafraîchir liste
      await loadUsers();
      // Fermer modaux
      setBanModalVisible(false);
      setModalVisible(false);
      setSelectedUser(null);
    } catch (e: any) {
      console.error('Ban error:', e);
      setBanError(e?.message || 'Erreur lors du bannissement');
    } finally {
      setBanLoading(false);
    }
  };

  const formatDate = (dateData: any) => {
    return userService.formatDate(dateData);
  };

  const getStatusColor = (status: string) => {
    return userService.getStatusColor(status);
  };

  const getStatusText = (status: string) => {
    return userService.getStatusDisplayName(status);
  };

  const filteredUsers = (selectedTab === 'coaches' ? coaches : clients)
    .filter(user =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      userService.formatUserName(user).toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a,b) => {
      const an = userService.formatUserName(a) || a.email || '';
      const bn = userService.formatUserName(b) || b.email || '';
      return an.localeCompare(bn, 'fr', { sensitivity: 'base' });
    });

  const renderUserItem = ({ item }: { item: userService.User }) => (
  <TouchableOpacity style={styles.userItem} onPress={() => openUserDetails(item)}>
      <View style={styles.userInfo}>
        <View style={styles.userHeader}>
          <Text style={styles.userName}>
            {item.firstName && item.lastName 
              ? `${item.firstName} ${item.lastName}`
              : item.email
            }
          </Text>
      <View style={[styles.roleBadge, { backgroundColor: item.role === 'coach' ? '#007AFF' : item.role === 'observer' ? '#6c757d' : '#28a745' }]}>
            <Text style={styles.roleBadgeText}>
        {item.role === 'coach' ? 'Coach' : item.role === 'observer' ? 'Observateur' : 'Client'}
            </Text>
          </View>
        </View>
        <Text style={styles.userEmail}>{item.email}</Text>
        {item.createdAt && (
          <Text style={styles.userDate}>
            Inscrit le: {formatDate(item.createdAt)}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  const renderAppointmentItem = ({ item }: { item: userService.Appointment }) => {
    const participantLine = (item.participants || [])
      .map(p => p.role ? `${p.role}${p.status ? '('+p.status+')':''}` : p.email || p.userId)
      .join(' • ');
    return (
      <View style={styles.appointmentItem}>
        <View style={styles.appointmentHeader}>
          <Text style={styles.appointmentType}>{item.sessionType}</Text>
          <View style={styles.roleAndStatus}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.appointmentDate}>{formatDate(item.date)}</Text>
        {!!participantLine && (
          <Text style={styles.participantsText} numberOfLines={2}>{participantLine}</Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Chargement...', headerBackTitle: 'Retour' }} />
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Vérification des permissions...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen options={{ title: 'Accès refusé', headerBackTitle: 'Retour' }} />
        <Ionicons name="lock-closed" size={64} color="#ff4444" />
        <Text style={styles.errorTitle}>Accès refusé</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Gestion Utilisateurs',
          headerBackTitle: 'Retour'
        }} 
      />

      {/* Header avec statistiques */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{coaches.length}</Text>
          <Text style={styles.statLabel}>Coaches</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{clients.length}</Text>
          <Text style={styles.statLabel}>Clients</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{users.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par nom ou email..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Onglets */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'coaches' && styles.activeTab]}
          onPress={() => setSelectedTab('coaches')}
        >
          <Text style={[styles.tabText, selectedTab === 'coaches' && styles.activeTabText]}>
            Coaches ({coaches.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'clients' && styles.activeTab]}
          onPress={() => setSelectedTab('clients')}
        >
          <Text style={[styles.tabText, selectedTab === 'clients' && styles.activeTabText]}>
            Clients ({clients.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Liste des utilisateurs */}
      {loadingUsers ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Chargement des utilisateurs...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          style={styles.usersList}
          contentContainerStyle={styles.usersListContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Aucun utilisateur trouvé</Text>
            </View>
          }
        />
      )}

      {/* Modal détails utilisateur */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedUser?.firstName && selectedUser?.lastName 
                ? `${selectedUser.firstName} ${selectedUser.lastName}`
                : selectedUser?.email
              }
            </Text>
            <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Informations utilisateur */}
            <View style={styles.userDetailsSection}>
              <Text style={styles.sectionTitle}>Informations</Text>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Email:</Text>
                <Text style={styles.detailValue}>{selectedUser?.email}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Rôle:</Text>
                <Text style={styles.detailValue}>
                  {selectedUser?.role === 'coach' ? 'Coach' : 'Client'}
                </Text>
              </View>
              {selectedUser?.createdAt && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Inscrit le:</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedUser.createdAt)}</Text>
                </View>
              )}
            </View>

            {/* Historique des rendez-vous */}
            <View style={styles.appointmentsSection}>
              <Text style={styles.sectionTitle}>
                {selectedUser?.role === 'coach' ? 'Détails Coach' : 'Détails Client'}
              </Text>
              {!isObserver && (
                <TouchableOpacity style={styles.banButton} onPress={openBanModal}>
                  <Ionicons name="ban" size={16} color="#fff" />
                  <Text style={styles.banButtonText}>Bannir cet utilisateur</Text>
                </TouchableOpacity>
              )}

              <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Historique des rendez-vous ({userAppointments.length})</Text>
              
              {loadingAppointments ? (
                <View style={styles.loadingAppointments}>
                  <ActivityIndicator size="small" color="#007AFF" />
                  <Text style={styles.loadingText}>Chargement...</Text>
                </View>
              ) : userAppointments.length > 0 ? (
                <FlatList
                  data={userAppointments}
                  keyExtractor={(item) => item.id}
                  renderItem={renderAppointmentItem}
                  scrollEnabled={false}
                />
              ) : (
                <View style={styles.emptyAppointments}>
                  <Text style={styles.emptyText}>Aucun rendez-vous trouvé</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Ban modal */}
      <Modal visible={banModalVisible} animationType="fade" transparent onRequestClose={closeBanModal}>
        <View style={styles.banOverlay}>
          <View style={styles.banBox}>
            <Text style={styles.banTitle}>Confirmer le bannissement</Text>
            <Text style={styles.banText}>
              Cette action supprimera le compte de {selectedUser?.email}. Elle est irréversible.
            </Text>
            <Text style={styles.banLabel}>Motif du bannissement</Text>
            <TextInput
              style={styles.banInput}
              placeholder="Motif..."
              value={banReason}
              onChangeText={setBanReason}
              multiline
            />
            {banError && <Text style={styles.banError}>{banError}</Text>}
            <View style={styles.banActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeBanModal} disabled={banLoading}>
                <Text style={styles.cancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBanBtn} onPress={confirmBan} disabled={banLoading}>
                {banLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmBanText}>Confirmer le ban</Text>
                )}
              </TouchableOpacity>
            </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff4444',
    marginTop: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    padding: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
  usersList: {
    flex: 1,
  },
  usersListContent: {
    paddingHorizontal: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  userDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingTop: 50,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
  },
  userDetailsSection: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  appointmentsSection: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  loadingAppointments: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyAppointments: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  appointmentItem: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appointmentType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  roleAndStatus: {
    flexDirection: 'row',
    gap: 8,
  },
  appointmentDate: {
    fontSize: 14,
    color: '#666',
  },
  participantsText: {
    fontSize: 11,
    color: '#555',
    marginTop: 4,
  },
  // Ban styles
  banButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  banButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  banOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  banBox: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    maxWidth: 480,
  },
  banTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  banText: {
    color: '#555',
    marginBottom: 12,
  },
  banLabel: {
    color: '#333',
    fontWeight: '600',
    marginBottom: 6,
  },
  banInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    textAlignVertical: 'top',
    marginBottom: 8,
    backgroundColor: '#fafafa',
  },
  banError: {
    color: '#d32f2f',
    marginBottom: 8,
  },
  banActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#e9ecef',
  },
  cancelText: {
    color: '#333',
    fontWeight: '600',
  },
  confirmBanBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#dc3545',
  },
  confirmBanText: {
    color: 'white',
    fontWeight: '700',
  },
});
// fin styles
