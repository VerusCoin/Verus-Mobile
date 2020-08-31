import Colors from '../globals/colors';

export default text = {
  centralHeader: {
    fontSize: 24,
    color: Colors.quaternaryColor,
    textAlign: 'center',
    fontFamily: 'Avenir-Medium',
  },
  mediumFont: {
    fontSize: 24,
  },
  centralSuccessHeader: {
    fontSize: 24,
    color: Colors.successButtonColor,
    textAlign: 'center',
    fontFamily: 'Avenir-Medium',
  },
  largeCentralPaddedHeader: {
    fontSize: 32,
    color: Colors.quaternaryColor,
    textAlign: 'center',
    fontFamily: 'Avenir-Medium',
    paddingVertical: 16,
  },
  mediumCentralPaddedHeader: {
    fontSize: 24,
    color: Colors.quaternaryColor,
    textAlign: 'center',
    fontFamily: 'Avenir-Medium',
    paddingVertical: 16,
  },
  greyStripeHeader: {
    width: '100%',
    backgroundColor: Colors.tertiaryColor,
    paddingVertical: 16,
    fontSize: 24,
    textAlign: 'center',
    color: Colors.quinaryColor,
    fontFamily: 'Avenir-Black',
  },
  errorText: {
    color: Colors.warningButtonColor,
  },
  successText: {
    color: Colors.successButtonColor,
  },
  warningText: {
    color: Colors.infoButtonColor,
  },
  seedWord: {
    fontSize: 32,
    color: Colors.primaryColor,
    textAlign: 'center',
    fontFamily: 'Avenir-Medium',
  },
  defaultDescriptiveText: {
    textAlign: 'center',
    fontSize: 18,
    fontFamily: 'Avenir-Book',
  },
  smallerDescriptiveText: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'Avenir-Book',
  },
  seedText: {
    color: Colors.primaryColor,
    textAlign: 'center',
    fontFamily: 'Avenir-Medium',
  },
  infoText: {
    fontFamily: 'Avenir-Black',
    color: Colors.quaternaryColor,
  },
  centralLightTextPadded: {
    fontFamily: 'Avenir-Book',
    color: Colors.quaternaryColor,
    textAlign: 'center',
    paddingVertical: 6,
  },
  leftLightText: {
    fontFamily: 'Avenir-Book',
    color: Colors.quaternaryColor,
    fontSize: 16,
    textAlign: 'left',
  },
  centralInfoTextPadded: {
    fontFamily: 'Avenir-Black',
    color: Colors.quaternaryColor,
    textAlign: 'center',
    paddingVertical: 6,
  },
  whiteText: {
    fontFamily: 'Avenir-Book',
    color: Colors.secondaryColor,
  },
  linkText: {
    color: Colors.linkButtonColor,
    fontFamily: 'Avenir-Black',
  },
  defaultText: {
    fontFamily: 'Avenir-Book',
    color: Colors.quaternaryColor,
  },
  formInputLabel: {
    textAlign:'left',
    color: Colors.quinaryColor,
    fontFamily: 'Avenir-Book',
    fontWeight: 'normal',
  },
  mediumFormInputLabel: {
    textAlign:'left',
    color: Colors.quinaryColor,
    fontFamily: 'Avenir-Book',
    fontWeight: 'normal',
    fontSize: 16,
  },
  mediumFormInputLabelLeftPadded: {
    textAlign:'left',
    color: Colors.quinaryColor,
    fontFamily: 'Avenir-Book',
    fontWeight: 'normal',
    fontSize: 16,
    paddingLeft: 9,
  },
  mediumInlineLink: {
    color: Colors.linkButtonColor,
    fontFamily: 'Avenir-Black',
    fontSize: 16,
  },
  ghostText: {
    color: Colors.primaryColor,
    fontFamily: 'Avenir-Black',
    fontSize: 16,
  },
  inputTextDefaultStyle: {
    color: Colors.quinaryColor,
    fontFamily: 'Avenir-Book',
    fontWeight: 'normal',
  },
  formCenterLabel: {
    textAlign: 'center',
    color: Colors.quinaryColor,
    fontFamily: 'Avenir-Book',
    fontWeight: 'normal',
  },
  formCenterError: {
    textAlign: 'center',
    color: Colors.warningButtonColor,
    fontFamily: 'Avenir-Book',
    fontWeight: 'normal',
  },
  formCenterBlueInput: {
    textAlign: 'center',
    color: Colors.primaryColor,
    fontFamily: 'Avenir-Book',
    fontWeight: 'normal',
  },
  listItemLeftTitleDefault: {
    color: Colors.quinaryColor,
    fontFamily:'Avenir-Black',
    fontSize: 16,
  },
  listItemLeftTitleUppercase: {
    color: Colors.quinaryColor,
    fontFamily:'Avenir-Black',
    fontSize: 16,
    textTransform: 'uppercase',
  },
  listItemLeftTitlePadded: {
    color: Colors.quinaryColor,
    fontFamily:'Avenir-Black',
    fontSize: 16,
    paddingHorizontal: 6, // To match sidemenu avatars
  },
  listItemLeftTitlePaddedUppercase: {
    color: Colors.quinaryColor,
    fontFamily:'Avenir-Black',
    fontSize: 16,
    paddingHorizontal: 6, // To match sidemenu avatars
    textTransform: 'uppercase',
  },
  capitalizeFirstLetter: {
    textTransform: 'capitalize',
  },
  listItemRightTitleDefault: {
    color: Colors.quinaryColor,
  },
  listItemRightTitleDefaultError: {
    color: Colors.quinaryColor,
    paddingVertical: 2,
  },
  listItemSubtitleDefault: {
    color: 'rgba(206,68,70,1)',
  },
  fiatLabel: {
    backgroundColor: Colors.tertiaryColor,
    paddingTop: 40,
    fontSize: 56,
    textAlign: 'center',
    color: Colors.quaternaryColor,
    width: '100%',
    fontFamily:'Avenir-Book',
    height: '25%',
    fontWeight: 'bold',
  },
  boldListHeader: {
    width: '100%',
    backgroundColor: Colors.secondaryColor,
    paddingVertical: 16,
    fontSize: 24,
    textAlign: 'left',
    color: Colors.quinaryColor,
    paddingLeft: 32,
    fontFamily:'Avenir-Black',
  },
  blockTextAlignRight: {
    fontSize: 16,
    color: Colors.quaternaryColor,
    width: '65%',
    textAlign: 'right',
  },

  labelBold:{
    fontSize: 12,
    fontFamily:'Avenir-Book',
    color: Colors.secondaryColor,
    fontWeight: 'bold',
    padding: 8,
  },

  whiteTextWithCustomFontSize:{
    color: Colors.secondaryColor,
    fontSize: 16,
  },

  textWithLeftPadding: {
    paddingLeft: 16,
    fontSize: 16,
  },
  labelUltraLightGrey:{
    color:Colors.ultraLightGrey,
  },
  textHeader:{
    paddingBottom: 20,
    fontSize: 24,
    paddingRight: 10,
  },
  textButton:{
    fontSize: 16,
    color: Colors.secondaryColor,
    fontWeight: 'bold',
  },
  textWithTopMargin: {
    marginTop: '10%',
    fontSize: 16,
  },
  textWithGreyColor:{
    color: Colors.quaternaryColor,
    paddingTop: 3,
  },
  textWithHorizontalPadding:{
    paddingHorizontal: 10,
  },
  whiteTextWithPadding:{
    padding: '3%',
    color: Colors.secondaryColor,
    fontSize: 20,
  },

  textWithBlackColor: {
    color: Colors.quinaryColor,
    fontSize: 17,
  },
  textWithRightPadding: {
    fontSize: 16,
    color: Colors.quaternaryColor,
    paddingRight: 24,
  },
  defaultFontSize:{
    fontSize:16,
  },
  textWithLeftMargin:{
    marginLeft:'24%',
    color:Colors.ultraLightGrey,
  },
  boldText:{
    fontSize: 16,
    color: Colors.quaternaryColor,
    fontWeight: 'bold',
    paddingVertical: '3%',
  },
  smallTextWithWhiteColor:{
    color:Colors.secondaryColor,
    fontSize:12,
  },
  centeredText: {
    textAlign: 'center',
  },
};
