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
  wifLabel: {
    backgroundColor: "transparent",
    marginTop: 50,
    marginBottom: 8,
    paddingBottom: 0,
    fontSize: 22,
    color: "#E9F1F7",
    width: "85%",
    textAlign: "center"
  },
  wifInput: {
    width: "100%",
    color: "#009B72"
  },
  singleButtonContainer: {
    width: "75%",
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "center",
  },
  labelContainer: {
    width: "94%",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  addAccountButton: {
    height: 46,
    backgroundColor: "#2E86AB",
    marginTop: 15,
    marginBottom: 40
  },
  dropDownContainer: {
    width: "85%",
    alignItems: "center"
  },
  dropDown: {
    width: "90%",
    marginBottom: 0,
    marginTop: 0,
  },
  swapInputTypeBtn: {
    textAlign:"left",
    marginRight: "auto",
    color: "#2E86AB"
  },
  swapInputTypeBtnBordered: {
    marginRight: "auto",
    color: "#2E86AB",
    borderRadius: 10,
    backgroundColor: "#E9F1F7",
    paddingLeft: 5,
    paddingRight: 5,
    overflow: "hidden"
  },
});
