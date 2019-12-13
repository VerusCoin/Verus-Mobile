import { StyleSheet } from "react-native";
import Colors from '../../../../globals/colors';

export default styles = StyleSheet.create({
  root: {
    backgroundColor: Colors.secondaryColor,
    flex: 1,
  },
  formLabel: {
    textAlign:"left",
    marginRight: "auto",
  },
  formInput: {
    width: "100%",
  },
  valueContainer: {
    width: "85%",
  },
  wifLabel: {
    backgroundColor: "transparent",
    marginTop: 20,
    marginBottom: 8,
    paddingBottom: '10%',
    fontSize: 22,
    color: Colors.quaternaryColor,
    width: "85%",
    textAlign: "center",
    fontWeight: 'bold'
  },
  wifInput: {
    width: "80%",
    color: Colors.successButtonColor,
    textAlign: "center",
    backgroundColor: Colors.tertiaryColor,
    alignSelf: 'center'
  },
  buttonContainer: {
    width: "65%",
    backgroundColor: "transparent",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  addAccountButton: {
    height: 46,
    backgroundColor: Colors.primaryColor,
    marginTop: 15,
    marginBottom: 40
  },
  cancelButton: {
    height: 46,
    backgroundColor: Colors.basicButtonColor,
    marginTop: 15,
  },
});