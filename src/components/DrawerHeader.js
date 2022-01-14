import React from 'react';
import {
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Colors from '../globals/colors';
import {NewLogo} from '../images/customIcons';

const DrawerHeader = ({navigateToScreen}) => (
  <TouchableOpacity onPress={() => navigateToScreen('Home')}>
    <SafeAreaView
      style={{
        backgroundColor: Colors.secondaryColor,
      }}>
      <View style={styles.container}>
        <Image source={NewLogo} style={styles.logo} />
        <Text style={styles.textLogo}>Valu Wallet</Text>
      </View>
    </SafeAreaView>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.secondaryColor,
    paddingLeft: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  textLogo: {
    color: Colors.quinaryColor,
    paddingLeft: 9,
    fontSize: 16,
    fontFamily: 'Avenir-Black',
  },
  logo: {
    width: 50,
    height: 40,
    overflow: 'hidden',
  },
});

export default DrawerHeader;
