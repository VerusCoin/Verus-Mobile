import React, { useEffect, useState } from 'react';
import { Clipboard, FlatList, TouchableOpacity, Alert, View, Image } from 'react-native';
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
  const { friendlyNames, verusId, StickyFooterComponent, flex, ownedByUser, ownedAddress, updates } = props;
  const [listData, setListData] = useState([]);
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

    if (verusId.identity.primaryaddresses.length > 1 || !verusId.identity.primaryaddresses.includes(ownedAddress)) {
      tmpwarningData[0].warning = true;
      tmpwarningData[0].data = 'Funds can be spent by other addresses, see primary addresses below';
      tmpwarningData[0].status = triangle;
    }

    if (verusId.identity.revocationauthority !== verusId.identity.identityaddress) {
      let tmpRecAddr = `${tryDisplayFriendlyName(verusId.identity.recoveryauthority)} `;
      if (tmpRecAddr.length > 30) { 
        tmpRecAddr = "[recovery ID listed below]"
      } 
      tmpwarningData[1].warning = true;
      tmpwarningData[1].data = (<Text style={{ color: 'red'}}>{`Set to another VerusID, `}<Text style={{color: Colors.primaryColor}}>{tmpRecAddr}</Text> {`can revoke access to funds and signing`}</Text>)
      tmpwarningData[1].status = triangle;
    }

    if (verusId.identity.recoveryauthority !== verusId.identity.identityaddress) {
      let tmpRevAddr = `${tryDisplayFriendlyName(verusId.identity.revocationauthority)} `;
      if (tmpRevAddr.length > 30) { 
        tmpRevAddr = "[revocation ID listed below]"
      } 
      tmpwarningData[2].warning = true;
      tmpwarningData[2].data = (<Text style={{ color: 'red'}}>{`Set to another VerusID, `}<Text style={{color: Colors.primaryColor}}>{tmpRevAddr}</Text> {`can change ID ownership`}</Text>)
      tmpwarningData[2].status = triangle;
    }
    return tmpwarningData;
  };

  useEffect(() => {
    if (friendlyNames != null && verusId != null) {

      let warningData = ownedByUser ? getWarningData() : [];

      let data = [...warningData,
      {
        key: 'Name',
        data: verusId.identity.name,
        onPress: () => copyDataToClipboard(verusId.identity.name, 'Name'),
      },
      {
        key: 'i-Address',
        data: verusId.identity.identityaddress,
        onPress: () =>
          copyDataToClipboard(verusId.identity.identityaddress, 'Address'),
      },
      {
        key: 'Status',
        data: verusId.status,
        capitalized: true,
      },
      {
        key: 'Revocation Authority',
        data: tryDisplayFriendlyName(verusId.identity.revocationauthority),
        onPress: () =>
          copyDataToClipboard(
            verusId.identity.revocationauthority,
            'Revocation',
          ),
      },
      {
        key: 'Recovery Authority',
        data: tryDisplayFriendlyName(verusId.identity.recoveryauthority),
        onPress: () =>
          copyDataToClipboard(verusId.identity.recoveryauthority, 'Recovery'),
      },
      {
        key: 'System',
        data: tryDisplayFriendlyName(verusId.identity.systemid).replace(/@/g, ''),
        onPress: () =>
          copyDataToClipboard(verusId.identity.systemid, 'System ID'),
      },
      ];

      if (verusId.identity.privateaddress || (updates && updates['Private Address'])) {
        data.push({
          key: 'Private Address',
          data: !verusId.identity.privateaddress ? "None" : verusId.identity.privateaddress,
          onPress: !verusId.identity.privateaddress ? undefined : () => copyDataToClipboard(
            verusId.identity.privateaddress,
            'Private Address',
          ),
        });
      }

      for (let i = 0; i < verusId.identity.primaryaddresses.length; i++) {
        data.push({
          key: `Primary Address #${i + 1}`,
          data: verusId.identity.primaryaddresses[i],
          onPress: () =>
            copyDataToClipboard(
              verusId.identity.primaryaddresses[i],
              'Primary Address',
            ),
        });
      }

      setListData(updates ? data.sort((a, b) => {
        if (updates[a.key]) return -1
        else if (updates[b.key]) return 1
        else return 1
      }) : data);
    }
  }, [verusId, friendlyNames]);

  copyDataToClipboard = (data, name) => {
    Clipboard.setString(data);

    Alert.alert(`${name} Copied`, `${data} copied to clipboard.`);
  };



  return (
    <View style={flex ? { ...Styles.fullWidth, flex: 1 } : { ...Styles.fullWidth, height: "100%" }}>
      <FlatList
        style={flex ? { ...Styles.fullWidth, flex: 1 } : { ...Styles.fullWidth }}
        contentContainerStyle={{ paddingBottom: 152 }}
        renderItem={({ item }) => {
          if (item.condition == null || item.condition === true) {
            return (
              <React.Fragment>
                <TouchableOpacity
                  disabled={item.onPress == null}
                  onPress={() => item.onPress()}>
                  <List.Item
                    title={item.data}
                    description={updates && updates[item.key] ? `Current ${item.key.toLowerCase()}` : item.key}
                    titleNumberOfLines={item.numLines || 1}
                    titleStyle={
                      {...(item.capitalized
                        ? Styles.capitalizeFirstLetter
                        : {}),
                        color: updates && updates[item.key] ? Colors.warningButtonColor : Colors.quaternaryColor
                      }
                    }
                    right={props =>
                      item.right ? (
                        <Text
                          {...props}
                          style={{
                            fontSize: 16,
                            alignSelf: 'center',
                            marginRight: 8,
                          }}>
                          {item.right}
                        </Text>
                      ) : null
                    }
                  />
                  <Divider />
                </TouchableOpacity>
                {updates && updates[item.key] &&
                  <>
                    <List.Item
                      title={updates[item.key].data}
                      description={`New ${item.key.toLowerCase()}`}
                      titleNumberOfLines={item.numLines || 1}
                      titleStyle={
                        {...(item.capitalized
                          ? Styles.capitalizeFirstLetter
                          : {}),
                          color: Colors.verusGreenColor
                        }
                      }
                      right={props =>
                        item.right ? (
                          <Text
                            {...props}
                            style={{
                              fontSize: 16,
                              alignSelf: 'center',
                              marginRight: 8,
                            }}>
                            {item.right}
                          </Text>
                        ) : null
                      }
                    />
                    <Divider />
                  </>
                }
              </React.Fragment>
            );
          } else if (item.condition == 'warning') {
            return (
              <React.Fragment>
                <TouchableOpacity
                  disabled={item.onPress == null}
                  onPress={() => item.onPress()}>
                  <List.Item
                    title={item.data}
                    description={item.key}
                    titleNumberOfLines={item.numLines || 3}
                    titleStyle={{ textAlign: 'left', color: item.warning ? 'red' : 'black', width: '100%' }}
                    right={props =>
                      <View style={{ width: '20%', flexDirection: 'row', alignContent: 'flex-end', justifyContent: 'flex-end', }}>
                        {item.status}
                        <Paragraph style={{
                          fontSize: 12,
                          textDecorationLine: 'underline',
                          marginRight: 8,
                          alignSelf: 'flex-end',
                          color: 'grey'
                        }}>
                          Learn more
                        </Paragraph>
                      </View>
                    }
                    left={() =>
                      <View style={{ width: '15%', justifyContent: 'center', flexDirection: 'row' }}>
                        {item.icon}
                      </View>}
                  />
                  <Divider />
                </TouchableOpacity>
              </React.Fragment>
            );
          } else {
            return null;
          }
        }}
        data={listData}
      />
      {StickyFooterComponent != null ? StickyFooterComponent : null}
    </View>
  );
}
