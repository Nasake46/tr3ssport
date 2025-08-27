import { router } from 'expo-router';
import { auth, firestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export type AppRole = 'user' | 'coach' | 'admin';

export const getFallbackPathForRole = (role: AppRole | undefined): string => {
  switch (role) {
    case 'admin':
      return '/admin-dashboard';
    case 'coach':
      return '/(tabs)/homeCoach';
    case 'user':
    default:
      return '/(tabs)/HomeScreen';
  }
};

export const resolveCurrentUserRole = async (): Promise<AppRole | undefined> => {
  try {
    const user = auth.currentUser;
    if (!user) return undefined;
    const snap = await getDoc(doc(firestore, 'users', user.uid));
    if (!snap.exists()) return undefined;
    const data = snap.data() as any;
    return (data.role as AppRole) || 'user';
  } catch {
    return undefined;
  }
};

export const navigateToRoleHome = async (role?: AppRole) => {
  const r = role ?? (await resolveCurrentUserRole());
  const path = getFallbackPathForRole(r);
  router.replace(path as any);
};

export const backOrRoleHome = async (preferredRole?: AppRole) => {
  if (typeof (router as any).canGoBack === 'function' && (router as any).canGoBack()) {
    router.back();
  } else {
    await navigateToRoleHome(preferredRole);
  }
};
