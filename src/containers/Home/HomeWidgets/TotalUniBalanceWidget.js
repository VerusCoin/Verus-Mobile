import React, { useState, useEffect } from 'react';
import { View, Dimensions } from 'react-native';
import { Card, Paragraph } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { USD } from '../../../utils/constants/currencies';
import { formatCurrency } from "react-native-format-currency";
import Colors from '../../../globals/colors';

const TotalUniBalanceWidget = props => {
  const {totalBalance} = props;
  const {width} = Dimensions.get('window');

  const displayCurrency = useSelector(state =>
    state.settings.generalWalletSettings.displayCurrency
      ? state.settings.generalWalletSettings.displayCurrency
      : USD,
  );

  const [uniValueDisplay, setUniValueDisplay] = useState('-');

  useEffect(() => {
    if (totalBalance != null && displayCurrency != null) {
      const [valueFormattedWithSymbol, valueFormattedWithoutSymbol, symbol] =
        formatCurrency({amount: totalBalance, code: displayCurrency});

      setUniValueDisplay(valueFormattedWithSymbol);
    }
  }, [totalBalance, displayCurrency]);

  return (
    <Card
      style={{
        height: 110,
        width: width / 2 - 16,
        borderRadius: 10,
        backgroundColor: Colors.secondaryColor
      }}
      mode="outlined">
      <Card.Content>
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
          }}>
          <Paragraph style={{fontSize: 16, fontWeight: 'bold'}}>
            {'Total value'}
          </Paragraph>
        </View>
        <Paragraph style={{fontSize: 16, paddingTop: 8, fontWeight: '500'}}>
          {uniValueDisplay}
        </Paragraph>
      </Card.Content>
    </Card>
  );
};

export default TotalUniBalanceWidget;