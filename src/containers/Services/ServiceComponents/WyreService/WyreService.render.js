import React from "react";
import { View } from 'react-native'
import styles from "../../../../styles";
import WyreServiceIntroSlider from "./WyreServiceIntroSlider/WyreServiceIntroSlider";
import AnimatedActivityIndicator from "../../../../components/AnimatedActivityIndicator";
import { WYRE_SERVICE } from "../../../../utils/constants/intervalConstants";
import WyreServiceAccount from "./WyreServiceAccount/WyreServiceAccount";

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
      {this.props.encryptedSeeds[WYRE_SERVICE] != null ? (
        <WyreServiceAccount
          navigation={this.props.navigation}
          setLoading={(loading, callback) => this.setLoading(loading, callback)}
        />
      ) : (
        <WyreServiceIntroSlider
          setLoading={(loading, callback) => this.setLoading(loading, callback)}
          navigation={this.props.navigation}
        />
      )}
    </React.Fragment>
  );
};
