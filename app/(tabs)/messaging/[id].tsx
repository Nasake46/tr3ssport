import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { firestore } from '../../../firebase';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export default function Conversation() {
  const { id } = useLocalSearchParams();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const userId = getAuth().currentUser?.uid;

  useEffect(() => {
    if (!id) return;
    const messagesRef = collection(firestore, 'conversations', id as string, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, snap =>
      setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    );
    return () => unsubscribe();
  }, [id]);

  const sendMessage = async () => {
    if (!text.trim() || !userId) return;
    await addDoc(collection(firestore, 'conversations', id as string, 'messages'), {
      text,
      senderId: userId,
      timestamp: Timestamp.now()
    });
    setText('');
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Text
            style={{
              alignSelf: item.senderId === userId ? 'flex-end' : 'flex-start',
              backgroundColor: item.senderId === userId ? '#d1e7dd' : '#f8d7da',
              padding: 8,
              borderRadius: 8,
              marginVertical: 4,
              maxWidth: '80%'
            }}
          >
            {item.text}
          </Text>
        )}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Écrire un message..."
        />
        <Button title="Envoyer" onPress={sendMessage} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingBottom: 80 },
  inputContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    alignItems: 'center'
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: 'white'
  }
});
