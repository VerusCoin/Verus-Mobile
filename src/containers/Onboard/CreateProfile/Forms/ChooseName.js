import React from 'react';
import {View, Dimensions, TouchableWithoutFeedback, Keyboard} from 'react-native';
import {Text, Paragraph, TextInput} from 'react-native-paper';
import { useSelector } from 'react-redux';
import { createAlert } from '../../../../actions/actions/alert/dispatchers/alert';
import TallButton from '../../../../components/LargerButton';
import Colors from '../../../../globals/colors';
import { SMALL_DEVICE_HEGHT } from '../../../../utils/constants/constants';

export default function ChooseName({ profileName, setProfileName, navigation }) {
  const {height} = Dimensions.get('window');
  const accounts = useSelector(state => state.authentication.accounts)
  const isKeyboardActive = useSelector(state => state.keyboard.active);

  const isDuplicateAccount = (accountID) => {
    let index = 0;

    while (
      index < accounts.length &&
      accountID !== accounts[index].id
    ) {
      index++;
    }

    if (index < accounts.length) {
      return true;
    } else {
      return false;
    }
  };

  const validate = () => {
    const res = { valid: false, message: "" }

    if (!profileName || profileName.length < 1) {
      res.message = "Please enter a profile name."
      return res
    } else if (profileName.length > 50) {
      res.message = "Please enter a profile name shorter than 50 characters."
      return res
    } else if (isDuplicateAccount(profileName)) {
      res.message = "A profile with this name already exists."
      return res
    }

    res.valid = true
    return res
  }

  const next = () => {
    const { valid, message } = validate()

    if (!valid) createAlert("Error", message)
    else navigation.navigate("CreatePassword")
  }

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          flex: 1,
          alignItems: 'center',
          backgroundColor: Colors.secondaryColor
        }}>
        <View
          style={{
            alignItems: 'center',
            position: 'absolute',
            top: height < SMALL_DEVICE_HEGHT ? 60 : height / 2 - 250,
          }}>
          <Text
            style={{
              textAlign: 'center',
              color: Colors.primaryColor,
              fontSize: 28,
              fontWeight: 'bold',
            }}>
            {"Choose Name"}
          </Text>
          <Paragraph
            style={{
              textAlign: 'center',
              width: '75%',
              marginTop: 24,
              width: 280
            }}>
            {"Give your profile a name. You can have multiple profiles."}
          </Paragraph>
          <TextInput
            returnKeyType="done"
            label="Choose name"          
            value={profileName}
            mode={"outlined"}
            style={{
              width: '75%',
              marginTop: 48,
              width: 280
            }}
            placeholder="Enter name"
            dense={true}
            onChangeText={(text) => setProfileName(text)}
          />
        </View>
        {!isKeyboardActive && <TallButton
          onPress={next}
          mode="contained"
          labelStyle={{fontWeight: "bold"}}
          disabled={profileName.length == 0}
          style={{
            position: "absolute",
            bottom: 80,
            width: 280
          }}>
          {"Next"}
        </TallButton>}
      </View>
    </TouchableWithoutFeedback>
  );
}
