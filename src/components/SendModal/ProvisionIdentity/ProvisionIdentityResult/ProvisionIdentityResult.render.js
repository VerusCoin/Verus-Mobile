import React from 'react';
import {ScrollView, View, TouchableOpacity} from 'react-native';
import {Button, Text} from 'react-native-paper';
import Colors from '../../../../globals/colors';
import Styles from '../../../../styles';
import {copyToClipboard} from '../../../../utils/clipboard/clipboard';
import AnimatedSuccessCheckmark from '../../../AnimatedSuccessCheckmark';
import { convertFqnToDisplayFormat } from '../../../../utils/fullyqualifiedname';

export const ProvisionIdentityResultRender = function () {
  return ProvisionIdentitySuccessRender.call(this);
};

export const ProvisionIdentitySuccessRender = function () {
  const {fullyQualifiedName} = this.state;
  const coinObj = this.props.sendModal.coinObj;
  const formattedFriendlyName = convertFqnToDisplayFormat(fullyQualifiedName);

  return (
    <ScrollView
      style={{...Styles.fullWidth, ...Styles.backgroundColorWhite}}
      contentContainerStyle={{
        ...Styles.focalCenter,
        justifyContent: 'space-between'
      }}>
          <Text
            numberOfLines={1}
            style={{
              textAlign: 'center',
              fontSize: 20,
              color: Colors.verusDarkGray,
            }}>
            {`Creating ${formattedFriendlyName}`}
          </Text>

        <View style={{paddingVertical: 16}}>
          <AnimatedSuccessCheckmark
            style={{
              width: 128,
            }}
          />
        </View>
        <View style={{paddingVertical: 16, width: '75%'}}>
          <Text
            style={{
              textAlign: 'center',
              fontSize: 20,
              color: Colors.verusDarkGray,
            }}>
            {`You will receive a notification when your ${coinObj.display_ticker} ID is ready to use.`}
          </Text>
        </View> 
        <View
          style={{
            width: '90%',
            flexDirection: 'row',
            justifyContent: 'space-evenly',
          }}>
          <Button
            buttonColor={Colors.verusGreenColor}
            textColor={Colors.secondaryColor}
            style={{width: 148}}
            labelStyle={{fontSize: 18}}
            onPress={() => this.finishSend()}>
            Done
          </Button>
        </View>
    </ScrollView>
  );
};
