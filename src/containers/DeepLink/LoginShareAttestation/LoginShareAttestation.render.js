import React from "react";
import { SafeAreaView, ScrollView, View } from "react-native";
import { Divider, List, Button, Text } from "react-native-paper";

import Styles from "../../../styles";

import Colors from '../../../globals/colors';

export const LoginShareAttestationRender = function (props) {

  return (
    <SafeAreaView style={Styles.defaultRoot}>
      <ScrollView
        style={Styles.fullWidth}
        contentContainerStyle={Styles.focalCenter}>
        <View style={Styles.fullWidth}>

          <Text style={{ fontSize: 20, textAlign: 'center', paddingBottom: 20 }}>
            Agree to share the following attestation data.
          </Text>
          <Text style={{ fontSize: 20, textAlign: 'center', paddingBottom: 20 }}>
            {`Attestation Name: `}<Text style={{ fontSize: 20, color: Colors.primaryColor, fontWeight: 'bold', marginVertical: 5, }}>{`${this.state.attestationName}`}</Text>
          </Text>
          {this.state.attestationAcceptedAttestors && <Text style={{ fontSize: 20, textAlign: 'center', paddingBottom: 20 }}>
            {`From: `}<Text style={{ fontSize: 20, color: Colors.primaryColor, fontWeight: 'bold', marginVertical: 5, }}>{`${this.state.attestationAcceptedAttestors[0]}`}</Text>
          </Text>}


          {this.state.attestationRequestedFields.map(request => {
            return (
              <React.Fragment key={request}>
                <List.Item
                  title={request}
                   key={request}
                />
                <Divider />
              </React.Fragment>

            );
          })}


        </View>
      </ScrollView>
      <View
        style={{
          ...Styles.fullWidthBlock,
          paddingHorizontal: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          display: 'flex',
        }}>
        <Button
          color={Colors.warningButtonColor}
          style={{ width: 148 }}
          onPress={() => this.cancel()}>
          Cancel
        </Button>
        <Button
          color={Colors.verusGreenColor}
          style={{ width: 148 }}
          onPress={() => this.handleContinue()}>
          Accept
        </Button>
      </View>
    </SafeAreaView>
  );
};
