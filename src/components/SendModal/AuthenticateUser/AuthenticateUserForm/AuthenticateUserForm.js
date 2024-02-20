import React from 'react';
import {useEffect, useState} from 'react';
import {FlatList, TouchableOpacity} from 'react-native';
import {List} from 'react-native-paper';
import {useSelector} from 'react-redux';
import styles from '../../../../styles';
import {
  SEND_MODAL_FORM_STEP_CONFIRM,
  SEND_MODAL_USER_ALLOWLIST,
} from '../../../../utils/constants/sendModal';
import Colors from '../../../../globals/colors';

const AuthenticateUserForm = props => {
  const accounts = useSelector(state => state.authentication.accounts);
  const data = useSelector(state => state.sendModal.data);
  const darkMode = useSelector(state => state.settings.darkModeState);
  const [accountList, setAccountList] = useState([]);

  const selectAccount = account => {
    props.navigation.navigate(SEND_MODAL_FORM_STEP_CONFIRM, {
      account,
    });
  };

  useEffect(() => {
    const _accounts = data[SEND_MODAL_USER_ALLOWLIST]
      ? data[SEND_MODAL_USER_ALLOWLIST]
      : accounts;

    const _accountList = _accounts.map(item => {
      return {
        key: item.accountHash,
        title: item.id,
        account: item,
      };
    });

    setAccountList(_accountList);
  }, []);

  return (
    <FlatList
      style={{
        ...styles.fullWidth,
        backgroundColor: darkMode
          ? Colors.darkModeColor
          : Colors.secondaryColor,
      }}
      renderItem={({item}) => {
        return (
          <TouchableOpacity onPress={() => selectAccount(item.account)}>
            <List.Item
              titleStyle={{
                color: darkMode ? Colors.secondaryColor : Colors.quinaryColor,
              }}
              title={item.title}
              description={item.description}
              right={props => (
                <List.Icon
                  {...props}
                  color={darkMode ? Colors.secondaryColor : Colors.quinaryColor}
                  icon={'chevron-right'}
                  size={20}
                />
              )}
            />
          </TouchableOpacity>
        );
      }}
      data={accountList}
    />
  );
};

export default AuthenticateUserForm;
