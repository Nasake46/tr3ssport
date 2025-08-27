import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0C2B',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 32,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 16,
    color: '#fff',
    marginBottom: 16,
  },
  buttonGroup: {
    marginTop: 24, // ⬅️ espace entre inputs et boutons
    gap: 12,
  },
  loginButton: {
    backgroundColor: '#E5E2DA',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#0D0C2B',
    fontWeight: 'bold',
    fontSize: 16,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#fff',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
  },
  outlineButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  footer: {
    backgroundColor: '#E5E2DA',
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerTitle: {
    color: '#0D0C2B',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  footerText: {
    color: '#0D0C2B',
    fontSize: 12,
  },
});