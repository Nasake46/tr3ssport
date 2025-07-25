import { useEffect } from 'react';
import { router } from 'expo-router';

export default function MyAppointmentsRedirect() {
  useEffect(() => {
    // Rediriger immédiatement vers le dashboard client
    router.replace('/appointments/client-dashboard');
  }, []);

  return null; // Ce composant ne rend rien
}
