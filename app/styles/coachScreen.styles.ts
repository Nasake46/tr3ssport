import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
container: {
paddingBottom: 40,
backgroundColor: '#FFFFFF',
},
headerContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  paddingHorizontal: 20,
  paddingTop: 24,
  paddingBottom: 32,
  backgroundColor: '#fff',
  gap: 16,
},

leftColumn: {
  flex: 1,
  alignItems: 'center',
},

rightColumn: {
  flex: 1,
  alignItems: 'center',
},

avatar: {
  width: 100,
  height: 100,
  borderRadius: 50,
  marginBottom: 12,
},

name: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#04403A',
  textAlign: 'center',
},
level: {
  fontSize: 18,
  color: '#04403A',
},
seniority: {
  fontSize: 16,
  color: '#555',
},

price: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#04403A',
  marginBottom: 8,
},

reductionBox: {
  backgroundColor: '#E6E6E6',
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 6,
  marginBottom: 16,
  alignItems: 'center',
},

priceReduction: {
  fontSize: 16,
  fontWeight: '600',
  color: '#5D5A88',
},
reductionNote: {
  fontSize: 12,
  color: '#5D5A88',
},

primaryButton: {
  backgroundColor: '#04403A',
  paddingVertical: 10,
  paddingHorizontal: 20,
  borderRadius: 25,
  marginBottom: 8,
},
primaryButtonText: {
  color: '#fff',
  fontWeight: 'bold',
},

outlineButton: {
  borderColor: '#04403A',
  borderWidth: 1,
  paddingVertical: 10,
  paddingHorizontal: 20,
  borderRadius: 25,
},
outlineButtonText: {
  color: '#04403A',
  fontWeight: 'bold',
},
descriptionBlock: {
  paddingHorizontal: 20,
  paddingTop: 16,
  paddingBottom: 24,
},

descriptionText: {
  fontSize: 17,
  lineHeight: 22,
  color: '#04403A',
  marginBottom: 20,
},

sectionTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#04403A',
  marginBottom: 12,
},

badgeContainer: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},

badge: {
  backgroundColor: '#F4AF00',
  borderRadius: 20,
  paddingVertical: 6,
  paddingHorizontal: 12,
},

badgeText: {
  fontSize: 13,
  fontWeight: '600',
  color: '#04403A',
},

experienceBlock: {
  paddingHorizontal: 20,
  paddingBottom: 32,
},

experienceParagraph: {
  fontSize: 16,
  color: '#04403A',
  marginTop: 8,
  marginBottom: 20,
  lineHeight: 20,
  textAlign: 'left',
},

experienceItem: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 12,
},

iconDot: {
  width: 10,
  height: 10,
  borderRadius: 5,
  backgroundColor: '#04403A',
  marginRight: 12,
},

experienceText: {
  fontSize: 16,
  color: '#04403A',
  flex: 1,
},

ctaBlock: {
  paddingHorizontal: 20,
  alignItems: 'center',
},

ctaButton: {
  backgroundColor: '#04403A',
  paddingVertical: 14,
  paddingHorizontal: 28,
  borderRadius: 30,
},

ctaButtonText: {
  color: '#fff',
  fontSize: 15,
  fontWeight: 'bold',
},

zoneBlock: {
  paddingHorizontal: 20,
  paddingTop: 32,
},

mapContainer: {
  height: 200,
  marginTop: 24,
  marginHorizontal: 20,
  borderRadius: 12,
  overflow: 'hidden',
},

map: {
  ...StyleSheet.absoluteFillObject,
},

demoBlock: {
  backgroundColor: '#04403A',
  borderRadius: 16,
  margin: 20,
  padding: 20,
  marginTop: 40,
},

sectionLabel: {
  color: '#fff',
  fontSize: 12,
  letterSpacing: 1,
  marginBottom: 8,
},

demoTitle: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#fff',
  marginBottom: 16,
},

demoVideo: {
  backgroundColor: '#C2C2DA',
  height: 140,
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 16,
},

playIcon: {
  fontSize: 32,
  color: '#fff',
},

demoDescription: {
  fontSize: 13,
  color: '#fff',
  lineHeight: 18,
},

});    