import React from 'react';
import { useEffect, useState } from "react"
import { FlatList, TouchableOpacity } from "react-native";
import { List } from "react-native-paper";
import { useSelector } from 'react-redux'
import styles from "../../../../styles";
import { SEND_MODAL_FORM_STEP_CONFIRM, SEND_MODAL_USER_TO_AUTHENTICATE } from "../../../../utils/constants/sendModal";

const AuthenticateUserForm = props => {
  const accounts = useSelector(state => state.authentication.accounts)
  const [accountList, setAccountList] = useState([])

  const selectAccount = (account) => {
    props.navigation.navigate(SEND_MODAL_FORM_STEP_CONFIRM, {
      account
    });
  }

  useEffect(() => {
    const _accountList = accounts.map(item => {
      return {
        key: item.accountHash,
        title: item.id,
        account: item,
      };
    })

    setAccountList(_accountList);    
  }, []);

  return (
    <FlatList
      style={{...styles.fullWidth, ...styles.backgroundColorWhite}}
      renderItem={({item}) => {
        return (
          <TouchableOpacity onPress={() => selectAccount(item.account)}>
            <List.Item
              title={item.title}
              description={item.description}
              right={props => (
                <List.Icon {...props} icon={'chevron-right'} size={20} />
              )}
            />
          </TouchableOpacity>
        );
      }}
      data={accountList}
    />
  );
};

export default AuthenticateUserForm