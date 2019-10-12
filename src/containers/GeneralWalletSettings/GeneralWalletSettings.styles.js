import { StyleSheet } from "react-native";

export default styles = StyleSheet.create({
  root: {
    backgroundColor: "#232323",
    flex: 1,
  },
  formLabel: {
    textAlign:"left",
    marginRight: "auto",
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
    backgroundColor: "#009B72",
    marginTop: 15,
  },
  backButton: {
    height: 46,
    backgroundColor: "rgba(206,68,70,1)",
    marginTop: 15,
  },
  utxoVerificationDesc: {
    textAlign:"left",
    marginRight: "auto",
    color: "#2E86AB"
  },
  bottom: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 36
  },
});