import React from "react";
import { ScrollView, View, TouchableOpacity } from "react-native";
import { Button, List, Divider, Text } from "react-native-paper";
import Colors from "../../../../globals/colors";
import Styles from "../../../../styles";
import { copyToClipboard } from "../../../../utils/clipboard/clipboard";
import AnimatedSuccessCheckmark from "../../../AnimatedSuccessCheckmark";

export const ConversionSendResultRender = function () {
  return ConversionSendSuccessRender.call(this)
};

export const ConversionSendSuccessRender = function () {
  const { txid, toAddress, valueSent, fromCurrency } = this.state.params;

  return (
    <ScrollView
      style={{...Styles.fullWidth, ...Styles.backgroundColorWhite}}
      contentContainerStyle={{
        ...Styles.focalCenter,
        justifyContent: 'space-between'
      }}>
      <TouchableOpacity
        onPress={() =>
          copyToClipboard(finalTxAmount, {
            title: 'Amount copied',
            message: `${finalTxAmount} copied to clipboard.`,
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
            }}>{`${finalTxAmount} ${coinObj.id}`}</Text>
          {' sent'}
        </Text>
      </TouchableOpacity>
      <View style={{paddingVertical: 16}}>
        <AnimatedSuccessCheckmark
          style={{
            width: 128,
          }}
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
          <Text style={{color: Colors.basicButtonColor, textAlign: 'center'}}>
            {toAddress}
          </Text>
        </Text>
      </TouchableOpacity>
      <View style={{paddingVertical: 16, width: '75%'}}>
        <Text
          style={{
            textAlign: 'center',
            fontSize: 20,
            color: Colors.verusDarkGray,
          }}>
          {'The transaction may take a few minutes to appear in your wallet.'}
        </Text>
      </View>
      <View
        style={{
          width: '90%',
          flexDirection: 'row',
          justifyContent: 'space-evenly',
        }}>
        {explorers[coinObj.id] != null && (
          <Button
            textColor={Colors.primaryColor}
            style={{width: 148}}
            labelStyle={{fontSize: 18}}
            onPress={() => this.openExplorer()}>
            Details
          </Button>
        )}
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