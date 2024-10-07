import React, { useEffect, useState } from 'react';
import {View, Dimensions, TouchableWithoutFeedback, Keyboard, TouchableOpacity} from 'react-native';
import {Text, Paragraph, TextInput, Portal} from 'react-native-paper';
import { useSelector } from 'react-redux';
import { createAlert } from '../../actions/actions/alert/dispatchers/alert';
import TallButton from '../../components/LargerButton';
import Colors from '../../globals/colors';
import { SMALL_DEVICE_HEGHT } from '../../utils/constants/constants';
import { openRecoverIdentitySendModal, openRevokeIdentitySendModal } from '../../actions/actions/sendModal/dispatchers/sendModal';
import { coinsList } from '../../utils/CoinData/CoinsList';
import ListSelectionModal from '../../components/ListSelectionModal/ListSelectionModal';
import { SEND_MODAL_ENCRYPTED_IDENTITY_SEED, SEND_MODAL_IDENTITY_TO_REVOKE_FIELD, SEND_MODAL_REVOKE_RECOVER_COMPLETE, SEND_MODAL_SYSTEM_ID } from '../../utils/constants/sendModal';
import { encryptkey } from '../../utils/seedCrypt';

export default function RevokeRecoverIdentityForm({ navigation, isRecovery, importedSeed, exitRevokeRecover }) {
  const DEFAULT_SYSTEMS = [coinsList.VRSC, coinsList.iExBJfZYK7KREDpuhj6PzZBzqMAKaFg7d2, coinsList.iHog9UCTrn95qpUBFCZ7kKz7qWdMA8MQ6N, coinsList.VRSCTEST];

  const {height} = Dimensions.get('window');
  const isKeyboardActive = useSelector(state => state.keyboard.active);
  const [networkSelectOpen, setNetworkSelectOpen] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState(coinsList.VRSC);
  const [loading, setLoading] = useState(false);
  const instanceKey = useSelector(state => state.authentication.instanceKey);

  const complete = useSelector(state => state.sendModal.data[SEND_MODAL_REVOKE_RECOVER_COMPLETE]);
  const sendModalVisible = useSelector(state => state.sendModal.visible);
  const [lastSendModalVisible, setLastSendModalVisible] = useState(true);
  const [alreadyComplete, setAlreadyComplete] = useState(false);

  useEffect(() => {
    if (complete && !alreadyComplete) {
      setAlreadyComplete(true);
    }
  }, [complete])

  useEffect(() => {
    if (!sendModalVisible && lastSendModalVisible && alreadyComplete) {
      setLastSendModalVisible(false) 
      exitRevokeRecover()
    }
  }, [sendModalVisible])

  const validate = () => {
    const res = { valid: false, message: "" }

    res.valid = true
    return res
  }

  const next = async () => {
    const { valid, message } = validate();

    if (!valid) createAlert("Error", message);
    else if (!loading) {
      try {
        setLoading(true);

        if (isRecovery) {
          openRecoverIdentitySendModal({
            [SEND_MODAL_IDENTITY_TO_REVOKE_FIELD]: '',
            [SEND_MODAL_SYSTEM_ID]: selectedNetwork.system_id,
            [SEND_MODAL_ENCRYPTED_IDENTITY_SEED]: await encryptkey(instanceKey, importedSeed)
          });
        } else {
          openRevokeIdentitySendModal({
            [SEND_MODAL_IDENTITY_TO_REVOKE_FIELD]: '',
            [SEND_MODAL_SYSTEM_ID]: selectedNetwork.system_id,
            [SEND_MODAL_ENCRYPTED_IDENTITY_SEED]: await encryptkey(instanceKey, importedSeed)
          });
        }
        

        setLoading(false);
      } catch(e) {
        setLoading(false);
        createAlert("Error", e.message);
      }
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
            {"Select Blockchain"}
          </Text>
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
          <Paragraph
            style={{
              textAlign: 'center',
              width: '75%',
              marginTop: 24,
              width: 280
            }}>
            {`Select the blockchain you want to ${isRecovery ? "recover" : "revoke"} your VerusID on, then press next. Keep in mind, if your identity has been exported to other blockchains, you will need to revoke/recover them separately.`}
          </Paragraph>
        </View>
        {!isKeyboardActive && <TallButton
          onPress={next}
          mode="contained"
          labelStyle={{fontWeight: "bold"}}
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
