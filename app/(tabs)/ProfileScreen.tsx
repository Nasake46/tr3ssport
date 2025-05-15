import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, FontAwesome5, Feather } from '@expo/vector-icons';

export default function ProfileScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <Text style={styles.title}>Mon Compte</Text>
        <View style={styles.userInfo}>
          <Ionicons name="person-circle" size={60} color="#5D5A88" />
          <View>
            <Text style={styles.name}>Nathalie</Text>
            <Text style={styles.email}>Nathalie.S@gmail.com</Text>
          </View>
        </View>

        {/* Options */}
        <TouchableOpacity style={styles.option}>
          <Feather name="settings" size={20} color="#5D5A88" />
          <Text style={styles.optionText}>Paramètres du compte</Text>
        </TouchableOpacity>
        <View style={styles.line} />

        <TouchableOpacity style={styles.option}>
          <FontAwesome5 name="cc-visa" size={20} color="#5D5A88" />
          <Text style={styles.optionText}>Facturation</Text>
        </TouchableOpacity>
        <View style={styles.line} />

        <TouchableOpacity style={styles.option}>
          <Feather name="mail" size={20} color="#5D5A88" />
          <Text style={styles.optionText}>Contact</Text>
        </TouchableOpacity>
        <View style={styles.line} />

        <TouchableOpacity style={styles.option}>
          <Feather name="star" size={20} color="#5D5A88" />
          <Text style={styles.optionText}>Avis et recommandations</Text>
        </TouchableOpacity>
        <View style={styles.line} />

        <TouchableOpacity style={styles.option}>
          <Feather name="help-circle" size={20} color="#5D5A88" />
          <Text style={styles.optionText}>FAQ</Text>
        </TouchableOpacity>
        <View style={styles.line} />

        <View style={styles.option}>
          <Feather name="bell" size={20} color="#5D5A88" />
          <Text style={styles.optionText}>Notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#ccc', true: '#5D5A88' }}
          />
        </View>
        <View style={styles.line} />

        {/* Logout */}
        <TouchableOpacity style={styles.logout}>
          <Text style={styles.logoutText}>Déconnexion</Text>
          <Feather name="log-out" size={18} color="#5D5A88" style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        {/* Footer links (à propos, mentions...) */}
        <View style={styles.footerLinks}>
          <Text style={styles.footerText}>À propos</Text>
          <Text style={styles.footerText}>Mentions légales</Text>
          <Text style={styles.footerText}>Politique de confidentialité</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#5D5A88',
    marginBottom: 20,
    textAlign: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    gap: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5D5A88',
  },
  email: {
    color: '#888',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  optionText: {
    fontSize: 16,
    color: '#5D5A88',
    flex: 1,
  },
  line: {
    width: '100%',
    height: 1,
    backgroundColor: '#D4D2E3',
    marginBottom: 4,
  },
  logout: {
    marginTop: 30,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#5D5A88',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'center',
    alignItems: 'center',
  },
  logoutText: {
    color: '#5D5A88',
    fontWeight: 'bold',
    fontSize: 16,
  },
  footerLinks: {
    marginTop: 40,
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 13,
    color: '#999',
  },
});
