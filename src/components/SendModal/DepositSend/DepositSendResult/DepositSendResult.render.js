import React from "react";
import { ScrollView, View, TouchableOpacity } from "react-native";
import { Button, Text } from "react-native-paper";
import Colors from "../../../../globals/colors";
import Styles from "../../../../styles";
import { copyToClipboard } from "../../../../utils/clipboard/clipboard";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export const DepositSendResultRender = function () {
  return DepositSendSuccessRender.call(this)
};

export const DepositSendSuccessRender = function () {
  const { txid, toAddress, valueReceived, toCurrency } = this.state.params;
  const deposited = valueReceived

  return (
    <ScrollView
      style={{...Styles.fullWidth, ...Styles.backgroundColorWhite}}
      contentContainerStyle={{
        ...Styles.focalCenter,
        justifyContent: 'space-between'
      }}>
      <TouchableOpacity
        onPress={() =>
          copyToClipboard(valueSent, {
            title: 'Amount copied',
            message: `${valueSent} copied to clipboard.`,
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
          <Text
            style={{
              color: Colors.basicButtonColor,
              textAlign: 'center',
            }}>{`${deposited} ${toCurrency}`}</Text>
          {' deposit initiated'}
        </Text>
      </TouchableOpacity>
      <View style={{paddingVertical: 16}}>
        <MaterialCommunityIcons
          name={'information'}
          color={Colors.primaryColor}
          size={104}
        />
      </View>
      <TouchableOpacity
        onPress={() =>
          copyToClipboard(toAddress, {
            title: 'Address copied',
            message: `${toAddress} copied to clipboard.`,
          })
        }
        style={{
          width: '75%',
        }}>
        <Text
          numberOfLines={1}
          style={{
            textAlign: 'center',
            fontSize: 20,
            color: Colors.verusDarkGray,
          }}>
          {'to '}
          <Text
            style={{
              color: Colors.basicButtonColor,
              textAlign: 'center',
            }}>{`Wyre ${toCurrency} wallet`}</Text>
        </Text>
      </TouchableOpacity>
      <View style={{paddingVertical: 16, width: '75%'}}>
        <Text
          style={{
            textAlign: 'center',
            fontSize: 20,
            color: Colors.verusDarkGray,
          }}>
          {
            "Complete this deposit manually through a wire transfer to the account specified under the 'manage' tab. Your pending deposit may take a few minutes to appear."
          }
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
      <TouchableOpacity
        onPress={() =>
          copyToClipboard(txid, {
            title: 'Transaction ID copied',
            message: `${txid} copied to clipboard.`,
          })
        }
        style={{
          width: '75%',
        }}>
        <Text
          numberOfLines={1}
          style={{
            textAlign: 'center',
            fontSize: 14,
            color: Colors.verusDarkGray,
          }}>
          {`id: ${txid}`}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};