import { StyleSheet } from "react-native";
import Colors from '../../globals/colors';

export default styles = StyleSheet.create({
  root: {
    backgroundColor: Colors.secondaryColor,
    flex: 1,
    alignItems: "center"
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
    color: Colors.quaternaryColor
  },
  addressText: {
    fontSize: 16,
    color: Colors.quaternaryColor,
    width: "65%",
    textAlign: "right"
  },
  rect: {
    height: 1,
    width: 360,
    backgroundColor: "rgb(230,230,230)"
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
    color: Colors.quaternaryColor
  },
  explorerBtn: {
    alignSelf: "center",
    width: 140,
    height: 45,
    backgroundColor: "rgba(68,152,206,1)",
    opacity: 1,
    marginTop: 10,
    marginBottom: 0
  },
});