import React, {useEffect, useState} from 'react';
import { SafeAreaView, ScrollView, View, Dimensions } from 'react-native';
import { Button, Dialog, Portal, Text, List} from 'react-native-paper';
import { connect } from 'react-redux';
import Colors from '../globals/colors';
import { getIdentity } from '../utils/api/channels/verusid/callCreators';
import { primitives } from 'verusid-ts-client';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const getIdentities = async (identities) => {

  const identity = await Promise.all(identities.map(async (iaddress) => {return await getIdentity(null , iaddress)}));
  console.log(identity);
  return identity;

}

const AttestationModal = (props) => {

  const {visible, loginConsentResponse, attestation, viewOnly, buttons = [], mainTitle } = props;
  const [signers, setSigners] = useState([]);
  const signatures = Object.keys(attestation.signatures);
  let attestationValues = {};
  
  for (let [key, value] of attestation.components) {
    if (primitives.ATTESTATION_IDENTITY_DATA[value.attestationKey]) {
      attestationValues[primitives.ATTESTATION_IDENTITY_DATA[value.attestationKey].detail] = value.value;
    }
  }

  useEffect(() => {
    getIdentities(signatures).then((identities) => setSigners(identities));
    
  }, []);

  const title = attestationValues["Document Type"] || '' ;

  const { height } = Dimensions.get('window');
  const dialogContentMaxHeight = height * 0.6; // Adjust this value as needed

  return (
    <SafeAreaView>
      <Portal>
        <Dialog
          dismissable={!!viewOnly === true}
          visible={visible}
          onDismiss={viewOnly ? cancel : () => {}}
          style={{ maxHeight: '100%', marginBottom: 36 }}
        >
          <Dialog.Title>
            <View style={{flex: 1, flexDirection: 'row'}}>
              <MaterialCommunityIcons name={'text-box-check'} size={50} color={Colors.primaryColor} style={{ width: 50, marginRight: 9, alignSelf: 'flex-end', }} />
              <Text>{mainTitle}</Text>
            </View>
          </Dialog.Title>
          <Dialog.Content style={{ maxHeight: dialogContentMaxHeight }}>
            <ScrollView>
              <Text>{`Issuer: ${signers.map((id) => id.fullyqualifiedname ).join("\n")}`}</Text>
              <Text>Type: {title}</Text>
                <List.Section>
                  {Object.entries(attestationValues).map(([key, value]) => (
                    <List.Item key={value} title={value} description={key} />
                  ))}
                </List.Section>
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
              {buttons != null
                ? buttons.map((button, index) => (
                    <Button
                      disabled={button.disabled || viewOnly}
                      onPress={button.onPress}
                      color={Colors.primaryColor}
                      key={index}
                    >
                      {button.text}
                    </Button>
                  ))
                : null}
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );

};

const mapStateToProps = (state) => {
  return {
    activeAlert: state.alert.active,
  };
};

export default connect(mapStateToProps)(AttestationModal);