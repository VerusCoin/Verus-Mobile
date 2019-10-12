import { StyleSheet } from "react-native";

export default styles = StyleSheet.create({
  root: {
    backgroundColor: "#232323",
    flex: 1,
    alignItems: "center"
  },
  coinAddedBox: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: "center"
  },
  titleLabel: {
    backgroundColor: "transparent",
    opacity: 0.86,
    marginTop: 5,
    marginBottom: 3,
    paddingBottom: 0,
    fontSize: 22,
    textAlign: "center",
    color: "#E9F1F7",
    width: 245,
  },

  fullName: {
    backgroundColor: "transparent",
    opacity: 0.86,
    marginTop: 0,
    marginBottom: 10,
    paddingBottom: 0,
    fontSize: 20,
    textAlign: "center",
    color: "#E9F1F7",
    width: 245,
  },

  description: {
    backgroundColor: "transparent",
    opacity: 0.86,
    marginTop: 0,
    marginBottom: 0,
    paddingBottom: 0,
    fontSize: 22,
    textAlign: "center",
    color: "#E9F1F7",
    width: 300,
  },

  coinAddedLabel: {
    backgroundColor: "transparent",
    opacity: 0.86,
    fontSize: 22,
    marginRight: 5,
    color: "#50C3A5",
  },
  rect: {
    height: 1,
    width: "100%",
    backgroundColor: "rgb(230,230,230)"
  },
  addCoinBtn: {
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
  receiveBtn: {
    width: 222.32,
    height: 45,
    backgroundColor: "rgba(29,145,95,1)",
    opacity: 1,
    marginTop: 0,
    marginBottom: 0
  },
  homeLabel: {
    width: 244,
    backgroundColor: "transparent",
    opacity: 0.86,
    marginTop: 5,
    marginBottom: 15,
    paddingBottom: 0,
    fontSize: 22,
    textAlign: "center",
    color: "#E9F1F7"
  }
});