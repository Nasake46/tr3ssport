import { View, Text, FlatList, TouchableOpacity, Modal, Button, TextInput, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { collection, getDocs, addDoc, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { firestore } from '../../firebase';
import { getAuth } from 'firebase/auth';

export default function MessagingScreen() {
  const [contacts, setContacts] = useState<{ id: string; name: string; conversationId: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [requests, setRequests] = useState<{ id: string; fromId: string; name: string }[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
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
    const convQuery = query(
      collection(firestore, 'conversations'),
      where('members', 'array-contains', currentUser.uid)
    );
    const convSnapshot = await getDocs(convQuery);

    const otherUserIds: string[] = [];
    const convIdByUserId: Record<string, string> = {};

    convSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const members: string[] = data.members || [];
      const otherUserId = members.find(id => id !== currentUser.uid);
      if (otherUserId) {
        otherUserIds.push(otherUserId);
        convIdByUserId[otherUserId] = doc.id;
      }
    });

    const chunks: string[][] = [];
    for (let i = 0; i < otherUserIds.length; i += 10) {
      chunks.push(otherUserIds.slice(i, i + 10));
    }

    let usersList: { id: string; name: string; conversationId: string }[] = [];

    for (const chunk of chunks) {
      const usersQuery = query(collection(firestore, 'users'), where('__name__', 'in', chunk));
      const usersSnapshot = await getDocs(usersQuery);
      usersList = usersList.concat(
        usersSnapshot.docs.map(doc => {
          const data = doc.data();
          const name = `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Utilisateur';
          return { id: doc.id, name, conversationId: convIdByUserId[doc.id] };
        })
      );
    }

    setContacts(usersList);
  };

  const fetchUsers = async () => {
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

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      <Button title="Ajouter un contact" onPress={fetchUsers} />

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
    </View>
  );
}
