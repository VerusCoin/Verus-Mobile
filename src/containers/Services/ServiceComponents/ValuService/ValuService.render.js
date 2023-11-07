import React from "react";
import { View } from 'react-native'
import styles from "../../../../styles";
import ValuServiceIntroSlider from "./ValuServiceIntroSlider/ValuServiceIntroSlider";
import AnimatedActivityIndicator from "../../../../components/AnimatedActivityIndicator";
import { VALU_SERVICE } from "../../../../utils/constants/intervalConstants";
import ValuServiceAccount from "./ValuServiceAccount/ValuServiceAccount";

export const ValuServiceRender = function () {
  return (
    <React.Fragment>
      {this.props.loading && (
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
      {this.props.encryptedSeeds[VALU_SERVICE] != null ? (
       <ValuServiceAccount
        navigation={this.props.navigation}
        />
      ) : (
        <ValuServiceIntroSlider
        navigation={this.props.navigation}
        />
      )}
    </React.Fragment>
  );
};