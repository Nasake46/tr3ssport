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
import { doc, getDoc, collection, where, getDocs, query } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { updateParticipantStatus } from '../../services/appointmentService';

// Types pour les rendez-vous
interface Appointment {
  id: string;
  type: 'solo' | 'group';
  createdBy: string;
  coachIds: string[];
  sessionType: string;
  location: string;
  description: string;
  date: Date;
  status: 'pending' | 'accepted' | 'refused';
  createdAt: Date;
  // decisions supprimé (legacy)
  clientName?: string;
  clientEmail?: string;
  coachParticipants: { id:string; userId?:string; status:string; }[];
  globalStatus?: string;
}

interface CoachDecision {
  status: 'accepted' | 'refused';
  comment: string;
  respondedAt: Date;
}

type FilterStatus = 'all' | 'pending' | 'accepted' | 'refused';

export default function CoachDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    refused: 0
  });

  const currentUser = auth.currentUser;

  useEffect(() => {
    const checkUserRole = async () => {
      if (!currentUser) {
        console.log('❌ COACH DASHBOARD - Utilisateur non connecté');
        setLoading(false);
        return;
      }

      try {
        // Vérifier le rôle de l'utilisateur
        const userDoc = await getDoc(doc(firestore, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role !== 'coach') {
            console.log('❌ COACH DASHBOARD - Accès refusé: utilisateur non coach');
            setUserRole(userData.role);
            setLoading(false);
            return;
          }
          setUserRole(userData.role);
          loadAppointments();
        } else {
          console.log('❌ COACH DASHBOARD - Utilisateur non trouvé');
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ COACH DASHBOARD - Erreur vérification rôle:', error);
        setLoading(false);
      }
    };

    checkUserRole();
  }, [currentUser]);

  // Vérifier si l'utilisateur est connecté avant de rendre le composant
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

  // Vérifier si l'utilisateur est un coach
  if (userRole && userRole !== 'coach') {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="lock-closed-outline" size={64} color="#e74c3c" />
        <Text style={styles.accessDeniedTitle}>Accès refusé</Text>
        <Text style={styles.accessDeniedText}>
          Cette section est réservée aux coachs uniquement
        </Text>
        <TouchableOpacity 
          style={styles.backToHomeButton}
          onPress={() => router.push('/(tabs)' as any)}
        >
          <Text style={styles.backToHomeButtonText}>Retour à l'accueil</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const loadAppointments = async () => {
    try {
      console.log('🔍 COACH DASHBOARD - Début chargement RDV pour coach:', currentUser?.uid);
      
      // Récupérer tous les rendez-vous où le coach est impliqué
      // Temporairement sans orderBy pour éviter l'erreur d'index
      const appointmentsQuery = query(
        collection(firestore, 'appointments'),
        where('coachIds', 'array-contains', currentUser?.uid)
      );

      const snapshot = await getDocs(appointmentsQuery);
      
      const appointmentsList: Appointment[] = [];
      
      for (const docSnapshot of snapshot.docs) {
        const raw:any = docSnapshot.data() as any; // typage assoupli
        let coachParticipants:any[] = [];
        try {
          const partsSnap = await getDocs(query(collection(firestore,'appointmentParticipants'), where('appointmentId','==', docSnapshot.id), where('role','==','coach')));
          coachParticipants = partsSnap.docs.map(d=>{ const pd:any = d.data(); return { id:d.id, ...pd }; });
        } catch(e){ console.warn('⚠️ COACH DASHBOARD - participants coach load fail', e); }
        let clientName = 'Utilisateur inconnu'; let clientEmail='';
        try {
          const clientDocRef = doc(firestore, 'users', raw.createdBy);
          const clientDoc = await getDoc(clientDocRef);
          if (clientDoc.exists()) { const cd:any=clientDoc.data(); clientName = `${cd.firstName||''} ${cd.lastName||''}`.trim() || cd.email?.split('@')[0] || 'Utilisateur'; clientEmail = cd.email||''; }
        } catch {}
        const appointment: Appointment = {
          id: docSnapshot.id,
          type: raw.type,
          createdBy: raw.createdBy,
          coachIds: raw.coachIds || [],
          sessionType: raw.sessionType || '',
          location: raw.location || '',
          description: raw.description || '',
          date: raw.date?.toDate() || new Date(),
          // status sera dérivé ci-dessous (status ou fallback globalStatus)
          createdAt: raw.createdAt?.toDate() || new Date(),
          clientName,
          clientEmail,
          coachParticipants,
          status: (raw as any).status || raw.globalStatus || 'pending',
          globalStatus: raw.globalStatus
        };
        appointmentsList.push(appointment);
      }

      // Trier les rendez-vous côté client par date (plus récent en premier)
      appointmentsList.sort((a, b) => b.date.getTime() - a.date.getTime());

      console.log(`✅ COACH DASHBOARD - ${appointmentsList.length} RDV chargés`);
      setAppointments(appointmentsList);
      
      // Calculer les statistiques
      const newStats = {
        total: appointmentsList.length,
        pending: appointmentsList.filter(apt => {
          const me = apt.coachParticipants.find(p=>p.userId===currentUser?.uid);
          return !me || me.status==='pending';
        }).length,
        accepted: appointmentsList.filter(apt => apt.coachParticipants.find(p=>p.userId===currentUser?.uid && p.status==='accepted')).length,
        refused: appointmentsList.filter(apt => apt.coachParticipants.find(p=>p.userId===currentUser?.uid && p.status==='declined')).length
      };
      setStats(newStats);
      
    } catch (error) {
      console.error('❌ COACH DASHBOARD - Erreur chargement:', error);
      Alert.alert('Erreur', 'Impossible de charger les rendez-vous');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAppointments();
  };

  const getFilteredAppointments = () => {
    if (filterStatus === 'all') return appointments;
    
    return appointments.filter(appointment => {
      const me = appointment.coachParticipants.find(p=>p.userId===currentUser?.uid);
      const myStatus = me?.status || 'pending';
      switch (filterStatus) {
        case 'pending': return myStatus==='pending';
        case 'accepted': return myStatus==='accepted';
        case 'refused': return myStatus==='declined';
        default: return true;
      }
    });
  };

  const getStatusText = (appointment: Appointment) => {
    // Vérifier si le rendez-vous est passé
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const appointmentDate = new Date(appointment.date);
    appointmentDate.setHours(0, 0, 0, 0);
    
    if (appointmentDate < currentDate) {
      return 'Terminé';
    }
    
    const me = appointment.coachParticipants.find(p=>p.userId===currentUser?.uid);
    const myStatus = me?.status || 'pending';
    if (myStatus === 'accepted') return 'Accepté';
    if (myStatus === 'declined') return 'Refusé';
    return 'En attente';
  };

  const getStatusColor = (appointment: Appointment) => {
    const currentDate = new Date(); currentDate.setHours(0,0,0,0);
    const appointmentDate = new Date(appointment.date); appointmentDate.setHours(0,0,0,0);
    if (appointmentDate < currentDate) return '#95a5a6';
    const me = appointment.coachParticipants.find(p=>p.userId===currentUser?.uid);
    if (!me || me.status==='pending') return '#f39c12';
    if (me.status==='accepted') return '#27ae60';
    if (me.status==='declined') return '#e74c3c';
    return '#f39c12';
  };

  const getResponsesCount = (appointment: Appointment) => {
    const totalCoaches = appointment.coachIds.length;
    const respondedCoaches = appointment.coachParticipants.filter(p=>p.status!=='pending').length;
    return `${respondedCoaches}/${totalCoaches}`;
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

  const handleAppointmentPress = (appointment: Appointment) => {
    router.push({ pathname: '/appointments/detail', params: { appointmentId: appointment.id } });
  };

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
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
    </View>
  );

  const renderAppointmentCard = (appointment: Appointment) => {
    const statusColor = getStatusColor(appointment);
    const responsesCount = getResponsesCount(appointment);
    
    return (
      <TouchableOpacity
        key={appointment.id}
        style={styles.appointmentCard}
        onPress={() => handleAppointmentPress(appointment)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.typeContainer}>
            <Ionicons
              name={appointment.type === 'solo' ? 'person' : 'people'}
              size={16}
              color="#666"
            />
            <Text style={styles.typeText}>
              {appointment.type === 'solo' ? 'Solo' : 'Groupe'}
            </Text>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>
              {getStatusText(appointment)}
            </Text>
          </View>
        </View>
        
        <Text style={styles.sessionType}>{appointment.sessionType}</Text>
        <Text style={styles.clientName}>Client: {appointment.clientName}</Text>
        
        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={14} color="#666" />
            <Text style={styles.detailText}>
              {formatDate(appointment.date)}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="location" size={14} color="#666" />
            <Text style={styles.detailText}>{appointment.location}</Text>
          </View>
        </View>
        
        <View style={styles.cardFooter}>
          <Text style={styles.responsesText}>Réponses: {responsesCount}</Text>
          <View style={{ flexDirection:'row', gap:8 }}>
            <TouchableOpacity disabled={appointment.coachParticipants.find(p=>p.userId===currentUser?.uid)?.status==='accepted'} onPress={async()=>{
              const me = appointment.coachParticipants.find(p=>p.userId===currentUser?.uid); if(!me)return; await updateParticipantStatus(me.id,'accepted'); loadAppointments();
            }} style={[styles.actionButton,{ backgroundColor:'#27ae60', opacity: appointment.coachParticipants.find(p=>p.userId===currentUser?.uid)?.status==='accepted'?0.5:1 }]}> 
              <Text style={styles.actionButtonText}>Accepter</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={appointment.coachParticipants.find(p=>p.userId===currentUser?.uid)?.status==='declined'} onPress={async()=>{
              const me = appointment.coachParticipants.find(p=>p.userId===currentUser?.uid); if(!me)return; await updateParticipantStatus(me.id,'declined'); loadAppointments();
            }} style={[styles.actionButton,{ backgroundColor:'#e74c3c', opacity: appointment.coachParticipants.find(p=>p.userId===currentUser?.uid)?.status==='declined'?0.5:1 }]}> 
              <Text style={styles.actionButtonText}>Refuser</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement des rendez-vous...</Text>
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
        <Text style={styles.title}>Demandes de RDV</Text>
        <TouchableOpacity 
          style={styles.calendarButton}
          onPress={() => router.push('/coachCalendar' as any)}
        >
          <Ionicons name="calendar" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {renderFilterButtons()}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {getFilteredAppointments().length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>
              {filterStatus === 'all' 
                ? 'Aucun rendez-vous'
                : `Aucun rendez-vous ${filterStatus === 'pending' ? 'en attente' : filterStatus === 'accepted' ? 'accepté' : 'refusé'}`
              }
            </Text>
            <Text style={styles.emptyText}>
              Les demandes de rendez-vous apparaîtront ici
            </Text>
          </View>
        ) : (
          getFilteredAppointments().map(renderAppointmentCard)
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
  calendarButton: {
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
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  appointmentCard: {
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
  clientName: {
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
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  responsesText: {
    fontSize: 12,
    color: '#666',
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
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
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
  accessDeniedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginTop: 16,
    marginBottom: 8,
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  backToHomeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backToHomeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButton:{ paddingVertical:6, paddingHorizontal:10, borderRadius:6 },
  actionButtonText:{ color:'#fff', fontSize:12, fontWeight:'600' },
});
