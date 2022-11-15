import React from "react";
import { View } from 'react-native'
import styles from "../../../../styles";
import AnimatedActivityIndicator from "../../../../components/AnimatedActivityIndicator";
import VerusIdServiceOverview from "./VerusIdServiceOverview/VerusIdServiceOverview";
import VerusIdServiceIntroSlider from "./VerusIdServiceIntroSlider/VerusIdServiceIntroSlider";

export const VerusIdServiceRender = function () {
  return (
    <React.Fragment>
      {(this.props.loading || this.state.linkedIds == null) && (
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
      {!this.props.loading && this.state.linkedIds != null && (
        <React.Fragment>
          {Object.keys(this.state.linkedIds).length > 0 ? (
            <VerusIdServiceOverview
              navigation={this.props.navigation}
              linkedIds={this.state.linkedIds}
            />
          ) : (
            <VerusIdServiceIntroSlider navigation={this.props.navigation} />
          )}
        </React.Fragment>
      )}
    </React.Fragment>
  );
};
