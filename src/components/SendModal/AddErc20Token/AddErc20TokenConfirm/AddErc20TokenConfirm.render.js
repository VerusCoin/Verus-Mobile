import React from 'react';
import { View, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { List, Text, Divider, Button } from 'react-native-paper';
import Colors from '../../../../globals/colors';
import Styles from '../../../../styles';
import { copyToClipboard } from '../../../../utils/clipboard/clipboard';

export const AddErc20TokenConfirmRender = ({ 
  contract,
  goBack,
  submitData
}) => {
  return (
    <SafeAreaView style={{ ...Styles.fullWidth, ...Styles.backgroundColorWhite }}>
      <View style={{...Styles.fullWidth, ...Styles.fullHeight}}>
        <FlatList
          style={{...Styles.fullWidth}}
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
          data={[
            {
              key: 'Contract Address',
              data: contract.address,
              numLines: 100,
              onPress: () => copyToClipboard(
                contract.address, {title: 'Address copied', message: `${contract.address} copied to clipboard.`}
              ),
            },
            {
              key: 'Token Symbol',
              data: contract.symbol,
              numLines: 100,
              onPress: () => copyToClipboard(
                contract.symbol, {title: 'Symbol copied', message: `${contract.symbol} copied to clipboard.`}
              ),
            },
            {
              key: 'Token Name',
              data: contract.name,
              numLines: 100,
              onPress: () => copyToClipboard(
                contract.name, {title: 'Name copied', message: `${contract.name} copied to clipboard.`}
              ),
            },
            {
              key: 'Token Decimals',
              data: contract.decimals,
              numLines: 100,
              onPress: () => copyToClipboard(
                contract.decimals, {title: 'Decimals copied', message: `${contract.decimals} copied to clipboard.`}
              ),
            }
          ]}
        />
        <View
          style={{
            position: 'absolute',
            backgroundColor: 'white',
            width: '100%',
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            paddingVertical: 20,
            bottom: 0,
          }}>
          <Button
            textColor={Colors.warningButtonColor}
            style={{width: 148}}
            onPress={goBack}>
            Back
          </Button>
          <Button
            buttonColor={Colors.verusGreenColor}
            textColor={Colors.secondaryColor}
            style={{width: 148}}
            onPress={submitData}>
            Add
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};
