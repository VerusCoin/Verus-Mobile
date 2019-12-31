import { StyleSheet } from "react-native"
import Colors from '../../../globals/colors';

export default styles = StyleSheet.create({
  root: {
    backgroundColor: Colors.secondaryColor,
    flex: 1,
  },
  formLabel: {
    textAlign:"left",
    marginRight: "auto",
    fontFamily: 'Avenir-Black',
    color: Colors.quaternaryColor,
    fontSize: 20,
    marginBottom: 20
  },
  keyGenLabel: {
    textAlign:"left",
    marginRight: "auto",
    color: "#2E86AB"
  },
  formInput: {
    width: "100%",
  },
  valueContainer: {
    width: "85%",
  },
  mainHeader: {
    backgroundColor: "transparent",
    marginTop: 30,
    fontSize: 22,
    color: "#E9F1F7",
    width: "85%",
    textAlign: "center"
  },
  wifInput: {
    width: "100%",
    color: "#009B72"
  },
  buttonContainer: {
    width: "75%",
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
  saveChangesButton: {
    height: 46,
    backgroundColor: Colors.successButtonColor,
    marginTop: 15,
    width: '60%',
  },
  clearCacheButton: {
    height: 46,
    backgroundColor: "#2E86AB",
    marginTop: 25,
    marginBottom: 25
  },
  backButton: {
    height: 46,
    backgroundColor: Colors.basicButtonColor,
    marginTop: 15,
    width: '35%'
  },
  utxoVerificationDesc: {
    textAlign:"left",
    marginRight: "auto",
    fontFamily: 'Avenir-Book',
    fontWeight: 'normal',
  },
  bottom: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 36
  }
});