import React, {useState, useEffect} from 'react';
import {SafeAreaView, ScrollView, TouchableOpacity, View} from 'react-native';
import Styles from '../../../styles/index';
import { primitives } from "verusid-ts-client"
import { Button, Divider, List, Portal, Text } from 'react-native-paper';
import VerusIdDetailsModal from '../../../components/VerusIdDetailsModal/VerusIdDetailsModal';
import { getIdentity } from '../../../utils/api/channels/verusid/callCreators';
import { unixToDate } from '../../../utils/math';
import { useSelector } from 'react-redux';
import Colors from '../../../globals/colors';
import { VerusIdLogo } from '../../../images/customIcons';
import { openAuthenticateUserModal } from '../../../actions/actions/sendModal/dispatchers/sendModal';
import { AUTHENTICATE_USER_SEND_MODAL, SEND_MODAL_USER_ALLOWLIST } from '../../../utils/constants/sendModal';
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import { findCoinObj, getCoinIdFromSystemId } from '../../../utils/CoinData/CoinData';
import { createAlert } from '../../../actions/actions/alert/dispatchers/alert';

const LoginRequestInfo = props => {
  const { deeplinkData, sigtime, cancel, signerFqn } = props
  const [req, setReq] = useState(new primitives.LoginConsentRequest(deeplinkData))
  const [loading, setLoading] = useState(false)
  const [verusIdDetailsModalProps, setVerusIdDetailsModalProps] = useState(null)
  const [sigDateString, setSigDateString] = useState(unixToDate(sigtime))
  const [waitingForSignin, setWaitingForSignin] = useState(false)
  const accounts = useSelector(state => state.authentication.accounts)
  const signedIn = useSelector(state => state.authentication.signedIn)
  const sendModalType = useSelector(state => state.sendModal.type)

  const { system_id, signing_id, challenge } = req
  const chain_id = getCoinIdFromSystemId(system_id)

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
          return {
            ['i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV']: 'VRSC',
            ['iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq']: 'VRSCTEST',
          };
        }
      },
      iAddress,
      chain
    })
  }

  useEffect(() => {
    if (signedIn && waitingForSignin) {
      props.navigation.navigate("LoginRequestIdentity", {
        deeplinkData
      })
    }
  }, [signedIn, waitingForSignin]);

  useEffect(() => {
    setReq(new primitives.LoginConsentRequest(deeplinkData))
  }, [deeplinkData]);

  useEffect(() => {
    setSigDateString(unixToDate(sigtime))
  }, [sigtime]);

  useEffect(() => {
    if (sendModalType != AUTHENTICATE_USER_SEND_MODAL) {
      setLoading(false)
    } else setLoading(true)
  }, [sendModalType]);

  handleContinue = () => {
    if (signedIn) {
      props.navigation.navigate('LoginRequestIdentity', {
        deeplinkData,
      });
    } else {
      setWaitingForSignin(true);
      const coinObj = findCoinObj(chain_id);
      const allowList = coinObj.testnet ? accounts.filter(x => {
        if (
          x.testnetOverrides &&
          x.testnetOverrides[coinObj.mainnet_id] === coinObj.id
        ) {
          return true;
        } else {
          return false;
        }
      }) : accounts.filter(x => {
        if (
          x.testnetOverrides &&
          x.testnetOverrides[coinObj.mainnet_id] != null
        ) {
          return false;
        } else {
          return true;
        }
      })

      if (allowList.length > 0) {
        const data = {
          [SEND_MODAL_USER_ALLOWLIST]: allowList
        }
  
        openAuthenticateUserModal(data);
      } else {
        createAlert(
          "Cannot continue",
          `No ${
            coinObj.testnet ? 'testnet' : 'mainnet'
          } profiles found, cannot respond to ${
            coinObj.testnet ? 'testnet' : 'mainnet'
          } login request.`,
        );
      }
    }
  };

  return loading ? (
    <AnimatedActivityIndicatorBox />
  ) : (
    <SafeAreaView style={Styles.defaultRoot}>
      <Portal>
        {verusIdDetailsModalProps != null && (
          <VerusIdDetailsModal {...verusIdDetailsModalProps} />
        )}
      </Portal>
      <ScrollView
        style={Styles.fullWidth}
        contentContainerStyle={Styles.focalCenter}>
        <VerusIdLogo width={'55%'} height={'10%'} />
        <View style={Styles.wideBlock}>
          <Text style={{fontSize: 20, textAlign: 'center'}}>
            {`${signerFqn} is requesting login with VerusID`}
          </Text>
        </View>
        <View style={Styles.fullWidth}>
          <TouchableOpacity
            onPress={() => openVerusIdDetailsModal(chain_id, signing_id)}>
            <List.Item
              title={signerFqn}
              description={'Requested by'}
              right={props => (
                <List.Icon {...props} icon={'information'} size={20} />
              )}
            />
            <Divider />
          </TouchableOpacity>
          <TouchableOpacity>
            <List.Item
              title={'View your chosen identity'}
              description={'Permissions requested'}
            />
            <Divider />
          </TouchableOpacity>
          <TouchableOpacity>
            <List.Item title={chain_id} description={'System name'} />
            <Divider />
          </TouchableOpacity>
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
            justifyContent: 'space-between',
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
            onPress={() => handleContinue()}>
            Continue
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default LoginRequestInfo;
