import React from 'react';
import {ScrollView, View, TouchableOpacity} from 'react-native';
import {Button, Text} from 'react-native-paper';
import Colors from '../../../../globals/colors';
import Styles from '../../../../styles';
import {copyToClipboard} from '../../../../utils/clipboard/clipboard';
import AnimatedSuccessCheckmark from '../../../AnimatedSuccessCheckmark';

export const AddPbaasCurrencyResultRender = ({currency, finishSend}) => {
  return (
    <ScrollView
      style={{...Styles.fullWidth, ...Styles.backgroundColorWhite}}
      contentContainerStyle={{
        ...Styles.focalCenter,
        justifyContent: 'space-between',
      }}>
      <TouchableOpacity
        onPress={() =>
          copyToClipboard(currency.fullyqualifiedname, {
            title: 'Currency copied',
            message: `${currency.fullyqualifiedname} copied to clipboard.`,
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
          {`${currency.fullyqualifiedname} added`}
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
          {`${currency.fullyqualifiedname} will now show on your wallet home page.`}
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
