import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, TouchableOpacity, View } from 'react-native';
import Styles from '../../../styles/index';
import { primitives } from "verusid-ts-client"
import { Button, Divider, List, Portal, Text } from 'react-native-paper';
import VerusIdDetailsModal from '../../../components/VerusIdDetailsModal/VerusIdDetailsModal';
import { getIdentity } from '../../../utils/api/channels/verusid/callCreators';
import { unixToDate } from '../../../utils/math';
import { useDispatch, useSelector } from 'react-redux';
import Colors from '../../../globals/colors';
import { VerusIdLogo } from '../../../images/customIcons';
import { closeSendModal, openAuthenticateUserModal } from '../../../actions/actions/sendModal/dispatchers/sendModal';
import { AUTHENTICATE_USER_SEND_MODAL, SEND_MODAL_USER_ALLOWLIST } from '../../../utils/constants/sendModal';
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import { getSystemNameFromSystemId } from '../../../utils/CoinData/CoinData';
import { createAlert, resolveAlert } from '../../../actions/actions/alert/dispatchers/alert';
import { CoinDirectory } from '../../../utils/CoinData/CoinDirectory';
import { addCoin, addKeypairs, setUserCoins } from '../../../actions/actionCreators';
import { refreshActiveChainLifecycles } from '../../../actions/actions/intervals/dispatchers/lifecycleManager';

