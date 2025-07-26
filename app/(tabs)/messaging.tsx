import { View, Text, FlatList, TouchableOpacity, Modal, Button, TextInput, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { collection, getDocs, addDoc, query, where, doc, updateDoc } from 'firebase/firestore';
import { firestore } from '../../firebase';
import { getAuth } from 'firebase/auth';
import Fuse from 'fuse.js';

export default function MessagingScreen() {
  const [contacts, setContacts] = useState<{ id: string; name: string; conversationId: string }[]>([]);
  const [groupChats, setGroupChats] = useState<{ id: string; memberCount: number }[]>([]);
  const [showGroups, setShowGroups] = useState(false);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [requests, setRequests] = useState<{ id: string; fromId: string; name: string }[]>([]);
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

    const oneToOne: { id: string; name: string; conversationId: string }[] = [];
    const groupList: { id: string; memberCount: number }[] = [];

    for (const docSnap of convSnapshot.docs) {
      const data = docSnap.data();
      const members: string[] = data.members || [];

      if (members.length === 2) {
        const otherId = members.find(id => id !== currentUser.uid);
        if (otherId) {
          const userSnap = await getDocs(query(collection(firestore, 'users'), where('__name__', '==', otherId)));
          const userData = userSnap.docs[0]?.data();
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
      .filter(doc => doc.id !== currentUser?.uid)
      .map(doc => {
        const data = doc.data();
        const name = `${data.firstName || ''} ${data.lastName || ''}`.trim();
        return { id: doc.id, name: name || 'Utilisateur' };
      });
    setUsers(userList);
    setSearchQuery('');
    setModalVisible(true);
  };

  const fetchContactRequests = async () => {
    const requestQuery = query(
      collection(firestore, 'contactRequests'),
      where('toId', '==', currentUser?.uid)
    );
    const snapshot = await getDocs(requestQuery);
    const result: { id: string; fromId: string; name: string }[] = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      if (data.status === 'pending') {
        const userSnap = await getDocs(query(collection(firestore, 'users'), where('__name__', '==', data.fromId)));
        const userData = userSnap.docs[0]?.data();
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

  const fuse = new Fuse(users, {
    keys: ['name'],
    threshold: 0.4,
    ignoreLocation: true,
    includeScore: true,
  });

  const filteredUsers = searchQuery
    ? fuse.search(searchQuery).map(result => result.item)
    : users;

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Messages</Text>

      {requests.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontWeight: 'bold' }}>Demandes de contact :</Text>
          {requests.map(req => (
            <View key={req.id} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 5 }}>
              <Text style={{ flex: 1 }}>{req.name}</Text>
              <Button title="Accepter" onPress={() => acceptRequest(req.id, req.fromId)} />
              <Button title="Refuser" onPress={() => rejectRequest(req.id)} />
            </View>
          ))}
        </View>
      )}

      <FlatList
        data={contacts}
        keyExtractor={item => item.conversationId}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => openChat(item.conversationId)}
            style={{ padding: 15, borderBottomWidth: 1, borderColor: '#ccc' }}
          >
            <Text style={{ fontSize: 18 }}>{item.name}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text>Aucune conversation pour le moment</Text>}
      />

      <TouchableOpacity onPress={() => setShowGroups(prev => !prev)} style={{ marginTop: 20, marginBottom: 10 }}>
        <Text style={{ fontSize: 18, color: 'blue' }}>{showGroups ? 'Masquer les groupes' : 'Afficher les groupes'}</Text>
      </TouchableOpacity>

      {showGroups && (
        <FlatList
          data={groupChats}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => openChat(item.id)}
              style={{ padding: 15, borderBottomWidth: 1, borderColor: '#ccc', backgroundColor: '#f0f0f0' }}
            >
              <Text style={{ fontSize: 16 }}>Groupe ({item.memberCount} membres)</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <Button title="Ajouter un contact" onPress={fetchUsers} />
      <Button title="Créer un groupe" onPress={() => setGroupModalVisible(true)} />

      <Modal visible={modalVisible} animationType="slide">
        <View style={{ flex: 1, padding: 20 }}>
          <Text style={{ fontSize: 20, marginBottom: 10 }}>Ajouter un contact</Text>

          <TextInput
            placeholder="Rechercher un nom..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{
              padding: 10,
              borderWidth: 1,
              borderColor: '#ccc',
              borderRadius: 8,
              marginBottom: 20,
            }}
          />

          <FlatList
            data={filteredUsers}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => sendContactRequest(item.id)}
                style={{ padding: 15, borderBottomWidth: 1, borderColor: '#ccc' }}
              >
                <Text style={{ fontSize: 18 }}>{item.name}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text>Aucun utilisateur trouvé</Text>}
          />

          <Button title="Annuler" onPress={() => setModalVisible(false)} />
        </View>
      </Modal>

      <Modal visible={groupModalVisible} animationType="slide">
        <View style={{ flex: 1, padding: 20 }}>
          <Text style={{ fontSize: 20, marginBottom: 10 }}>Créer un groupe</Text>

          <FlatList
            data={contacts}
            keyExtractor={item => item.id}
            renderItem={({ item }) => {
              const selected = selectedContacts.includes(item.id);
              return (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedContacts(prev =>
                      selected ? prev.filter(id => id !== item.id) : [...prev, item.id]
                    );
                  }}
                  style={{
                    padding: 15,
                    borderBottomWidth: 1,
                    borderColor: '#ccc',
                    backgroundColor: selected ? '#e0f7fa' : '#fff',
                  }}
                >
                  <Text style={{ fontSize: 18 }}>{item.name}</Text>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={<Text>Aucun contact disponible</Text>}
          />

          <Button title="Créer le groupe" onPress={createGroupConversation} />
          <Button title="Annuler" onPress={() => setGroupModalVisible(false)} />
        </View>
      </Modal>
    </View>
  );
}
