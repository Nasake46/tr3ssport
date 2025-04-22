import { Image, StyleSheet, Platform, Button, View } from 'react-native';
import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useState } from 'react';
import auth from '@react-native-firebase/auth';  // Utilisation correcte de la version Firebase pour React Native
//  // Ton fichier firebase.ts

export default function HomeScreen() {
  const [message, setMessage] = useState('');

  async function loginAndCallApi() {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, 'test@email.com', 'motdepasse');
      const token = await userCredential.user.getIdToken();

      const res = await fetch('http://localhost:3000/secure-data', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.text();
      setMessage(data);
    } catch (err) {
      console.error(err);
      setMessage('Erreur lors de la connexion ou de l’appel API');
    }
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <Button title="Connexion + API" onPress={loginAndCallApi} />
        {message ? (
          <View style={{ marginTop: 10 }}>
            <ThemedText>{message}</ThemedText>
          </View>
        ) : null}
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
