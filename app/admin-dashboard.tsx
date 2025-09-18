import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { auth, firestore } from '@/firebase';
import { signOut } from 'firebase/auth';
import * as userService from '@/services/userService';
import { doc, getDoc } from 'firebase/firestore';
import { backOrRoleHome } from '@/services/navigationService';
import { runMigration } from '@/scripts/migrateParticipants';

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isObserver, setIsObserver] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);
  // Migration participants
  const [migrating, setMigrating] = useState(false);
  const [migrationSummary, setMigrationSummary] = useState<any | null>(null);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [lastWasDryRun, setLastWasDryRun] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const navigateToCoachHome = () => {
    // Accès explicite à homCoach.tsx (même dossier)
    router.replace('./homeCoach' as any);
  };

  const headerBackBtn = () => (
    <TouchableOpacity
      onPress={navigateToCoachHome}
      style={{ flexDirection: 'row', alignItems: 'center' }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="chevron-back" size={24} color="#007AFF" />
      <Text style={{ color: '#007AFF', fontWeight: '600', marginLeft: 2 }}>Coach</Text>
    </TouchableOpacity>
  );

  const checkAdminAccess = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Erreur', 'Vous devez être connecté pour accéder à cette page');
        backOrRoleHome();
        return;
      }

      // Vérifier le rôle de l'utilisateur dans Firestore
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserInfo(userData);

        if (userData.role === 'admin') {
          setIsAdmin(true);
          setIsObserver(false);
        } else if ((userData.role || '').toLowerCase() === 'observer') {
          // Observateur: accès lecture seule
          setIsAdmin(true); // autoriser l'accès à la vue
          setIsObserver(true);
        } else {
          setIsAdmin(false);
          Alert.alert(
            'Accès refusé',
            "Vous n'avez pas les permissions nécessaires pour accéder à cette page.",
            [{ text: 'OK', onPress: () => backOrRoleHome('user') }]
          );
        }
      } else {
        setIsAdmin(false);
        Alert.alert(
          'Erreur',
          'Impossible de vérifier vos permissions.',
          [{ text: 'OK', onPress: () => backOrRoleHome('user') }]
        );
      }
    } catch (error) {
      console.error('Erreur vérification admin:', error);
      Alert.alert(
        'Erreur',
        'Une erreur est survenue lors de la vérification des permissions.',
        [{ text: 'OK', onPress: () => backOrRoleHome('user') }]
      );
    } finally {
      setLoading(false);
    }
  };

  const navigateToBanCoach = () => {
    router.push('./admin-ban-coach' as any);
  };
  const navigateToCoachApprovals = () => {
    router.push('./admin-coach-approvals' as any);
  };
  const navigateToSetObserver = () => {
    router.push('./admin-set-observer' as any);
  };

  const navigateToBans = () => {
    router.push('./admin-bans' as any);
  };

  const navigateToUserManagement = () => {
    router.push('./admin-users' as any);
  };

  const navigateToSystemStats = () => {
    router.push('./admin-stats' as any);
  };

  const navigateToAppointmentOverview = () => {
    Alert.alert('Bientôt disponible', "La vue d'ensemble des rendez-vous sera disponible prochainement");
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace('/(tabs)/LoginScreen' as any);
    } catch (e: any) {
      console.error('Erreur déconnexion:', e);
      Alert.alert('Erreur', e?.message || 'Impossible de se déconnecter');
    }
  };

  const launchMigration = async (dryRun: boolean) => {
    console.log('🛠️ ADMIN DASHBOARD - Lancement migration participantsIds dryRun=', dryRun);
    if (isObserver) { Alert.alert('Lecture seule', 'Action non autorisée pour les observateurs'); return; }
    setMigrating(true);
    setMigrationError(null);
    try {
      const summary = await runMigration({ dryRun });
      setMigrationSummary(summary);
      setLastWasDryRun(dryRun);
      console.log('🛠️ ADMIN DASHBOARD - Migration summary:', summary);
    } catch (e: any) {
      console.error('❌ ADMIN DASHBOARD - Erreur migration:', e);
      setMigrationError(e?.message || 'Erreur migration');
    } finally {
      setMigrating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen
          options={{
            title: 'Chargement...',
            headerBackTitle: 'Retour',
            headerLeft: headerBackBtn,
          }}
        />
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Vérification des permissions...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen
          options={{
            title: 'Accès refusé',
            headerBackTitle: 'Retour',
            headerLeft: headerBackBtn,
          }}
        />
        <Ionicons name="lock-closed" size={64} color="#ff4444" />
        <Text style={styles.errorTitle}>Accès refusé</Text>
        <Text style={styles.errorText}>
          Vous n'avez pas les permissions administrateur nécessaires.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Dashboard Admin',
          headerBackTitle: 'Retour',
          headerLeft: headerBackBtn,
        }}
      />

      <ScrollView style={styles.scrollView}>
        {/* Header d'accueil */}
        <View style={styles.welcomeContainer}>
  <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
    <TouchableOpacity
      onPress={() => router.replace('../homeCoach' as any)}
      style={{ flexDirection: 'row', alignItems: 'center' }}
    >
      <Ionicons name="chevron-back" size={24} color="#007AFF" />
      <Text style={{ color: '#007AFF', fontWeight: '600', marginLeft: 2 }}>Coach</Text>
    </TouchableOpacity>

    <Ionicons name="shield-checkmark" size={32} color="#007AFF" />
  </View>

  <Text style={styles.welcomeTitle}>Dashboard Administrateur</Text>
  <Text style={styles.welcomeSubtitle}>
    Bienvenue, {userInfo?.firstName || 'Admin'}
  </Text>
