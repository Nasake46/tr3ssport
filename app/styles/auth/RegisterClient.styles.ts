import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7F3',
  },
  scroll: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#04403A',
    marginBottom: 24,
  },
  formCard: {
    backgroundColor: '#E6E6E6',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 32,
    width: '100%',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#04403A',
    marginBottom: 10,
    marginTop: 5,
  },
  input: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 20,
    fontSize: 16,
    color: '#000',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#04403A',
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  error: {
    color: 'red',
    marginBottom: 16,
  },
});
