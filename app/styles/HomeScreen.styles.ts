import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  text_h1: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#04403A',
  },
  text_base: {
    color: '#04403A',
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
    backgroundColor: 'rgba(4, 64, 58, 0.15)'
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
    backgroundColor: '#04403A',
    marginTop: 10,
    alignSelf: 'center',
  }
});