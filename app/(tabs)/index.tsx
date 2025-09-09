// app/index.tsx
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, firestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function Index() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setRole(null);
        setReady(true);
        return;
      }
      setUser(u);
      try {
        const snap = await getDoc(doc(firestore, 'users', u.uid));
        const r = snap.exists() ? (snap.data() as any).role : null;
        setRole(r ?? 'user');
      } catch {
        setRole('user');
      } finally {
        setReady(true);
      }
    });
    return unsub;
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  // Non connecté -> login
  if (!user) return <Redirect href="/auth/LoginScreen" />;

  // Coach (ou admin) -> homeCoach
  if (role === 'coach' || role === 'admin') return <Redirect href="/homeCoach" />;

  // User -> HomeScreen
  return <Redirect href="/HomeScreen" />;
}
