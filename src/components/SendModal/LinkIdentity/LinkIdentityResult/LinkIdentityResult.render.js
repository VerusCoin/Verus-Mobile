import React from 'react';
import {ScrollView, View, TouchableOpacity} from 'react-native';
import {Button, Text} from 'react-native-paper';
import Colors from '../../../../globals/colors';
import Styles from '../../../../styles';
import {copyToClipboard} from '../../../../utils/clipboard/clipboard';
import AnimatedSuccessCheckmark from '../../../AnimatedSuccessCheckmark';
import { useSelector } from 'react-redux';
import { convertFqnToDisplayFormat } from '../../../../utils/fullyqualifiedname';

export const LinkIdentityResultRender = ({verusId, finishSend}) => {
  const coinObj = useSelector(state => state.sendModal.coinObj);
  const formattedFriendlyName = convertFqnToDisplayFormat(verusId.fullyqualifiedname);

  return (
    <ScrollView
      style={{...Styles.fullWidth, ...Styles.backgroundColorWhite}}
      contentContainerStyle={{
        ...Styles.focalCenter,
        justifyContent: 'space-between',
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
          numberOfLines={3}
          style={{
            textAlign: 'center',
            fontSize: 20,
            color: Colors.verusDarkGray,
          }}>
          {`${formattedFriendlyName} linked`}
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
          {`Your VerusID will now appear as a card in your ${coinObj.display_ticker} wallet.`}
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
          onPress={finishSend}>
          Done
        </Button>
      </View>
    </ScrollView>
  );
};
