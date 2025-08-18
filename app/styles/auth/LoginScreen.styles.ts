import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7F3',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
  },
  formContainer: {
    backgroundColor: '#04403A',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 24,
  },
  input: {
    height: 48,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingHorizontal: 16,
    color: '#000',
    marginBottom: 16,
  },
  forgot: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#F4AF00',
    fontSize: 12,
  },
  loginButton: {
    backgroundColor: '#F4AF00',
    paddingVertical: 14,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#F4AF00',
    paddingVertical: 14,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  outlineButtonText: {
    color: '#F4AF00',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bottomSection: {
    alignItems: 'center',
    width: '85%',
    marginTop: 24,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#04403A',
  },
  or: {
    marginHorizontal: 8,
    color: '#04403A',
    fontSize: 12,
  },
  socials: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  social: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#04403A',
  },
  coachLink: {
    fontSize: 14,
    color: '#F4AF00',
    textDecorationLine: 'underline',
  },
  footer: {
    backgroundColor: '#04403A',
    paddingVertical: 32,
    alignItems: 'center',
    width: '100%',
  },
  footerTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  footerText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});