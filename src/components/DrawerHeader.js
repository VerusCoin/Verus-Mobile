import React from 'react';
import { View, Text, Image, StatusBar, TouchableOpacity } from 'react-native';

const LOGO_DIR = require('../images/customIcons/verusHeaderLogo.png');

const DrawerHeader = ({ navigateToScreen }) => (
	<TouchableOpacity onPress={() => navigateToScreen('Home')}>
		<View
			style={{
				flexDirection: 'row',
				backgroundColor: "#2E86AB",
				paddingVertical: 28,
				paddingLeft: 17,
				paddingTop: StatusBar.currentHeight + 10,
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
