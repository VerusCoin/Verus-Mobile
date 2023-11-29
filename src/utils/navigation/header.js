import { DrawerActions } from '@react-navigation/compat';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Icon } from 'react-native-elements';
import Colors from '../../globals/colors';
import styles from '../../styles';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';



const Header = () => {
  const navigation = useNavigation(); // Use the hook here
  const dispatch = useDispatch()
  const showBalance = useSelector(state => state.coins.showBalance);

  const handleBalanceShow=(event)=>{
    event.preventDefault();
    event.stopPropagation();
    dispatch({type:'SET_BALANCE_SHOW'})
    console.log(showBalance)
  }

  
  return (
    <TouchableOpacity
      
      style={{ paddingRight: 8 }}>
      
      <View
      style={{
        flexDirection:'row',
      }}
      >
        {
        showBalance? 
        <TouchableOpacity
      onPress={handleBalanceShow}
      style={{
        flexDirection:'row',
        justifyContent:'center',
        alignItems:'center'
      }}
      >
      <Text
      style={{
        color:Colors.secondaryColor
      }}
      >Hide balances</Text>
      <MaterialCommunityIcons 
      name="eye-off" 
      size={25}
       
      color={Colors.secondaryColor}
      style={{
        marginLeft:5,
        marginRight:5
      }}
      />
      </TouchableOpacity>:
      <TouchableOpacity
      onPress={handleBalanceShow}
      style={{
        flexDirection:'row',
        justifyContent:'center',
        alignItems:'center'
      }}
      >
      <Text
      style={{
        color:Colors.secondaryColor
      }}
      >Show balances</Text>
      <MaterialCommunityIcons 
      name="eye" 
      size={25}
       
      color={Colors.secondaryColor}
      style={{
        marginLeft:5,
        marginRight:5
      }}
      />
      </TouchableOpacity>
        }
      
      
      <Icon name="menu" 
      onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
      size={35} color={Colors.secondaryColor} />
      </View>
      
    </TouchableOpacity>
  );
};


export const defaultHeaderOptions = ({navigation, params, route}) => ({
  headerShown: true,
  headerMode: "screen",
  headerStyle: {
    backgroundColor: Colors.primaryColor,
  },
  headerTitleStyle: {
    fontFamily: 'Avenir-Black',
    fontWeight: 'normal',
    fontSize: 22,
    color: Colors.secondaryColor,
  },
  headerRight: () => <Header/>,
  headerTintColor: Colors.secondaryColor,
});
