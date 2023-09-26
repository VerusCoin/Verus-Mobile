import React from "react";
import { View } from 'react-native'
import styles from "../../../../styles";
import AnimatedActivityIndicator from "../../../../components/AnimatedActivityIndicator";
import PbaasPreconvertServiceOverview from "./PbaasPreconvertServiceOverview/PbaasPreconvertServiceOverview";

export const PbaasPreconvertServiceRender = ({ navigation, loading, currenciesInPreconvert, refreshCurrenciesInPreconvert }) => {
  return (
    <React.Fragment>
      {(loading || currenciesInPreconvert == null) && (
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
      {!loading && currenciesInPreconvert != null && (
        <React.Fragment>
          <PbaasPreconvertServiceOverview
            navigation={navigation}
            currenciesInPreconvert={currenciesInPreconvert}
            refreshCurrenciesInPreconvert={refreshCurrenciesInPreconvert}
          />
        </React.Fragment>
      )}
    </React.Fragment>
  );
};