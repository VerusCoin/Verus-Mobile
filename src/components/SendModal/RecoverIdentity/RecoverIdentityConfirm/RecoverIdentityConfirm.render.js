import React from 'react';
import { ScrollView, View, SafeAreaView } from 'react-native';
import { Button } from 'react-native-paper';
import Colors from '../../../../globals/colors';
import Styles from '../../../../styles';
import VerusIdObjectData from '../../../VerusIdObjectData';

export const RecoverIdentityConfirmRender = ({ targetId, friendlyNames, goBack, submitData, ownedByUser, ownedAddress }) => {
  return (
    <SafeAreaView style={{ ...Styles.fullWidth, ...Styles.backgroundColorWhite }}>
      <VerusIdObjectData
        verusId={targetId}
        friendlyNames={friendlyNames}
        ownedByUser={false}
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
              color={Colors.warningButtonColor}
              style={{ width: 148 }}
              onPress={goBack}>
              Back
            </Button>
            <Button
              color={Colors.verusGreenColor}
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
