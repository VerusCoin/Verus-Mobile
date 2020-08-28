import Colors from '../globals/colors';

export default buttons = {
  fullWidthButton: {
    width: '100%',
    alignSelf: 'center',
    backgroundColor: Colors.linkButtonColor,
  },
  defaultButton: {
    alignSelf: 'center',
    backgroundColor: Colors.linkButtonColor,
    minWidth: 104,
  },
  defaultButtonWhite: {
    alignSelf: 'center',
    backgroundColor: Colors.secondaryColor,
    minWidth: 104,
  },
  defaultButtonClearWhite: {
    alignSelf: 'center',
    borderColor: Colors.secondaryColor,
    minWidth: 104,
  },
  redButton: {
    alignSelf: 'center',
    minWidth: 104,
  },
  greenButton: {
    alignSelf: 'center',
    minWidth: 104,
    backgroundColor: Colors.successButtonColor,
  },
  fullWidthButtonTitle: {
    fontSize: 16,
    fontFamily: 'Avenir-Black',
    fontWeight: '600',
  },
  inlineXButton: {
    marginRight: 16,
    color: Colors.warningButtonColor,
  },
  linkButton:{
    backgroundColor: Colors.linkButtonColor,
    paddingVertical: 10,
    marginVertical: '2%',
    alignItems: 'center',
    borderRadius: 5,
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
    borderRadius: 5,
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
    borderRadius: 4,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 5,
  },

  buttonWithSuccessColor: {
    backgroundColor: Colors.successButtonColor,
    paddingHorizontal: '16%',
    borderRadius: 5,
    paddingVertical: 16,
  },

  linkleftButton: {
    backgroundColor:Colors.linkButtonColor,
    marginVertical: '2%',
    paddingVertical: 10,
    borderRadius: 5,
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
