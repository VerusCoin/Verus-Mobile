import React from 'react';
import { ScrollView, View, SafeAreaView } from 'react-native';
import { Button } from 'react-native-paper';
import Colors from '../../../../globals/colors';
import Styles from '../../../../styles';
import VerusIdObjectData from '../../../VerusIdObjectData';

export const RecoverIdentityConfirmRender = ({ targetId, friendlyNames, goBack, submitData, ownedByUser, ownedAddress, sendModal, revocationAddr, recoveryAddr, primaryAddr, privateAddr }) => {
  return (
    <SafeAreaView style={{ ...Styles.fullWidth, ...Styles.backgroundColorWhite }}>
      <VerusIdObjectData
        verusId={targetId}
        friendlyNames={friendlyNames}
        ownedByUser={false}
        ownedAddress={ownedAddress}
        updates={{
          ['Recovery Authority']: recoveryAddr ? {
            data: recoveryAddr
          } : null,
          ['Revocation Authority']: revocationAddr ? {
            data: revocationAddr
          } : null,
          ['Private Address']: privateAddr ? {
            data: privateAddr
          } : null,
          ['Primary Address #1']: primaryAddr ? {
            data: primaryAddr
          } : null,
          ["Status"]: {
            data: "Active"
          }
        }}
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
              Recover
            </Button>
          </View>
        }
      />
    </SafeAreaView>
  );
};
