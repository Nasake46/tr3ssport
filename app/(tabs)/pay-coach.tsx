import { View, Text, TextInput, Button, Alert } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';

const COACHS = [
  { id: 'coach_1', name: 'Marie Dupont' },
  { id: 'coach_2', name: 'Alex Bernard' },
];

export default function PayCoachScreen() {
  const [selectedCoach, setSelectedCoach] = useState(COACHS[0].id);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || cents < 50) {
      Alert.alert('Montant invalide', 'Entrez un montant d’au moins 0,50 €.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://192.168.1.124:4242/pay-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachId: selectedCoach, amount: cents }),
      });

      const data = await response.json();
      if (data.url) {
        setLoading(false);
        router.replace(data.url);
      } else {
        Alert.alert('Erreur', 'Impossible de lancer le paiement.');
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', 'Une erreur est survenue.');
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Rémunérer un coach</Text>

      <Text style={{ marginBottom: 5 }}>Choisissez un coach :</Text>
      {COACHS.map((coach) => (
        <Button
          key={coach.id}
          title={coach.name}
          onPress={() => setSelectedCoach(coach.id)}
          color={selectedCoach === coach.id ? 'blue' : undefined}
        />
      ))}

      <Text style={{ marginTop: 20 }}>Montant (€) :</Text>
      <TextInput
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 10,
          marginTop: 5,
          marginBottom: 20,
        }}
        placeholder="Ex : 50.00"
      />

      <Button
        title={loading ? 'Chargement...' : 'Payer'}
        onPress={handlePayment}
        disabled={loading}
      />
    </View>
  );
}
