import React, {useState, useEffect} from 'react';
import {SafeAreaView, ScrollView, TouchableOpacity, View} from 'react-native';
import Styles from '../../../styles/index';
import { primitives } from "verusid-ts-client"
import { Button, Divider, List, Portal, Text } from 'react-native-paper';
import VerusIdDetailsModal from '../../../components/VerusIdDetailsModal/VerusIdDetailsModal';
import { getFriendlyNameMap, getIdentity } from '../../../utils/api/channels/verusid/callCreators';
import { blocksToTime, unixToDate } from '../../../utils/math';
import { useSelector } from 'react-redux';
import Colors from '../../../globals/colors';
import { VerusPayTextLogo } from '../../../images/customIcons';
import { openAuthenticateUserModal } from '../../../actions/actions/sendModal/dispatchers/sendModal';
import { AUTHENTICATE_USER_SEND_MODAL, SEND_MODAL_USER_ALLOWLIST } from '../../../utils/constants/sendModal';
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import { getSystemNameFromSystemId } from '../../../utils/CoinData/CoinData';
import { createAlert, resolveAlert } from '../../../actions/actions/alert/dispatchers/alert';
import { CoinDirectory } from '../../../utils/CoinData/CoinDirectory';
import ListSelectionModal from '../../../components/ListSelectionModal/ListSelectionModal';
import { copyToClipboard } from '../../../utils/clipboard/clipboard';
import { useObjectSelector } from '../../../hooks/useObjectSelector';
import VerusIdObjectData from '../../../components/VerusIdObjectData';
import { getVerusIdStatus } from '../../../utils/verusid/getVerusIdStatus';
import { VERUSID_AUTH_INFO, VERUSID_BASE_INFO, VERUSID_CMM_DATA, VERUSID_CMM_INFO, VERUSID_PRIMARY_ADDRESS, VERUSID_PRIVATE_ADDRESS, VERUSID_PRIVATE_INFO, VERUSID_RECOVERY_AUTH, VERUSID_REVOCATION_AUTH, VERUSID_STATUS } from '../../../utils/constants/verusidObjectData';
import { getCmmDataLabel } from '../../../utils/vdxf/cmmDataLabel';
import VdxfUniValueModal from '../../../components/VdxfUniValueModal/VdxfUniValueModal';
import { getVDXFKeyLabel } from '../../../utils/vdxf/vdxfTypeLabels';
import { capitalizeString } from '../../../utils/stringUtils';

