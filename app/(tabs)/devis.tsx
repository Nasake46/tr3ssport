import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Picker } from '@react-native-picker/picker';

const COLORS = {
  bg: '#FFFFFF',
  text: '#0F473C',
  sub: '#3D6B60',
  primary: '#0E6B5A',
  chip: '#F4AF00',
  card: '#F2F4F5',
  line: '#E5E7EB',
};

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
  'MMA': 0,
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
      alert('Veuillez remplir vos informations personnelles.');
      return;
    }
    if (isNaN(total) || total <= 0) {
      alert('Veuillez entrer un montant total valide.');
      return;
    }
    if (!certificat) {
      alert('Veuillez joindre un certificat médical.');
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
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg, padding: 20 }}>
      <Text style={s.title}>Devis Sport & Santé</Text>

      <Text style={s.label}>Prénom :</Text>
      <TextInput
        value={firstName}
        onChangeText={setFirstName}
        placeholder="Prénom"
        style={s.input}
      />

      <Text style={s.label}>Nom :</Text>
      <TextInput
        value={lastName}
        onChangeText={setLastName}
        placeholder="Nom"
        style={s.input}
      />

      <Text style={s.label}>Email :</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        placeholder="adresse@mail.com"
        style={s.input}
      />

      <Text style={s.label}>Mutuelle :</Text>
      <View style={s.pickerBox}>
        <Picker selectedValue={mutuelle} onValueChange={setMutuelle} style={s.picker}>
          {MUTUELLE_NAMES.map((name) => (
            <Picker.Item key={name} label={name} value={name} />
          ))}
        </Picker>
      </View>

      <Text style={s.label}>Montant total (€) :</Text>
      <TextInput
        keyboardType="decimal-pad"
        value={totalAmount}
        onChangeText={setTotalAmount}
        placeholder="Ex : 60.00"
        style={s.input}
      />

      <TouchableOpacity onPress={pickCertificat} style={s.uploadBtn}>
        <Text style={s.uploadBtnTxt}>
          {certificat ? `📄 ${certificat.name}` : 'Joindre un certificat médical'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.btnPrimary} onPress={generateQuote}>
        <Text style={s.btnPrimaryTxt}>Générer le devis</Text>
      </TouchableOpacity>

      {quote && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Détail du devis</Text>
          <Text>Nom : {firstName} {lastName}</Text>
          <Text>Email : {email}</Text>
          <Text>Montant total : {quote.total.toFixed(2)} €</Text>
          <Text>Remboursement ({mutuelle}) : {quote.reimbursed.toFixed(2)} €</Text>
          <Text style={{ marginTop: 8, fontWeight: 'bold' }}>
            Reste à charge : {quote.remaining.toFixed(2)} €
          </Text>
          {MUTUELLES_REMARKS[mutuelle] && (
            <Text style={{ marginTop: 12, fontStyle: 'italic' }}>
              Note : {MUTUELLES_REMARKS[mutuelle]}
            </Text>
          )}
          <TouchableOpacity style={[s.btnPrimary, { marginTop: 16 }]} onPress={handleExportPDF}>
            <Text style={s.btnPrimaryTxt}>Exporter en PDF</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 20 },
  label: { marginBottom: 6, color: COLORS.sub, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    backgroundColor: '#fff',
  },
  pickerBox: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    marginBottom: 14,
    backgroundColor: '#fff',
  },
  picker: { width: '100%', height: 50 },
  uploadBtn: {
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadBtnTxt: { color: COLORS.text, fontWeight: '600' },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: 'center',
    marginBottom: 20,
  },
  btnPrimaryTxt: { color: '#fff', fontWeight: '700' },
  card: {
    marginTop: 20,
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
});
