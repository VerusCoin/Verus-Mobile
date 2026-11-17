import React from 'react';
import { ScrollView, View } from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Button} from 'react-native-paper';
import Colors from '../../../../globals/colors';
import AppButton from '../../../AppButton';
import Styles from '../../../../styles';
import VerusIdObjectData from '../../../VerusIdObjectData';

export const LinkIdentityConfirmRender = ({ verusId, friendlyNames, goBack, submitData, ownedByUser, ownedAddress }) => {
  return (
    <SafeAreaView style={{ ...Styles.fullWidth, ...Styles.backgroundColorWhite }}>
      <VerusIdObjectData
        verusId={verusId}
        friendlyNames={friendlyNames}
        ownedByUser={ownedByUser}
        ownedAddress={ownedAddress}
        StickyFooterComponent={
          <View
            style={{
              backgroundColor: 'white',
              width: '100%',
              flexDirection: 'row',
              justifyContent: 'space-evenly',
              paddingVertical: 20
            }}>
            <AppButton
              variant="secondary"
              style={{ width: 148 }}
              onPress={goBack}>
              Back
            </AppButton>
            <Button
              buttonColor={Colors.verusGreenColor}
              textColor={Colors.secondaryColor}
              style={{ width: 148 }}
              onPress={submitData}>
              Link
            </Button>
          </View>
        }
      />
    </SafeAreaView>
  );
};
