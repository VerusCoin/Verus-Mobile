import React from 'react';
import { 
  View, 
  TouchableOpacity,
	SafeAreaView
} from 'react-native';
import { Text } from 'react-native-paper';
import Colors from '../globals/colors';
import { CoinLogos, getCoinLogo } from '../utils/CoinData/CoinData';
import { useSelector } from 'react-redux';

const VrscLogo = getCoinLogo("VRSC");

const DrawerHeader = ({ navigateToScreen }) => {
  const darkMode = useSelector(state=>state.settings.darkModeState)
  return(
  <TouchableOpacity onPress={() => navigateToScreen("Home")}>
    <SafeAreaView
      style={{
        backgroundColor: darkMode?Colors.verusDarkBlue:Colors.primaryColor,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          backgroundColor: darkMode?Colors.verusDarkBlue:Colors.primaryColor,
          paddingLeft: 20,
					paddingBottom: 24,
          paddingTop: 24,
          alignItems: "center",
        }}
      >
        <VrscLogo
          width={30}
          height={30}
        />
        <Text
          style={{
            color: "#FFF",
            paddingLeft: 22,
            fontSize: 16,
            fontFamily: "Avenir-Black",
          }}
        >
          Verus Mobile
        </Text>
      </View>
    </SafeAreaView>
  </TouchableOpacity>)
};

export default DrawerHeader;
