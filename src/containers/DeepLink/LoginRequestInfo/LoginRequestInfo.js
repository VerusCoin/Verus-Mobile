import {CommonActions} from '@react-navigation/native';
import React, {useState, useEffect} from 'react';
import {SafeAreaView, ScrollView, TouchableOpacity, View} from 'react-native';
import Styles from '../../../styles/index';
import {LoginConsentRequest} from 'verus-typescript-primitives';
import { Button, Divider, List, Portal, Text } from 'react-native-paper';
import VerusIdDetailsModal from '../../../components/VerusIdDetailsModal/VerusIdDetailsModal';
import { getIdentity } from '../../../utils/api/channels/verusid/callCreators';
import { unixToDate } from '../../../utils/math';
import { createAlert } from '../../../actions/actions/alert/dispatchers/alert';
import { resetDeeplinkData } from '../../../actions/actionCreators';
import { useDispatch, useSelector } from 'react-redux';
import Colors from '../../../globals/colors';
import { VerusIdLogo } from '../../../images/customIcons';

const LoginRequestInfo = props => {
  const { deeplinkData, sigtime, cancel } = props
  const req = new LoginConsentRequest(deeplinkData)
  const [verusIdDetailsModalProps, setVerusIdDetailsModalProps] = useState(null)
  const [sigDateString, setSigDateString] = useState(unixToDate(sigtime))

  const { chain_id, signing_id, challenge } = req
  const { client, requested_scope } = challenge // TODO HARDENING: DISPLAY REQUESTED SCOPE!!
  const { name } = client

  const getVerusId = async (chain, iAddrOrName) => {
    const identity = await getIdentity({id: chain}, iAddrOrName);

    if (identity.error) throw new Error(identity.error.message);
    else return identity.result;
  }

  const openVerusIdDetailsModal = (chain, iAddress) => {
    setVerusIdDetailsModalProps({
      loadVerusId: () => getVerusId(chain, iAddress),
      visible: true,
      animationType: 'slide',
      cancel: () => setVerusIdDetailsModalProps(null),
      loadFriendlyNames: async () => {
        try {
          const identityObj = await getVerusId(chain, iAddress);
    
          return getFriendlyNameMap({id: chain}, identityObj);
        } catch (e) {
          return {['i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV']: 'VRSC'};
        }
      },
      iAddress,
      chain
    })
  }

  const onBehalfOfWarning = () => {
    createAlert(
      'Warning',
      `The creator of this request claims to represent ${name}. Make sure you trust the VerusID that made this request to do so.`,
    );
  }

  useEffect(() => {
    if (name != null) {
      onBehalfOfWarning();
    }
  }, []);

  return (
    <SafeAreaView style={Styles.defaultRoot}>
      <Portal>
        {verusIdDetailsModalProps != null && (
          <VerusIdDetailsModal {...verusIdDetailsModalProps} />
        )}
      </Portal>
      <ScrollView
        style={Styles.fullWidth}
        contentContainerStyle={Styles.focalCenter}>
        <VerusIdLogo width={'70%'} height={'25%'} />
        <View style={Styles.wideBlock}>
          <Text style={{fontSize: 20, textAlign: 'center'}}>
            {`${signing_id} is requesting a login with VerusID`}
          </Text>
        </View>
        <View style={Styles.fullWidth}>
          <TouchableOpacity
            onPress={() => openVerusIdDetailsModal(chain_id, signing_id)}>
            <List.Item
              title={signing_id}
              description={'Requested by'}
              right={props => (
                <List.Icon {...props} icon={'information'} size={20} />
              )}
            />
            <Divider />
          </TouchableOpacity>
          {name && (
            <TouchableOpacity onPress={() => onBehalfOfWarning()}>
              <List.Item
                title={name}
                description={'On behalf of'}
                right={props => (
                  <List.Icon
                    {...props}
                    icon={'exclamation'}
                    size={20}
                    color={Colors.infoButtonColor}
                  />
                )}
              />
              <Divider />
            </TouchableOpacity>
          )}
          <TouchableOpacity>
            <List.Item title={sigDateString} description={'Signed on'} />
            <Divider />
          </TouchableOpacity>
        </View>
        <View
          style={{
            ...Styles.fullWidthBlock,
            paddingHorizontal: 16,
            flexDirection: 'row',
            justifyContent: "space-between",
            display: 'flex',
          }}>
          <Button
            color={Colors.warningButtonColor}
            style={{width: 148}}
            onPress={() => cancel()}>
            Cancel
          </Button>
          <Button
            color={Colors.verusGreenColor}
            style={{width: 148}}
            onPress={() => cancel()}>
            Continue
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default LoginRequestInfo;
