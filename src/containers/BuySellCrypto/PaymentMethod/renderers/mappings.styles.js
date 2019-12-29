import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  manageAccountView: {
    height: 35,
    marginTop: 15,
    borderRadius: 5,
    backgroundColor: '#009B72',
  },
  manageAccountLabel: {
    textAlign: 'center',
    paddingTop: 7,
    fontWeight: '500',
    color: 'white',
    fontSize: 15,
  },
  bankAccountLabel: {
    color: 'black',
    fontSize: 17,
    fontWeight: '500',
    padding: 5,
    textAlign: 'center'
  },
  bankAccountContainer: {
    flex: 1,
    padding: 10,
  },
  coinItemLabel: {
    color: '#E9F1F7',
    marginLeft: 10,
  },
  coinItemContainer: {
    borderBottomWidth: 0,
  },
  formInput: {
    width: '100%',
    marginLeft: 0,
    borderWidth: 1,
    borderRadius: 7,
    borderColor: '#86939e',
    padding: 5,
  },
});
