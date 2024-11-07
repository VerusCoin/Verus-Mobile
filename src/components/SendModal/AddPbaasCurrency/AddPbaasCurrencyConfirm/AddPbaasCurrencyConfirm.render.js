import React from 'react';
import { View, SafeAreaView } from 'react-native';
import { Button } from 'react-native-paper';
import Colors from '../../../../globals/colors';
import Styles from '../../../../styles';
import CurrencyObjectData from '../../../CurrencyObjectData';

export const AddPbaasCurrencyConfirmRender = ({ 
  currency, 
  friendlyNames, 
  goBack, 
  submitData, 
  spotterSystem,
  longestChainOnLaunchSystem }) => {
  return (
    <SafeAreaView style={{ ...Styles.fullWidth, ...Styles.backgroundColorWhite }}>
      <CurrencyObjectData
        currency={currency}
        friendlyNames={friendlyNames}
        longestChainOnLaunchSystem={longestChainOnLaunchSystem}
        spotterSystem={spotterSystem}
        StickyFooterComponent={
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
              style={{ width: 148 }}
              onPress={goBack}>
              Back
            </Button>
            <Button
              buttonColor={Colors.verusGreenColor}
              textColor={Colors.secondaryColor}
              style={{ width: 148 }}
              onPress={submitData}>
              Add
            </Button>
          </View>
        }
      />
    </SafeAreaView>
  );
};
