// MessagingScreen.tsx — DA alignée avec tes écrans (vert profond + jaune, cartes arrondies)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { collection, getDocs, addDoc, query, where, doc, updateDoc, getDoc } from 'firebase/firestore';
import { firestore } from '../../firebase';
import { getAuth } from 'firebase/auth';
import Fuse from 'fuse.js';

import { Ionicons } from '@expo/vector-icons';

type Contact = { id: string; name: string; conversationId: string };
type GroupChat = { id: string; memberCount: number };
type UserMini = { id: string; name: string };
type Request = { id: string; fromId: string; name: string };

const COLORS = {
  bg: '#FAF8F5',
  card: '#FFFFFF',
  text: '#0F473C',
  sub: '#3D6B60',
  primary: '#0E6B5A',
  primaryDark: '#04403A',
  accent: '#F4AF00',
  line: '#E5E7EB',
  chip: '#F4AF00',
};

export default function MessagingScreen() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [showGroups, setShowGroups] = useState(false);
  const [users, setUsers] = useState<UserMini[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const currentUser = getAuth().currentUser;

  const openChat = (conversationId: string) => {
    router.push({ pathname: '/messaging/[id]', params: { id: conversationId } });
  };

  useEffect(() => {
    if (!currentUser) return;
    fetchConversations();
    fetchContactRequests();
  }, [currentUser]);

  const fetchConversations = async () => {
    if (!currentUser) return;

    const convQuery = query(
      collection(firestore, 'conversations'),
      where('members', 'array-contains', currentUser.uid)
    );
    const convSnapshot = await getDocs(convQuery);

    const oneToOne: Contact[] = [];
    const groupList: GroupChat[] = [];

    for (const docSnap of convSnapshot.docs) {
      const data = docSnap.data() as any;
      const members: string[] = data.members || [];

      if (members.length === 2) {
        const otherId = members.find((id) => id !== currentUser.uid);
        if (otherId) {
          const userSnap = await getDocs(query(collection(firestore, 'users'), where('__name__', '==', otherId)));
          const userData = userSnap.docs[0]?.data() as any;
          const name = `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || 'Utilisateur';
          oneToOne.push({ id: otherId, name, conversationId: docSnap.id });
        }
      } else {
        groupList.push({ id: docSnap.id, memberCount: members.length });
      }
    }

    setContacts(oneToOne);
    setGroupChats(groupList);
  };

  const fetchUsers = async () => {
    if (!currentUser) return;
    const snapshot = await getDocs(collection(firestore, 'users'));
    const userList = snapshot.docs
      .filter((d) => d.id !== currentUser?.uid)
      .map((d) => {
        const data = d.data() as any;
        const name = `${data.firstName || ''} ${data.lastName || ''}`.trim();
        return { id: d.id, name: name || 'Utilisateur' };
      });
    setUsers(userList);
    setSearchQuery('');
    setModalVisible(true);
  };

  const fetchContactRequests = async () => {
    if (!currentUser) return;
    const requestQuery = query(collection(firestore, 'contactRequests'), where('toId', '==', currentUser.uid));
    const snapshot = await getDocs(requestQuery);
    const result: Request[] = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as any;
      if (data.status === 'pending') {
        const userSnap = await getDocs(query(collection(firestore, 'users'), where('__name__', '==', data.fromId)));
        const userData = userSnap.docs[0]?.data() as any;
        const name = `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || 'Utilisateur';
        result.push({ id: docSnap.id, fromId: data.fromId, name });
      }
    }
    setRequests(result);
  };

  const sendContactRequest = async (toId: string) => {
    if (!currentUser) return;
    try {
      await addDoc(collection(firestore, 'contactRequests'), {
        fromId: currentUser.uid,
        toId,
        status: 'pending',
        createdAt: Date.now(),
      });
      Alert.alert('Demande envoyée');
      setModalVisible(false);
    } catch (error) {
      console.error('Erreur envoi demande', error);
    }
  };

  const acceptRequest = async (requestId: string, fromId: string) => {
    if (!currentUser) return;
    const members = [currentUser.uid, fromId].sort();
    const convRef = await addDoc(collection(firestore, 'conversations'), {
      members,
      createdAt: Date.now(),
    });
    await updateDoc(doc(firestore, 'contactRequests', requestId), { status: 'accepted' });
    fetchContactRequests();
    fetchConversations();
    openChat(convRef.id);
  };

  const rejectRequest = async (requestId: string) => {
    await updateDoc(doc(firestore, 'contactRequests', requestId), { status: 'rejected' });
    fetchContactRequests();
  };
  const goHomeByRole = async () => {
  const user = getAuth().currentUser;
  if (!user) {
    router.replace('/(tabs)'); // fallback
    return;
  }
  try {
    const snap = await getDoc(doc(firestore, 'users', user.uid));
    const roleRaw = snap.exists() ? (snap.data() as any).role : 'user';
    const role = String(roleRaw || 'user').toLowerCase();

    if (role === 'coach' || role === 'admin') {
      router.replace('/(tabs)/homeCoach'); // coach home
    } else {
      router.replace('/HomeScreen');       // user home
    }
  } catch {
    router.replace('/HomeScreen');
  }
};

  const createGroupConversation = async () => {
    if (!currentUser) return;
    if (selectedContacts.length < 1) {
      Alert.alert('Sélectionnez au moins un contact');
      return;
    }

    const members = [...selectedContacts, currentUser.uid];
    try {
      const convRef = await addDoc(collection(firestore, 'conversations'), {
        members,
        createdAt: Date.now(),
      });
      setGroupModalVisible(false);
      setSelectedContacts([]);
      fetchConversations();
      openChat(convRef.id);
    } catch (error) {
      console.error('Erreur création groupe', error);
    }
  };

  const fuse = new Fuse(users, { keys: ['name'], threshold: 0.4, ignoreLocation: true, includeScore: true });
  const filteredUsers = searchQuery ? fuse.search(searchQuery).map((r) => r.item) : users;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={goHomeByRole}>
  <Ionicons name="arrow-back" size={22} color={COLORS.primaryDark} />
</TouchableOpacity>

        <Text style={styles.headerTitle}>Messages</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={[styles.iconBtn, { borderColor: COLORS.primary }]} onPress={fetchUsers}>
            <Ionicons name="person-add" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { borderColor: COLORS.accent }]} onPress={() => setGroupModalVisible(true)}>
            <Ionicons name="people" size={20} color={COLORS.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={COLORS.sub} />
        <TextInput
          placeholder="Rechercher une conversation"
          placeholderTextColor="#8CA9A1"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
      </View>

      {/* Demandes de contact */}
      {requests.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Demandes de contact</Text>
          {requests.map((req) => (
            <View key={req.id} style={styles.requestRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarTxt}>{req.name.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={[styles.name, { flex: 1 }]} numberOfLines={1}>
                {req.name}
              </Text>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: COLORS.primary }]} onPress={() => acceptRequest(req.id, req.fromId)}>
                <Text style={styles.smallBtnTxt}>Accepter</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#E74C3C' }]} onPress={() => rejectRequest(req.id)}>
                <Text style={styles.smallBtnTxt}>Refuser</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Conversations */}
      <FlatList
        data={contacts.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))}
        keyExtractor={(item) => item.conversationId}
        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
        ListEmptyComponent={<Text style={{ color: COLORS.sub, textAlign: 'center', marginTop: 40 }}>Aucune conversation</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => openChat(item.conversationId)} style={styles.convCard} activeOpacity={0.85}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTxt}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.lastMsg} numberOfLines={1}>Appuyer pour ouvrir la conversation</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.sub} />
          </TouchableOpacity>
        )}
      />

      {/* Toggle groupes */}
      <TouchableOpacity style={styles.toggle} onPress={() => setShowGroups((p) => !p)}>
        <Text style={styles.toggleTxt}>{showGroups ? 'Masquer les groupes' : 'Afficher les groupes'}</Text>
        <Ionicons name={showGroups ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.primary} />
      </TouchableOpacity>

      {showGroups && (
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          {groupChats.map((g) => (
            <TouchableOpacity key={g.id} onPress={() => openChat(g.id)} style={styles.groupCard}>
              <Ionicons name="people" size={18} color={COLORS.primary} />
              <Text style={[styles.name, { marginLeft: 8 }]}>Groupe ({g.memberCount} membres)</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.sub} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Modal - Ajouter un contact */}
      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={[styles.modalWrap]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ajouter un contact</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.iconBtn}>
              <Ionicons name="close" size={20} color={COLORS.primaryDark} />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchWrap, { marginTop: 0 }]}>
            <Ionicons name="search" size={18} color={COLORS.sub} />
            <TextInput
              placeholder="Rechercher un nom…"
              placeholderTextColor="#8CA9A1"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            {filteredUsers.map((u) => (
              <TouchableOpacity key={u.id} onPress={() => sendContactRequest(u.id)} style={styles.convCard}>
                <View style={styles.avatar}><Text style={styles.avatarTxt}>{u.name.charAt(0).toUpperCase()}</Text></View>
                <Text style={[styles.name, { flex: 1 }]} numberOfLines={1}>{u.name}</Text>
                <View style={[styles.smallBtn, { backgroundColor: COLORS.accent }]}><Text style={[styles.smallBtnTxt, { color: COLORS.primaryDark }]}>Inviter</Text></View>
              </TouchableOpacity>
            ))}
            {filteredUsers.length === 0 && <Text style={{ color: COLORS.sub, textAlign: 'center', marginTop: 40 }}>Aucun utilisateur trouvé</Text>}
          </ScrollView>
        </View>
      </Modal>

      {/* Modal - Créer un groupe */}
      <Modal visible={groupModalVisible} animationType="slide" onRequestClose={() => setGroupModalVisible(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Créer un groupe</Text>
            <TouchableOpacity onPress={() => setGroupModalVisible(false)} style={styles.iconBtn}>
              <Ionicons name="close" size={20} color={COLORS.primaryDark} />
            </TouchableOpacity>
          </View>

          <Text style={{ color: COLORS.sub, marginBottom: 8 }}>Sélectionne des contacts</Text>
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            {contacts.map((c) => {
              const selected = selectedContacts.includes(c.id);
              return (
                <TouchableOpacity
                  key={c.id}
                  onPress={() =>
                    setSelectedContacts((prev) => (selected ? prev.filter((id) => id !== c.id) : [...prev, c.id]))
                  }
                  style={[styles.convCard, selected && { borderColor: COLORS.primary, borderWidth: 1 }]}
                >
                  <View style={styles.avatar}><Text style={styles.avatarTxt}>{c.name.charAt(0).toUpperCase()}</Text></View>
                  <Text style={[styles.name, { flex: 1 }]} numberOfLines={1}>{c.name}</Text>
                  {selected ? (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  ) : (
                    <Ionicons name="ellipse-outline" size={20} color={COLORS.sub} />
                  )}
                </TouchableOpacity>
              );
            })}
            {contacts.length === 0 && <Text style={{ color: COLORS.sub, textAlign: 'center', marginTop: 40 }}>Aucun contact disponible</Text>}
          </ScrollView>

          <TouchableOpacity style={styles.cta} onPress={createGroupConversation}>
            <Text style={styles.ctaTxt}>Créer le groupe</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: COLORS.primaryDark },
  iconBtn: {
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: { flex: 1, color: COLORS.text },
  card: {
    backgroundColor: COLORS.card,
    margin: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  cardTitle: { color: COLORS.primaryDark, fontWeight: '700', marginBottom: 8 },
  requestRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  smallBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 12 },
  convCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6F0EE',
  },
  avatarTxt: { color: COLORS.primary, fontWeight: '700' },
  name: { color: COLORS.text, fontWeight: '700' },
  lastMsg: { color: COLORS.sub, fontSize: 12, marginTop: 2 },
  toggle: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleTxt: { color: COLORS.primary, fontWeight: '700' },
  groupCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalWrap: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 16,
    paddingTop: 18,
  },
  modalHeader: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: { color: COLORS.primaryDark, fontWeight: '700', fontSize: 18, flex: 1 },
  cta: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  ctaTxt: { color: COLORS.primaryDark, fontWeight: '800' },
});
