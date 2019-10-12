import { StyleSheet } from "react-native";

export default styles = StyleSheet.create({
  root: {
    backgroundColor: "#232323",
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center"
  },
  loginLabel: {
    backgroundColor: "transparent",
    fontSize: 22,
    color: "#E9F1F7",
    width: "85%",
    textAlign: "center"
  },
  formLabel: {
    textAlign:"left",
    marginRight: "auto",
  },
  valueContainer: {
    width: "85%",
  },
  dropDownContainer: {
    width: "85%",
    alignItems: "center"
  },
  formInput: {
    width: "100%",
  },
  dropDown: {
    width: "90%",
    marginBottom: 0,
    marginTop: 0,
  },
  unlockButton: {
    height: 45,
    width: 130,
    marginBottom: 0,
    marginTop: 35,
    backgroundColor: "#009B72",
  },
  addUserButton: {
    height: 45,
    width: 130,
    marginBottom: 100,
    marginTop: 10,
    backgroundColor: "#2E86AB",
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
  loadingText: {
    backgroundColor: "transparent",
    opacity: 0.86,
    fontSize: 22,
    textAlign: "center",
    color: "#E9F1F7"
  },
});
