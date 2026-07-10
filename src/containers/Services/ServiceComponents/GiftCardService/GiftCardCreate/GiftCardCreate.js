import React, {useEffect, useState} from 'react';
import {
  Alert,
  Keyboard,
  SafeAreaView,
  ScrollView,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
import {useSelector} from 'react-redux';
import {modifyServiceStoredDataForUser} from '../../../../../actions/actions/services/dispatchers/services';
import {requestServiceStoredData} from '../../../../../utils/auth/authBox';
import {GIFT_CARD_SERVICE_ID} from '../../../../../utils/constants/services';
import {
  createGiftCard,
  normalizeGiftCardServiceData,
} from '../../../../../utils/giftCard/giftCard';
import Colors from '../../../../../globals/colors';
import Styles from '../../../../../styles';

const GiftCardCreate = props => {
  const activeAccount = useSelector(state => state.authentication.activeAccount);
  const activeCoinsForUser = useSelector(state => state.coins.activeCoinsForUser);
  const [label, setLabel] = useState('');
  const [encrypted, setEncrypted] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    props.navigation.setOptions({title: 'Create Gift Card'});
  }, [props.navigation]);

  const submit = async () => {
    if (encrypted) {
      if (!password) {
        Alert.alert('Error', 'Enter a claim password for this gift card.');
        return;
      }

      if (password !== confirmPassword) {
        Alert.alert('Error', 'Claim password and confirmation do not match.');
        return;
      }
    }

    setLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 0));

      const requestIsTestnet =
        activeAccount?.testnetOverrides != null &&
        Object.keys(activeAccount.testnetOverrides).length > 0;
      const card = await createGiftCard({
        label,
        password: encrypted ? password : undefined,
        requestIsTestnet,
        activeCoinsForUser,
      });
      const current = normalizeGiftCardServiceData(
        await requestServiceStoredData(GIFT_CARD_SERVICE_ID),
      );

      await modifyServiceStoredDataForUser(
        {
          ...current,
          introSeen: true,
          cards: {
            ...current.cards,
            [card.id]: card,
          },
        },
        GIFT_CARD_SERVICE_ID,
        activeAccount.accountHash,
      );

      props.navigation.goBack();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={Styles.defaultRoot}>
        <ScrollView
          contentContainerStyle={{
            ...Styles.centerContainer,
            flexGrow: 1,
            paddingHorizontal: 32,
          }}
          style={{...Styles.fullWidth, ...Styles.backgroundColorWhite}}>
          <ActivityIndicator animating color={Colors.primaryColor} size="large" />
          <Text
            style={{
              color: Colors.verusDarkGray,
              fontSize: 18,
              fontWeight: 'bold',
              marginTop: 24,
              textAlign: 'center',
            }}>
            Creating gift card...
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={Styles.defaultRoot}>
        <ScrollView
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          style={{...Styles.fullWidth, ...Styles.backgroundColorWhite}}
          contentContainerStyle={{
            flexGrow: 1,
            padding: 16,
            paddingBottom: 48,
          }}>
          <Text
            style={{
              color: Colors.primaryColor,
              fontSize: 22,
              fontWeight: 'bold',
              marginBottom: 16,
            }}>
            Create Gift Card
          </Text>
          <TextInput
            label="Label"
            mode="outlined"
            value={label}
            onChangeText={setLabel}
            style={{marginBottom: 16}}
          />
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: encrypted ? 8 : 24,
            }}>
            <Text>Require claim password</Text>
            <Switch value={encrypted} onValueChange={setEncrypted} />
          </View>
          {encrypted && (
            <React.Fragment>
              <View
                style={{
                  backgroundColor: '#FFF4E8',
                  borderColor: Colors.infoButtonColor,
                  borderRadius: 8,
                  borderWidth: 1,
                  marginBottom: 16,
                  padding: 12,
                }}>
                <Text
                  style={{
                    color: Colors.quaternaryColor,
                    fontSize: 14,
                    lineHeight: 20,
                  }}>
                  If this claim password is lost, the gift card cannot be redeemed and its funds are gone forever.
                </Text>
              </View>
              <TextInput
                label="Claim password"
                mode="outlined"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                style={{marginBottom: 12}}
              />
              <TextInput
                label="Confirm claim password"
                mode="outlined"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                style={{marginBottom: 24}}
              />
            </React.Fragment>
          )}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 'auto',
              paddingTop: 24,
            }}>
            <Button onPress={() => props.navigation.goBack()}>Cancel</Button>
            <Button mode="contained" icon="gift-outline" onPress={submit}>
              Create
            </Button>
          </View>
        </ScrollView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

export default GiftCardCreate;
