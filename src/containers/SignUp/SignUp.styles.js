import { StyleSheet } from "react-native";
import Colors from '../../globals/colors';

export default styles = StyleSheet.create({
  root: {
    backgroundColor: Colors.secondaryColor,
    flex: 1,
  },
  formLabel: {
    textAlign:"left",
    marginRight: "auto",
    color: Colors.quinaryColor,
    fontFamily: 'Avenir-Book',
    fontWeight: 'normal'
  },
  formInput: {
    width: "100%",
    fontFamily: 'Avenir-Medium',
    color: Colors.quinaryColor,
    fontSize: 15,
  },
  valueContainer: {
    width: "90%",
  },
  switchContainer: {
    alignItems: "flex-start",
    marginLeft: 18
  },
  wifLabel: {
    backgroundColor: "transparent",
    marginTop: 50,
    marginBottom: 8,
    paddingBottom: 0,
    fontSize: 22,
    color: Colors.quaternaryColor,
    width: "85%",
    textAlign: "center",
    fontFamily: 'Avenir-Medium',
  },
  wifInput: {
    width: "100%",
    color: Colors.quaternaryColor,
    fontSize: 13,
    fontFamily: 'Avenir-Medium',
  },
  buttonContainer: {
    width: "80%",
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  singleButtonContainer: {
    width: "75%",
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "center",
  },
  addAccountButton: {
    height: 46,
    backgroundColor: Colors.successButtonColor,
    marginTop: 15,
    marginBottom: 40,
    width: '60%'
  },
  cancelButton: {
    height: 46,
    backgroundColor: Colors.basicButtonColor,
    marginTop: 15,
    width: '35%'
  },
  scanSeedButton: {
    width: '90%',
    marginVertical: '2%',
    alignSelf: 'center',
    height: 50,
    backgroundColor: Colors.linkButtonColor,
    marginTop: 15,
  },  
  generatePassphraseButton: {
    width: '90%',
    marginVertical: '2%',
    alignSelf: 'center',
    height: 50,
    backgroundColor: Colors.successButtonColor
  },
  passphraseDisplayLabel: {
    textAlign: 'center',
    marginRight: "auto",
    color: Colors.quinaryColor,
    fontWeight: 'bold',
    alignSelf: 'center',
    fontSize: 13
  },
});