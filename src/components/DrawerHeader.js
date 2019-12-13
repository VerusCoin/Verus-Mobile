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

const LOGO_DIR = require('../images/customIcons/VerusLogo.png');

const DrawerHeader = ({ navigateToScreen }) => (
	<TouchableOpacity onPress={() => navigateToScreen('Home')}>
		<View
			style={{
				flexDirection: 'row',
				backgroundColor: Colors.linkButtonColor,
				paddingTop: '30%',
				paddingLeft: '5%',
				paddingBottom : '15%',
				paddingTop: Platform.OS === 'ios' ? 35 : 90,
				alignItems: 'flex-end',
			}}
		>
			<Image
				source={LOGO_DIR}
				style={{width: 50, height: 40, overflow: 'hidden' }}
			/>
			<Text style={{ color: '#FFF', paddingLeft: 9, fontSize: 16, fontFamily: 'Avenir-Black' }}>
				Verus Wallet
			</Text>
		</View>
	</TouchableOpacity>
);

export default DrawerHeader;
