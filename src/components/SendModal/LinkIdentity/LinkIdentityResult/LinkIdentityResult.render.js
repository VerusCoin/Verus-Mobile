import React from 'react';
import {ScrollView, View, TouchableOpacity} from 'react-native';
import {Button, Text} from 'react-native-paper';
import Colors from '../../../../globals/colors';
import Styles from '../../../../styles';
import {copyToClipboard} from '../../../../utils/clipboard/clipboard';
import AnimatedSuccessCheckmark from '../../../AnimatedSuccessCheckmark';

export const LinkIdentityResultRender = function () {
  return LinkIdentitySuccessRender.call(this);
};

export const LinkIdentitySuccessRender = function () {
  const {verusId} = this.state;
  const coinObj = this.props.sendModal.coinObj;

  return (
    <ScrollView
      style={{...Styles.fullWidth, ...Styles.backgroundColorWhite}}
      contentContainerStyle={{
        ...Styles.focalCenter,
        justifyContent: 'space-between'
      }}>
        <TouchableOpacity
          onPress={() =>
            copyToClipboard(verusId.identity.identityaddress, {
              title: 'Address copied',
              message: `${verusId.identity.identityaddress} copied to clipboard.`,
            })
          }
          style={{
            width: '75%',
            marginTop: 16,
          }}>
          <Text
            numberOfLines={1}
            style={{
              textAlign: 'center',
              fontSize: 20,
              color: Colors.verusDarkGray,
            }}>
            {`${verusId.identity.name}@ linked`}
          </Text>
        </TouchableOpacity>
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
            {`Your VerusID will now appear as a card in your ${coinObj.id} wallet.`}
          </Text>
        </View>
        <View
          style={{
            width: '90%',
            flexDirection: 'row',
            justifyContent: 'space-evenly',
          }}>
          <Button
            color={Colors.verusGreenColor}
            style={{width: 148}}
            labelStyle={{fontSize: 18}}
            onPress={() => this.finishSend()}>
            Done
          </Button>
        </View>
    </ScrollView>
  );
};
