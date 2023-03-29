import React from 'react';
import {ScrollView, View, SafeAreaView} from 'react-native';
import {Button} from 'react-native-paper';
import Colors from '../../../../globals/colors';
import Styles from '../../../../styles';
import VerusIdObjectData from '../../../VerusIdObjectData';

export const LinkIdentityConfirmRender = function () {
  return (
    <SafeAreaView style={{...Styles.fullWidth, ...Styles.backgroundColorWhite}}>
      <VerusIdObjectData
        verusId={this.state.verusId}
        friendlyNames={this.state.friendlyNames}
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
              style={{width: 148}}
              onPress={() => this.goBack()}>
              Back
            </Button>
            <Button
              color={Colors.verusGreenColor}
              style={{width: 148}}
              onPress={() => this.submitData()}>
              Link
            </Button>
          </View>
        }
      />
    </SafeAreaView>
  );
};
