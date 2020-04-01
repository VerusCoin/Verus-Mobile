import Colors from "../globals/colors";

export default containers = {
  standardWidthBlock: {
    width: '75%',
    paddingVertical: 16,
  },
  standardWidthCenterBlock: {
    alignSelf: 'center',
    width: '75%',
    paddingVertical: 16,
  },
  standardWidthSpaceBetweenBlock: {
    width: "75%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  standardWidthFlexRowBlock: {
    width: '75%',
    paddingVertical: 16,
    display: 'flex',
    flexDirection: 'row',
    alignSelf: 'center'
  },
  wideBlock: {
    width: '90%',
    paddingVertical: 16,
  },
  wide: {
    width: '90%'
  },
  wideFlexRowBlock: {
    width: '90%',
    paddingVertical: 16,
    display: 'flex',
    flexDirection: 'row',
    alignSelf: 'center'
  },
  flexCenterRowBlock: {
    paddingVertical: 16,
    display: 'flex',
    flexDirection: 'row',
    alignSelf: 'center'
  },
  fullWidthFlexCenterBlock: {
    paddingVertical: 16,
    width: '100%',
    justifyContent: "center",
    alignItems: "center",
    display: 'flex',
  },
  fullWidthBlock: {
    paddingVertical: 16,
    width: '100%'
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  flexBackground: {
    flex: 1,
    backgroundColor: Colors.secondaryColor,
  },
  passwordInputContainer: {
    width: '91%'
  },
  footerContainer: {
    width: '100%',
    alignItems: "center",
    position: 'absolute',
    bottom: 32
  },
  headerContainer: {
    width: '100%',
    alignItems: "center",
    position: 'absolute',
    top: 56
  },
  bottomlessListItemContainer: {
    borderBottomWidth: 0
  }
}