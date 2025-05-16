import { View, Text, FlatList, TouchableOpacity, Modal, Button } from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { firestore } from '../../firebase';
import { getAuth } from 'firebase/auth';

export default function MessagingScreen() {
  const [contacts, setContacts] = useState<{ id: string; name: string; conversationId: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const currentUser = getAuth().currentUser;

  const openChat = (conversationId: string) => {
    router.push({
      pathname: '/messaging/[id]',
      params: { id: conversationId },
    });
  };

  useEffect(() => {
    if (!currentUser) return;

    const fetchConversations = async () => {
      try {
        const convQuery = query(
          collection(firestore, 'conversations'),
          where('members', 'array-contains', currentUser.uid)
        );
        const convSnapshot = await getDocs(convQuery);

        if (convSnapshot.empty) {
          setContacts([]);
          return;
        }

        // Pour stocker les ids des autres membres ET map conversationId par userId
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

        // Firestore limite les "in" à 10 éléments max, donc on chunk si besoin
        const chunks: string[][] = [];
        for (let i = 0; i < otherUserIds.length; i += 10) {
          chunks.push(otherUserIds.slice(i, i + 10));
        }

        let usersList: { id: string; name: string; conversationId: string }[] = [];

        for (const chunk of chunks) {
          const usersQuery = query(
            collection(firestore, 'users'),
            where('__name__', 'in', chunk)
          );
          const usersSnapshot = await getDocs(usersQuery);
          usersList = usersList.concat(
            usersSnapshot.docs.map(doc => {
              const data = doc.data();
              const name = `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Utilisateur';
              return {
                id: doc.id,
                name,
                conversationId: convIdByUserId[doc.id],
              };
            })
          );
        }

        setContacts(usersList);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      }
    };

    fetchConversations();
  }, [currentUser]);

  const fetchUsers = async () => {
    console.log('Fetching users...');
    try {
      const snapshot = await getDocs(collection(firestore, 'users'));
      const userList = snapshot.docs
        .filter(doc => doc.id !== currentUser?.uid)
        .map(doc => {
          const data = doc.data();
          const name = `${data.firstName || ''} ${data.lastName || ''}`.trim();
          return { id: doc.id, name: name || 'Utilisateur' };
        });
      console.log('Fetched users:', userList);
      setUsers(userList);
      setModalVisible(true);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const createConversation = async (otherUserId: string) => {
    console.log('createConversation called with', otherUserId);
    if (!currentUser) {
      console.log('No current user');
      return;
    }

    const members = [currentUser.uid, otherUserId].sort();

    try {
      const convQuery = query(
        collection(firestore, 'conversations'),
        where('members', 'array-contains', currentUser.uid)
      );
      const snapshot = await getDocs(convQuery);

      const existingConv = snapshot.docs.find(doc => {
        const data = doc.data();
        if (!data.members || data.members.length !== 2) return false;
        const sortedMembers = [...data.members].sort();
        return sortedMembers[0] === members[0] && sortedMembers[1] === members[1];
      });

      if (existingConv) {
        console.log('Existing conversation found:', existingConv.id);
        setModalVisible(false);
        openChat(existingConv.id);
        return;
      }

      const newConv = await addDoc(collection(firestore, 'conversations'), {
        members,
        createdAt: Date.now(),
      });
      console.log('New conversation created with ID:', newConv.id);
      setModalVisible(false);
      openChat(newConv.id);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Messages</Text>
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
          <Text style={{ fontSize: 20, marginBottom: 20 }}>Ajouter un contact</Text>
          <FlatList
            data={users}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => createConversation(item.id)}
                style={{
                  padding: 15,
                  borderBottomWidth: 1,
                  borderColor: '#ccc',
                }}
              >
                <Text style={{ fontSize: 18 }}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
          <Button title="Annuler" onPress={() => setModalVisible(false)} />
        </View>
      </Modal>
    </View>
  );
}
