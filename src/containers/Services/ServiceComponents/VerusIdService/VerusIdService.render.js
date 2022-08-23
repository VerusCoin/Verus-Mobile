import React from "react";
import { View } from 'react-native'
import styles from "../../../../styles";
import AnimatedActivityIndicator from "../../../../components/AnimatedActivityIndicator";

export const VerusIdServiceRender = function () {
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
    </React.Fragment>
  );
};
