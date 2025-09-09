// app/messaging/[id].tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { firestore } from '../../../firebase';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const COLORS = {
  bg: '#FAF8F5',
  card: '#FFFFFF',
  text: '#0F473C',
  sub: '#3D6B60',
  primaryDark: '#04403A',
  accent: '#F4AF00',
  line: '#E5E7EB',
};

type Message = { id: string; text: string; senderId: string; timestamp?: any };

export default function Conversation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const convId = String(id || '');
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const userId = getAuth().currentUser?.uid || null;
  const listRef = useRef<FlatList<Message>>(null);

  // ↓ pour gérer l'espace du notch + tab bar et baisser un peu la flèche
  const insets = useSafeAreaInsets();
  const tabBarH = useBottomTabBarHeight();

  // Temps réel
  useEffect(() => {
    if (!convId) return;
    const messagesRef = collection(firestore, 'conversations', convId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [convId]);

  // scroll en bas
  useEffect(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, [messages]);

  const sendMessage = async () => {
    if (!text.trim() || !userId || !convId) return;
    const payload = {
      text: text.trim(),
      senderId: userId,
      timestamp: Timestamp.now(),
      createdAt: serverTimestamp(),
    };
    await addDoc(collection(firestore, 'conversations', convId, 'messages'), payload);
    await updateDoc(doc(firestore, 'conversations', convId), {
      lastMessage: payload.text,
      updatedAt: serverTimestamp(),
    });
    setText('');
  };

  const renderItem = ({ item }: { item: Message }) => {
    const mine = item.senderId === userId;
    return (
      <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginVertical: 4 }}>
        <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
          <Text style={[styles.msgTxt, mine && { color: COLORS.primaryDark }]}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={(Platform.OS === 'ios' ? 64 : 0) + Math.max(tabBarH - 12, 0)}
      >
        {/* Header — flèche un peu plus basse via paddingTop dynamique */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity
            style={[styles.iconBtn, { marginTop: 2 }]} // ↓ encore un léger décalage de la flèche
            onPress={() => (router.replace('/messaging'))}
          >
            <Ionicons name="arrow-back" size={20} color={COLORS.primaryDark} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>Conversation</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Liste des messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{
            padding: 12,
            paddingBottom: 8 + Math.max(tabBarH - 12, 0) + insets.bottom + 44
          }}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="interactive"
          style={{ flex: 1 }}
        />

        {/* Barre d’envoi (au-dessus du tab bar) */}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + Math.max(0), marginBottom: -89 }]}>
        
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Écrire un message…"
            placeholderTextColor="#8CA9A1"
            returnKeyType="send"
            onSubmitEditing={() => {
              if (text.trim()) sendMessage();
            }}
            blurOnSubmit={false}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} disabled={!text.trim()}>
            <Ionicons name="send" size={18} color={COLORS.primaryDark} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
  },
  title: { flex: 1, fontWeight: '700', color: COLORS.primaryDark, fontSize: 18 },

  bubble: {
    maxWidth: '80%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  mine: { backgroundColor: COLORS.accent, borderColor: '#E6C978' },
  theirs: { backgroundColor: COLORS.card, borderColor: COLORS.line },
  msgTxt: { color: COLORS.text, fontSize: 15 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    zIndex: 12,
    elevation: 12,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: COLORS.text,
  },
  sendBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
