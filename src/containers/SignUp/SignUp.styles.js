import { StyleSheet } from "react-native";
import Colors from '../../globals/colors';

export default styles = StyleSheet.create({
  root: {
    backgroundColor: Colors.tertiaryColor,
    flex: 1,
  },
  formLabel: {
    textAlign:"left",
    marginRight: "auto",
    color: Colors.quinaryColor,
  },
  keyGenLabel: {
    textAlign:"left",
    marginRight: "auto",
    color: "#2E86AB"
  },
  scanLabel: {
    textAlign:"left",
    marginRight: "auto",
    color: "#009B72"
  },
  formInput: {
    width: "100%",
  },
  valueContainer: {
    width: "85%",
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
    // color: "#E9F1F7",
    color: Colors.quaternaryColor,
    width: "85%",
    textAlign: "center"
  },
  wifInput: {
    width: "100%",
    // color: "#009B72"
    color: Colors.quaternaryColor,
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
  addAccountButton: {
    height: 46,
    backgroundColor: Colors.linkButtonColor,
    marginTop: 15,
    marginBottom: 40
  },
  cancelButton: {
    height: 46,
    backgroundColor: Colors.warningButtonColor,
    marginTop: 15,
  },
});