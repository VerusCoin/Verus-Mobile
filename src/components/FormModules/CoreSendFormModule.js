import React from 'react';
import { View } from 'react-native';
import { Button, TextInput , Text} from 'react-native-paper';
import Colors from '../../globals/colors';
import Styles from '../../styles';

const CoreSendFormModule = ({
  sendingFromLabel = "Sending from",
  sendingFromValue,
  recipientAddressLabel = "Recipient address",
  recipientAddressValue,
  onRecipientAddressChange,
  onSelfPress,
  amountLabel = "Amount",
  amountValue,
  onAmountChange,
  onMaxPress,
  maxButtonDisabled = false,
  estimatedResultSubtitle = null,
  networkName,
  destDisabled,
  amountDisabled
}) => {
  return (
    <React.Fragment>
      <View style={{ ...Styles.wideBlockDense, paddingBottom: 2 }}>
        <TextInput
          label={sendingFromLabel}
          value={sendingFromValue}
          mode="outlined"
          disabled={true}
        />
        {
          networkName != null ? (
            <Text style={{marginTop: 8, fontSize: 14, color: Colors.verusDarkGray}}>
              {`on ${networkName} network`}
            </Text>
          ) : null
        }
      </View>
      <View style={{ ...Styles.wideBlockDense, paddingTop: 0, paddingBottom: 2 }}>
        <View style={Styles.flexRow}>
          <TextInput
            returnKeyType="done"
            label={recipientAddressLabel}
            value={recipientAddressValue}
            mode="outlined"
            onChangeText={onRecipientAddressChange}
            autoCorrect={false}
            style={{ flex: 1 }}
            disabled={destDisabled}
          />
          {
            !destDisabled && (
              <Button
                onPress={onSelfPress}
                textColor={Colors.primaryColor}
                style={{alignSelf: 'center', marginTop: 6, width: 64}}
                compact>
                {'Self'}
              </Button>
            )
          }
        </View>
      </View>
      <View style={{ ...Styles.wideBlockDense, paddingTop: 0 }}>
        <View style={Styles.flexRow}>
          <TextInput
            returnKeyType="done"
            label={amountLabel}
            keyboardType={'decimal-pad'}
            autoCapitalize={'none'}
            autoCorrect={false}
            value={amountValue}
            mode="outlined"
            onChangeText={onAmountChange}
            style={{ flex: 1 }}
            disabled={amountDisabled}
          />
          {
            !amountDisabled && (
              <Button
                onPress={onMaxPress}
                textColor={Colors.primaryColor}
                style={{alignSelf: 'center', marginTop: 6, width: 64}}
                disabled={maxButtonDisabled}
                compact>
                {'Max'}
              </Button>
            )
          }
        </View>
        {
          estimatedResultSubtitle != null ? (
            <Text style={{marginTop: 8, fontSize: 14, color: Colors.verusDarkGray}}>
              {estimatedResultSubtitle}
            </Text>
          ) : null
        }
      </View>
    </React.Fragment>
  );
};

export default CoreSendFormModule;