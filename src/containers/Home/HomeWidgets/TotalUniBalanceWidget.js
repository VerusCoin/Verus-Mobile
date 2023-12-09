import React, {useState, useEffect} from 'react';
import {View, Dimensions, TouchableOpacity} from 'react-native';
import {Card, Paragraph} from 'react-native-paper';
import {useDispatch, useSelector} from 'react-redux';
import {USD} from '../../../utils/constants/currencies';
import {formatCurrency} from 'react-native-format-currency';
import Colors from '../../../globals/colors';

const TotalUniBalanceWidget = props => {
  const {totalBalance} = props;
  const {width} = Dimensions.get('window');
  const dispatch = useDispatch();
  const showBalance = useSelector(state => state.coins.showBalance);

  const displayCurrency = useSelector(state =>
    state.settings.generalWalletSettings.displayCurrency
      ? state.settings.generalWalletSettings.displayCurrency
      : USD,
  );

  const [uniValueDisplay, setUniValueDisplay] = useState('-');

  useEffect(() => {
    if (totalBalance != null && displayCurrency != null) {
      const [valueFormattedWithSymbol, valueFormattedWithoutSymbol, symbol] =
        formatCurrency({
          amount: Number(totalBalance.toFixed(2)),
          code: displayCurrency,
        });

      setUniValueDisplay(valueFormattedWithSymbol);
    }
  }, [totalBalance, displayCurrency]);

  return (
    <Card
      style={{
        height: 110,
        width: width / 2 - 16,
        borderRadius: 10,
        backgroundColor: Colors.ultraUltraLightGrey,
        position: 'relative',
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
        {showBalance ? (
          <Paragraph style={{fontSize: 16, paddingTop: 8, fontWeight: '500'}}>
            {uniValueDisplay}
          </Paragraph>
        ) : (
          <Paragraph style={{fontSize: 16, paddingTop: 8, fontWeight: '500'}}>
            ********
          </Paragraph>
        )}
      </Card.Content>
    </Card>
  );
};

export default TotalUniBalanceWidget;
