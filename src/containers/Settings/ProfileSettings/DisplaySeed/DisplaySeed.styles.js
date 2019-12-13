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
    fontFamily: 'Avenir-Book'
  },
  formInput: {
    width: "100%",
    fontFamily: 'Avenir-Book'
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
    fontFamily: 'Avenir-Black'
  },
  wifInput: {
    width: "90%",
    color: Colors.successButtonColor,
    textAlign: "center",
    alignSelf: 'center',
    fontFamily: 'Avenir-Book'
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