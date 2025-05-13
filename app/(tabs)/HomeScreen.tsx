import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CarouselArticles from '../../components/CarousselArticle';


const HomeScreen = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View className='header' style={styles.div_header}>
        <Text style={styles.text_h1}>Mon tableau de bord</Text>
        <TouchableOpacity>
          <View className="profil">
            <Ionicons name="person" size={24} color="#333" />
            <Text style={styles.text_base}>Nathalie Marina</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Top buttons */}
      <View className='top_buttons' style={styles.div_head_button}>
        <TouchableOpacity>
          <View style={styles.top_buttons}>
            <Image source={require('../../assets/images/MyCoach.png')} style={{ width: 40, height: 40 }} />
            <Text style={styles.text_base}>Mon Coach</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity>
          <View style={styles.top_buttons}>
            <Image source={require('../../assets/images/Programm.png')} style={{ width: 40, height: 40 }}/>
            <Text style={styles.text_base}>Programme</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity>
          <View style={styles.top_buttons}>
            <Image source={require('../../assets/images/follow.png')} style={{ width: 40, height: 40 }}/>
            <Text style={styles.text_base}>Suivi</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Sessions */}
      <View className="sessions" style={styles.sessions}>
          <View>
            <Text style={styles.text_h1}>Séances</Text>
            <Text style={styles.text_base}>Lorem ipsum dolor sit, amet culpa.</Text>
          </View>
          <TouchableOpacity style={styles.button} onPress={() => Alert.alert('Consulter pressed')}>
            <Text style={styles.text_base}>Consulter</Text>
          </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.big_session} onPress={() => Alert.alert('Séances pressed')}>
        <Text style={styles.text_h1}>Séances à venir</Text>
        <Text>Lorem ipsum dolor sit, amet consectetur adipisicing elit</Text>
      </TouchableOpacity>

      {/* Other links */}
      <View className="other_links" style={styles.other_links}>
        <TouchableOpacity onPress={() => Alert.alert('Programme pressed')}>
          <View style={styles.programm}>
            <View style={styles.programmLogo}>
              <Image source={require('../../assets/images/Programme2.png')} style={{ width: 40, height: 40 }}></Image>
              <Text style={styles.text_base}>Programme</Text>
            </View>
            <Text>Sur mesure</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.line}></View>
        <TouchableOpacity onPress={() => Alert.alert('Follow pressed')}>
          <View style={styles.programmLogo}>
            <Image source={require('../../assets/images/follow.png')} style={{ width: 40, height: 40 }}></Image>
            <Text style={styles.text_base}>Suivi et Progrès</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.line}></View>
        <TouchableOpacity onPress={() => Alert.alert('Dossier pressed')}>
          <View style={styles.programmLogo}>
            <Image source={require('../../assets/images/healthFolder.png')} style={{ width: 40, height: 40 }}></Image>
            <Text style={styles.text_base}>Mon dossier de bilan</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.line}></View>
        <TouchableOpacity onPress={() => Alert.alert('Partenaires pressed')}>
        <View style={styles.programmLogo}>
            <Image source={require('../../assets/images/healthPartner.png')} style={{ width: 40, height: 40 }}></Image>
            <Text style={styles.text_base}>Partenaires de santé</Text>
        </View>
        </TouchableOpacity>
        <View style={styles.line}></View>
      </View>

      {/* Health article */}
      {/* <CarouselArticles /> */}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  text_h1: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5D5A88',
  },
  text_base: {
    color: '#5D5A88',
  },
  div_header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 20,
    padding: "3%",
  },
  div_head_button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: "3%",
    marginBottom: "3%",
  },
  top_buttons: {
    borderWidth: 1,
    borderRadius: 10,
    width: 120,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: "3%",
  },
  button: {
    borderWidth: 1,
    borderRadius: 10,
    width: 70,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  big_session: {
    borderWidth: 1,
    borderRadius: 10,
    width: '90%',
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 20,
  },
  other_links: {
    padding: '2%',
    marginTop: 10,
  },
  programm : {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: 10,
    width: '90%',
  },
  programmLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    marginTop: 10,
  },
  line: {
    width: '90%',
    height: 1,
    backgroundColor: '#D4D2E3',
    marginTop: 10,
    alignSelf: 'center',
  }
});

export default HomeScreen;
