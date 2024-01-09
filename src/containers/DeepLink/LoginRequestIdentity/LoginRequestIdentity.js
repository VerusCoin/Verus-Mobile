import React, { useState, useEffect } from 'react';
import { ScrollView } from 'react-native';
import Styles from '../../../styles/index';
import { primitives } from "verusid-ts-client"
import { createAlert } from '../../../actions/actions/alert/dispatchers/alert';
import { useSelector, useDispatch } from 'react-redux';
import { openLinkIdentityModal, openProvisionIdentityModal } from '../../../actions/actions/sendModal/dispatchers/sendModal';
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import { requestServiceStoredData } from '../../../utils/auth/authBox';
import { VERUSID_SERVICE_ID } from '../../../utils/constants/services';
import { findCoinObj } from '../../../utils/CoinData/CoinData';
import { Divider, List } from 'react-native-paper';
import { signLoginConsentResponse } from '../../../utils/api/channels/vrpc/requests/signLoginConsentResponse';
import BigNumber from 'bignumber.js';
import { VERUSID_NETWORK_DEFAULT } from "../../../../env/index";
import { CoinDirectory } from '../../../utils/CoinData/CoinDirectory';
import { CommonActions } from '@react-navigation/native';
import { SEND_MODAL_IDENTITY_TO_LINK_FIELD } from '../../../utils/constants/sendModal';
import { ELECTRUM } from '../../../utils/constants/intervalConstants';
import { coinsList } from '../../../utils/CoinData/CoinsList';
import { requestSeeds } from '../../../utils/auth/authBox';
import { deriveKeyPair } from '../../../utils/keys';
import { SET_DEEPLINK_DATA_EXTRAPARAMS } from "../../../utils/constants/storeType";
import { getIdentity } from "../../../utils/api/channels/verusid/callCreators";

