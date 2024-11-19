import React from 'react';
import {ScrollView, View, TouchableOpacity} from 'react-native';
import {Button, Text} from 'react-native-paper';
import Colors from '../../../../globals/colors';
import Styles from '../../../../styles';
import {copyToClipboard} from '../../../../utils/clipboard/clipboard';
import AnimatedSuccessCheckmark from '../../../AnimatedSuccessCheckmark';
import { convertFqnToDisplayFormat } from '../../../../utils/fullyqualifiedname';
import { explorers } from '../../../../utils/CoinData/CoinData';

export const RevokeIdentityResultRender = ({targetId, networkObj, finishSend, txid, openExplorer}) => {
  const formattedFriendlyName = convertFqnToDisplayFormat(targetId.fullyqualifiedname);

  return (
    <ScrollView
      style={{...Styles.fullWidth, ...Styles.backgroundColorWhite}}
      contentContainerStyle={{
        ...Styles.focalCenter,
        justifyContent: 'space-between',
      }}>
      <TouchableOpacity
        onPress={() =>
          copyToClipboard(targetId.identity.identityaddress, {
            title: 'Address copied',
            message: `${targetId.identity.identityaddress} copied to clipboard.`,
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
          {`${formattedFriendlyName} revoked!`}
        </Text>
      </TouchableOpacity>
      <View style={{paddingVertical: 16}}>
        <AnimatedSuccessCheckmark
          style={{
            width: 128,
          }}
        />
      </View>
      <View style={{width: '75%'}}>
        <Text
          style={{
            textAlign: 'center',
            fontSize: 20,
            color: Colors.verusDarkGray,
          }}>
          {`Your VerusID has been revoked on the ${networkObj ? networkObj.display_name : "???"} blockchain.`}
        </Text>
      </View>
      <View style={{paddingVertical: 8, width: '75%'}}>
        <Text
          style={{
            textAlign: 'center',
            fontSize: 20,
            color: Colors.verusDarkGray,
          }}>
          {'This action may take a few minutes to confirm on-chain.'}
        </Text>
      </View>
      <View
        style={{
          width: '90%',
          flexDirection: 'row',
          justifyContent: 'space-evenly',
        }}>
        {networkObj != null && explorers[networkObj.id] != null && (
          <Button
            textColor={Colors.primaryColor}
            style={{width: 148}}
            labelStyle={{fontSize: 18}}
            onPress={openExplorer}>
            Details
          </Button>
        )}
        <Button
          buttonColor={Colors.verusGreenColor}
          textColor={Colors.secondaryColor}
          style={{width: 148}}
          labelStyle={{fontSize: 18}}
          onPress={finishSend}>
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
