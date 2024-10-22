import React, { useEffect, useState } from "react";
import { closeSendModal } from "../../../../actions/actions/sendModal/dispatchers/sendModal";
import { explorers } from "../../../../utils/CoinData/CoinData";
import { openUrl } from "../../../../utils/linking";
import { ScrollView, View, TouchableOpacity } from "react-native";
import { Button, Text } from "react-native-paper";
import Colors from "../../../../globals/colors";
import Styles from "../../../../styles";
import { copyToClipboard } from "../../../../utils/clipboard/clipboard";
import AnimatedSuccessCheckmark from "../../../AnimatedSuccessCheckmark";
import { useSelector } from "react-redux";
import { SEND_MODAL_SEND_COMPLETED } from "../../../../utils/constants/sendModal";

const ConvertOrCrossChainSendResult = (props) => {
  const coinObj = useSelector(state => state.sendModal.coinObj);
  const [params, setParams] = useState(props.route.params == null ? {} : props.route.params);
  const { updateSendFormData } = props;

  const finishSend = () => {
    closeSendModal();
  }

  const openExplorer = () => {
    const url = `${explorers[coinObj.id]}/tx/${params.txid}`;

    openUrl(url);
  };

  useEffect(() => {
    updateSendFormData(SEND_MODAL_SEND_COMPLETED, true)
  }, [])

  const { txid, output, destination } = params;

  return (
    <ScrollView
      style={{...Styles.fullWidth, ...Styles.backgroundColorWhite}}
      contentContainerStyle={{
        ...Styles.focalCenter,
        justifyContent: 'space-between'
      }}
    >
      <TouchableOpacity
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
          {output.convertto ? "Conversion initiated" : output.exportto ? "Off-chain send initiated" : "Send initiated"}
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
          copyToClipboard(destination, {
            title: 'Destination copied',
            message: `${destination} copied to clipboard.`,
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
            {destination}
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
          {'Track its status under the Overview tab. It may take a time to arrive even after it is confirmed as sent.'}
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
            onPress={() => openExplorer()}>
            Details
          </Button>
        )}
        <Button
          buttonColor={Colors.verusGreenColor}
          textColor={Colors.secondaryColor}
          style={{width: 148}}
          labelStyle={{fontSize: 18}}
          onPress={() => finishSend()}>
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
}

export default ConvertOrCrossChainSendResult;
