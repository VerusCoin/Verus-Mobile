import React, {useEffect} from 'react';
import {ScrollView, View} from 'react-native';
import {Text} from 'react-native-paper';
import {closeSendModal} from '../../../../actions/actions/sendModal/dispatchers/sendModal';
import Colors from '../../../../globals/colors';
import Styles from '../../../../styles';
import AnimatedSuccessCheckmark from '../../../AnimatedSuccessCheckmark';
import {useSelector} from 'react-redux';

const AuthenticateUserResult = props => {
  const darkMode = useSelector(state => state.settings.darkModeState);
  async function onMount() {
    setTimeout(() => {
      closeSendModal();
    }, 500);
  }

  useEffect(() => {
    onMount();
  }, []);

  return (
    <ScrollView
      style={{
        ...Styles.fullWidth,
        backgroundColor: darkMode
          ? Colors.darkModeColor
          : Colors.secondaryColor,
      }}
      contentContainerStyle={{
        ...Styles.focalCenter,
        justifyContent: 'space-between',
        backgroundColor: darkMode
          ? Colors.darkModeColor
          : Colors.secondaryColor,
      }}>
      <View
        style={[
          Styles.focalCenter,
          {
            backgroundColor: darkMode
              ? Colors.darkModeColor
              : Colors.secondaryColor,
          },
        ]}>
        <Text
          numberOfLines={1}
          style={{
            textAlign: 'center',
            fontSize: 20,
            color: darkMode ? Colors.secondaryColor : Colors.verusDarkGray,
          }}>
          {`Account unlocked!`}
        </Text>
        <View style={{paddingVertical: 16}}>
          <AnimatedSuccessCheckmark
            style={{
              width: 128,
            }}
          />
        </View>
      </View>
    </ScrollView>
  );
};

export default AuthenticateUserResult;
