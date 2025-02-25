import React, { useEffect, useState } from 'react';
import { Clipboard, FlatList, TouchableOpacity, Alert, View, Image, ScrollView } from 'react-native';
import { Text, List, Divider, Paragraph } from 'react-native-paper';
import Colors from '../globals/colors';
import Styles from '../styles';
import { Revoke, Recover, Coins } from '../images/customIcons';
import { openUrl } from "../utils/linking";
import AnimatedSuccessCheckmark from "./AnimatedSuccessCheckmark";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

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
    hideDataOnLoad
  } = props;
  
  const [listData, setListData] = useState([]);
  const [expandedAccordions, setExpandedAccordions] = useState({});

  tryDisplayFriendlyName = iAddr => {
    return friendlyNames[iAddr] ? friendlyNames[iAddr] : iAddr;
  };

  copyDataToClipboard = (data, name) => {
    Clipboard.setString(data);

    Alert.alert(`${name} Copied`, `${data} copied to clipboard.`);
  };

  const getWarningData = () => {
    const tmpwarningData = [{
      key: 'Spend and Sign',
      data: 'Owned by you',
      onPress: () => openUrl('https://docs.verus.io/verusid/#multisig'),
      warning: false,
      condition: 'warning',
      icon: (<Image source={Coins} style={{ aspectRatio: 1, height: 50, width: 50, alignSelf: 'center' }} />),
      status: checkmark
    }, {
      key: 'Revoke',
      data: 'Set to this ID',
      onPress: () => openUrl('https://docs.verus.io/verusid/#revoke-recover'),
      warning: false,
      condition: 'warning',
      icon: <Image source={Revoke} style={{ aspectRatio: 1.1, height: 50, width: 50, alignSelf: 'center' }} />,
      status: checkmark
    }, {
      key: 'Recover',
      data: 'Set to this ID',
      onPress: () => openUrl('https://docs.verus.io/verusid/#revoke-recover'),
      warning: false,
      condition: 'warning',
      icon: <Image source={Recover} style={{ aspectRatio: 1, height: 50, width: 45, alignSelf: 'center' }} />,
      status: checkmark
    }];

    if (ownedAddress && verusId.identity.primaryaddresses.length > 1 || !verusId.identity.primaryaddresses.includes(ownedAddress)) {
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
          key: 'Name',
          data: verusId.identity.name,
          onPress: () => copyDataToClipboard(verusId.identity.name, 'Name'),
        },
        {
          key: 'i-Address',
          data: verusId.identity.identityaddress,
          onPress: () => copyDataToClipboard(verusId.identity.identityaddress, 'Address'),
        },
        {
          key: 'Status',
          data: verusId.status,
          capitalized: true,
        },
        {
          key: 'System',
          data: tryDisplayFriendlyName(verusId.identity.systemid).replace(/@/g, ''),
          onPress: () => copyDataToClipboard(verusId.identity.systemid, 'System ID'),
        },
      ];
  
      const authorityInfo = [
        {
          key: 'Revocation Authority',
          data: tryDisplayFriendlyName(verusId.identity.revocationauthority),
          onPress: () => copyDataToClipboard(verusId.identity.revocationauthority, 'Revocation'),
        },
        {
          key: 'Recovery Authority',
          data: tryDisplayFriendlyName(verusId.identity.recoveryauthority),
          onPress: () => copyDataToClipboard(verusId.identity.recoveryauthority, 'Recovery'),
        },
      ];

      const privacyData = [];
      if (verusId.identity.privateaddress || (updates && updates['Private Address'])) {
        privacyData.push({
          key: 'Private Address',
          data: verusId.identity.privateaddress || null,
          onPress: verusId.identity.privateaddress
            ? () => copyDataToClipboard(verusId.identity.privateaddress, 'Private Address')
            : undefined,
        });
      }
  
      const primaryAddresses = [];
      const primaryAddressUpdates = updates
        ? Object.keys(updates)
            .map(x => x.startsWith('Primary Address') ? updates[x] : undefined)
            .filter(x => !!x)
        : [];
      const primaryAddrs = verusId.identity.primaryaddresses;

      const numPrimaryAddrs = primaryAddrs.length > 
        primaryAddressUpdates.length ? 
          primaryAddrs.length 
          : 
          primaryAddressUpdates.length;
      
      for (let i = 0; i < numPrimaryAddrs; i++) {
        const key = `Primary Address #${i + 1}`;
        primaryAddresses.push({
          key,
          data: primaryAddrs[i] ? primaryAddrs[i] : 'None',
          onPress: primaryAddrs[i]
            ? () => copyDataToClipboard(primaryAddrs[i], 'Primary Address')
            : undefined,
        });
      }

      primaryAddresses.sort((a, b) => b.key.localeCompare(a.key));
  
      // Build grouped data
      const groupedData = [
        { title: 'Warnings', items: warningData },
        { title: 'Identity Info', items: baseInfo },
        { title: 'Authorities', items: authorityInfo.concat(primaryAddresses) },
        { title: 'Private Address', items: privacyData },
      ];
  
      // Filter out unchanged if hideUnchanged is true
      const finalGroups = groupedData.map(group => {
        const filtered = group.items.filter(item => {
          if (!hideUnchanged) return true;
          else return item.key && updates && updates[item.key];
        }).sort((a, b) => {
          if (updates && updates[a.key]) return -1;
          else if (updates && updates[b.key]) return 1;
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
                      updates && updates[item.key]
                        ? `${updates[item.key].data}`
                        : item.data
                    }
                    titleStyle={
                      updates && updates[item.key] ? { color: 'green' } : {}
                    }
                    titleNumberOfLines={100}
                    description={() =>
                      updates && updates[item.key] ? (
                        <>
                          {
                            item.data != null && 
                            (<Text style={{ color: Colors.warningButtonColor }}>{item.data}</Text>)
                          }
                          <Text style={{ color: Colors.verusDarkGray }}>{item.key}</Text>
                        </>
                      ) : (
                        <Text style={{ color: Colors.verusDarkGray }}>{item.key}</Text>
                      )
                    }
                    onPress={
                      updates && 
                      updates[item.key] && 
                      updates[item.key].onPress ? 
                        updates[item.key].onPress 
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
      ) : (
        /* Enable scrolling */
        <ScrollView>
          <List.Section>
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
                        updates && updates[item.key]
                          ? `${updates[item.key].data}`
                          : item.data
                      }
                      titleStyle={
                        updates && updates[item.key] ? { color: 'green' } : {}
                      }
                      titleNumberOfLines={100}
                      description={() =>
                        updates && updates[item.key] ? (
                          <>
                            {
                              item.data != null && 
                              (<Text style={{ color: Colors.warningButtonColor }}>{item.data}</Text>)
                            }
                            <Text style={{ color: Colors.verusDarkGray }}>{item.key}</Text>
                          </>
                        ) : (
                          <Text style={{ color: Colors.verusDarkGray }}>{item.key}</Text>
                        )
                      }
                      onPress={
                        updates && 
                        updates[item.key] && 
                        updates[item.key].onPress ? 
                          updates[item.key].onPress 
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
