import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useSelector } from 'react-redux';
import { Card, Button, List, IconButton } from 'react-native-paper';
import styles from '../../styles';
import Colors from '../../globals/colors';
import TallButton from '../../components/LargerButton';
import PasswordCheck from '../../components/PasswordCheck';
import { createAlert } from '../../actions/actions/alert/dispatchers/alert';
import { checkPinForUser } from '../../utils/asyncStore/authDataStorage';
import { canShowSeed } from '../../actions/actions/channels/dlight/dispatchers/AlertManager';
import { CommonActions } from '@react-navigation/native';

const RecoverSeedsSelectAccount = ({ navigation }) => {
  const accounts = useSelector(state => state.authentication.accounts);
  const [numSeeds, setNumSeeds] = useState({});
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordDialogTitle, setPasswordDialogTitle] = useState('');
  const [passwordDialogAccount, setPasswordDialogAccount] = useState(null);

  useEffect(() => {
    for (let account of accounts) {
      setNumSeeds(prevState => ({
        ...prevState,
        [account.accountHash]: Object.values(account.encryptedKeys).filter(x => x != null).length,
      }));
    }
  }, [accounts]);

  const handleCardPress = async (account) => {
    if (await canShowSeed()) {
      setPasswordDialogAccount(account);
      setPasswordDialogOpen(true);
      setPasswordDialogTitle(`Enter your password for "${account.id}"`);
    }
  };

  const onPasswordResult = async (result) => {
    if (result.valid) {
      setPasswordDialogOpen(false);

      try {
        const seeds = await checkPinForUser(result.password, passwordDialogAccount.id);

        navigation.dispatch(CommonActions.reset({
          index: 0,
          routes: [{ name: 'DisplaySeed', params: { data: { seeds, showDerivedKeys: true, keyDerivationVersion: passwordDialogAccount.keyDerivationVersion, completeOnBack: true } } }],
        }));
      } catch(e) {
        createAlert("Error", "Failed to retrieve seeds");
      }
    } else {
      createAlert("Authentication Error", "Incorrect password");
    }
  }

  const renderAccountCards = () => {
    return accounts.map(account => (
      <View style={{ margin: 8 }} key={account.accountHash}>
        <Card
          onPress={() => handleCardPress(account)}
          key={account.accountHash}
          style={{ backgroundColor: Colors.primaryColor }}
        >
          <List.Item
            title={account.id}
            titleStyle={{
              color: Colors.secondaryColor,
              fontWeight: '500',
            }}
            description={`${numSeeds[account.accountHash] ? numSeeds[account.accountHash] : 0} seed${numSeeds[account.accountHash] && numSeeds[account.accountHash] > 1 ? 's' : ''}`}
            left={() => <List.Icon color={Colors.secondaryColor} icon="account-circle" />}
            descriptionStyle={{ color: Colors.secondaryColor }}
            right={() => (
              <IconButton name="chevron-right" iconColor={Colors.secondaryColor} size={20} />
            )}
          />
        </Card>
      </View>
    ));
  };

  return (
    <SafeAreaView style={styles.flexBackground}>
      {passwordDialogOpen && 
        <PasswordCheck
          cancel={() => setPasswordDialogOpen(false)}
          submit={(result) => onPasswordResult(result)}
          visible={passwordDialogOpen}
          title={passwordDialogTitle}
          userName={passwordDialogAccount ? passwordDialogAccount.id : ''}
          account={passwordDialogAccount}
          allowBiometry={true}
        />
      }
      <Text style={{ ...Styles.centralHeader, marginTop: 16 }}>{'Select a Profile'}</Text>
      <ScrollView>
        {renderAccountCards()}
      </ScrollView>
      <TallButton 
        buttonColor={Colors.warningButtonColor} 
        textColor={Colors.secondaryColor}
        onPress={() => navigation.goBack()}
        mode="outlined"
        style={{ marginHorizontal: 8 }}
      >
        {"Cancel"}
      </TallButton>
    </SafeAreaView>
  );
};

export default RecoverSeedsSelectAccount;
