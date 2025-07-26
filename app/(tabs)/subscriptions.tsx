// app/subscriptions.tsx
import { View, Text, Button, FlatList, Alert } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';

const SUBSCRIPTIONS = [
  { id: 'basic', name: 'Abonnement Basic', price: 1000 },
  { id: 'premium', name: 'Abonnement Premium', price: 2500 },
];

export default function SubscriptionsScreen() {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleSubscribe = async (subscriptionId: string) => {
    console.log('Start subscription:', subscriptionId);
    setLoadingId(subscriptionId);
    try {
      const response = await fetch('http://192.168.1.124:4242/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId }),
      });

      const data = await response.json();
      console.log('Response:', data);

      if (data.url) {
        setLoadingId(null); // Important avant la redirection
        router.replace(data.url);
      } else {
        Alert.alert('Erreur', 'Impossible de démarrer le paiement.');
        setLoadingId(null);
      }
    } catch (err) {
      console.error('Erreur abonnement:', err);
      Alert.alert('Erreur', 'Une erreur est survenue.');
      setLoadingId(null);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Choisissez un abonnement</Text>

      <FlatList
        data={SUBSCRIPTIONS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ padding: 20, borderBottomWidth: 1, borderColor: '#ccc' }}>
            <Text style={{ fontSize: 18 }}>{item.name}</Text>
            <Text style={{ marginBottom: 10 }}>{item.price / 100} € / mois</Text>
            <Button
              title="S'abonner"
              onPress={() => handleSubscribe(item.id)}
              disabled={loadingId === item.id}
            />
          </View>
        )}
      />
    </View>
  );
}
