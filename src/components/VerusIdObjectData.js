import React, { useEffect, useState } from "react"
import {
  Clipboard,
  FlatList,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Text, List, Divider } from "react-native-paper";
import Styles from "../styles";

export default function VerusIdObjectData(props) {
  const { friendlyNames, verusId, ListFooterComponent } = props
  const [listData, setListData] = useState([]);

  tryDisplayFriendlyName = (iAddr) => {
    return friendlyNames[iAddr] ? friendlyNames[iAddr] : iAddr;
  }

  copyDataToClipboard = (data, name) => {
    Clipboard.setString(data);

    Alert.alert(`${name} Copied`, `${data} copied to clipboard.`);
  };

  useEffect(() => {
    if (friendlyNames != null && verusId != null) {      
      let data = [
        {
          key: 'Name',
          data: verusId.identity.name,
          onPress: () =>
            copyDataToClipboard(verusId.identity.name, 'Name'),
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
          capitalized: true
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
            copyDataToClipboard(
              verusId.identity.recoveryauthority,
              'Recovery',
            ),
        },
        {
          key: 'System',
          data: tryDisplayFriendlyName(verusId.identity.systemid),
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

  return (
    <FlatList
      ListFooterComponent={ListFooterComponent}
      style={Styles.fullWidth}
      renderItem={({item}) => {
        if (item.condition == null || item.condition === true)
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
                    item.capitalized ? Styles.capitalizeFirstLetter : undefined
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
        else return null;
      }}
      data={listData}
    />
  );
}