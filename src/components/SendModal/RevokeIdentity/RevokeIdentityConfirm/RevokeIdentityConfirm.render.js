import React from 'react';
import {Text} from 'react-native-paper';
import { ScrollView, View, SafeAreaView } from 'react-native';
import Button from '../../../Button';
import Colors from '../../../../globals/colors';
import Styles from '../../../../styles';
import VerusIdObjectData from '../../../VerusIdObjectData';

export const RevokeIdentityConfirmRender = ({ fee, feeCurrency, targetId, friendlyNames, goBack, submitData, ownedByUser, ownedAddress }) => {
  return (
    <SafeAreaView style={{ ...Styles.fullWidth, ...Styles.backgroundColorWhite, height: '100%' }}>
      <VerusIdObjectData
        verusId={targetId}
        friendlyNames={friendlyNames}
        ownedByUser={false}
        ownedAddress={ownedAddress}
        updates={{
          ["Status"]: {
            data: "Revoked"
          }
        }}
        StickyFooterComponent={
          <View
            style={{
              backgroundColor: 'white',
              width: '100%',
              flexDirection: 'column',
              justifyContent: 'space-evenly',
              paddingVertical: 20
            }}>
            <Text style={{textAlign: 'center', marginBottom: 12}}>Network fee: {fee} {feeCurrency}</Text>
            <View style={{flexDirection: 'row', justifyContent: 'space-evenly'}}>
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
              Revoke
            </Button>
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
};
