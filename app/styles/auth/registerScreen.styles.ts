import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EB', // Fond beige général
  },
  scroll: {
    padding: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0D0C2B',
    textAlign: 'center',
    marginBottom: 24,
  },
  form: {
    backgroundColor: '#0D0C2B', // Bloc formulaire
    borderRadius: 20,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#fff',
    marginBottom: 4,
    fontSize: 14,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 25,
    height: 48,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  submitButton: {
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  submitText: {
    color: '#0D0C2B',
    fontWeight: 'bold',
    fontSize: 16,
  },
});