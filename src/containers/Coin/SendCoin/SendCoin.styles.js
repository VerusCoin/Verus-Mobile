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
  formInput: {
    width: "100%",
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
    fontSize: 25,
    textAlign: "center",
    color: "#009B72",
    width: 359,
  },
  sendLabel: {
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
    width: 104,
    height: 45,
    backgroundColor: "#009B72",
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