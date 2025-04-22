import React, { useState } from 'react';
import { TextInput, Button } from 'react-native';
import auth from '@react-native-firebase/auth';  // Importation correcte

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const signIn = async () => {
    try {
      await auth().signInWithEmailAndPassword(email, password); // Utilisation de la méthode signInWithEmailAndPassword de @react-native-firebase/auth
      console.log('User signed in!');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Sign In" onPress={signIn} />
    </>
  );
}
