import { StyleSheet } from "react-native";

export default styles = StyleSheet.create({
  root: {
    backgroundColor: "#232323",
    flex: 1,
    alignItems: "center"
  },
  loadingRoot: {
    backgroundColor: "#232323",
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  infoBox: {
    flex: 1,
    flexDirection: 'column',
    alignSelf: 'center',
    justifyContent: 'flex-start',
    width: "85%",
  },
  infoRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: 10
  },
  infoText: {
    fontSize: 16,
    color: "#E9F1F7"
  },
  addressText: {
    fontSize: 16,
    color: "#E9F1F7",
    width: "65%",
    textAlign: "right"
  },
  rect: {
    height: 1,
    width: 360,
    backgroundColor: "rgb(230,230,230)"
  },
  loadingLabel: {
    backgroundColor: "transparent",
    opacity: 0.86,
    marginTop: 15,
    marginBottom: 15,
    fontSize: 22,
    textAlign: "center",
    color: "#E9F1F7"
  },
  errorLabel: {
    backgroundColor: "transparent",
    opacity: 0.86,
    marginTop: 15,
    marginBottom: 15,
    fontSize: 22,
    textAlign: "center",
    color: "rgba(206,68,70,1)"
  },
  verifiedLabel: {
    backgroundColor: "transparent",
    opacity: 0.86,
    marginTop: 15,
    marginBottom: 15,
    fontSize: 22,
    textAlign: "center",
    color: "rgba(68,206,147,1)"
  },
  sendBtn: {
    width: 140,
    height: 45,
    backgroundColor: "#009B72",
    opacity: 1,
    marginTop: 0,
    marginBottom: 0
  },
  explBtn: {
    width: 140,
    height: 45,
    backgroundColor: "#EDAE49",
    opacity: 1,
    marginTop: 0,
    marginBottom: 0
  },
  homeBtn: {
    width: 140,
    height: 45,
    backgroundColor: "#2E86AB",
    opacity: 1,
    marginTop: 0,
    marginBottom: 0
  },
  buttonContainer: {
    height: 54,
    width: "100%",
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingBottom: 0,
    paddingTop: 5,
    marginBottom: 8,
    marginTop: 8,
    left: "0%"
  },
});