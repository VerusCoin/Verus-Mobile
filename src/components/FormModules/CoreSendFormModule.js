import React from 'react';
import { View } from 'react-native';
import { Button, TextInput , Text} from 'react-native-paper';
import Colors from '../../globals/colors';
import Styles from '../../styles';
import { useSelector } from 'react-redux';

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
  networkName
}) => {
  const darkMode = useSelector((state)=>state.settings.darkModeState);
  return (
    <React.Fragment>
      <View
        style={{
          ...Styles.wideBlockDense,
          paddingBottom: 2,
          backgroundColor: darkMode
            ? Colors.darkModeColor
            : Colors.secondaryColor,
        }}>
        <TextInput
         style={{ flex: 1,
          backgroundColor:darkMode?Colors.verusDarkModeForm:Colors.ultraUltraLightGrey,
        }}
         theme={{
          colors: {
            text:darkMode
              ? Colors.secondaryColor
              : Colors.verusDarkGray,
            placeholder:darkMode
            ? Colors.verusDarkGray
            : Colors.verusDarkGray,
          }
        }}
          label={sendingFromLabel}
          value={sendingFromValue}
          mode="outlined"
          editable={false}
        />
        {networkName != null ? (
          <Text
            style={{marginTop: 8, fontSize: 14, color: Colors.verusDarkGray}}>
            {`on ${networkName} network`}
          </Text>
        ) : null}
      </View>
      <View style={{...Styles.wideBlockDense, paddingTop: 0, paddingBottom: 2}}>
        <View style={Styles.flexRow}>
          <TextInput
            returnKeyType="done"
            label={recipientAddressLabel}
            value={recipientAddressValue}
            style={{ flex: 1,
              backgroundColor:darkMode?Colors.verusDarkModeForm:Colors.ultraUltraLightGrey,
            }}
             theme={{
              colors: {
                text:darkMode
                  ? Colors.secondaryColor
                  : 'black',
                placeholder:darkMode
                ? Colors.verusDarkGray
                : Colors.verusDarkGray,
              }
            }}
            mode="outlined"
            multiline={true}
            onChangeText={onRecipientAddressChange}
            autoCapitalize={'none'}
            autoCorrect={false}
          />
          <Button
            onPress={onSelfPress}
            color={Colors.primaryColor}
            style={{alignSelf: 'center', marginTop: 6, width: 64}}
            compact>
            {'Self'}
          </Button>
        </View>
      </View>
      <View style={{...Styles.wideBlockDense, paddingTop: 0}}>
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
            style={{ flex: 1,
              backgroundColor:darkMode?Colors.verusDarkModeForm:Colors.ultraUltraLightGrey,
            }}
             theme={{
              colors: {
                text:darkMode
                  ? Colors.secondaryColor
                  : 'black',
                placeholder:darkMode
                  ? Colors.verusDarkGray
                  : Colors.verusDarkGray,
              }
            }}
          />
          <Button
            onPress={onMaxPress}
            color={Colors.primaryColor}
            style={{alignSelf: 'center', marginTop: 6, width: 64}}
            disabled={maxButtonDisabled}
            compact>
            {'Max'}
          </Button>
        </View>
        {estimatedResultSubtitle != null ? (
          <Text
            style={{marginTop: 8, fontSize: 14, color: Colors.verusDarkGray}}>
            {estimatedResultSubtitle}
          </Text>
        ) : null}
      </View>
    </React.Fragment>
  );
};

export default CoreSendFormModule;