// app/quote.tsx
import { View, Text, TextInput, Button, Alert, TouchableOpacity, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Picker } from '@react-native-picker/picker';

const MUTUELLE_NAMES = [
  'Harmonie Mutuelle',
  'MGEN',
  'Malakoff Humanis',
  'AXA',
  'LMDE',
  'MACSF',
  'Unéo',
  'MCEN',
  'Mutuelle des Sportifs',
  'Identités Mutuelle',
  'Mutuelle du Rempart',
  'MMA',
  'Autre',
] as const;

type MutuelleName = typeof MUTUELLE_NAMES[number];

const MUTUELLES: Record<MutuelleName, number> = {
  'Harmonie Mutuelle': 100,
  'MGEN': 250,
  'Malakoff Humanis': 250,
  'AXA': 200,
  'LMDE': 30,
  'MACSF': 150,
  'Unéo': 150,
  'MCEN': 250,
  'Mutuelle des Sportifs': 250,
  'Identités Mutuelle': 35,
  'Mutuelle du Rempart': 50,
  'MMA': 0, // spécifique à la remise
  'Autre': 50,
};

const MUTUELLES_REMARKS: Partial<Record<MutuelleName, string>> = {
  'MMA': '5 % de remise sur les activités physiques référencées MMA, 20 % sur les visios.',
  'MGEN': 'Jusqu’à 250 € sur 2 ans pour des activités labellisées SSO + 60 € pour un bilan.',
  'Malakoff Humanis': 'Forfait de 500 € sur 2 ans pour un accompagnement sport-santé.',
  'AXA': 'Jusqu’à 200 € pour des activités sportives prescrites et adaptées aux ALD.',
};

export default function QuoteScreen() {
  const [mutuelle, setMutuelle] = useState<MutuelleName>('Harmonie Mutuelle');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [certificat, setCertificat] = useState<null | { name: string; uri: string }>(null);
  const [quote, setQuote] = useState<null | { total: number; reimbursed: number; remaining: number }>(null);

  const pickCertificat = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
    });

    if (result.canceled) return;
    const file = result.assets[0];
    setCertificat({ name: file.name, uri: file.uri });
  };

  const generateQuote = () => {
    const total = parseFloat(totalAmount.replace(',', '.'));
    const forfait = MUTUELLES[mutuelle] ?? 50;

    if (!firstName || !lastName || !email) {
      Alert.alert('Erreur', 'Veuillez remplir vos informations personnelles.');
      return;
    }

    if (isNaN(total) || total <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant total valide.');
      return;
    }

    if (!certificat) {
      Alert.alert('Erreur', 'Veuillez joindre un certificat médical.');
      return;
    }

    const reimbursed = Math.min(total, forfait);
    const remaining = parseFloat((total - reimbursed).toFixed(2));

    setQuote({ total, reimbursed, remaining });
  };

  const handleExportPDF = async () => {
    if (!quote) return;

    const remark = MUTUELLES_REMARKS[mutuelle] ?? 'Aucune remarque spécifique.';

    const html = `
      <html>
        <body>
          <h1>Devis Sport & Santé</h1>
          <p><strong>Nom :</strong> ${firstName} ${lastName}</p>
          <p><strong>Email :</strong> ${email}</p>
          <p><strong>Mutuelle :</strong> ${mutuelle}</p>
          <p><strong>Montant total :</strong> ${quote.total.toFixed(2)} €</p>
          <p><strong>Remboursement estimé :</strong> ${quote.reimbursed.toFixed(2)} €</p>
          <p><strong>Reste à charge :</strong> ${quote.remaining.toFixed(2)} €</p>
          <p><strong>Remarque :</strong> ${remark}</p>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  };

  return (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>Devis Sport & Santé</Text>

      <Text style={{ marginBottom: 5 }}>Prénom :</Text>
      <TextInput
        value={firstName}
        onChangeText={setFirstName}
        placeholder="Prénom"
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10 }}
      />

      <Text style={{ marginBottom: 5 }}>Nom :</Text>
      <TextInput
        value={lastName}
        onChangeText={setLastName}
        placeholder="Nom"
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10 }}
      />

      <Text style={{ marginBottom: 5 }}>Email :</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        placeholder="adresse@mail.com"
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 20 }}
      />

      <Text style={{ marginBottom: 5 }}>Mutuelle :</Text>
      <Picker selectedValue={mutuelle} onValueChange={setMutuelle} style={{ marginBottom: 20 }}>
        {MUTUELLE_NAMES.map((name) => (
          <Picker.Item key={name} label={name} value={name} />
        ))}
      </Picker>

      <Text>Montant total (€) :</Text>
      <TextInput
        keyboardType="decimal-pad"
        value={totalAmount}
        onChangeText={setTotalAmount}
        placeholder="Ex : 60.00"
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 10,
          marginBottom: 20,
        }}
      />

      <TouchableOpacity
        onPress={pickCertificat}
        style={{
          backgroundColor: '#eee',
          padding: 15,
          borderRadius: 10,
          marginBottom: 10,
          alignItems: 'center',
        }}
      >
        <Text>{certificat ? `📄 ${certificat.name}` : 'Joindre un certificat médical'}</Text>
      </TouchableOpacity>

      <Button title="Générer le devis" onPress={generateQuote} />

      {quote && (
        <View style={{ marginTop: 30, padding: 15, backgroundColor: '#f0f0f0', borderRadius: 10 }}>
          <Text style={{ fontSize: 18, marginBottom: 10, fontWeight: 'bold' }}>Détail du devis</Text>
          <Text>Nom : {firstName} {lastName}</Text>
          <Text>Email : {email}</Text>
          <Text>Montant total : {quote.total.toFixed(2)} €</Text>
          <Text>Remboursement ({mutuelle}) : {quote.reimbursed.toFixed(2)} €</Text>
          <Text style={{ marginTop: 10, fontWeight: 'bold' }}>
            Reste à charge : {quote.remaining.toFixed(2)} €
          </Text>
          {MUTUELLES_REMARKS[mutuelle] && (
            <Text style={{ marginTop: 15, fontStyle: 'italic' }}>
              Note : {MUTUELLES_REMARKS[mutuelle]}
            </Text>
          )}
          <View style={{ marginTop: 20 }}>
            <Button title="Exporter en PDF" onPress={handleExportPDF} />
          </View>
        </View>
      )}
    </ScrollView>
  );
}