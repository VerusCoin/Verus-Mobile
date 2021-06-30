import React from "react";
import { Component } from "react"
import { connect } from 'react-redux'
import AppIntroSlider from 'react-native-app-intro-slider';
import {
  View,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { Text, TextInput } from 'react-native-paper'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from "../../../globals/colors";
import { useEffect } from "react";
import { modifyPersonalDataForUser } from "../../../actions/actionDispatchers";
import { PERSONAL_ATTRIBUTES } from "../../../utils/constants/personal";
import { createAlert } from "../../../actions/actions/alert/dispatchers/alert";

const slides = [
  {
    key: 1,
    title: 'Personal Profile',
    text: 'Your personal profile is a safe, private place to store personal information.',
    backgroundColor: Colors.verusGreenColor,
    icon: "fingerprint"
  },
  {
    key: 2,
    title: 'Privacy',
    text: 'Your personal profile is encrypted and stored locally. No part of it will ever leave your device without your explicit consent.',
    backgroundColor: Colors.quaternaryColor,
    icon: "shield-account"
  },
  {
    key: 3,
    title: 'Get Started',
    text: 'Enter your name to create your personal profile and get started.',
    backgroundColor: Colors.secondaryColor,
    form: true
  }
];

const NameForm = (props) => {
  const onChange = props.onChange != null ? props.onChange : () => {};
  const [first, setFirst] = React.useState('');
  const [middle, setMiddle] = React.useState('');
  const [last, setLast] = React.useState('');

  useEffect(() => {
    onChange({first, middle, last})
  }, [first, middle, last]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          height: 168,
          width: "75%",
          marginVertical: 40,
        }}
      >
        <TextInput
          label="First"
          value={first}
          mode={"outlined"}
          placeholder="required"
          disabled={props.loading}
          dense={true}
          onChangeText={(text) => setFirst(text)}
        />
        <TextInput
          label="Middle"
          value={middle}
          mode={"outlined"}
          placeholder="optional"
          disabled={props.loading}
          dense={true}
          onChangeText={(text) => setMiddle(text)}
          style={{ marginVertical: 8 }}
        />
        <TextInput
          label="Last"
          value={last}
          mode={"outlined"}
          placeholder="required"
          disabled={props.loading}
          dense={true}
          onChangeText={(text) => setLast(text)}
        />
      </View>
    </TouchableWithoutFeedback>
  );
};

class PersonalIntroSlider extends Component {
  constructor() {
    super();
    this.state = {
      showRealApp: false,
      name: {
        first: '',
        middle: '',
        last: ''
      },
      loading: false,
      currentSlide: 0
    };
  }

  renderInfoItem = (item) => {
    return (
      <View
        style={{
          backgroundColor: item.backgroundColor,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flex: 1,
          alignItems: "center",
        }}
      >
        <MaterialCommunityIcons name={item.icon} color={"white"} size={104} />
        <Text
          style={{
            fontSize: 32,
            fontWeight: "bold",
            textAlign: "center",
            color: "white",
            marginVertical: 40
          }}
        >
          {item.title}
        </Text>
        <Text style={{ textAlign: "center", width: "75%", color: "white" }}>
          {item.text}
        </Text>
      </View>
    );
  }

  renderFormItem = (item) => {
    return (
      <View
        style={{
          backgroundColor: item.backgroundColor,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flex: 1,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontSize: 32,
            fontWeight: "bold",
            textAlign: "center"
          }}
        >
          {item.title}
        </Text>
        <Text style={{ textAlign: "center", width: "75%", marginTop: 20 }}>{item.text}</Text>
        <NameForm onChange={(name) => this.setState({ name })} />
      </View>
    );
  }

  _renderItem = ({ item }) => {
    if (item.form) return this.renderFormItem(item)
    else return this.renderInfoItem(item)
  }

  _onDone = () => {
    this.setState({loading: true}, async () => {
      await modifyPersonalDataForUser(
        { name: this.state.name }, 
        PERSONAL_ATTRIBUTES, 
        this.props.activeAccount.accountHash
      )

      createAlert(
        "Success!",
        "You've created your own personal profile! Your name has been encrypted and stored on your device (and nowhere else). If you'd like, you can continue add to it through your personal profile tab."
      );
    })
  }

  render() {
    return (
      <KeyboardAvoidingView style={{flex: 1}} behavior={"height"}>
        <AppIntroSlider
          showSkipButton={true}
          renderItem={this._renderItem}
          data={slides}
          onDone={this._onDone}
          renderDoneButton={() => (
            <Text
              style={{
                color: Colors.primaryColor,
                fontSize: 18,
                marginTop: 12,
                marginRight: 6
              }}
            >
              {"Done"}
            </Text>
          )}
        />
      </KeyboardAvoidingView>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
  }
};

export default connect(mapStateToProps)(PersonalIntroSlider);