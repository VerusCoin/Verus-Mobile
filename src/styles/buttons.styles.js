import Colors from '../globals/colors';

export const roundedButton = {borderRadius: 24};
export const buttonLabel = {
  fontSize: 16,
  fontWeight: '700',
  letterSpacing: 0,
  textAlign: 'center',
  flexShrink: 1,
};

const buttons = {
  roundedButton,
  fullWidthButton: {
    ...roundedButton,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: Colors.linkButtonColor,
  },
  defaultButton: {
    ...roundedButton,
    alignSelf: 'center',
    backgroundColor: Colors.linkButtonColor,
    minWidth: 104,
  },
  redButton: {
    ...roundedButton,
    alignSelf: 'center',
    minWidth: 104,
  },
  greenButton: {
    ...roundedButton,
    alignSelf: 'center',
    minWidth: 104,
    backgroundColor: Colors.verusGreenColor,
  },
  fullWidthButtonTitle: buttonLabel,
  inlineXButton: {
    marginRight: 16,
    color: Colors.warningButtonColor,
  },
  linkButton:{
    backgroundColor: Colors.linkButtonColor,
    paddingVertical: 10,
    marginVertical: '2%',
    alignItems: 'center',
    ...roundedButton,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.43,
    shadowRadius: 2,
    elevation: 2,
  
  },

  greyButtonWithShadow:{
    backgroundColor:Colors.lightGrey,
    marginVertical: '2%',
    paddingVertical: 10,
    ...roundedButton,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.43,
    shadowRadius: 2,
    elevation: 2,
  },
  linkButtonWithMarginRight: {
    flexDirection: 'row',
    backgroundColor: Colors.linkButtonColor,
    ...roundedButton,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 5,
  },

  buttonWithSuccessColor: {
    backgroundColor: Colors.verusGreenColor,
    paddingHorizontal: '16%',
    ...roundedButton,
    paddingVertical: 16,
  },

  linkleftButton: {
    backgroundColor:Colors.linkButtonColor,
    marginVertical: '2%',
    paddingVertical: 10,
    ...roundedButton,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.43,
    shadowRadius: 2,
    elevation: 2,
    marginLeft:'55%',
    alignItems:'center',
  },

  opacity: {
    opacity: 1,
  },
  opacityBlur: {
    opacity: 0.4,
  },
};

export default buttons;
