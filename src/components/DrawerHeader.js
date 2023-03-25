import React from 'react';
import { 
  View, 
  Image, 
  StatusBar, 
  TouchableOpacity, 
  Platform,
	SafeAreaView
} from 'react-native';
import { Text } from 'react-native-paper';
import Colors from '../globals/colors';

const LOGO_DIR = require('../images/customIcons/Verus.png');

const DrawerHeader = ({ navigateToScreen }) => (
  <TouchableOpacity onPress={() => navigateToScreen("Home")}>
    <SafeAreaView
      style={{
        backgroundColor: Colors.primaryColor,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          backgroundColor: Colors.primaryColor,
          paddingLeft: 10,
					paddingBottom: 24,
          alignItems: "center",
        }}
      >
        <Image
          source={LOGO_DIR}
          style={{ width: 50, height: 40, overflow: "hidden" }}
        />
        <Text
          style={{
            color: "#FFF",
            paddingLeft: 9,
            fontSize: 16,
            fontFamily: "Avenir-Black",
          }}
        >
          Verus Mobile
        </Text>
      </View>
    </SafeAreaView>
  </TouchableOpacity>
);

export default DrawerHeader;
