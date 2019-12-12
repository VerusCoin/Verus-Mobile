import { StyleSheet } from "react-native";
import Colors from '../../globals/colors';

export default styles = StyleSheet.create({
  root: {
    backgroundColor: Colors.secondaryColor,
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
    marginTop: 5,
    marginBottom: 3,
    paddingBottom: 0,
    fontSize: 22,
    textAlign: "center",
    color: Colors.quaternaryColor,
    fontWeight: '600'
  },

  fullName: {
    backgroundColor: "transparent",
    opacity: 0.86,
    marginTop: 0,
    marginBottom: 10,
    paddingBottom: 0,
    fontSize: 20,
    textAlign: "center",
    color: Colors.quaternaryColor,
  },

  description: {
    backgroundColor: "transparent",
    opacity: 0.86,
    marginTop: 0,
    marginBottom: 0,
    paddingBottom: 0,
    fontSize: 22,
    textAlign: "center",
    color: Colors.quaternaryColor,
    width: 300,
  },

  coinAddedLabel: {
    backgroundColor: "transparent",
    opacity: 0.86,
    fontSize: 22,
    marginRight: 5,
    color: Colors.successButtonColor,
  },
  rect: {
    height: 1,
    width: "85%",
    backgroundColor: Colors.quaternaryColor,
    marginVertical: '3%'
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
    width: '85%',
    height: 45,
    backgroundColor: Colors.infoButtonColor,
    marginTop: 0,
    marginBottom: 0
  },
  homeLabel: {
    backgroundColor: "transparent",
    opacity: 0.86,
    marginTop: 5,
    marginBottom: 15,
    paddingBottom: 0,
    fontSize: 25,
    textAlign: "center",
    color: Colors.quaternaryColor,
    fontWeight: 'bold'
  }
});