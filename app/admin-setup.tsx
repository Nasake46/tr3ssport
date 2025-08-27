import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import * as userService from '@/services/userService';

export default function AdminSetupUtility() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [actionType, setActionType] = useState(''); // 'admin' ou 'reset'

  const debugAllUsers = async () => {
    try {
      console.log('🔍 DEBUG - Récupération de tous les utilisateurs...');
      const users = await userService.getAllUsers();
      console.log('🔍 DEBUG - Nombre total d\'utilisateurs:', users.length);
      console.log('🔍 DEBUG - Liste des utilisateurs:');
      
      users.forEach((user, index) => {
        console.log(`  ${index + 1}. ID: ${user.id}`);
        console.log(`     Email: ${user.email}`);
        console.log(`     Nom: ${userService.formatUserName(user)}`);
        console.log(`     Rôle: ${user.role}`);
        console.log('     ---');
      });
      
      Alert.alert(
        'Debug Info',
        `${users.length} utilisateurs trouvés. Consultez la console pour les détails.`
      );
    } catch (error) {
      console.error('❌ DEBUG - Erreur récupération utilisateurs:', error);
      Alert.alert('Erreur', 'Impossible de récupérer les utilisateurs');
    }
  };

  const confirmAction = () => {
    setShowConfirmModal(false);
    if (actionType === 'admin') {
      executeAdminChange();
    } else if (actionType === 'reset') {
      executeRoleReset();
    }
  };

  const executeAdminChange = async () => {
    if (!selectedUser) return;
    
    try {
      console.log('🔄 ADMIN SETUP - Mise à jour rôle vers admin pour ID:', selectedUser.id);
      await userService.updateUserRole(selectedUser.id, 'admin');
      console.log('✅ ADMIN SETUP - Rôle mis à jour avec succès');
      
      Alert.alert(
        'Succès',
        `${userService.formatUserName(selectedUser)} est maintenant administrateur`
      );
      setEmail('');
    } catch (error) {
      console.error('❌ ADMIN SETUP - Erreur mise à jour rôle:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le rôle');
    }
  };

  const executeRoleReset = async () => {
    if (!selectedUser) return;
    
    try {
      await userService.updateUserRole(selectedUser.id, 'user');
      Alert.alert(
        'Succès',
        `${userService.formatUserName(selectedUser)} est maintenant un utilisateur standard`
      );
      setEmail('');
    } catch (error) {
      console.error('Erreur mise à jour rôle:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le rôle');
    }
  };

  const makeUserAdmin = async () => {
    if (!email.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un email');
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 ADMIN SETUP - Recherche utilisateur avec email:', email);
      
      // Rechercher l'utilisateur par email
      const users = await userService.searchUsers(email);
      console.log('🔍 ADMIN SETUP - Utilisateurs trouvés:', users.length);
      console.log('🔍 ADMIN SETUP - Détails utilisateurs:', users);
      
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      console.log('🔍 ADMIN SETUP - Utilisateur exact trouvé:', user);

      if (!user) {
        Alert.alert('Erreur', `Aucun utilisateur trouvé avec l'email: ${email}`);
        return;
      }

      console.log('🔍 ADMIN SETUP - Rôle actuel:', user.role);
      if (user.role === 'admin') {
        Alert.alert('Information', 'Cet utilisateur est déjà administrateur');
        return;
      }

      // Préparer la confirmation avec la modale
      console.log('🔄 ADMIN SETUP - Préparation de la confirmation pour changer le rôle');
      setSelectedUser(user);
      setActionType('admin');
      setShowConfirmModal(true);
    } catch (error) {
      console.error('❌ ADMIN SETUP - Erreur recherche utilisateur:', error);
      Alert.alert('Erreur', 'Impossible de rechercher l\'utilisateur');
    } finally {
      setLoading(false);
    }
  };

  const resetUserRole = async () => {
    if (!email.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un email');
      return;
    }

    setLoading(true);
    try {
      const users = await userService.searchUsers(email);
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

      if (!user) {
        Alert.alert('Erreur', `Aucun utilisateur trouvé avec l'email: ${email}`);
        return;
      }

      if (user.role === 'user') {
        Alert.alert('Information', 'Cet utilisateur a déjà le rôle utilisateur standard');
        return;
      }

      // Préparer la confirmation avec la modale
      setSelectedUser(user);
      setActionType('reset');
      setShowConfirmModal(true);
    } catch (error) {
      console.error('Erreur recherche utilisateur:', error);
      Alert.alert('Erreur', 'Impossible de rechercher l\'utilisateur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Utilitaire Admin',
          headerBackTitle: 'Retour'
        }} 
      />

      <View style={styles.content}>
        <View style={styles.warningBox}>
          <Ionicons name="warning" size={24} color="#ff6b6b" />
          <Text style={styles.warningText}>
            Cet utilitaire permet de modifier les rôles utilisateurs. Utilisez avec précaution !
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gestion des rôles administrateur</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Email de l'utilisateur"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.adminButton, loading && styles.disabledButton]}
              onPress={makeUserAdmin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={20} color="white" />
                  <Text style={styles.buttonText}>Rendre Admin</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.resetButton, loading && styles.disabledButton]}
              onPress={resetUserRole}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="person" size={20} color="white" />
                  <Text style={styles.buttonText}>Reset Utilisateur</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.debugButton]}
              onPress={debugAllUsers}
            >
              <Ionicons name="bug" size={20} color="white" />
              <Text style={styles.buttonText}>Debug Utilisateurs</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Instructions:</Text>
          <Text style={styles.infoText}>
            1. Entrez l'email exact de l'utilisateur{'\n'}
            2. Cliquez sur "Rendre Admin" pour donner les privilèges administrateur{'\n'}
            3. Cliquez sur "Reset Utilisateur" pour retirer les privilèges spéciaux{'\n'}
            4. L'utilisateur doit redémarrer l'application pour voir les changements
          </Text>
        </View>

        <View style={styles.roleInfoSection}>
          <Text style={styles.roleInfoTitle}>Rôles disponibles:</Text>
          <View style={styles.roleItem}>
            <Ionicons name="person" size={16} color="#007AFF" />
            <Text style={styles.roleText}>User: Utilisateur standard (client)</Text>
          </View>
          <View style={styles.roleItem}>
            <Ionicons name="fitness" size={16} color="#28a745" />
            <Text style={styles.roleText}>Coach: Professionnel du sport</Text>
          </View>
          <View style={styles.roleItem}>
            <Ionicons name="shield-checkmark" size={16} color="#ff6b6b" />
            <Text style={styles.roleText}>Admin: Administrateur système</Text>
          </View>
        </View>
      </View>

      {/* Modale de confirmation */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 10,
            padding: 20,
            width: '90%',
            maxWidth: 400,
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' }}>
              Confirmation
            </Text>
            
            {selectedUser && (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 16, marginBottom: 10 }}>
                  {actionType === 'admin' 
                    ? "Voulez-vous vraiment donner le rôle d'administrateur à :"
                    : "Voulez-vous vraiment réinitialiser le rôle de :"
                  }
                </Text>
                <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>
                  {userService.formatUserName(selectedUser)}
                </Text>
                <Text style={{ marginBottom: 5 }}>
                  {selectedUser.email}
                </Text>
                <Text style={{ fontSize: 14, color: '#666' }}>
                  Rôle actuel: {selectedUser.role}
                </Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <TouchableOpacity
                style={{
                  backgroundColor: '#ccc',
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderRadius: 5,
                  flex: 1,
                  marginRight: 10,
                }}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={{ textAlign: 'center', fontWeight: 'bold' }}>
                  Annuler
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: actionType === 'admin' ? '#007AFF' : '#FF3B30',
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderRadius: 5,
                  flex: 1,
                  marginLeft: 10,
                }}
                onPress={confirmAction}
              >
                <Text style={{ textAlign: 'center', fontWeight: 'bold', color: 'white' }}>
                  Confirmer
                </Text>
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
  content: {
    flex: 1,
    padding: 20,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    borderColor: '#ff6b6b',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  warningText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#c62828',
    flex: 1,
    fontWeight: '500',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#fafafa',
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  adminButton: {
    backgroundColor: '#ff6b6b',
  },
  resetButton: {
    backgroundColor: '#6c757d',
  },
  debugButton: {
    backgroundColor: '#28a745',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
  },
  roleInfoSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  roleInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  roleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  roleText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
});
