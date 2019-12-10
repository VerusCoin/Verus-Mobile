import React from 'react';
import { 
  View, 
  Text, 
  Image, 
  StatusBar, 
  TouchableOpacity, 
  Platform 
} from 'react-native';
import Colors from '../globals/colors';

const LOGO_DIR = require('../images/customIcons/verusHeaderLogo.png');

const DrawerHeader = ({ navigateToScreen }) => (
	<TouchableOpacity onPress={() => navigateToScreen('Home')}>
		<View
			style={{
				flexDirection: 'row',
				backgroundColor: Colors.primaryColor,
				paddingVertical: 28,
				paddingLeft: 17,
				paddingTop: Platform.OS === 'ios' ? 35 : StatusBar.currentHeight,
				alignItems: 'center',
			}}
		>
			<Image
        source={LOGO_DIR}
        style={{width: 40, height: 40}}
			/>
			<Text style={{ color: '#FFF', paddingLeft: 9, fontSize: 16 }}>
				Verus Wallet
			</Text>
		</View>
	</TouchableOpacity>
);

export default DrawerHeader;
