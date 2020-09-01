import Colors from '../globals/colors';

export default containers = {
  standardWidthBlock: {
    width: '75%',
    paddingVertical: 16,
  },
  standardWidthFlexGrowCenterBlock: {
    alignSelf: 'center',
    width: '75%',
    paddingVertical: 16,
  },
  standardWidthFlexGrowCenterBlock: {
    alignSelf: 'center',
    width: '75%',
    paddingVertical: 16,
    flex: 1,
    justifyContent: 'center',
  },
  fullWidthFlexGrowCenterBlock: {
    alignSelf: 'center',
    width: '100%',
    paddingVertical: 16,
    flex: 1,
    justifyContent: 'center',
  },
  centralRow: {
    flexDirection: 'row',
    alignSelf: 'center',
  },
  fullHeight: {
    height: '100%',
  },
  startRow: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
  },
  standardWidthSpaceBetweenBlock: {
    width: '75%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    alignSelf: 'center',
  },
  fullWidthSpaceBetweenCenterBlock: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  standardWidthFlexRowBlock: {
    width: '75%',
    paddingVertical: 16,
    display: 'flex',
    flexDirection: 'row',
    alignSelf: 'center',
  },
  wideBlock: {
    width: '90%',
    paddingVertical: 16,
  },
  wideCenterBlock: {
    width: '90%',
    paddingVertical: 16,
    alignSelf: 'center',
  },
  standardWidthCenterBlock: {
    width: '75%',
    paddingVertical: 16,
    alignSelf: 'center',
  },
  wide: {
    width: '90%',
  },
  wideCenter: {
    width: '90%',
    alignSelf: 'center',
  },
  contentCenter:{
    flexDirection: 'row',
    justifyContent: 'center',
    alignSelf:'center',
  },
  fullWidth: {
    width: '100%',
  },
  fullWidthAlignCenter: {
    width: '100%',
    alignItems: 'center',
  },
  fullWidthAlignCenterRowBlock: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 16,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  wideFlexRowBlock: {
    width: '90%',
    paddingVertical: 16,
    display: 'flex',
    flexDirection: 'row',
    alignSelf: 'center',
  },
  flexCenterRowBlock: {
    paddingVertical: 16,
    display: 'flex',
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'baseline',
  },
  fullWidthFlexCenterBlock: {
    paddingVertical: 16,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    display: 'flex',
  },
  svgHeader:{
    width:'100%',
    height: '20%',
    justifyContent: 'center',
    paddingTop: 12
  },
  fullWidthBlock: {
    paddingVertical: 16,
    width: '100%',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontalCenterContainer: {
    alignItems: 'center',
  },
  flexBackground: {
    flex: 1,
    backgroundColor: Colors.secondaryColor,
  },
  passwordInputContainer: {
    width: '91%',
  },
  footerContainer: {
    width: '100%',
    alignItems: 'center',
    flex: 1,
    maxHeight: '14%',
    backgroundColor: Colors.secondaryColor,
    borderTopWidth: 1,
    borderColor: Colors.tertiaryColor,
  },
  highFooterContainer: {
    width: '100%',
    alignItems: 'center',
    flex: 1,
    maxHeight: '16%',
    backgroundColor: Colors.secondaryColor,
    borderTopWidth: 1,
    borderColor: Colors.tertiaryColor,
  },
  headerContainer: {
    width: '100%',
    alignItems: 'center',
    maxHeight: '10%',
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.secondaryColor,
    borderBottomWidth: 1,
    borderColor: Colors.tertiaryColor,
  },
  tallHeaderContainer: {
    width: '100%',
    alignItems: 'center',
    maxHeight: '18%',
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.secondaryColor,
    borderBottomWidth: 1,
    borderColor: Colors.tertiaryColor,
  },
  innerHeaderFooterContainer: {
    position: 'absolute',
    width: '100%',
  },
  innerHeaderFooterContainerCentered: {
    position: 'absolute',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineHeaderContainer: {
    width: '100%',
    alignItems: 'center',
    position: 'absolute',
    top: 32,
  },
  bottomlessListItemContainer: {
    borderBottomWidth: 0,
  },
  underflow: {
    overflow: 'visible',
    zIndex: -1,
  },
  greyStripeContainer: {
    backgroundColor: Colors.tertiaryColor,
    borderBottomWidth: 0,
  },
  halfWidthBox: {
    maxWidth: '50%',
  },
  horizontalPaddingBox: {
    paddingHorizontal: '25%',
  },
  horizontalPaddingBox10: {
    paddingHorizontal: '10%',
  },
  horizontalPaddingBox5: {
    paddingHorizontal: '5%',
  },
  flexColumn:{
    flexDirection:'column',
  },
  flexRow:{
    flexDirection:'row',
  },
  alignItemsStart:{
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  alignItemsCenter:{
    flexDirection: 'row',
    alignItems: 'center',
  },
  alignItemsRight:{
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  alignItemsCenterColumn:{
    flexDirection: 'column',
    alignItems: 'center',
  },
  blockWithBorderBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingVertical: 10,
    borderColor: Colors.ultraLightGrey,
  },
  blockWithBorder: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: Colors.ultraLightGrey,
    marginTop:'2%',
    justifyContent: 'space-between',
    borderBottomWidth:1,
  },
  blockWithFlexStart: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 16,
  },
  containerWithTopMargin:{
    marginTop:'20%',
  },
  containerVerticalPadding:{
    paddingVertical:8,
  },
  fullWidthSpaceBetween: {
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paddedBorderedBox: {
    borderWidth: 1,
    borderColor: Colors.lightGrey,
    padding: 10,
  },
};
