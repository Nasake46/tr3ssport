import React, { useState } from 'react';
import { auth } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Connexion réussie
    } catch (err) {
      console.error('Erreur de connexion', err);
    }
  };

}
