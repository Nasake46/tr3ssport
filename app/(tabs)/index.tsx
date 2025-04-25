import { Button, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Button title="Login" onPress={() => router.push('/(tabs)/loginScreen')} />
      <Button title="Register" onPress={() => router.push('/(tabs)/registerScreen')} />
      <Button title="Login Coach" onPress={() => router.push('/(tabs)/loginCoachScreen')} />
      <Button title="Register Coach" onPress={() => router.push('/(tabs)/registerCoachScreen')} />
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