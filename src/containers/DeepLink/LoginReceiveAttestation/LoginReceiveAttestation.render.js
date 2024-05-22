import React from "react";
import { SafeAreaView, ScrollView, View, Image } from "react-native";
import { Divider, List, Button, Text } from "react-native-paper";
import Styles from "../../../styles";
import Colors from '../../../globals/colors';
import {convertFqnToDisplayFormat} from '../../../utils/fullyqualifiedname';

export const LoginReceiveAttestationRender = function (props) {

  return (
    <SafeAreaView style={Styles.defaultRoot}>
      <ScrollView
        style={Styles.fullWidth}
        contentContainerStyle={Styles.focalCenter}>
        <View style={Styles.fullWidth}>

          <Text style={{ fontSize: 20, textAlign: 'center', paddingBottom:20 }}>
            Agree to Receive the following attestation.
          </Text>
          <Text style={{ fontSize: 20, textAlign: 'center', paddingBottom:20, fontWeight: 'bold' }}>
            {`${convertFqnToDisplayFormat(this.state.attestationName)}`}
          </Text>
          <Text style={{ fontSize: 20, textAlign: 'center', paddingBottom:20 }}>
            {`From: `}<Text style={{ fontSize: 20, color: Colors.primaryColor, fontWeight: 'bold', marginVertical: 5, }}>{`${this.state.signerFqn}`}</Text>
          </Text>
          {this.state.attestationData && Object.keys(this.state.attestationData).map(request => {
            return (
              <React.Fragment key={request}>
                <List.Item
                  title={request}
                  description={ this.state.attestationData[request]?.message }
                  key={request}
                  right={() => this.state.attestationData[request]?.image ? <List.Icon icon={{ uri: this.state.attestationData[request]?.image }} /> : null}
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
