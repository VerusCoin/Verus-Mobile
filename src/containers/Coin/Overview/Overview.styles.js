import { StyleSheet } from "react-native";

export default styles = StyleSheet.create({
  root: {
    backgroundColor: "#232323",
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
    fontSize: 25,
    textAlign: "center",
    color: "#E9F1F7",
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
    backgroundColor: "#E9F1F7",
    opacity: 0.86,
    marginTop: 0,
    marginBottom: 0,
    paddingBottom: 15,
    paddingTop: 15,
    fontSize: 22,
    textAlign: "center",
    color: "#232323"
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
