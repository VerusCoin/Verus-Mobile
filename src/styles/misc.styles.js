import Colors from '../globals/colors';

export default misc = {
  defaultDivider: {
    alignSelf: 'center',
    width: '90%',
    marginVertical: '3%',
    backgroundColor: Colors.quaternaryColor,
  },
  flex: {
    flex: 1,
  },
  inputField:{
    fontSize: 16,
    borderRadius: 5,
    fontWeight: 'bold',
    height: 40,
    color: Colors.quaternaryColor,
    borderWidth: 0.7,
    paddingLeft: 16,
  },
  marginVertical:{
    marginVertical:'10%',
  },
  borderWithGreenColor: {
    color: Colors.successButtonColor,
    borderWidth: 1,
    padding: 4,
    borderColor:Colors.successButtonColor,
    fontWeight: 'bold',
  },
  backgroundColorWhite:{
    backgroundColor:Colors.secondaryColor,
  },
  paddingTop:{
    paddingTop:20,
  },
  icon: {
      width: 20,
      height: 20,
      tintColor: 'black'
  },
  formLabel: {
      fontSize: 14,
      textAlign: 'left',
      paddingTop: '0%',
      color: Colors.kycBlack,
      marginVertical: 0,
      paddingVertical: 0,
      fontFamily: 'SourceSansPro-Regular',
      fontWeight: "bold",
  },
  formInput: {
      fontSize: 16,
      textAlign: 'left',
      paddingTop: '0%',
      color: Colors.kycBlack,
      marginVertical: 0,
      paddingVertical: 0,
      fontFamily: 'SourceSansPro-Regular',
      fontWeight: "normal",
  },
  progessBadgeDone: {
    paddingRight: 60,
    backgroundColor:  Colors.buttonKYC
  },
  progessBadgeTodo: {
    paddingRight: 60,
    backgroundColor:  Colors.kycPoint
  },
  progressBarContainer:{
    paddingBottom: 16,
    paddingTop: 12,
    flexDirection: 'row',
    alignSelf: 'flex-start',
    width: "30%",
  },
  smallBlackDotContainer:{
    paddingTop: 5,
    flexDirection: 'row',
    alignSelf: 'flex-start',
    width: "5%",
  },
  smallBlackDot: {
    scaleX: 0.5,
    scaleY: 0.5,
    backgroundColor:  Colors.kycBlack,
  },
  inputMaskDateOfBirth: {
      color: Colors.quaternaryColor,
      borderBottomColor: '#86939d',
      borderBottomWidth: 1,
      width: '85%',
      marginLeft: 20,
      paddingVertical: 10,
  },
  paddingBottom:{
    paddingBottom:4,
  },
  paddingRight:{
    paddingRight:'3%',
  },
  defaultLeftPadding:{
    paddingLeft:0,
  },
  defaultMargin:{
    marginLeft:0,
    marginRight:0,
  },

  paddingHorizontal:{
    paddingHorizontal:10,
  },
  circleBadge:{
    width: 17,
    height: 17,
    borderRadius: 17 / 2,
    backgroundColor:Colors.quaternaryColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  marginLeftAuto: {
    marginLeft: 'auto',
  },
  noVerticalPadding: {
    paddingVertical: 0,
  },
};
