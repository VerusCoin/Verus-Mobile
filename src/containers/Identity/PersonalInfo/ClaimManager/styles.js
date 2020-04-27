import { StyleSheet } from 'react-native';
import Colors from '../../../../globals/colors';

export default StyleSheet.create({
  root: {
    flex: 1,
    padding:16,
    backgroundColor:Colors.secondaryColor,
  },
  button: {
    backgroundColor:
            '#b5b5b5',
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
  moveInto:{
    marginLeft:'55%',
    alignItems:'center',
    backgroundColor:Colors.primaryColor,
  },
  moveIntoText:{
    fontSize: 16,
    color:Colors.secondaryColor,
  },
  claimsContainer:{
    paddingVertical:8,
  },
  claims:{
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:'space-between',
    borderBottomColor:'#b5b5b5',
    borderBottomWidth: 0.8,
  },
  text:{
    fontSize: 16,
  },
  labelContainer:{
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-between',
    borderBottomColor:'#b5b5b5',
    borderBottomWidth: 0.8,
    paddingVertical:8,
  },
  label:{
    color:'#b5b5b5',
  },
  claimText:{
    marginLeft:'24%',
    color:'#b5b5b5',
  },
  icon:{
    flexDirection:'row',
    alignItems:'center',
  },

  checkBox:{
    backgroundColor: Colors.secondaryColor,
  },
});
