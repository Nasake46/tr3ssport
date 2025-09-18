import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { auth, firestore } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'expo-router';
import 'react-native-reanimated';
import { useColorScheme } from '../hooks/useColorScheme';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const router = useRouter();
  const pathname = usePathname();
  const [initialRedirectDone, setInitialRedirectDone] = useState(false);

  useEffect(() => {
    if (loaded && !initialRedirectDone) {
      const unsub = onAuthStateChanged(auth, async (user) => {
        try {
          if (user) {
            const snap = await getDoc(doc(firestore, 'users', user.uid));
            const role = snap.exists() ? (snap.data() as any).role : undefined;
            const normalizedRole = role ? String(role).trim().toLowerCase() : 'user';
            console.log('🌐 ROOT LAYOUT - Auth user détecté, rôle:', normalizedRole, 'pathname:', pathname);
            const bypassPaths = ['/test-new-features'];
            if (!bypassPaths.includes(pathname || '')) {
              if (normalizedRole === 'admin' || normalizedRole === 'observer') {
                router.replace('/admin-dashboard');
              } else if (normalizedRole === 'coach') {
                router.replace('/(tabs)/homeCoach');
              }
            } else {
              console.log('🌐 ROOT LAYOUT - Bypass redirection pour page de test');
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
  }, [loaded, initialRedirectDone, router, pathname]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
  <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="test-new-features" options={{
          title: 'Test New Features',
          headerShown: true,
          presentation: 'modal'
        }} />
        <Stack.Screen name="coachActiveSession" options={{
          // écran legacy redirigé vers /sessionAttendance
          title: 'Assiduité',
          headerShown: false,
        }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
