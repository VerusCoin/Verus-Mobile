import React, { useState } from 'react';
import {View, Dimensions, TouchableWithoutFeedback, Keyboard} from 'react-native';
import {Text, Paragraph, Button, TextInput} from 'react-native-paper';
import { createAlert } from '../../../../actions/actions/alert/dispatchers/alert';
import Colors from '../../../../globals/colors';

export default function CreatePassword({ password, setPassword, navigation }) {
  const {height} = Dimensions.get('window');

  const [firstBox, setFirstBox] = useState("")
  const [secondBox, setSecondBox] = useState("")

  const validate = () => {
    const res = { valid: false, message: "" }

    if (!firstBox || firstBox.length < 1) {
      res.message = "Please enter a password."
      return res
    } else if (firstBox.length < 5) {
      res.message = "Please enter a password longer than 5 characters."
      return res
    } else if (firstBox !== secondBox) {
      res.message = "Password and confirm password do not match."
      return res
    }

    res.valid = true
    return res
  }

  const next = () => {
    const { valid, message } = validate()

    if (!valid) createAlert("Error", message)
    else {
      setPassword(firstBox)
      navigation.navigate("UseBiometrics")
    }
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
            top: height / 2 - 250,
          }}>
          <Text
            style={{
              textAlign: 'center',
              color: Colors.primaryColor,
              fontSize: 28,
              fontWeight: 'bold',
            }}>
            {"Create Password"}
          </Text>
          <Paragraph
            style={{
              textAlign: 'center',
              width: '75%',
              marginTop: 24,
              width: 280
            }}>
            {"Create a secure password for your profile. Your password will be used to encrypt your wallet."}
          </Paragraph>
          <TextInput
            returnKeyType="done"
            label="Create password"          
            value={firstBox}
            mode={"outlined"}
            style={{
              width: '75%',
              marginTop: 24,
              width: 280
            }}
            placeholder="Enter password"
            dense={true}
            onChangeText={(text) => setFirstBox(text)}
            autoCapitalize={'none'}
            autoCorrect={false}
            secureTextEntry={true}
          />
          <TextInput
            returnKeyType="done"
            label="Confirm password"          
            value={secondBox}
            mode={"outlined"}
            style={{
              width: '75%',
              marginTop: 8,
              width: 280
            }}
            placeholder="Enter password"
            dense={true}
            onChangeText={(text) => setSecondBox(text)}
            autoCapitalize={'none'}
            autoCorrect={false}
            secureTextEntry={true}
          />
        </View>
        <Button
          onPress={next}
          mode="contained"
          labelStyle={{fontWeight: "bold"}}
          disabled={firstBox.length == 0 || secondBox.length == 0}
          style={{
            position: "absolute",
            bottom: 80,
            width: 280
          }}>
          {"Next"}
        </Button>
      </View>
    </TouchableWithoutFeedback>
  );
}
