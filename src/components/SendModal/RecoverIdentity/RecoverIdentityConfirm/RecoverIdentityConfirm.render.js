import React from 'react';
import { ScrollView, View, SafeAreaView } from 'react-native';
import { Button } from 'react-native-paper';
import Colors from '../../../../globals/colors';
import Styles from '../../../../styles';
import VerusIdObjectData from '../../../VerusIdObjectData';
import { VERUSID_AUTH_INFO, VERUSID_BASE_INFO, VERUSID_PRIMARY_ADDRESS, VERUSID_PRIVATE_ADDRESS, VERUSID_PRIVATE_INFO, VERUSID_RECOVERY_AUTH, VERUSID_REVOCATION_AUTH, VERUSID_STATUS } from '../../../../utils/constants/verusidObjectData';

export const RecoverIdentityConfirmRender = ({ targetId, friendlyNames, goBack, submitData, ownedByUser, ownedAddress, sendModal, revocationAddr, recoveryAddr, primaryAddr, privateAddr }) => {
  return (
    <SafeAreaView style={{ ...Styles.fullWidth, ...Styles.backgroundColorWhite, height: '100%' }}>
      <VerusIdObjectData
        verusId={targetId}
        friendlyNames={friendlyNames}
        ownedByUser={false}
        ownedAddress={ownedAddress}
        updates={{
          [VERUSID_AUTH_INFO.key]: {
            [VERUSID_RECOVERY_AUTH.key]: recoveryAddr ? {
              data: recoveryAddr
            } : null,
            [VERUSID_REVOCATION_AUTH.key]: revocationAddr ? {
              data: revocationAddr
            } : null,
            [`${VERUSID_PRIMARY_ADDRESS.key}:0`]: primaryAddr ? {
              data: primaryAddr
            } : null,
          },
          [VERUSID_PRIVATE_INFO.key]: {
            [VERUSID_PRIVATE_ADDRESS.key]: privateAddr ? {
              data: privateAddr
            } : null,
          },
          [VERUSID_BASE_INFO.key]: {
            [VERUSID_STATUS.key]: {
              data: "Active"
            }
          }
        }}
        StickyFooterComponent={
          <View
            style={{
              backgroundColor: 'white',
              width: '100%',
              flexDirection: 'row',
              justifyContent: 'space-evenly',
              paddingVertical: 20
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
