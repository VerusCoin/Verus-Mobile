import React from 'react';
import { View, SafeAreaView } from 'react-native';
import { Button, Divider, List } from 'react-native-paper';
import Colors from '../../../../globals/colors';
import Styles from '../../../../styles';
import VerusIdObjectData from '../../../VerusIdObjectData';
import { SEND_MODAL_IDENTITY_UPDATE_CHAIN_INFO, SEND_MODAL_IDENTITY_UPDATE_CMM_DATA_KEYS, SEND_MODAL_IDENTITY_UPDATE_SUBJECT_ID, SEND_MODAL_IDENTITY_UPDATE_UPDATES } from '../../../../utils/constants/sendModal';

export const UpdateIdentityConfirmRender = ({ goBack, submitData, ownedAddress, sendModal, friendlyNames, fee, feeCurrency }) => {
  return (
    <SafeAreaView style={{ ...Styles.fullWidth, ...Styles.backgroundColorWhite, height: '100%' }}>
      <VerusIdObjectData
        verusId={sendModal.data[SEND_MODAL_IDENTITY_UPDATE_SUBJECT_ID]}
        friendlyNames={friendlyNames}
        chainInfo={sendModal.data[SEND_MODAL_IDENTITY_UPDATE_CHAIN_INFO]}
        cmmDataKeys={sendModal.data[SEND_MODAL_IDENTITY_UPDATE_CMM_DATA_KEYS]}
        ownedByUser={false}
        hideUnchanged={true}
        ownedAddress={ownedAddress}
        updates={sendModal.data[SEND_MODAL_IDENTITY_UPDATE_UPDATES]}
        extraListItems={
          <React.Fragment>
            <List.Item
              title={`${fee} ${friendlyNames[feeCurrency] ? friendlyNames[feeCurrency].replace('@', '') : feeCurrency}`}
              description={"Fee"}
              titleNumberOfLines={100}
            />
            <Divider />
          </React.Fragment>
        }
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
              Update
            </Button>
          </View>
        }
      />
    </SafeAreaView>
  );
};
