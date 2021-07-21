import React from "react";
import { View } from 'react-native'
import styles from "../../../../styles";
import WyreServiceIntroSlider from "./WyreServiceIntroSlider/WyreServiceIntroSlider";
import AnimatedActivityIndicator from "../../../../components/AnimatedActivityIndicator";
import { WYRE_SERVICE } from "../../../../utils/constants/intervalConstants";

export const WyreServiceRender = function () {
  return (
    <React.Fragment>
      {this.state.loading && (
        <View
          style={{
            ...styles.centerContainer,
            ...styles.backgroundColorWhite,
            width: "100%",
            height: "100%",
            position: "absolute",
            zIndex: 999,
          }}
        >
          <AnimatedActivityIndicator
            style={{
              width: 128,
            }}
          />
        </View>
      )}
      {this.props.encryptedSeeds[WYRE_SERVICE] != null ? null : (
        <WyreServiceIntroSlider
          setLoading={(loading, callback) => this.setLoading(loading, callback)}
          navigation={this.props.navigation}
        />
      )}
    </React.Fragment>
  );
};
