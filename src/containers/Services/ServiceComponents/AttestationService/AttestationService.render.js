import React from "react";
import { View, Text } from 'react-native'
import styles from "../../../../styles";
import AnimatedActivityIndicator from "../../../../components/AnimatedActivityIndicator";
import {Divider, List} from 'react-native-paper';

export const VerusAttestationRender = function () {
  return (
    <React.Fragment>
      {(this.props.loading) && (
        <View
          style={{
            ...styles.centerContainer,
            ...styles.backgroundColorWhite,
            width: '100%',
            height: '100%',
            position: 'absolute',
            zIndex: 999,
          }}>
          <AnimatedActivityIndicator
            style={{
              width: 128,
            }}
          />
        </View>
      )}
      {!this.props.loading && (
        <React.Fragment>
        {Object.values(this.state.attestations || {}).length === 0 && (
          <Text style={{fontSize: 20, textAlign: 'center', padding: 20}}>No attestations present</Text>
        )}
        {Object.values(this.state.attestations || {}).map((attestation, index) => {

          return (
            <React.Fragment key={index}>
              <List.Item
                title={attestation?.name}
                description={`Signed by: ${attestation?.signer}`}
                onPress={() => this.viewDetails(attestation)}
                right={props => (
                  <List.Icon {...props} icon={'chevron-right'} size={20} />
                )}
              />
              <Divider />
            </React.Fragment>
          );


        })}
        </React.Fragment>
      )}
    </React.Fragment>
  );
};
