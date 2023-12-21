import React, { useEffect, useState } from 'react';
import { Clipboard, FlatList, TouchableOpacity, Alert, View, Image } from 'react-native';
import { Text, List, Divider, Button, Paragraph } from 'react-native-paper';
import Colors from '../globals/colors';
import Styles from '../styles';
import { VerusIdWallet, Revoke, Recover, Coins } from '../images/customIcons';
import Icon from 'react-native-vector-icons/FontAwesome';
import AnimatedSuccessCheckmark from "./AnimatedSuccessCheckmark";

const idWarningParams = [
  {
    icon: <Image source={Coins} style={{ aspectRatio: 1, height: 80 }} />,
    title: "Spend and Sign",
    text: ["Owned by you", "Funds can be spent by other addresses"]
  },
  {
    icon: <Image source={Revoke} style={{ aspectRatio: 1.1, height: 80 }} />,
    title: "Revoke",
    text: ["Set to this ID", "Set to another ID"]
  },
  {
    icon: <Image source={Recover} style={{ aspectRatio: 1, height: 80 }} />,
    title: "Recover",
    text: ["Set to this ID", "Set to another ID"]
  },
]

export default function VerusIdObjectData(props) {
  const { friendlyNames, verusId, StickyFooterComponent, flex } = props;
  const [listData, setListData] = useState([]);
  const [idWarnings, setIdWarnings] = useState([true, false, true]);

  tryDisplayFriendlyName = iAddr => {
    return friendlyNames[iAddr] ? friendlyNames[iAddr] : iAddr;
  };

  copyDataToClipboard = (data, name) => {
    Clipboard.setString(data);

    Alert.alert(`${name} Copied`, `${data} copied to clipboard.`);
  };

  useEffect(() => {
    const tmpWarnings = [true, true, true];
    if (verusId.identity.primaryaddresses.length > 1) {
      tmpWarnings[0] = false;
    }

    if(verusId.identity.revocationauthority === verusId.identity.identityaddress) {
      tmpWarnings[1] = false;
    }

    if(verusId.identity.recoveryauthority === verusId.identity.identityaddress) {
      tmpWarnings[2] = false;
    }
    setIdWarnings(tmpWarnings);
  }, []);

  useEffect(() => {
    if (friendlyNames != null && verusId != null) {
      let data = [
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

      if (verusId.identity.privateaddress) {
        data.push({
          key: 'Private Address',
          data: verusId.identity.privateaddress,
          onPress: () =>
            copyDataToClipboard(
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

      setListData(data);
    }
  }, [verusId, friendlyNames]);

  copyDataToClipboard = (data, name) => {
    Clipboard.setString(data);

    Alert.alert(`${name} Copied`, `${data} copied to clipboard.`);
  };

  const triangle = (
    <View style={{ justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: 20, height: 20, marginRight: 5, marginTop: 5 }} />
      <Icon name="exclamation-triangle" color="black" size={20} style={{ position: 'absolute' }} />
      <Icon name="exclamation-triangle" color="yellow" size={18} style={{ position: 'absolute' }} />
      <Icon name="exclamation" size={9} color="black" style={{ position: 'absolute' }} />
    </View>
  );

  const checkmark = (<AnimatedSuccessCheckmark style={{ width: 20, marginRight: 5, marginTop: 1 }} />);

  return (
    <View style={flex ? { ...Styles.fullWidth, flex: 1 } : { ...Styles.fullWidth, height: "100%" }}>
      <View
        style={{
          backgroundColor: 'white',
          width: '100%',
          flexDirection: 'row',
          justifyContent: 'space-evenly',
          paddingVertical: 20,
        }}>
        {idWarningParams.map((item, index) => {
          return (
            <View style={{ alignItems: 'center', width: "30%" }} key={index}>
              {item.icon}
              <Paragraph style={{ textAlign: 'center', textDecorationLine: 'underline', fontWeight: 'bold', marginTop: 10 }}>{item.title}</Paragraph>
              <View style={{ flexDirection: 'row', marginTop: 10, alignItems: 'flex-start' }}>
                  {idWarnings[index] ? checkmark : triangle}
                <Paragraph style={{paddingHorizontal:5}}>{item.text[idWarnings[index] ? 0 : 1]}</Paragraph>
              </View>
            </View>
          )
        })}
      </View>
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
                    description={item.key}
                    titleNumberOfLines={item.numLines || 1}
                    titleStyle={
                      item.capitalized
                        ? Styles.capitalizeFirstLetter
                        : undefined
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