const LoginRequestInfo = props => {
  const { deeplinkData, sigtime, cancel, signerFqn } = props
  const [req, setReq] = useState(new primitives.LoginConsentRequest(deeplinkData))
  const [loading, setLoading] = useState(false)
  const [verusIdDetailsModalProps, setVerusIdDetailsModalProps] = useState(null)
  const [sigDateString, setSigDateString] = useState(unixToDate(sigtime))
  const [waitingForSignin, setWaitingForSignin] = useState(false)
  const [permissions, setExtraPermissions] = useState(null)
  const [loginMethod, setLoginMethod] = useState(0)
  const [ready, setReady] = useState(false)

  const accounts = useSelector(state => state.authentication.accounts)
  const signedIn = useSelector(state => state.authentication.signedIn)
  const sendModalType = useSelector(state => state.sendModal.type)

  const dispatch = useDispatch()

  const { system_id, signing_id, challenge } = req
  const chain_id = getSystemNameFromSystemId(system_id)

  const loginType = ["Login", "Login and accept an agreement", "Login and reveal identity information", "Login, accept an agreement and reveal identity information"];
  const rootSystemAdded = useSelector(
    state =>
      state.coins.activeCoinsForUser &&
      state.coins.activeCoinsForUser.find(x => x.id === chain_id) != null,
  );
  const [prevRootSystemAdded, setPrevRootSystemAdded] = useState(rootSystemAdded)

  const activeAccount = useSelector(
    state => state.authentication.activeAccount,
  );
  const activeCoinList = useSelector(state => state.coins.activeCoinList);

  const getVerusId = async (chain, iAddrOrName) => {
    const identity = await getIdentity(CoinDirectory.getBasicCoinObj(chain).system_id, iAddrOrName);

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
    
          return getFriendlyNameMap(CoinDirectory.getBasicCoinObj(chain), identityObj);
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
      closeSendModal()
      handleContinue()
    }
  }, [signedIn, waitingForSignin]);

  useEffect(() => {
    if (
      prevRootSystemAdded != rootSystemAdded &&
      prevRootSystemAdded === false &&
      rootSystemAdded === true
    ) {
      handleContinue()
    }
  }, [rootSystemAdded]);

  useEffect(() => {
    setReq(new primitives.LoginConsentRequest(deeplinkData))
  }, [deeplinkData]);

  const buildAlert = (request) => {
    return createAlert(
      request.title,
      request.data,
      [
        {
          text: 'DECLINE',
          onPress: () => resolveAlert(false),
          style: 'cancel',
        },
        {
          text: 'ACCEPT', onPress: () => {

            var _permissions = [];
            for (let i = 0; i < permissions.length; i++) {
              _permissions.push(permissions[i]);
              if (_permissions[i].vdxfkey == request.vdxfkey) {
                _permissions[i].agreed = true;
              }
            }
            setExtraPermissions(_permissions);

            resolveAlert(true)
          }
        },
      ],
      {
        cancelable: true,
      },
    )
  }


  useEffect(() => {

    if (req && req.challenge && req.challenge.requested_access) {
      if (req.challenge.requested_access.length === 1) {
        setReady(true);
        setLoginMethod(0);
      } else if (req.challenge.requested_access.length > 1 && !permissions) {
        var loginTemp = [];
        var tempMethod = 0;
        for (let i = 1; i < req.challenge.requested_access.length; i++) {
          var tempdata = {};
          if (req.challenge.requested_access[i].vdxfkey === primitives.IDENTITY_AGREEMENT.vdxfid) {
            tempMethod = tempMethod | 1;
            tempdata = { data: req.challenge.requested_access[i].toJson().data, title: "Agreement to accept" }
          }
          // TODO: Add support for identity data
          loginTemp.push({ vdxfkey: req.challenge.requested_access[i].vdxfkey, ...tempdata, agreed: false })

        }
        setLoginMethod(tempMethod);
        setExtraPermissions(loginTemp);
      }
    }
  }, [req]);

  useEffect(() => {
    if (permissions) {
      for (let i = 0; i < permissions.length; i++) {
        if (!permissions[i].agreed)
          return;
      }
      setReady(true);
    }
  }, [permissions]);

  useEffect(() => {
    setSigDateString(unixToDate(sigtime))
  }, [sigtime]);

  useEffect(() => {
    if (sendModalType != AUTHENTICATE_USER_SEND_MODAL) {
      setLoading(false)
    } else setLoading(true)
  }, [sendModalType]);

  const addRootSystem = async () => {
    setLoading(true)

    try {
      const fullCoinData = CoinDirectory.findCoinObj(chain_id)

      dispatch(
        await addKeypairs(
          fullCoinData,
          activeAccount.keys,
          activeAccount.keyDerivationVersion == null
            ? 0
            : activeAccount.keyDerivationVersion,
        ),
      );
  
      const addCoinAction = await addCoin(
        fullCoinData,
        activeCoinList,
        activeAccount.id,
        fullCoinData.compatible_channels,
      );
  
      if (addCoinAction) {
        dispatch(addCoinAction);
  
        const setUserCoinsAction = setUserCoins(
          activeCoinList,
          activeAccount.id,
        );
        dispatch(setUserCoinsAction);
  
        refreshActiveChainLifecycles(setUserCoinsAction.payload.activeCoinsForUser);
      } else {
        createAlert("Error", "Error adding coin")
      }
    } catch(e) {
      createAlert("Error", e.message)
    }

    setLoading(false)
  }

  const canAddRootSystem = () => {
    return createAlert(
      `Add ${chain_id}?`,
      `To complete this login request, you need to add the ${chain_id} currency to your wallet. Would you like to do so now?`,
      [
        {
          text: 'Cancel',
          onPress: () => resolveAlert(false),
          style: 'cancel',
        },
        {text: 'Yes', onPress: () => resolveAlert(true)},
      ],
      {
        cancelable: true,
      },
    )
  }

  const tryAddRootSystem = async () => {
    if (await canAddRootSystem()) {
      return addRootSystem()
    }
  }

  const handleContinue = () => {
    if (signedIn) {
      if (!rootSystemAdded) {
        tryAddRootSystem()
      } else {
        props.navigation.navigate('LoginRequestIdentity', {
          deeplinkData,
        });
      }
    } else {
      setWaitingForSignin(true);
      const coinObj = CoinDirectory.findCoinObj(chain_id);
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
          <Text style={{ fontSize: 20, textAlign: 'center' }}>
            {`${signerFqn} is requesting ${loginType[loginMethod]} with VerusID`}
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
          {permissions && permissions.map((request, index) => {
            return (
              <TouchableOpacity key={index} onPress={() => buildAlert(request)}>
                <List.Item title={request.title} description={`View the ${request.title} Details.`}
                  right={props => (
                    <List.Icon
                      key={request}
                      {...props}
                      icon="check"
                      style={{ borderRadius: 90, backgroundColor: request.agreed ? 'green' : 'grey' }}
                      color={Colors.secondaryColor}
                    />
                  )} />
                <Divider />
              </TouchableOpacity>
            );
          })}
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
            color={ready ? Colors.verusGreenColor : Colors.lightGrey}
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
