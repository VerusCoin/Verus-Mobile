import { StyleSheet } from "react-native";
import Colors from '../../../globals/colors';

export default styles = StyleSheet.create({
  root: {
    backgroundColor: Colors.secondaryColor,
    flex: 1,
    alignItems: "center"
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
    color: Colors.quaternaryColor,
    fontFamily: 'Avenir',
  },
  connectionErrorLabel: {
    backgroundColor: "transparent",
    opacity: 0.89,
    marginTop: 15,
    marginBottom: 15,
    paddingBottom: 0,
    paddingTop: 0,
    fontSize: 25,
    textAlign: "center",
    color: "rgba(206,68,70,1)",
  },
  spinner: {
    marginTop: 13,
    marginBottom: 14,
  },
  transactionLabel: {
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
  headerContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  transactionList: {
    width: "100%",
  },
  transactionItemLabel: {
    color: "#E9F1F7",
    marginLeft: 10,
  },
});
