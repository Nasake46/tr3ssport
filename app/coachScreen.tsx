import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { styles } from '../app/styles/coachScreen.styles';
import MapView, { Marker } from 'react-native-maps';
import * as Linking from 'expo-linking';
import CarouselRecommandations from '@/components/CarouselRecommandations';


export default function CoachScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* HEADER COACH */}
        <View style={styles.headerContainer}>
        {/* Colonne gauche : image + infos coach */}
        <View style={styles.leftColumn}>
            <Image
            source={require('@/assets/images/coachtest.jpg')}
            style={styles.avatar}
            />
            <Text style={styles.name}>John Doe</Text>
            <Text style={styles.level}>Expert 🏅</Text>
            <Text style={styles.seniority}>3 ans d’ancienneté</Text>
        </View>

        {/* Colonne droite : prix + contact */}
        <View style={styles.rightColumn}>
            <Text style={styles.price}>78 € / h</Text>
            <View style={styles.reductionBox}>
            <Text style={styles.priceReduction}>39 €</Text>
            <Text style={styles.reductionNote}>Après déduction d’impôts</Text>
            </View>

            <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Contacter</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.outlineButton}>
            <Text style={styles.outlineButtonText}>Définir comme coach</Text>
            </TouchableOpacity>
        </View>
        </View>
        {/* Description */}
        <View style={styles.descriptionBlock}>
            <Text style={styles.descriptionText}>
                Coach Sportif spécialisé en sport santé, fait de l’accompagnement sur mesure pour les personnes à mobilité réduite.
            </Text>

            <Text style={styles.sectionTitle}>SPÉCIALITÉS</Text>

            <View style={styles.badgeContainer}>
                <View style={styles.badge}>
                <Text style={styles.badgeText}>Renforcement musculaire</Text>
                </View>
                <View style={styles.badge}>
                <Text style={styles.badgeText}>Cardio</Text>
                </View>
                <View style={styles.badge}>
                <Text style={styles.badgeText}>Souplesse</Text>
                </View>
            </View>
        </View>
        {/* Expérience */}
        <View style={styles.experienceBlock}>
            <Text style={styles.sectionTitle}>EXPÉRIENCE</Text>

            <Text style={styles.experienceParagraph}>
                Lorem ipsum dolor sit amet consectetur adipiscing elit mattis sit phasellus mollis sit aliquam sit nullam. Cras tincidunt lobortis feugiat vivamus at morbi leo urna molestie atole elementum eu facilisis faucibus interdum posuere.
            </Text>

            <View style={styles.experienceItem}>
                <View style={styles.iconDot} />
                <Text style={styles.experienceText}>Diplômé APA</Text>
            </View>

            <View style={styles.experienceItem}>
                <View style={styles.iconDot} />
                <Text style={styles.experienceText}>Cours à domicile ou dans un lieu fixé</Text>
            </View>

            <View style={styles.experienceItem}>
                <View style={styles.iconDot} />
                <Text style={styles.experienceText}>Cours à distance selon profil</Text>
            </View>

            <View style={styles.experienceItem}>
                <View style={styles.iconDot} />
                <Text style={styles.experienceText}>Agrément service à la personne</Text>
            </View>

            <View style={styles.experienceItem}>
                <View style={styles.iconDot} />
                <Text style={styles.experienceText}>Première séance de 30 min offerte</Text>
            </View>
        </View>
        {/* Call to Action */}
        <View style={styles.ctaBlock}>
            <TouchableOpacity style={styles.ctaButton}>
                <Text style={styles.ctaButtonText}>Réserver une séance d’essai</Text>
            </TouchableOpacity>
        </View>
        {/* Zone de déplacement */}
        <View style={styles.zoneBlock}>
        <Text style={styles.sectionTitle}>Périmètre de déplacement</Text>

        <View style={styles.badgeContainer}>
            <View style={styles.badge}><Text style={styles.badgeText}>Hauts-de-seine</Text></View>
            <View style={styles.badge}><Text style={styles.badgeText}>Paris</Text></View>
            <View style={styles.badge}><Text style={styles.badgeText}>Val-de-marne</Text></View>
            <View style={styles.badge}><Text style={styles.badgeText}>Val-d’Oise</Text></View>
        </View>
        </View>
        {/* Map */}
        <View style={styles.mapContainer}>
            <MapView
                style={styles.map}
                initialRegion={{
                latitude: 48.8566, // Paris
                longitude: 2.3522,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
                }}
            >
                <Marker
                coordinate={{ latitude: 48.8566, longitude: 2.3522 }}
                title="Zone d’intervention"
                description="Paris et alentours"
                />
            </MapView>
        </View>

        <View style={styles.demoBlock}>
            <Text style={styles.sectionLabel}>SUR MESURE</Text>
            <Text style={styles.demoTitle}>Démo séance type</Text>

            <TouchableOpacity
                style={styles.demoVideo}
                onPress={() => Linking.openURL('https://youtu.be/wvlztaJYKYI?si=Utv8YbkokleQcaH3')}
            >
                <Text style={styles.playIcon}>▶️</Text>
            </TouchableOpacity>

            <Text style={styles.demoDescription}>
                Lorem ipsum dolor sit amet consectetur adipiscing eli mattis sit phasellus mollis sit
            </Text>
        </View>

        <CarouselRecommandations />

    </ScrollView>
  );
}