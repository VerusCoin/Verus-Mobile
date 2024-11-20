import { fromBase58Check } from "@bitgo/utxo-lib/dist/src/address";
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { primitives } from "verusid-ts-client";
import { createAlert } from "../../../../actions/actions/alert/dispatchers/alert";
import { getIdentity } from "../../../../utils/api/channels/verusid/callCreators";
import {
  SEND_MODAL_FORM_STEP_CONFIRM,
  SEND_MODAL_IDENTITY_TO_PROVISION_FIELD,
} from "../../../../utils/constants/sendModal";
import {
  Alert,
  ScrollView,
  View,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
} from "react-native";
import { TextInput, Button, Paragraph } from "react-native-paper";
import Styles from "../../../../styles";

const ProvisionIdentityForm = (props) => {
  const { height } = Dimensions.get("window");
  const sendModal = useSelector((state) => state.sendModal);
  const chainTicker = sendModal.coinObj.id;
  const addresses = useSelector(state =>
    state.authentication.activeAccount.keys[chainTicker]
      ? state.authentication.activeAccount.keys[chainTicker].vrpc.addresses
      : [],
  );

  const hasProvisioningInfo =
    sendModal.data.request != null &&
    sendModal.data.request.challenge.provisioning_info != null;

  const [state, setState] = useState({
    friendlyNameMap: {},
    provisioningInfo: hasProvisioningInfo
      ? sendModal.data.request.challenge.provisioning_info
      : [],
    provAddress: null,
    provSystemId: null,
    provFqn: null,
    provParent: null,
    provWebhook: null,
    assignedIdentity: null,
    loading: false,
    parentname: ''
  });

  useEffect(() => {
    const updateProvisioningInfoProcessedData = async () => {
      if (!hasProvisioningInfo) return;
  
      const findProvisioningInfo = (key) =>
        sendModal.data.request.challenge.provisioning_info.find(
          (x) => x.vdxfkey === key.vdxfid
        );
  
      const provAddress = findProvisioningInfo(primitives.ID_ADDRESS_VDXF_KEY);
      const provSystemId = findProvisioningInfo(primitives.ID_SYSTEMID_VDXF_KEY);
      const provFqn = findProvisioningInfo(primitives.ID_FULLYQUALIFIEDNAME_VDXF_KEY);
      const provParent = findProvisioningInfo(primitives.ID_PARENT_VDXF_KEY);
      const provWebhook = findProvisioningInfo(primitives.LOGIN_CONSENT_ID_PROVISIONING_WEBHOOK_VDXF_KEY);
  
      setState((currentState) => ({
        ...currentState,
        provAddress,
        provSystemId,
        provFqn,
        provParent,
        provWebhook,
      }));
    };
    const initializeState = async () => {
      await updateProvisioningInfoProcessedData();
    
      setState((currentState) => {
        const provIdKey = currentState.provAddress || currentState.provFqn || null;
    
        const identitykeys = provIdKey == null ? [] : [provIdKey];
        if (currentState.provParent) identitykeys.push(currentState.provParent);
        if (currentState.provSystemId) identitykeys.push(currentState.provSystemId);
    
        const fetchIdentities = async () => {
          let friendlyNameMap = currentState.friendlyNameMap;
          let assignedIdentity = null;
          let parentname = '';

          for (const idKey of identitykeys) {
            if (idKey != null) {
              const identity = await getIdentity(sendModal.coinObj.system_id, idKey.data);
    
              if (identity.result) {
                friendlyNameMap[identity.result.identity.identityaddress] =
                  identity.result.identity.name;
    
                if (provIdKey != null && idKey.data === provIdKey.data) {
                  assignedIdentity = identity.result.identity.identityaddress;
                  props.updateSendFormData(
                    SEND_MODAL_IDENTITY_TO_PROVISION_FIELD,
                    identity.result.identity.name
                  );

                }
                if (idKey.vdxfkey === primitives.ID_PARENT_VDXF_KEY.vdxfid) {
                   parentname = `.${identity.result.fullyqualifiedname}`
                } 
              }
            }
          }
    
          return { friendlyNameMap, assignedIdentity, parentname };
        };
    
        fetchIdentities().then(({ parentname, friendlyNameMap, assignedIdentity }) => {
          setState({ ...currentState, friendlyNameMap, assignedIdentity, loading: false, parentname });
        });
    
        return { ...currentState, loading: true };
      });
    };
    
    initializeState();    
  }, []);  
  
  const formHasError = () => {
    const identity = sendModal.data[SEND_MODAL_IDENTITY_TO_PROVISION_FIELD]?.trim() || '';
  
    if (!identity) {
      createAlert('Required Field', 'Identity is a required field.');
      return true;
    }
  
    try {
      fromBase58Check(identity);
      if (state.parentname) {
        createAlert(
          'Invalid Identity',
          'i-Address cannot have a parent name.',
        );
        return true;
      }
    } catch (e) {
      const formattedId = state.parentname ? `${identity}${state.parentname}` : `${identity}@`;
      if (!formattedId.endsWith('@')) {
        createAlert(
          'Invalid Identity',
          'Identity not a valid identity handle or iAddress.',
        );
        return true;
      }
    }
  
    return false;
  };

  const submitData = async () => {
    if (formHasError()) return;
  
    props.setLoading(true);
  
    const { coinObj, data } = sendModal;
    const identity = data[SEND_MODAL_IDENTITY_TO_PROVISION_FIELD];

    let formattedId;

    try {
      formattedId = fromBase58Check(identity);
    } catch(e) {
      formattedId = state.parentname ? `${identity}${state.parentname}` : `${identity}@`;
    }

    try {
      const res = await getIdentity(coinObj.system_id, formattedId);
  
      if (res.error && res.error.code !== -5) {
        throw new Error(res.error.message);
      } else if (!state.assignedIdentity && !res.error && res.result != null) {
        throw new Error('Identity name taken, please select a different name');
      }
  
      props.setModalHeight(height >= 496 ? 520 : height - 24);

      props.navigation.navigate(SEND_MODAL_FORM_STEP_CONFIRM, {
        primaryAddress: addresses[0],
        provAddress: state.provAddress,
        provSystemId: state.provSystemId,
        provFqn: state.provFqn,
        provParent: state.provParent,
        provWebhook: state.provWebhook,
        friendlyNameMap: state.friendlyNameMap
      });
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  
    props.setLoading(false);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ScrollView
        style={{
          ...Styles.flexBackground,
          ...Styles.fullWidth,
        }}
        contentContainerStyle={{
          ...Styles.centerContainer,
          justifyContent: "flex-start",
        }}
      >
        <View style={Styles.wideBlock}>
        <TextInput
          returnKeyType="done"
          label={state.parentname ? "VerusID name" : "i-Address or VerusID name"}
          value={state.assignedIdentity
            ? state.friendlyNameMap[state.assignedIdentity]
              ? `${state.friendlyNameMap[state.assignedIdentity]}`
              : state.assignedIdentity
            : sendModal.data[SEND_MODAL_IDENTITY_TO_PROVISION_FIELD]}
          mode="outlined"
          disabled={state.assignedIdentity != null || state.loading}
          onChangeText={text => {
            if (state.assignedIdentity == null && !text.endsWith("@")) {
              props.updateSendFormData(
                SEND_MODAL_IDENTITY_TO_PROVISION_FIELD,
                text
              );
            }
          }}
          autoCapitalize="none"
          autoCorrect={false}
        />
         <Paragraph style={{color: "grey"}}>{"Your Fully qualified name will be: \n\n"}{
            state.assignedIdentity
            ? state.friendlyNameMap[state.assignedIdentity]
              ? `${
                  state.friendlyNameMap[state.assignedIdentity]
                }`
              : state.assignedIdentity
            : sendModal.data[SEND_MODAL_IDENTITY_TO_PROVISION_FIELD]
          }{state.parentname}</Paragraph> 
        </View>
        <View style={{ ...Styles.wideBlock, paddingTop: 0 }}>
          <Button mode="contained" onPress={() => submitData()} disabled={state.loading}>
            Continue
          </Button>
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
};

export default ProvisionIdentityForm;