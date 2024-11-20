import React from 'react';
import { ScrollView, View, SafeAreaView } from 'react-native';
import { Button } from 'react-native-paper';
import Colors from '../../../../globals/colors';
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
              Link
            </Button>
          </View>
        }
      />
    </SafeAreaView>
  );
};
