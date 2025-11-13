import React, {useEffect, useState} from 'react';
import {Clipboard, FlatList, TouchableOpacity, Alert, View} from 'react-native';
import {Text, List, Divider} from 'react-native-paper';
import Styles from '../styles';
import { IS_FRACTIONAL_FLAG, IS_GATEWAY_FLAG, IS_TOKEN_FLAG } from '../utils/constants/currencies';
import { blocksToTime } from '../utils/math';

export default function CurrencyObjectData(props) {
  const {
    friendlyNames,
    currency,
    StickyFooterComponent,
    flex,
    spotterSystem,
    longestChainOnLaunchSystem,
    blockTimeOnLaunchSystem
  } = props;

  const [listData, setListData] = useState([]);

  tryDisplayFriendlyName = iAddr => {
    return friendlyNames[iAddr] ? friendlyNames[iAddr] : iAddr;
  };

  copyDataToClipboard = (data, name) => {
    Clipboard.setString(data);

    Alert.alert(`${name} Copied`, `${data} copied to clipboard.`);
  };

  useEffect(() => {
    if (friendlyNames != null && currency != null) {
      const isGateway = (currency.options & IS_GATEWAY_FLAG) == IS_GATEWAY_FLAG;
      const isToken = (currency.options & IS_TOKEN_FLAG) == IS_TOKEN_FLAG;
      const isReserve = (currency.options & IS_FRACTIONAL_FLAG) == IS_FRACTIONAL_FLAG;
      const finalStartBlock = currency.launchsystemid !== spotterSystem ? 1 : currency.startblock;
      const isPending = longestChainOnLaunchSystem != null ? finalStartBlock > longestChainOnLaunchSystem : false;
      const age = longestChainOnLaunchSystem - finalStartBlock;
      const isFailed =
        !isPending &&
        currency.minpreconversion != null &&
        currency.minpreconversion.length > 0 &&
        currency.minpreconversion.every(n => n > 0) &&
        (currency.bestcurrencystate && currency.bestcurrencystate.supply === 0);
      const spendableTo =
        !isFailed &&
        (isReserve ||
          (isPending &&
            currency.conversions != null &&
            currency.conversions.length > 0));
      const status = isFailed ? "failed" : isPending ? "pending" : "active";
      const preConvert = spendableTo && age < 0;
      const isMapped = currency.proofprotocol === 3 && currency.nativecurrencyid != null;

      const data = [
        {
          key: 'Name',
          data: currency.fullyqualifiedname,
          onPress: () => copyDataToClipboard(currency.fullyqualifiedname, 'Name'),
        },
        {
          key: 'Status',
          numLines: 100,
          data:
            longestChainOnLaunchSystem == null
              ? 'Unknown'
              : status === 'pending'
              ? `${preConvert ? 'Preconvert' : 'Pending'} - ${
                  -1 * age
                } blocks (~${blocksToTime(-1 * age, blockTimeOnLaunchSystem)}) until start`
              : status === 'failed'
              ? 'Failed to Launch'
              : (currency.startblock != 0 ? `Active (~${blocksToTime(Math.abs(age), blockTimeOnLaunchSystem)} old)` : 'Active'),
        },
        {
          key: 'Type',
          data:
            currency.endblock === 0
              ? `Permanent ${
                  isToken ? (isGateway ? 'Gateway' : 'Token') : 'Blockchain'
                }`
              : `Temporary ${
                  isToken ? (isGateway ? 'Gateway' : 'Token') : 'Blockchain'
                } (exists until ${tryDisplayFriendlyName(currency.parent)} block ${
                  currency.endblock
                })`,
        },
        {
          key: 'i-Address',
          data: currency.currencyid,
          onPress: () => copyDataToClipboard(currency.currencyid, 'i-Address'),
        },
        {
          key: 'System',
          data: tryDisplayFriendlyName(currency.systemid),
          onPress: () => copyDataToClipboard(currency.systemid, 'System'),
        },
      ];


      if (currency.preallocations && currency.preallocations.length > 0) {
        data.push({
          key: 'Preallocated?',
          data: `Yes, a part of this currency's supply was allocated to preselected addresses before launch.`,
          numLines: 100
        });
      }

      if (currency.proofprotocol === 2) {
        data.push({
          key: 'Centralized Minting?',
          data: `Yes, this currency can be minted by a controlling identity.`,
          numLines: 100
        });
      }

      if (!isMapped && currency.bestcurrencystate) {
        data.push({
          key: 'Current Supply',
          data: `${currency.bestcurrencystate.supply} ${currency.fullyqualifiedname}`,
          onPress: () =>
            copyDataToClipboard(
              `${currency.bestcurrencystate.supply} ${currency.fullyqualifiedname}`,
              'Supply',
            ),
        });
      }

      setListData(data);
    }
  }, [currency, friendlyNames]);

  copyDataToClipboard = (data, name) => {
    Clipboard.setString(data);

    Alert.alert(`${name} Copied`, `${data} copied to clipboard.`);
  };

  return (
    <View style={flex ? {...Styles.fullWidth, flex: 1} : {...Styles.fullWidth, ...Styles.fullHeight}}>
      <FlatList
        style={flex ? {...Styles.fullWidth, flex: 1} : {...Styles.fullWidth}}
        contentContainerStyle={{paddingBottom: 152}}
        renderItem={({item}) => {
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
