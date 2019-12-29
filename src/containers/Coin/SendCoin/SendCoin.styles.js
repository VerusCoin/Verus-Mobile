import { StyleSheet } from "react-native";
import Colors from '../../../globals/colors';

export default styles = StyleSheet.create({
  root: {
    backgroundColor: Colors.secondaryColor,
    flex: 1,
  },
  formLabel: {
    textAlign:"left",
    marginRight: "auto",
    color: Colors.quinaryColor,
    fontFamily: 'Avenir',
  },
  formInput: {
    width: "100%",
    color: Colors.quinaryColor,
    fontFamily: 'Avenir',
  },
  valueContainer: {
    width: "85%",
  },
  coinBalanceLabel: {
    backgroundColor: "transparent",
    opacity: 0.89,
    marginTop: 15,
    marginBottom: 15,
    paddingBottom: 0,
    paddingTop: 0,
    fontSize: 35,
    textAlign: "center",
    color: Colors.quinaryColor,
    fontFamily: 'Avenir-Book',
  },
  sendLabel: {
    width: "100%",
    backgroundColor: Colors.tertiaryColor,
    opacity: 0.86,
    marginTop: 0,
    marginBottom: 0,
    paddingBottom: 15,
    paddingTop: 15,
    fontSize: 22,
    textAlign: "center",
    color: Colors.quinaryColor,
    fontFamily: 'Avenir-Black',
  },
  buttonContainer: {
    height: 45,
    width: 400,
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingBottom: 0,
    paddingTop: 0,
    marginBottom: 8,
    marginTop: 28
  },
  loadingContainer: {
    width: 400,
    backgroundColor: "transparent",
    justifyContent: "center",
    paddingBottom: 0,
    paddingTop: 0,
    marginBottom: 8,
    marginTop: 28
  },
  sendBtn: {
    width: '80%',
    height: 45,
    backgroundColor: Colors.successButtonColor,
    opacity: 1,
    marginTop: 0,
    marginBottom: 0
  },
  loadingText: {
    backgroundColor: "transparent",
    opacity: 0.86,
    fontSize: 22,
    textAlign: "center",
    color: "#E9F1F7"
  },
  errorText: {
    backgroundColor: "transparent",
    opacity: 0.86,
    fontSize: 22,
    textAlign: "center",
    color: "rgba(206,68,70,1)"
  },
});