import React, { useEffect, useState } from 'react';
import { Clipboard, FlatList, TouchableOpacity, Alert, View, Image, ScrollView } from 'react-native';
import { Text, List, Divider, Paragraph } from 'react-native-paper';
import Colors from '../globals/colors';
import Styles from '../styles';
import { Revoke, Recover, Coins } from '../images/customIcons';
import { openUrl } from "../utils/linking";
import AnimatedSuccessCheckmark from "./AnimatedSuccessCheckmark";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getVerusIdStatus } from '../utils/verusid/getVerusIdStatus';
import { 
  VERUSID_AUTH_INFO, 
  VERUSID_BASE_INFO, 
  VERUSID_CMM_DATA, 
  VERUSID_CMM_INFO, 
  VERUSID_IADDRESS, 
  VERUSID_NAME, 
  VERUSID_PRIMARY_ADDRESS, 
  VERUSID_PRIVATE_ADDRESS, 
  VERUSID_PRIVATE_INFO, 
  VERUSID_RECOVERY_AUTH, 
  VERUSID_REVOCATION_AUTH, 
  VERUSID_STATUS, 
  VERUSID_SYSTEM, 
  VERUSID_WARNING_RECOVER, 
  VERUSID_WARNING_REVOKE, 
  VERUSID_WARNING_SPEND_AND_SIGN, 
  VERUSID_WARNINGS 
} from '../utils/constants/verusidObjectData';
import { getCmmDataLabel } from '../utils/vdxf/cmmDataLabel';
import { getVDXFKeyLabel } from '../utils/vdxf/vdxfTypeLabels';
import { capitalizeString } from '../utils/stringUtils';

const checkmark = (<AnimatedSuccessCheckmark style={{ width: 20, marginRight: 5, marginBottom: 1, alignSelf: 'flex-end', }} />);

const triangle = <MaterialCommunityIcons name={'information'} size={20} color={Colors.warningButtonColor} style={{ width: 20, marginRight: 9, alignSelf: 'flex-end', }} />;

