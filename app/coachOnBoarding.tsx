import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  TextInput
} from 'react-native';

export default function CoachOnboarding() {
  const [step, setStep] = useState(1);
  const [adminStatus, setAdminStatus] = useState('');


  const handleNext = () => {
    setStep(step + 1); // passera à l’étape 2 plus tard
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
            <View style={styles.stepContainer}>
            <Text style={styles.title}>
                Bienvenue sur votre{'\n'}application Tr3ssport
            </Text>
            <Image
                source={require('@/assets/images/bigLogo.png')}
                style={styles.logo}
            />
            <TouchableOpacity style={styles.button} onPress={handleNext}>
                <Text style={styles.buttonText}>Compléter mon profil</Text>
            </TouchableOpacity>
            </View>
        );
case 2:
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.pageTitle}>Votre profil</Text>
      <Text style={styles.pageSubtext}>
        Cras tincidunt lobortis feugiat vivamus at morbi leo urna molestie atole elementum eu facilisis faucibus interdum posuere.
      </Text>

      <Text style={styles.subtitle}>Question Administrative 1</Text>

      {['lobortis feugiat vivamus at morbi leo', 'lobortis feugiat vivamus at morbi leo', 'lobortis feugiat vivamus at morbi leo'].map((text, i) => (
        <TouchableOpacity key={i} style={styles.optionButton}>
          <Text style={styles.optionText}>{text}</Text>
        </TouchableOpacity>
      ))}

      <TextInput
        style={styles.input}
        placeholder="Saisir ma réponse..."
        placeholderTextColor="#999"
      />

      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <Text style={styles.buttonText}>Valider</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipContainer} onPress={handleNext}>
        <Text style={styles.skipRight}>
          Passer cette étape <Text style={{ fontSize: 18 }}>➡️</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );



      // Étapes suivantes à venir…
      default:
        return null;
    }
  };

  return <SafeAreaView style={styles.container}>{renderStep()}</SafeAreaView>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EB',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  stepContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 310,
    height: 310,
    resizeMode: 'contain',
    marginBottom: 32,
  },
title: {
  fontSize: 28,
  color: '#0D0C2B',
  fontWeight: '600',
  textAlign: 'center',
  marginBottom: 24,
  lineHeight: 28,
},

  button: {
    backgroundColor: '#0D0C2B',
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
pageTitle: {
  fontSize: 22,
  fontWeight: 'bold',
  color: '#0D0C2B',
  textAlign: 'center',
  marginBottom: 8,
},

pageSubtext: {
  fontSize: 13,
  color: '#666',
  textAlign: 'center',
  marginBottom: 24,
  lineHeight: 18,
  paddingHorizontal: 10,
},

subtitle: {
  fontSize: 18,
  fontWeight: '600',
  color: '#0D0C2B',
  textAlign: 'left',
  alignSelf: 'flex-start',
  marginBottom: 16,
},

optionButton: {
  backgroundColor: '#fff',
  borderRadius: 16,
  paddingVertical: 14,
  paddingHorizontal: 20,
  marginBottom: 12,
  width: '100%',
  borderWidth: 1,
  borderColor: '#ccc',
},

optionText: {
  color: '#0D0C2B',
  fontSize: 14,
},

skipContainer: {
  marginTop: 16,
  width: '100%',
  alignItems: 'flex-end',
},

skipRight: {
  fontSize: 14,
  color: '#0D0C2B',
  textDecorationLine: 'underline',
},
input: {
  backgroundColor: '#fff',
  borderRadius: 25,
  height: 48,
  paddingHorizontal: 16,
  color: '#000',
  marginBottom: 16,
  width: '100%',
  borderWidth: 1,
  borderColor: '#ccc',
},

});