</View>


        {/* Cartes d'action */}
        <View style={styles.cardsContainer}>
          {/* Gestion des utilisateurs */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={navigateToUserManagement}
          >
            <View style={styles.cardHeader}>
              <Ionicons name="people" size={24} color="#007AFF" />
              <Text style={styles.cardTitle}>Gestion des utilisateurs</Text>
            </View>
            <Text style={styles.cardDescription}>
              Visualiser et gérer tous les utilisateurs (coaches et clients) avec leur historique de rendez-vous
            </Text>
            <View style={styles.cardAction}>
              <Text style={styles.cardActionText}>Voir les utilisateurs</Text>
              <Ionicons name="chevron-forward" size={16} color="#007AFF" />
            </View>
          </TouchableOpacity>

          {/* Approbation des coachs */}
          <TouchableOpacity
            style={[styles.actionCard, isObserver && { opacity: 0.6 }]}
            onPress={() =>
              isObserver
                ? Alert.alert('Lecture seule', 'Action non autorisée pour les observateurs')
                : navigateToCoachApprovals()
            }
            disabled={isObserver}
          >
            <View style={styles.cardHeader}>
              <Ionicons name="shield-checkmark" size={24} color="#28a745" />
              <Text style={styles.cardTitle}>Approbations Coach</Text>
            </View>
            <Text style={styles.cardDescription}>
              Examiner et approuver ou rejeter les demandes d'inscription des coachs.
            </Text>
            <View style={styles.cardAction}>
              <Text style={styles.cardActionText}>Ouvrir</Text>
              <Ionicons name="chevron-forward" size={16} color="#28a745" />
            </View>
          </TouchableOpacity>

          {/* Définir rôle Observateur */}
          <TouchableOpacity
            style={[styles.actionCard, isObserver && { opacity: 0.6 }]}
            onPress={() =>
              isObserver
                ? Alert.alert('Lecture seule', 'Action non autorisée pour les observateurs')
                : navigateToSetObserver()
            }
            disabled={isObserver}
          >
            <View style={styles.cardHeader}>
              <Ionicons name="eye" size={24} color="#6c757d" />
              <Text style={styles.cardTitle}>Donner rôle Observateur</Text>
            </View>
            <Text style={styles.cardDescription}>
              Accorder un accès lecture seule au dashboard admin à un utilisateur par email.
            </Text>
            <View style={styles.cardAction}>
              <Text style={styles.cardActionText}>Ouvrir</Text>
              <Ionicons name="chevron-forward" size={16} color="#6c757d" />
            </View>
          </TouchableOpacity>

          {/* Utilisateurs bannis */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={navigateToBans}
          >
            <View style={styles.cardHeader}>
              <Ionicons name="ban" size={24} color="#dc3545" />
              <Text style={styles.cardTitle}>Utilisateurs bannis</Text>
            </View>
            <Text style={styles.cardDescription}>
              Voir la liste des comptes bannis et les motifs associés.
            </Text>
            <View style={styles.cardAction}>
              <Text style={styles.cardActionText}>Ouvrir</Text>
              <Ionicons name="chevron-forward" size={16} color="#dc3545" />
            </View>
          </TouchableOpacity>

          {/* Statistiques système */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={navigateToSystemStats}
          >
            <View style={styles.cardHeader}>
              <Ionicons name="stats-chart" size={24} color="#28a745" />
              <Text style={styles.cardTitle}>Statistiques système</Text>
            </View>
            <Text style={styles.cardDescription}>
              Voir les métriques d'utilisation, statistiques d'activité et rapports système
            </Text>
            <View style={styles.cardAction}>
              <Text style={styles.cardActionText}>Voir les stats</Text>
              <Ionicons name="chevron-forward" size={16} color="#28a745" />
            </View>
          </TouchableOpacity>

          {/* Vue d'ensemble des RDV */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={navigateToAppointmentOverview}
          >
            <View style={styles.cardHeader}>
              <Ionicons name="calendar" size={24} color="#ff9500" />
              <Text style={styles.cardTitle}>Rendez-vous globaux</Text>
            </View>
            <Text style={styles.cardDescription}>
              Vue d'ensemble de tous les rendez-vous, sessions actives et historique complet
            </Text>
            <View style={styles.cardAction}>
              <Text style={styles.cardActionText}>Voir les RDV</Text>
              <Ionicons name="chevron-forward" size={16} color="#ff9500" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Informations rapides */}
        <View style={styles.quickInfoContainer}>
          <Text style={styles.quickInfoTitle}>Informations rapides</Text>

          <View style={styles.infoItem}>
            <Ionicons name="person" size={20} color="#666" />
            <Text style={styles.infoText}>
              Connecté en tant que: {userInfo?.email}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="shield" size={20} color="#666" />
            <Text style={styles.infoText}>
              Rôle: Administrateur
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="time" size={20} color="#666" />
            <Text style={styles.infoText}>
              Dernière connexion: {new Date().toLocaleDateString('fr-FR')}
            </Text>
          </View>

          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={18} color="#fff" />
            <Text style={styles.signOutText}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>

        {/* Avertissement de sécurité */}
        <View style={styles.securityWarning}>
          <Ionicons name="warning" size={20} color="#856404" />
          <Text style={styles.warningText}>
            Attention: Vous avez accès aux données sensibles. Utilisez ces outils avec précaution.
          </Text>
        </View>

        {/* Bloc maintenance / migration */}
        <View style={styles.maintenanceContainer}>
          <View style={styles.maintenanceHeader}>
            <Text style={styles.maintenanceTitle}>Maintenance / Migration</Text>
          </View>
          <Text style={styles.maintenanceSubtitle}>Backfill participantsIds / coachIds & normalisation des participants</Text>
          <View style={styles.migrationButtonsRow}>
            <TouchableOpacity
              style={[styles.migrationButton, { opacity: migrating ? 0.6 : 1 }]}
              disabled={migrating || isObserver}
              onPress={() =>
                isObserver
                  ? Alert.alert('Lecture seule', 'Action non autorisée pour les observateurs')
                  : launchMigration(true)
              }
            >
              <Text style={styles.migrationButtonText}>Dry-run</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.migrationButtonPrimary, { opacity: migrating ? 0.6 : 1 }]}
              disabled={migrating || isObserver}
              onPress={() =>
                isObserver
                  ? Alert.alert('Lecture seule', 'Action non autorisée pour les observateurs')
                  : launchMigration(false)
              }
            >
              <Text style={styles.migrationButtonPrimaryText}>Exécuter</Text>
            </TouchableOpacity>
          </View>
          {migrating && (
            <View style={styles.migrationLoadingRow}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.migrationLoadingText}>Migration en cours...</Text>
            </View>
          )}
          {migrationError && !migrating && (
            <Text style={styles.migrationError}>Erreur: {migrationError}</Text>
          )}
          {migrationSummary && !migrating && (
            <View style={styles.migrationSummaryBox}>
              <Text style={styles.migrationSummaryTitle}>Résumé ({lastWasDryRun ? 'Dry-run' : 'Exécuté'})</Text>
              <Text style={styles.migrationSummaryLine}>Créés: {migrationSummary.created}</Text>
              <Text style={styles.migrationSummaryLine}>Ignorés (déjà présents): {migrationSummary.skipped}</Text>
              <Text style={styles.migrationSummaryLine}>Appointments MAJ: {migrationSummary.updatedAppointments}</Text>
              <Text style={styles.migrationSummaryLine}>Erreurs: {migrationSummary.errors}</Text>
            </View>
          )}
        </View>
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
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff4444',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  scrollView: {
    flex: 1,
  },
  welcomeContainer: {
    backgroundColor: 'white',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  cardsContainer: {
    padding: 20,
    gap: 16,
  },
  actionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  sessionsContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sessionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  sessionsSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  sessionsLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  sessionsLoadingText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
  sessionsError: {
    fontSize: 13,
    color: '#d32f2f',
    paddingVertical: 4,
  },
  sessionsEmpty: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  sessionList: {
    marginTop: 4,
  },
  sessionItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  sessionRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  sessionStatusBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sessionStatusText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  sessionDate: {
    fontSize: 12,
    color: '#555',
    marginBottom: 2,
  },
  sessionParticipants: {
    fontSize: 11,
    color: '#666',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardActionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  quickInfoContainer: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  quickInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
  },
  signOutButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#d9534f',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  signOutText: {
    color: 'white',
    fontWeight: '600',
  },
  securityWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    margin: 20,
    marginTop: 0,
  },
  warningText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#856404',
    flex: 1,
    lineHeight: 20,
  },
  maintenanceContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  maintenanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  maintenanceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  maintenanceSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  migrationButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  migrationButton: {
    backgroundColor: '#e1e8f5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  migrationButtonText: {
    color: '#1f559c',
    fontWeight: '600',
  },
  migrationButtonPrimary: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  migrationButtonPrimaryText: {
    color: 'white',
    fontWeight: '600',
  },
  migrationLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  migrationLoadingText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#555',
  },
  migrationError: {
    color: '#d32f2f',
    fontSize: 13,
    marginBottom: 8,
  },
  migrationSummaryBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  migrationSummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  migrationSummaryLine: {
    fontSize: 12,
    color: '#555',
    marginBottom: 2,
  },
});