export default function VerusIdObjectData(props) {
  const { 
    friendlyNames, 
    verusId, 
    StickyFooterComponent, 
    flex, 
    ownedByUser, 
    ownedAddress, 
    updates, 
    hideUnchanged, 
    scrollDisabled, 
    containerStyle,
    hideDataOnLoad,
    chainInfo,
    coinObj,
    cmmDataKeys,
    extraListItems
  } = props;
  
  const [listData, setListData] = useState([]);
  const [expandedAccordions, setExpandedAccordions] = useState({});

  const getDisplayUpdates = () => {
    const updateFrame = {
      [VERUSID_BASE_INFO.key]: {},
      [VERUSID_AUTH_INFO.key]: {},
      [VERUSID_PRIVATE_INFO.key]: {},
      [VERUSID_CMM_INFO.key]: {},
      [VERUSID_WARNINGS.key]: {}
    }

    if (updates) {
      for (const groupKey in updates) {
        updateFrame[groupKey] = updates[groupKey];
      }
    }

    return updateFrame
  };

  const [displayUpdates, setDisplayUpdates] = useState(getDisplayUpdates());

  tryDisplayFriendlyName = iAddr => {
    return friendlyNames[iAddr] ? friendlyNames[iAddr] : iAddr;
  };

  const getCmmDataKey = iAddr => {
    const keyLabel = getVDXFKeyLabel(iAddr, true);

    if (keyLabel == null) {
      if (cmmDataKeys && cmmDataKeys[iAddr]) {
        return cmmDataKeys[iAddr].label;
      } else return iAddr.substring(0, 4) + '...' + iAddr.substring(iAddr.length - 4);
    } else return capitalizeString(keyLabel);
  }

  copyDataToClipboard = (data, name) => {
    Clipboard.setString(data);

    Alert.alert(`${name} Copied`, `${data} copied to clipboard.`);
  };

  const getWarningData = () => {
    const tmpwarningData = [{
      key: VERUSID_WARNING_SPEND_AND_SIGN.key,
      title: VERUSID_WARNING_SPEND_AND_SIGN.label,
      data: 'Owned by you',
      onPress: () => openUrl('https://docs.verus.io/verusid/#multisig'),
      warning: false,
      condition: 'warning',
      icon: (<Image source={Coins} style={{ aspectRatio: 1, height: 50, width: 50, alignSelf: 'center' }} />),
      status: checkmark
    }, {
      key: VERUSID_WARNING_REVOKE.key,
      title: VERUSID_WARNING_REVOKE.label,
      data: 'Set to this ID',
      onPress: () => openUrl('https://docs.verus.io/verusid/#revoke-recover'),
      warning: false,
      condition: 'warning',
      icon: <Image source={Revoke} style={{ aspectRatio: 1.1, height: 50, width: 50, alignSelf: 'center' }} />,
      status: checkmark
    }, {
      key: VERUSID_WARNING_RECOVER.key,
      title: VERUSID_WARNING_RECOVER.label,
      data: 'Set to this ID',
      onPress: () => openUrl('https://docs.verus.io/verusid/#revoke-recover'),
      warning: false,
      condition: 'warning',
      icon: <Image source={Recover} style={{ aspectRatio: 1, height: 50, width: 45, alignSelf: 'center' }} />,
      status: checkmark
    }];

    if ((ownedAddress && verusId.identity.primaryaddresses.length > 1) || (ownedAddress && !verusId.identity.primaryaddresses.includes(ownedAddress))) {
      tmpwarningData[0].warning = true;
      tmpwarningData[0].data = 'Funds can be spent by other addresses, see primary addresses below';
      tmpwarningData[0].status = triangle;
    }

    if (verusId.identity.revocationauthority !== verusId.identity.identityaddress) {
      let tmpRevAddr = `${tryDisplayFriendlyName(verusId.identity.revocationauthority)} `;
      if (tmpRevAddr.length > 30) { 
        tmpRevAddr = "[revocation ID listed below]"
      } 
      tmpwarningData[1].warning = true;
      tmpwarningData[1].data = (<Text style={{ color: 'red'}}>{`Set to another VerusID, `}<Text style={{color: Colors.primaryColor}}>{tmpRevAddr}</Text> {`can revoke access to funds and signing`}</Text>)
      tmpwarningData[1].status = triangle;
    }

    if (verusId.identity.recoveryauthority !== verusId.identity.identityaddress) {
      let tmpRecAddr = `${tryDisplayFriendlyName(verusId.identity.recoveryauthority)} `;
      if (tmpRecAddr.length > 30) { 
        tmpRecAddr = "[recovery ID listed below]"
      } 
      tmpwarningData[2].warning = true;
      tmpwarningData[2].data = (<Text style={{ color: 'red'}}>{`Set to another VerusID, `}<Text style={{color: Colors.primaryColor}}>{tmpRecAddr}</Text> {`can change ID ownership`}</Text>)
      tmpwarningData[2].status = triangle;
    }
    return tmpwarningData;
  };

  useEffect(() => {
    if (friendlyNames != null && verusId != null) {
      let warningData = ownedByUser ? getWarningData() : [];
      
      const baseInfo = [
        {
          key: VERUSID_NAME.key,
          title: VERUSID_NAME.label,
          data: verusId.identity.name,
          onPress: () => copyDataToClipboard(verusId.identity.name, VERUSID_NAME.label),
        },
        {
          key: VERUSID_IADDRESS.key,
          title: VERUSID_IADDRESS.label,
          data: verusId.identity.identityaddress,
          onPress: () => copyDataToClipboard(verusId.identity.identityaddress, VERUSID_IADDRESS.label),
        },
        {
          key: VERUSID_STATUS.key,
          title: VERUSID_STATUS.label,
          data: chainInfo && coinObj ? getVerusIdStatus(verusId.identity, chainInfo, coinObj.seconds_per_block) : verusId.status,
          capitalized: true,
        },
        {
          key: VERUSID_SYSTEM.key,
          title: VERUSID_SYSTEM.label,
          data: tryDisplayFriendlyName(verusId.identity.systemid).replace(/@/g, ''),
          onPress: () => copyDataToClipboard(verusId.identity.systemid, VERUSID_SYSTEM.label),
        },
      ];
  
      const authorityInfo = [
        {
          key: VERUSID_REVOCATION_AUTH.key,
          title: VERUSID_REVOCATION_AUTH.label,
          data: tryDisplayFriendlyName(verusId.identity.revocationauthority),
          onPress: () => copyDataToClipboard(verusId.identity.revocationauthority, VERUSID_REVOCATION_AUTH.label),
        },
        {
          key: VERUSID_RECOVERY_AUTH.key,
          title: VERUSID_RECOVERY_AUTH.label,
          data: tryDisplayFriendlyName(verusId.identity.recoveryauthority),
          onPress: () => copyDataToClipboard(verusId.identity.recoveryauthority, VERUSID_RECOVERY_AUTH.label),
        },
      ];

      const privacyData = [];
      if (verusId.identity.privateaddress || (displayUpdates[VERUSID_PRIVATE_INFO.key][VERUSID_PRIVATE_ADDRESS.key])) {
        privacyData.push({
          key: VERUSID_PRIVATE_ADDRESS.key,
          title: VERUSID_PRIVATE_ADDRESS.label,
          data: verusId.identity.privateaddress || null,
          onPress: verusId.identity.privateaddress
            ? () => copyDataToClipboard(verusId.identity.privateaddress, VERUSID_PRIVATE_ADDRESS.key)
            : undefined,
        });
      }
  
      const primaryAddresses = [];
      const primaryAddressUpdates = Object.keys(displayUpdates[VERUSID_AUTH_INFO.key])
        .map(x => (x.split(":")[0] === VERUSID_PRIMARY_ADDRESS.key) ? displayUpdates[VERUSID_AUTH_INFO.key][x] : undefined)
        .filter(x => !!x);
      const primaryAddrs = verusId.identity.primaryaddresses;

      const numPrimaryAddrs = primaryAddrs.length > 
        primaryAddressUpdates.length ? 
          primaryAddrs.length 
          : 
          primaryAddressUpdates.length;
      
      for (let i = 0; i < numPrimaryAddrs; i++) {
        primaryAddresses.push({
          key: `${VERUSID_PRIMARY_ADDRESS.key}:${i}`,
          title: `${VERUSID_PRIMARY_ADDRESS.label} ${i + 1}`,
          data: primaryAddrs[i] ? primaryAddrs[i] : 'None',
          onPress: primaryAddrs[i]
            ? () => copyDataToClipboard(primaryAddrs[i], 'Primary Address')
            : undefined,
        });
      }

      primaryAddresses.sort((a, b) => b.key.localeCompare(a.key));

      const contentMultiMapInfo = {};

      if (verusId.identity.contentmultimap) {
        for (const iAddrKey in verusId.identity.contentmultimap) {
          const shortIAddr = getCmmDataKey(iAddrKey);

          contentMultiMapInfo[`${VERUSID_CMM_DATA.key}:${iAddrKey}`] = {
            key: `${VERUSID_CMM_DATA.key}:${iAddrKey}`,
            title: shortIAddr,
            data: getCmmDataLabel(verusId.identity.contentmultimap[iAddrKey]),
            dataInDescription: true
          };
        }
      }

      for (const key in displayUpdates[VERUSID_CMM_INFO.key]) {
        if (!contentMultiMapInfo[key]) {
          const iAddr = key.split(':')[1];
          const shortIAddr = getCmmDataKey(iAddr);
          
          contentMultiMapInfo[key] = {
            key,
            title: shortIAddr,
            data: displayUpdates[VERUSID_CMM_INFO.key][key].data,
            hideOldData: true,
            dataInDescription: true
          };
        }
      }
  
      // Build grouped data
      const groupedData = [
        { key: VERUSID_WARNINGS.key, title: VERUSID_WARNINGS.label, items: warningData },
        { key: VERUSID_BASE_INFO.key, title: VERUSID_BASE_INFO.label, items: baseInfo },
        { key: VERUSID_CMM_INFO.key, title: VERUSID_CMM_INFO.label, items: Object.values(contentMultiMapInfo) },
        { key: VERUSID_AUTH_INFO.key, title: VERUSID_AUTH_INFO.label, items: authorityInfo.concat(primaryAddresses) },
        { key: VERUSID_PRIVATE_INFO.key, title: VERUSID_PRIVATE_INFO.label, items: privacyData },
      ];
  
      // Filter out unchanged if hideUnchanged is true
      const finalGroups = groupedData.map(group => {
        const filtered = group.items.filter(item => {
          if (!hideUnchanged) return true;
          else return item.key && displayUpdates[group.key][item.key];
        }).sort((a, b) => {
          if (displayUpdates[group.key][a.key]) return -1;
          else if (displayUpdates[group.key][b.key]) return 1;
          return 1;
        });
        return { ...group, items: filtered };
      });
  
      setListData(finalGroups);

      if (!hideDataOnLoad) {
        const initialExpandedState = {};
        finalGroups.forEach((group, idx) => {
          initialExpandedState[idx] = true;
        });
        setExpandedAccordions(initialExpandedState);
      }
    }
  }, [verusId, friendlyNames]);

  copyDataToClipboard = (data, name) => {
    Clipboard.setString(data);

    Alert.alert(`${name} Copied`, `${data} copied to clipboard.`);
  };

  return (
    <View style={containerStyle ? containerStyle : flex ? { ...Styles.fullWidth, flex: 1 } : { ...Styles.fullWidth, height: "100%" }}>
      {scrollDisabled ? (
        /* No scrolling */
        <List.Section>
          { extraListItems }
          {listData.map((group, idx) => group.items.length > 0 && (
            <List.Accordion
              key={idx}
              title={group.title}
              expanded={expandedAccordions[idx]}
              onPress={() => setExpandedAccordions({ ...expandedAccordions, [idx]: !expandedAccordions[idx] })}
              style={{ backgroundColor: Colors.secondaryBackground }}
            >
              {group.items.map((item, index) => {
                return (
                  <React.Fragment key={index}>
                    <List.Item
                      title={
                        displayUpdates[group.key][item.key]
                          ? `${item.dataInDescription ? item.title : displayUpdates[group.key][item.key].data}`
                          : item.dataInDescription ? item.title : item.data
                      }
                      titleStyle={
                        displayUpdates[group.key][item.key] ? { color: 'green' } : {}
                      }
                      titleNumberOfLines={100}
                      description={() =>
                        displayUpdates[group.key][item.key] ? (
                          <>
                            {
                              item.data != null && !item.hideOldData && 
                              (<Text style={{ color: Colors.warningButtonColor }}>{item.dataInDescription ? item.title : item.data}</Text>)
                            }
                            <Text style={{ color: Colors.verusDarkGray }}>{item.dataInDescription ? displayUpdates[group.key][item.key].data : item.title}</Text>
                          </>
                        ) : (
                          <Text style={{ color: Colors.verusDarkGray }}>{item.dataInDescription ? item.data : item.title}</Text>
                        )
                      }
                      onPress={
                        displayUpdates[group.key][item.key] && 
                        displayUpdates[group.key][item.key].onPress ? 
                          displayUpdates[group.key][item.key].onPress 
                          : 
                          item.onPress
                      }
                    />
                    <Divider />
                  </React.Fragment>
                )
              })}
            </List.Accordion>
          ))}
        </List.Section>
      ) : (
        /* Enable scrolling */
        <ScrollView>
          <List.Section>
            { extraListItems }
            {listData.map((group, idx) => group.items.length > 0 && (
              <List.Accordion
                key={idx}
                title={group.title}
                expanded={expandedAccordions[idx]}
                onPress={() => setExpandedAccordions({ ...expandedAccordions, [idx]: !expandedAccordions[idx] })}
                style={{ backgroundColor: Colors.secondaryBackground }}
              >
                {group.items.map((item, index) => (
                  <React.Fragment key={index}>
                    <List.Item
                      title={
                        displayUpdates[group.key][item.key]
                          ? `${item.dataInDescription ? item.title : displayUpdates[group.key][item.key].data}`
                          : item.dataInDescription ? item.title : item.data
                      }
                      titleStyle={
                        displayUpdates[group.key][item.key] ? { color: 'green' } : {}
                      }
                      titleNumberOfLines={100}
                      description={() =>
                        displayUpdates[group.key][item.key] ? (
                          <>
                            {
                              item.data != null && !item.hideOldData && 
                              (<Text style={{ color: Colors.warningButtonColor }}>{item.dataInDescription ? item.title : item.data}</Text>)
                            }
                            <Text style={{ color: Colors.verusDarkGray }}>{item.dataInDescription ? item.data : item.title}</Text>
                          </>
                        ) : (
                          <Text style={{ color: Colors.verusDarkGray }}>{item.dataInDescription ? item.data : item.title}</Text>
                        )
                      }
                      onPress={
                        displayUpdates[group.key][item.key] && 
                        displayUpdates[group.key][item.key].onPress ? 
                          displayUpdates[group.key][item.key].onPress 
                          : 
                          item.onPress
                      }
                    />
                    <Divider />
                  </React.Fragment>
                ))}
              </List.Accordion>
            ))}
          </List.Section>
        </ScrollView>
      )}
      {StickyFooterComponent != null ? StickyFooterComponent : null}
    </View>
  );
}
