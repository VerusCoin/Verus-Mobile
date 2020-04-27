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
  redButton: {
    alignSelf: 'center',
    minWidth: 104,
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
    backgroundColor:Colors.lightGray,
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

};
