import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { auth, firestore } from '@/firebase';
import { doc, getDoc, updateDoc, Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
// Ajout addDoc
import { addDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { backOrRoleHome } from '../../services/navigationService';
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
  decisions: { [coachId: string]: CoachDecision };
  invitedEmails?: string[];
  notes?: string;
}

interface CoachDecision {
  status: 'accepted' | 'refused';
  comment: string;
  respondedAt: Date;
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function AppointmentDetail() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [coaches, setCoaches] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseAction, setResponseAction] = useState<'accepted' | 'refused'>('accepted');
  const [comment, setComment] = useState('');
  const [coachParticipants, setCoachParticipants] = useState<any[]>([]); // participants docs pour les coachs

  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!appointmentId || !currentUser) {
      backOrRoleHome();
      return;
    }
    loadAppointmentDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId, currentUser]);

  const safeToDate = (value: any): Date | null => {
    if (!value) return null;
    // Firestore Timestamp
    if (typeof value?.toDate === 'function') return value.toDate();
    // Déjà une Date
    if (value instanceof Date) return value;
    // Chaîne ou nombre convertible
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  };

  const loadAppointmentDetail = async () => {
    try {
      console.log('🔍 APPOINTMENT DETAIL - Chargement RDV:', appointmentId);
      const appointmentDoc = await getDoc(doc(firestore, 'appointments', appointmentId));
      if (!appointmentDoc.exists()) { Alert.alert('Erreur', 'Rendez-vous introuvable'); backOrRoleHome(); return; }
      const data = appointmentDoc.data() as any;
      // Charger participants coachs (nouveau modèle)
      let coachParts: any[] = [];
      try {
        const partsSnap = await getDocs(query(collection(firestore, 'appointmentParticipants'), where('appointmentId','==', appointmentId), where('role','==','coach')));
        coachParts = partsSnap.docs.map(d=>({ id:d.id, ...d.data() }));
      } catch(e){ console.warn('⚠️ APPOINTMENT DETAIL - Impossible de charger participants coachs', e); }
      setCoachParticipants(coachParts);
      const appointmentData: Appointment = {
        id: appointmentDoc.id,
        type: data.type,
        createdBy: data.createdBy,
        coachIds: data.coachIds || [],
        sessionType: data.sessionType || '',
        location: data.location || '',
        description: data.description || '',
        date: data.date?.toDate() || new Date(),
        status: data.globalStatus === 'confirmed' ? 'accepted' : data.globalStatus === 'declined' ? 'refused' : 'pending',
        createdAt: data.createdAt?.toDate() || new Date(),
        decisions: {},
        invitedEmails: data.invitedEmails || [],
        notes: data.notes || ''
      };

      setAppointment(appointmentData);

      // Charger les informations du client
      const clientDoc = await getDoc(doc(firestore, 'users', data.createdBy));
      if (clientDoc.exists()) {
        const clientData = clientDoc.data() as any;
        setClient({
          id: clientDoc.id,
          firstName: clientData.firstName || '',
          lastName: clientData.lastName || '',
          email: clientData.email || ''
        });
      }

      // Charger les informations des coaches
      const coachList: Client[] = [];
      for (const coachId of appointmentData.coachIds) {
        try {
          const coachDoc = await getDoc(doc(firestore, 'users', coachId));
          if (coachDoc.exists()) {
            const coachData = coachDoc.data() as any;
            coachList.push({
              id: coachDoc.id,
              firstName: coachData.firstName || '',
              lastName: coachData.lastName || '',
              email: coachData.email || ''
            });
          }
        } catch (error) {
          console.warn('⚠️ Erreur chargement coach:', coachId, error);
        }
      }
      setCoaches(coachList);

      console.log('✅ APPOINTMENT DETAIL - Données chargées');
    } catch (error) {
      console.error('❌ APPOINTMENT DETAIL - Erreur:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails du rendez-vous');
      backOrRoleHome();
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = (action: 'accepted' | 'refused') => {
    console.log('[APPT_DETAIL] handleResponse appelé', { action, appointmentId, currentUser: currentUser?.uid });
    setResponseAction(action);
    setComment('');
    setShowResponseModal(true);
  };

  const submitResponse = async () => {
    if (!appointment || !currentUser) { console.log('[APPT_DETAIL] submitResponse abort - missing appointment/currentUser'); return; }
    console.log('[APPT_DETAIL] submitResponse start', { appointmentId: appointment.id, currentUser: currentUser.uid, desiredAction: responseAction });
    try {
      setActionLoading(true);
      console.log('[APPT_DETAIL] coachParticipants snapshot', coachParticipants.map(p=>({id:p.id,userId:p.userId,email:p.email,status:p.status,role:p.role})));
      let me = coachParticipants.find(p => p.userId === currentUser.uid);
      if (!me) {
        console.warn('[APPT_DETAIL] Participant coach introuvable – tentative de création rétroactive');
        try {
          const newRef = await addDoc(collection(firestore,'appointmentParticipants'), {
            appointmentId: appointment.id,
            userId: currentUser.uid,
            email: currentUser.email || '',
            role: 'coach',
            status: 'pending',
            attendanceStatus: 'pending',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
          console.log('[APPT_DETAIL] Participant coach créé rétroactivement', newRef.id);
          me = { id: newRef.id, userId: currentUser.uid, status:'pending', role:'coach' } as any;
        } catch(e) {
          console.error('[APPT_DETAIL] Échec création participant coach rétroactif', e);
          Alert.alert('Erreur','Impossible de créer votre participation (coach)');
          return;
        }
      }
      const newStatus = responseAction === 'accepted' ? 'accepted' : 'declined';
      console.log('[APPT_DETAIL] updateParticipantStatus invocation', { participantId: me.id, newStatus });
      await updateParticipantStatus(me.id, newStatus);
      console.log('[APPT_DETAIL] updateParticipantStatus terminé, rechargement participants');
      try {
        const partsSnap = await getDocs(query(collection(firestore, 'appointmentParticipants'), where('appointmentId','==', appointment.id), where('role','==','coach')));
        const coachParts = partsSnap.docs.map(d=>({ id:d.id, ...d.data() }));
        console.log('[APPT_DETAIL] participants rechargés', (coachParts as any[]).map(p=>({id:p.id,userId:(p as any).userId,status:(p as any).status})));
        setCoachParticipants(coachParts);
      } catch(e){ console.warn('[APPT_DETAIL] Erreur reload participants', e); }
      setShowResponseModal(false);
      console.log('[APPT_DETAIL] Modal fermé, affichage alerte succès');
      Alert.alert('Succès', `Vous avez ${responseAction === 'accepted' ? 'accepté' : 'refusé'} ce rendez-vous.`, [{ text:'OK', onPress: () => { console.log('[APPT_DETAIL] Retour après succès'); backOrRoleHome(); } }]);
    } catch (error) {
      console.error('❌ APPOINTMENT DETAIL - Erreur réponse:', error);
      Alert.alert('Erreur', 'Impossible denvoyer votre réponse');
    } finally { setActionLoading(false); console.log('[APPT_DETAIL] submitResponse end'); }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // SUPPR: getMyDecision basé sur appointment.decisions (legacy)
  // Nouveau helpers basés sur coachParticipants
  const getMyCoachParticipant = () => {
    if (!currentUser) return null;
    return coachParticipants.find(p => p.userId === currentUser.uid) || null;
  };
  const hasResponded = () => {
    const me = getMyCoachParticipant();
    return !!me && me.status !== 'pending';
  };
  const getResponsesStatus = () => {
    const total = coachParticipants.length;
    if (total === 0) return '0/0 coach a répondu';
    const responded = coachParticipants.filter(c => c.status === 'accepted' || c.status === 'declined').length;
    return `${responded}/${total} coaches ont répondu`;
  };

  const renderCoachResponses = () => {
    return coachParticipants.map(cp => {
      const status = cp.status === 'accepted' ? 'Accepté' : cp.status === 'declined' ? 'Refusé' : 'En attente';
      return (
        <View key={cp.id} style={styles.coachResponseRow}>
          <Text style={styles.coachResponseName}>{cp.userId || cp.email || 'Coach'}</Text>
          <Text style={styles.coachResponseStatus}>{status}</Text>
        </View>
      );
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement des détails...</Text>
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Rendez-vous introuvable</Text>
      </View>
    );
  }

  const myParticipant = getMyCoachParticipant();
  const myResponded = hasResponded();
  const myStatus = myParticipant?.status; // 'accepted' | 'declined' | 'pending'
  const myDecisionDateLabel = (() => {
    const d = safeToDate(myParticipant?.updatedAt || myParticipant?.joinedAt);
    return d ? `Le ${d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : null;
  })();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => backOrRoleHome()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Détail du RDV</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.card}>
          <View style={styles.sessionHeader}>
            <Text style={styles.sessionType}>{appointment.sessionType}</Text>
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
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Client demandeur</Text>
            <Text style={styles.clientName}>
              {client ? `${client.firstName} ${client.lastName}` : 'Client inconnu'}
            </Text>
            <Text style={styles.clientEmail}>{client?.email}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Détails de la séance</Text>
            
            <View style={styles.detailRow}>
              <Ionicons name="calendar" size={18} color="#666" />
              <Text style={styles.detailLabel}>Date :</Text>
              <Text style={styles.detailValue}>{formatDate(appointment.date)}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="location" size={18} color="#666" />
              <Text style={styles.detailLabel}>Lieu :</Text>
              <Text style={styles.detailValue}>{appointment.location}</Text>
            </View>
            
            {appointment.description && (
              <View style={styles.detailRow}>
                <Ionicons name="document-text" size={18} color="#666" />
                <Text style={styles.detailLabel}>Description :</Text>
                <Text style={styles.detailValue}>{appointment.description}</Text>
              </View>
            )}
            
            {appointment.notes && (
              <View style={styles.detailRow}>
                <Ionicons name="chatbubble-ellipses" size={18} color="#666" />
                <Text style={styles.detailLabel}>Notes :</Text>
                <Text style={styles.detailValue}>{appointment.notes}</Text>
              </View>
            )}
          </View>

          {coaches.length > 1 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Autres coaches impliqués</Text>
              {coaches
                .filter(coach => coach.id !== currentUser?.uid)
                .map((coach, index) => {
                  const decision = appointment.decisions[coach.id];
                  return (
                    <View key={coach.id} style={styles.coachRow}>
                      <Text style={styles.coachName}>
                        {coach.firstName} {coach.lastName}
                      </Text>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: decision 
                          ? (decision.status === 'accepted' ? '#27ae60' : '#e74c3c')
                          : '#f39c12'
                        }
                      ]}>
                        <Text style={styles.statusText}>
                          {decision 
                            ? (decision.status === 'accepted' ? 'Accepté' : 'Refusé')
                            : 'En attente'
                          }
                        </Text>
                      </View>
                    </View>
                  );
                })
              }
            </View>
          )}

          {appointment.type === 'group' && appointment.invitedEmails && appointment.invitedEmails.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Clients invités</Text>
              {appointment.invitedEmails.map((email, index) => (
                <Text key={index} style={styles.invitedEmail}>• {email}</Text>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Statut des réponses</Text>
            <Text style={styles.responsesStatus}>{getResponsesStatus()}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Réponses des coachs</Text>
            {renderCoachResponses()}
          </View>
        </View>

        {/* Bloc réponse coach */}
        {myResponded ? (
          <View style={styles.responseCard}>
            <Text style={styles.responseTitle}>Votre réponse</Text>
            <View style={styles.myResponseContainer}>
              <View style={[styles.myStatusBadge,{ backgroundColor: myStatus === 'accepted' ? '#27ae60' : '#e74c3c' }]}>
                <Text style={styles.myStatusText}>{myStatus === 'accepted' ? 'Accepté' : 'Refusé'}</Text>
              </View>
              {myDecisionDateLabel && (<Text style={styles.responseDate}>{myDecisionDateLabel}</Text>)}
            </View>
          </View>
        ) : (
          <View style={styles.actionsCard}>
            <Text style={styles.actionsTitle}>Répondre à cette demande</Text>
            <Text style={styles.actionsSubtitle}>Acceptez-vous ce rendez-vous ?</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity style={[styles.actionButton, styles.refuseButton]} onPress={() => handleResponse('refused')}>
                <Ionicons name="close" size={20} color="white" />
                <Text style={styles.actionButtonText}>Refuser</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.acceptButton]} onPress={() => handleResponse('accepted')}>
                <Ionicons name="checkmark" size={20} color="white" />
                <Text style={styles.actionButtonText}>Accepter</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal de réponse */}
      <Modal
        visible={showResponseModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowResponseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {responseAction === 'accepted' ? 'Accepter' : 'Refuser'} le rendez-vous
            </Text>
            
            <Text style={styles.modalSubtitle}>
              Voulez-vous ajouter un commentaire ? (optionnel)
            </Text>
            
            <TextInput
              style={styles.commentInput}
              value={comment}
              onChangeText={setComment}
              placeholder="Votre commentaire..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setShowResponseModal(false)}
              >
                <Text style={styles.cancelModalButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  responseAction === 'accepted' ? styles.acceptModalButton : styles.refuseModalButton
                ]}
                onPress={submitResponse}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.confirmModalButtonText}>
                    {responseAction === 'accepted' ? 'Accepter' : 'Refuser'}
                  </Text>
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
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sessionType: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 5,
  },
  clientEmail: {
    fontSize: 14,
    color: '#666',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginLeft: 10,
  },
  coachRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  coachName: {
    fontSize: 14,
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
    fontWeight: '600',
  },
  invitedEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  responsesStatus: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  responseCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  responseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  myResponseContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  myStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  myStatusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  responseDate: {
    fontSize: 12,
    color: '#666',
  },
  commentContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  commentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
  },
  actionsCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  actionsSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#27ae60',
  },
  refuseButton: {
    backgroundColor: '#e74c3c',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#e74c3c',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    width: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#f0f0f0',
  },
  acceptModalButton: {
    backgroundColor: '#27ae60',
  },
  refuseModalButton: {
    backgroundColor: '#e74c3c',
  },
  cancelModalButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmModalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  coachResponseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  coachResponseName: {
    fontSize: 14,
    color: '#333',
  },
  coachResponseStatus: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
});
