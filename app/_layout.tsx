import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { auth, firestore } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const router = useRouter();
  const [initialRedirectDone, setInitialRedirectDone] = useState(false);

  useEffect(() => {
    if (loaded && !initialRedirectDone) {
      // Attendre l'état auth puis rediriger selon rôle
      const unsub = onAuthStateChanged(auth, async (user) => {
        try {
          if (user) {
            const snap = await getDoc(doc(firestore, 'users', user.uid));
            const role = snap.exists() ? (snap.data() as any).role : undefined;
            const normalizedRole = role ? String(role).trim().toLowerCase() : 'user';
            console.log('🌐 ROOT LAYOUT - Auth user détecté, rôle:', normalizedRole);
            if (normalizedRole === 'admin' || normalizedRole === 'observer') {
              // Page d'accueil par défaut pour admin
              router.replace('/admin-dashboard');
            } else if (normalizedRole === 'coach') {
              router.replace('/(tabs)/homeCoach');
            } else {
              // Reste sur la stack par défaut (tabs)
            }
          } else {
            console.log('🌐 ROOT LAYOUT - Aucun utilisateur connecté');
          }
        } catch (e) {
          console.warn('🌐 ROOT LAYOUT - Erreur redirection initiale:', e);
        } finally {
          setInitialRedirectDone(true);
          SplashScreen.hideAsync();
          unsub();
        }
      });
    } else if (loaded && initialRedirectDone) {
      SplashScreen.hideAsync();
    }
  }, [loaded, initialRedirectDone]);

  if (!loaded) {
    return null;
  }

  // ... haut du fichier inchangé

return (
  <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen
        name="qr-test"
        options={{ title: 'Test QR Code', headerShown: true, presentation: 'modal' }}
      />
      <Stack.Screen name="+not-found" />
    </Stack>

    <StatusBar style="auto" />
  </ThemeProvider>
);

// ... bas du fichier inchangé

}
