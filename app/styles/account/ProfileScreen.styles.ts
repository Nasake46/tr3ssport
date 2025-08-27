import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#04403A',
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
    color: '#04403A',
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
    color: '#04403A',
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
    borderColor: '#04403A',
    backgroundColor: '#04403A',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'center',
    alignItems: 'center',
  },
  logoutText: {
    color: 'white',
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
