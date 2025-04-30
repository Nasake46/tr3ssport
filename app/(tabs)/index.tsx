import { Button, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Button title="Login" onPress={() => router.push('/(tabs)/LoginScreen')} />
      <Button title="Register" onPress={() => router.push('/(tabs)/registerScreen')} />
      <Button title="Home" onPress={() => router.push('/(tabs)/HomeScreen')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
});