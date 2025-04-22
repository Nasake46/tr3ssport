import { firebaseAuth } from '@/firebase';  // Utilise le fichier firebase.ts
import { signInWithEmailAndPassword } from '@react-native-firebase/auth';

const handleLogin = async () => {
  try {
    await signInWithEmailAndPassword(firebaseAuth, email, password);
    // Connexion réussie
  } catch (err) {
    console.error('Erreur de connexion', err);
  }
};