const IdentityUpdateRequestInfo = props => {
  const { 
    deeplinkData, 
    sigtime, 
    cancel, 
    signerFqn,
    coinObj,
    chainInfo,
    subjectIdentity,
    identityUpdates,
    friendlyNames,
    cmmDataKeys
  } = props;
  
  const { fullyqualifiedname, identity } = subjectIdentity;

  const [subject, setSubject] = useState(primitives.Identity.fromJson(subjectIdentity));
  const [req, setReq] = useState(primitives.IdentityUpdateRequest.fromJson(deeplinkData));

  const [vdxfUniValueModalData, setVdxfUniValueModalData] = useState([]);
  const [vdxfUniValueModalTitle, setVdxfUniValueModalTitle] = useState("Data");
  const [vdxfUniValueModalVisible, setVdxfUniValueModalVisible] = useState(false);

  const [partialSignDataModalData, setPartialSignDataModalData] = useState(null);
  const [partialSignDataModalTitle, setPartialSignDataModalTitle] = useState("Data");
  const [partialSignDataModalVisible, setPartialSignDataModalVisible] = useState(false);

  const [encryptedDataAccordionOpen, setEncryptedDataAccordionOpen] = useState(true);
  
  const { systemid, signingid, details } = req;

  const friendlyNameMap = new Map(Object.entries(friendlyNames));

  const chainId = req.isSigned() ? getSystemNameFromSystemId(systemid.toAddress()) : null;

  const getVerusId = async (chain, iAddrOrName) => {
    const identity = await getIdentity(CoinDirectory.getBasicCoinObj(chain).system_id, iAddrOrName);

    if (identity.error) throw new Error(identity.error.message);
    else return identity.result;
  }

  const displayIdentityAddress = (addr) => {
    if (friendlyNameMap.has(addr)) return friendlyNameMap.get(addr);
    else return addr;
  }

  const getDisplayUpdates = () => {
    const displayUpdates = {
      [VERUSID_AUTH_INFO.key]: {
        [VERUSID_RECOVERY_AUTH.key]: identityUpdates.recoveryauthority && identityUpdates.recoveryauthority !== identity.recoveryauthority ? {
          data: displayIdentityAddress(identityUpdates.recoveryauthority),
          onPress: () => openVerusIdDetailsModal(coinObj.system_id, identityUpdates.recoveryauthority)
        } : null,
        [VERUSID_REVOCATION_AUTH.key]: identityUpdates.revocationauthority && identityUpdates.revocationauthority !== identity.revocationauthority ? {
          data: displayIdentityAddress(identityUpdates.revocationauthority),
          onPress: () => openVerusIdDetailsModal(coinObj.system_id, identityUpdates.revocationauthority)
        } : null
      },
      [VERUSID_PRIVATE_INFO.key]: {
        [VERUSID_PRIVATE_ADDRESS.key]: identityUpdates.privateaddress && identityUpdates.privateaddress !== identity.privateaddress ? {
          data: displayIdentityAddress(identityUpdates.privateaddress),
          onPress: () => copyToClipboard(
            identityUpdates.privateaddress,
            { message: `${identityUpdates.privateaddress} copied to clipboard.` }
          )
        } : null
      },
      [VERUSID_BASE_INFO.key]: {},
      [VERUSID_CMM_INFO.key]: {}
    }

    if (identityUpdates.primaryaddresses && identityUpdates.primaryaddresses.join(',') !== identity.primaryaddresses.join(',')) {
      for (let i = 0; i < identityUpdates.primaryaddresses.length; i++) {
        displayUpdates[VERUSID_AUTH_INFO.key][`${VERUSID_PRIMARY_ADDRESS.key}:${i}`] = {
          data: identityUpdates.primaryaddresses[i],
          onPress: () => copyToClipboard(
            identityUpdates.primaryaddresses[i],
            { message: `${identityUpdates.primaryaddresses[i]} copied to clipboard.` }
          )
        }
      }
    }

    if (identityUpdates.flags && identityUpdates.flags !== identity.flags) {
      if (subject.isRevoked() !== req.details.identity.isRevoked()) {
        displayUpdates[VERUSID_BASE_INFO.key][VERUSID_STATUS.key] = {
          data: getVerusIdStatus(identityUpdates, chainInfo, coinObj),
        }
      } 
    }

    if (identityUpdates.contentmultimap) {
      for (const key in identityUpdates.contentmultimap) {
        
        if (req.details.containsSignData() && req.details.signdatamap.has(key)) {
          
        } else {
          const dataLabel = getCmmDataLabel(identityUpdates.contentmultimap[key]);

          displayUpdates[VERUSID_CMM_INFO.key][`${VERUSID_CMM_DATA.key}:${key}`] = {
            data: dataLabel,
            onPress: () => {
              const updates = identityUpdates.contentmultimap[key];
  
              return openVdxfUniValueModal(updates.map(x => {
                return {
                  key: Object.keys(x)[0],
                  data: Object.values(x)[0]
                }
              }), getCmmDataKey(key))
            }
          };
        }
      }
    }

    return displayUpdates;
  }

  const getMainHeading = () => {
    const recipientLabel = req.isSigned() ? signerFqn : 'This unsigned request';

    if (req.details.containsSignData()) {
      return `${recipientLabel} is asking to make changes and upload encrypted data into to ${fullyqualifiedname}`
    } else return `${recipientLabel} is asking to make changes to ${fullyqualifiedname}`
  }

  const getExpiryLabel = () => {
    if (!req.details.expires()) return "";

    return blocksToTime(
      req.details.expiryheight.toNumber() - chainInfo.longestchain, 
      coinObj.seconds_per_block
    );
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
    
          return getFriendlyNameMap(CoinDirectory.getBasicCoinObj(chain).system_id, identityObj);
        } catch (e) {
          return {
            ['i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV']: 'VRSC',
            ['iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq']: 'VRSCTEST',
          };
        }
      },
      iAddress,
      chain
    });
  }

  const getCmmDataKey = iAddr => {
    const keyLabel = getVDXFKeyLabel(iAddr, true);

    if (keyLabel == null) {
      if (cmmDataKeys && cmmDataKeys[iAddr]) {
        return cmmDataKeys[iAddr].label;
      } else return iAddr.substring(0, 4) + '...' + iAddr.substring(iAddr.length - 4);
    } else return capitalizeString(keyLabel);
  }

  const openVdxfUniValueModal = (objects, title) => {
    setVdxfUniValueModalTitle(title);
    setVdxfUniValueModalData(objects);
    setVdxfUniValueModalVisible(true);
  }

  const closeVdxfUniValueModal = () => {
    setVdxfUniValueModalVisible(false);
    setVdxfUniValueModalTitle("Data");
    setVdxfUniValueModalData([]);
  }

  const closePartialSignDataModal = () => {
    setPartialSignDataModalVisible(false);
    setPartialSignDataModalTitle("Data");
    setPartialSignDataModalData(null);
  }

  const openPartialSignDataModal = (data, title) => {
    setPartialSignDataModalTitle(title);
    setPartialSignDataModalData(data);
    setPartialSignDataModalVisible(true);
  }

  const [isListSelectionModalVisible, setIsListSelectionModalVisible] = useState(false);
  const [listData, setListData] = useState([]);
  const [mainHeading, setMainHeading] = useState(getMainHeading());
  const [expiryLabel, setExpiryLabel] = useState(getExpiryLabel());
  const [loading, setLoading] = useState(false);
  const [verusIdDetailsModalProps, setVerusIdDetailsModalProps] = useState(null);
  const [sigDateString, setSigDateString] = useState(unixToDate(sigtime));
  const [waitingForSignin, setWaitingForSignin] = useState(false);
  const [displayUpdates, setDisplayUpdates] = useState(getDisplayUpdates())

  const accounts = useObjectSelector(state => state.authentication.accounts);
  
  const signedIn = useSelector(state => state.authentication.signedIn);
  const sendModalType = useSelector(state => state.sendModal.type);
  const isWrongRequestType = useSelector(state => {
    const isTestAccount =
      state.authentication.activeAccount &&
      Object.keys(state.authentication.activeAccount.testnetOverrides).length > 0;

    return (
      state.authentication.signedIn &&
      ((isTestAccount && !req.details.isTestnet()) ||
      (!isTestAccount && req.details.isTestnet()))
    );
  });

  const handleContinue = () => {
    if (signedIn) {
      props.navigation.navigate('IdentityUpdatePaymentConfiguration', { ...props, displayUpdates });
    } else {
      setWaitingForSignin(true);
      const allowList = req.details.isTestnet() ? accounts.filter(x => {
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
          x.testnetOverrides[coinObj.id] != null
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
            req.details.isTestnet() ? 'testnet' : 'mainnet'
          } profiles found, cannot respond to ${
            req.details.isTestnet() ? 'testnet' : 'mainnet'
          } login request.`,
        );
      }
    }
  };
  
  const handleSupportedNetworkSelect = (item) => {
    setIsListSelectionModalVisible(false);
  };

  const wrongRequestType = isTestRequest => {
    createAlert(
      isTestRequest ? 'Testnet Request' : 'Mainnet Request',
      `This request was created for ${
        isTestRequest ? 'testnet' : 'mainnet'
      }, but you are using a ${
        isTestRequest ? 'mainnet' : 'testnet'
      } profile. Please logout, select a ${
        isTestRequest ? 'testnet' : 'mainnet'
      } profile, and retry this request to continue.`,
      [
        {
          text: 'Ok',
          onPress: () => {
            cancel();
            resolveAlert(true);
          },
        },
      ],
      {
        cancelable: false,
      },
    );
  };

  useEffect(() => {
    if (isWrongRequestType) {
      wrongRequestType(req.details.isTestnet());
    }
  }, [])

  useEffect(() => {
    if (signedIn && waitingForSignin) {
      handleContinue();
    }
  }, [signedIn, waitingForSignin]);

  useEffect(() => {
    setMainHeading(getMainHeading())
    setExpiryLabel(getExpiryLabel())
  }, [req]);

  useEffect(() => {
    setReq(primitives.IdentityUpdateRequest.fromJson(deeplinkData))
  }, [deeplinkData]);

  useEffect(() => {
    setSigDateString(unixToDate(sigtime))
  }, [sigtime]);

  useEffect(() => {
    if (sendModalType != AUTHENTICATE_USER_SEND_MODAL) {
      setLoading(false)
    } else setLoading(true)
  }, [sendModalType]);

  return loading ? (
    <AnimatedActivityIndicatorBox />
  ) : (
    <SafeAreaView style={Styles.defaultRoot}>
      <Portal>
        {verusIdDetailsModalProps != null && (
          <VerusIdDetailsModal {...verusIdDetailsModalProps} />
        )}
        {vdxfUniValueModalData.length > 0 && (
          <VdxfUniValueModal 
            objects={vdxfUniValueModalData}
            visible={vdxfUniValueModalVisible}
            title={vdxfUniValueModalTitle}
            setVisible={(x) => setVdxfUniValueModalVisible(x)}
            cancel={closeVdxfUniValueModal}
          />
        )}
        {partialSignDataModalData != null && (
          <VdxfUniValueModal 
            data={partialSignDataModalData}
            objects={[]}
            visible={partialSignDataModalVisible}
            title={partialSignDataModalTitle}
            setVisible={(x) => setPartialSignDataModalVisible(x)}
            cancel={closePartialSignDataModal}
          />
        )}
        {isListSelectionModalVisible && <ListSelectionModal
          visible={isListSelectionModalVisible}
          data={listData}
          onSelect={handleSupportedNetworkSelect}
          cancel={() => setIsListSelectionModalVisible(false)}
          title="Supported Payment Networks"
          flexHeight={1}
        />}
      </Portal>
      <View style={{ flex: 1, width: '100%' }}>
        <ScrollView
          style={Styles.fullWidth}
          contentContainerStyle={{ 
            backgroundColor: Colors.secondaryColor,
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center' 
          }}>
          {/* <VerusPayTextLogo width={'55%'} height={'10%'} /> */}
           <View
              style={Styles.wideBlock}>
              <Text style={{fontSize: 18, textAlign: 'center'}}>{mainHeading}</Text>
            </View>
          <View style={Styles.fullWidth}>
            {(req.details.expires() ||
              req.isSigned()
            ) && <Divider />}
            {
              req.details.expires() && (
                <React.Fragment>
                  <List.Item title={expiryLabel} description={'Expires in approx.'} />
                  <Divider />
                </React.Fragment>
              )
            }
            {
              req.isSigned() && (
                <React.Fragment>
                  <TouchableOpacity
                    onPress={() => openVerusIdDetailsModal(chainId, signingid.toAddress())}>
                    <List.Item
                      title={signerFqn}
                      description={'Signed by'}
                      right={props => <List.Icon {...props} icon={'information'} size={20} />}
                    />
                    <Divider />
                  </TouchableOpacity>
                  <List.Item title={chainId} description={'Signature system'} />
                  <Divider />
                  <List.Item title={sigDateString} description={'Signed on'} />
                  <Divider />
                </React.Fragment>
              )
            }
            {
              req.details.containsSignData() && (
                <List.Accordion
                  title={"Encrypt & Upload"}
                  onPress={() => setEncryptedDataAccordionOpen(!encryptedDataAccordionOpen)}
                  expanded={encryptedDataAccordionOpen}
                  style={{ backgroundColor: Colors.secondaryBackground }}
                >
                  {Array.from(req.details.signdatamap).map(([key, value]) => {
                    const dataLabel = getCmmDataKey(key);

                    return (
                      <TouchableOpacity 
                        onPress={() => openPartialSignDataModal(value, dataLabel)}
                      >
                        <List.Item
                          title={getCmmDataKey(key)}
                          description={'Tap to see information and agree'}
                          right={props => <List.Icon {...props} icon={'information'} size={20} />}
                        />
                        <Divider />
                      </TouchableOpacity>
                    )
                  })}
                </List.Accordion>
              )
            }
          </View>
          <VerusIdObjectData
            verusId={subjectIdentity}
            friendlyNames={friendlyNames}
            updates={displayUpdates}
            hideUnchanged={true}
            scrollDisabled={true}
            containerStyle={{ ...Styles.fullWidth }}
            chainInfo={chainInfo}
            coinObj={coinObj}
            cmmDataKeys={cmmDataKeys}
          />
        </ScrollView>
        <View
          style={{
            paddingHorizontal: 16,
            paddingBottom: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            backgroundColor: '#fff' // or any other background color
          }}>
          <Button
            textColor={Colors.warningButtonColor}
            style={{ width: 148 }}
            onPress={() => cancel()}>
            Cancel
          </Button>
          <Button
            buttonColor={Colors.verusGreenColor}
            textColor={Colors.secondaryColor}
            style={{ width: 148 }}
            disabled={isWrongRequestType}
            onPress={() => handleContinue()}>
            Continue
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default IdentityUpdateRequestInfo;
