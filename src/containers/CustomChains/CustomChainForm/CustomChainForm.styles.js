import { StyleSheet } from "react-native"

export default styles = StyleSheet.create({
  root: {
    backgroundColor: "#232323",
    flex: 1,
  },
  mainLabel: {
    backgroundColor: "transparent",
    fontSize: 22,
    color: "#E9F1F7",
    textAlign: "center",
    marginTop: 25
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
  addCoinButton: {
    height: 46,
    backgroundColor: "#2E86AB",
    marginTop: 15,
    marginBottom: 40
  },
  cancelButton: {
    height: 46,
    backgroundColor: "rgba(206,68,70,1)",
    marginTop: 15,
  },
  infoLink: {
    color: "#2E86AB"
  },
  addServerBtn: {
    textAlign:"left",
    marginRight: "auto",
    color: "#2E86AB"
  },
  serverItemContainer: {
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
    alignSelf: "center",
    //borderWidth: 1,
    //borderColor: "green",
    width: "100%"
  },
  serversContainer: {
    justifyContent: "center", 
    //borderWidth: 1,
    width: "100%",
    //borderColor: "red"
  },
  serverInput: { 
    width: "100%",
  },
  serverInputContainer: {
    marginHorizontal: 0,
    flex: 1,
    //borderWidth: 1,
    //borderColor: "blue",
    //width: "100%",
  },
  labelContainer: {
    width: "94%",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  infoBtn: {
    marginRight: "auto",
    color: "#2E86AB",
    borderRadius: 10,
    backgroundColor: "#E9F1F7",
    paddingLeft: 5,
    paddingRight: 5,
    overflow: "hidden"
  },
  removeServerBtn: {
    marginRight: 15
  }
});