const LoginRequestIdentity = props => {
  const { deeplinkData } = props.route.params
  const [loading, setLoading] = useState(false)
  const [linkedIds, setLinkedIds] = useState({})
  const [sortedIds, setSortedIds] = useState({});
  const [idsloaded, setIdsloaded] = useState(false);
  const [idProvisionSuccess, setIdProvisionSuccess] = useState(false)
  const [canProvision, setCanProvision] = useState(false)
  const req = new primitives.LoginConsentRequest(deeplinkData)
  const encryptedIds = useSelector(state => state.services.stored[VERUSID_SERVICE_ID])
  const sendModal = useSelector((state) => state.sendModal);
  const fromService = useSelector((state) => state.deeplink.fromService);
  const extraParams = useSelector((state) => state.deeplink.extraParams);
  const dispatch = useDispatch()

  useEffect(() => {
    let canProvision = req.challenge.provisioning_info && req.challenge.provisioning_info.some(x => {
      return (
        x.vdxfkey ===
        primitives.LOGIN_CONSENT_ID_PROVISIONING_WEBHOOK_VDXF_KEY
          .vdxfid
      );
    })

    if (Object.keys(linkedIds).length > 0) {
      for (const chainId of Object.keys(linkedIds)) {
        if (linkedIds[chainId] && 
           Object.keys(linkedIds[chainId])
            .includes(req.challenge.subject.find(item => item.vdxfkey === primitives.ID_ADDRESS_VDXF_KEY.vdxfid)?.data)) {
          canProvision = false;
        }
      }
    }
    setCanProvision(canProvision)
  }, [linkedIds])

  const activeCoinsForUser = useSelector(state => state.coins.activeCoinsForUser)
  const testnetOverrides = useSelector(state => state.authentication.activeAccount.testnetOverrides)
  const identityNetwork = testnetOverrides[VERUSID_NETWORK_DEFAULT]
    ? testnetOverrides[VERUSID_NETWORK_DEFAULT]
    : VERUSID_NETWORK_DEFAULT;

  const activeCoinIds = activeCoinsForUser.map(coinObj => coinObj.id)

  const { system_id } = req;

  const getPotentialPrimaryAddresses = async () => {

    const isTestnet = Object.keys(testnetOverrides).length > 0;
    const system = isTestnet ? coinsList.VRSCTEST : coinsList.VRSC;
    const seeds = await requestSeeds();
    const seed = seeds[ELECTRUM];
    const keyObj = await deriveKeyPair(seed, system, ELECTRUM);
    const { addresses } = keyObj;
    return addresses;
  };

  async function onEncryptedIdsUpdate() {
    setLoading(true)

    try {
      const verusIdServiceData = await requestServiceStoredData(
        VERUSID_SERVICE_ID,
      );
      
      if (verusIdServiceData.linked_ids) {
        setLinkedIds(verusIdServiceData.linked_ids)
      } else {
        setLinkedIds({})
      }
      setIdsloaded(true);

    } catch (e) {
      createAlert('Error Loading Linked VerusIDs', e.message);
    }

    setLoading(false)
  } 

  useEffect(() => {
    if(extraParams && extraParams.fqn){
      const data = {[SEND_MODAL_IDENTITY_TO_LINK_FIELD]: extraParams.fqn};
      openLinkIdentityModal(CoinDirectory.findCoinObj(system_id, null, true), data);
    }
  }, [extraParams])

  useEffect(() => {

    if (idsloaded && req.challenge.subject && req.challenge.subject.length > 0 &&
      req.challenge.subject.some(item => item.vdxfkey === primitives.ID_ADDRESS_VDXF_KEY.vdxfid)) {

        const providionedId = req.challenge.subject.find(item => item.vdxfkey === primitives.ID_ADDRESS_VDXF_KEY.vdxfid).data;
        for (const chainId of activeCoinIds) { 
          if (linkedIds[chainId] && Object.keys(linkedIds[chainId]).includes(providionedId)) {
            return;
          }
        }
      getIdentity(system_id, providionedId).then((provisionedID) => {
        getPotentialPrimaryAddresses().then((addresses) => {
          if (provisionedID.result) {
            for (const address of provisionedID.result.identity.primaryaddresses) {
              if (addresses.includes(address)) {
                dispatch({
                  type: SET_DEEPLINK_DATA_EXTRAPARAMS,
                  payload: {
                    extraParams: { fqn: provisionedID.result.fullyqualifiedname }
                  },
                });
                return;
              }
            }
          }
        })
      })
    }
  }, [idsloaded])

  useEffect(() => {
    onEncryptedIdsUpdate()
  }, [encryptedIds])

  useEffect(() => {
    if (!idProvisionSuccess && sendModal.data?.success){
      setIdProvisionSuccess(true);
    }

    if (idProvisionSuccess && !sendModal.visible) {
      props.navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{name: 'SignedInStack'}],
        }),
      );
    }
  }, [sendModal])

  useEffect(() => {
    const sortedIdKeysPerChain = {}

    for (const chainId of activeCoinIds) {
      sortedIdKeysPerChain[chainId] = linkedIds[chainId]
        ? Object.keys(linkedIds[chainId]).sort(function (x, y) {
            if (linkedIds[chainId][x] < linkedIds[chainId][y]) {
              return -1;
            }
            if (linkedIds[chainId][x] > linkedIds[chainId][y]) {
              return 1;
            }
            return 0;
          })
        : [];
    }

    setSortedIds(sortedIdKeysPerChain)
  }, [linkedIds])

  const openLinkIdentityModalFromChain = () => {
    return openLinkIdentityModal(CoinDirectory.findCoinObj(system_id, null, true));
  }

  const openProvisionIdentityModalFromChain = () => {
    openProvisionIdentityModal(CoinDirectory.findCoinObj(system_id, null, true), req, fromService)
  }

  const selectIdentity = async (iAddress) => {
    try {
      const signedResponse = await signLoginConsentResponse(
        CoinDirectory.findCoinObj(system_id, null, true),
        {
          system_id: system_id,
          signing_id: iAddress,
          decision: new primitives.LoginConsentDecision({
            decision_id: req.challenge.challenge_id,
            request: req,
            created_at: BigNumber(Date.now())
              .dividedBy(1000)
              .decimalPlaces(0)
              .toNumber(),
          }),
        },
      );

      props.navigation.navigate("LoginRequestComplete", {
        signedResponse
      })
    } catch(e) {
      createAlert("Error", e.message)
    }
  };

  return loading ? (
    <AnimatedActivityIndicatorBox />
  ) : (
    <ScrollView style={{...Styles.fullWidth, ...Styles.backgroundColorWhite}}>
      {Object.keys(sortedIds).filter(x => x === identityNetwork).map(chainId => {
        return (
          <React.Fragment key={chainId}>
            {sortedIds[chainId].length > 0 && (
              <List.Subheader>{`Linked ${chainId} VerusIDs`}</List.Subheader>
            )}
            {sortedIds[chainId].map(iAddr => {
              return (
                <React.Fragment key={iAddr}>
                  <Divider />
                  <List.Item
                    title={linkedIds[chainId][iAddr]}
                    description={iAddr}
                    descriptionNumberOfLines={1}
                    titleNumberOfLines={1}
                    left={props => <List.Icon {...props} icon={'account'} />}
                    right={props => (
                      <List.Icon {...props} icon={'chevron-right'} size={20} />
                    )}
                    onPress={() => selectIdentity(iAddr)}
                  />
                </React.Fragment>
              );
            })}
            <Divider />
            <List.Subheader>{`Options`}</List.Subheader>
            <Divider />
            <List.Item
              title={'Link VerusID'}
              right={props => <List.Icon {...props} icon={'plus'} size={20} />}
              onPress={() => openLinkIdentityModalFromChain(chainId)}
            />
            <Divider />
            {canProvision && (
              <React.Fragment>
                <List.Item
                  title={'Request new VerusID'}
                  right={props => (
                    <List.Icon {...props} icon={'plus'} size={20} />
                  )}
                  onPress={() => openProvisionIdentityModalFromChain(chainId)}
                />
                <Divider />
              </React.Fragment>
            )}
          </React.Fragment>
        );
      })}
    </ScrollView>
  );
};

export default LoginRequestIdentity;
