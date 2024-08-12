import React, { useState } from 'react';
import {View, Dimensions, TouchableWithoutFeedback, Keyboard, TouchableOpacity} from 'react-native';
import {Text, Paragraph, TextInput, Portal} from 'react-native-paper';
import { useSelector } from 'react-redux';
import { createAlert } from '../../actions/actions/alert/dispatchers/alert';
import TallButton from '../../components/LargerButton';
import Colors from '../../globals/colors';
import { SMALL_DEVICE_HEGHT } from '../../utils/constants/constants';
import { openRevokeIdentitySendModal } from '../../actions/actions/sendModal/dispatchers/sendModal';
import { coinsList } from '../../utils/CoinData/CoinsList';
import ListSelectionModal from '../../components/ListSelectionModal/ListSelectionModal';

export default function RevokeRecoverIdentityForm({ navigation, isRecovery }) {
  const DEFAULT_SYSTEMS = [coinsList.VRSC, coinsList.iExBJfZYK7KREDpuhj6PzZBzqMAKaFg7d2, coinsList.VRSCTEST];

  const {height} = Dimensions.get('window');
  const isKeyboardActive = useSelector(state => state.keyboard.active);
  const [identityTerm, setIdentityTerm] = useState("");
  const [networkSelectOpen, setNetworkSelectOpen] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState(coinsList.VRSC);

  const validate = () => {
    const res = { valid: false, message: "" }

    // if (!profileName || profileName.length < 1) {
    //   res.message = "Please enter a profile name."
    //   return res
    // } else if (profileName.length > 50) {
    //   res.message = "Please enter a profile name shorter than 50 characters."
    //   return res
    // } else if (isDuplicateAccount(profileName)) {
    //   res.message = "A profile with this name already exists."
    //   return res
    // }

    res.valid = true
    return res
  }

  const next = () => {
    const { valid, message } = validate()

    if (!valid) createAlert("Error", message)
    else {
      openRevokeIdentitySendModal(
        
      )
    }
  }

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          flex: 1,
          alignItems: 'center',
          backgroundColor: Colors.secondaryColor
        }}>
        <Portal>
          {networkSelectOpen && (
            <ListSelectionModal
              title="Select a Blockchain"
              flexHeight={1}
              visible={networkSelectOpen}
              onSelect={(item) => setSelectedNetwork(item ? item.value : coinsList.VRSC)}
              data={DEFAULT_SYSTEMS.map(x => {
                return {
                  key: x.id,
                  title: x.display_ticker,
                  description: x.display_name,
                  value: x
                }
              })}
              cancel={() => setNetworkSelectOpen(false)}
            />
          )}
        </Portal>
        <View
          style={{
            alignItems: 'center',
            position: 'absolute',
            top: height < SMALL_DEVICE_HEGHT ? 60 : height / 2 - 250,
          }}>
          <Text
            style={{
              textAlign: 'center',
              color: Colors.primaryColor,
              fontSize: 28,
              fontWeight: 'bold',
            }}>
            {"Enter VerusID"}
          </Text>
          <Paragraph
            style={{
              textAlign: 'center',
              width: '75%',
              marginTop: 24,
              width: 280
            }}>
            {`Enter the handle or i-address of the VerusID you want to ${isRecovery ? "recover" : "revoke"}, and select the blockchain that the VerusID exists on.`}
          </Paragraph>
          <TextInput
            returnKeyType="done"
            label="Identity"          
            value={identityTerm}
            mode={"outlined"}
            style={{
              width: '75%',
              marginTop: 48,
              width: 280
            }}
            placeholder="Enter handle/i-address"
            dense={true}
            onChangeText={(text) => setIdentityTerm(text)}
          />
          <TouchableOpacity onPress={() => setNetworkSelectOpen(true)}>
            <TextInput
              style={{
                width: '75%',
                marginTop: 48,
                width: 280
              }}
              dense={true}
              label="Blockchain"
              value={selectedNetwork.display_name}
              mode={"outlined"}
              placeholder="Select blockchain"
              editable={false}
              pointerEvents="none"
            />
          </TouchableOpacity>
        </View>
        {!isKeyboardActive && <TallButton
          onPress={next}
          mode="contained"
          labelStyle={{fontWeight: "bold"}}
          disabled={identityTerm.length == 0}
          style={{
            position: "absolute",
            bottom: 80,
            width: 280
          }}>
          {"Next"}
        </TallButton>}
      </View>
    </TouchableWithoutFeedback>
  );
}
