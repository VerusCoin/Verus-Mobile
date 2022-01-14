import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {NewLogo, Verus} from '../../images/customIcons/index';
import Colors from '../../globals/colors';

function NewLogoComponent() {
  return (
    <View style={styles.container}>
      <Image style={styles.logo} source={NewLogo} />
      <Text style={styles.textValu}>VALU</Text>
      <View style={styles.contentPowered}>
        <Text style={styles.textPoweredBy}>Powered by </Text>
        <Image style={styles.poweredLogo} source={Verus} />
        <Text style={styles.textVerus}>verus</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.secondaryColor,
  },
  containerModal: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.primaryColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentPowered: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
  },
  logo: {
    height: 120,
    width: 150,
  },
  textValu: {
    fontSize: 30,
    color: Colors.quinaryColor,
    fontWeight: 'bold',
  },
  poweredLogo: {
    height: 24,
    width: 24,
  },
  textVerus: {
    color: Colors.primaryColor,
    fontSize: 20,
    paddingLeft: 4,
  },
  textPoweredBy: {
    color: Colors.quinaryColor,
  },
});

export default NewLogoComponent;
