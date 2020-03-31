import React, { Component } from "react";
import { Button } from "react-native-elements";
import Styles from '../styles/index'

export default class StandardButton extends Component {
  constructor(props) {
    super(props);
    this.state = {
      onPressingInProgress: false,
    };
  }

  _onPress = (e) => {
    this.setState({
        onPressingInProgress: true
      }, () => {
           this.props.onPress(e)
           this.setState({
             onPressingInProgress: false
          })
      })
  }


  render() {
    return (
      <Button 
        onPress={this._onPress}
        disabled={this.state.onPressingInProgress || this.props.disabled}
        titleStyle={Styles.fullWidthButtonTitle}
        buttonStyle={{...Styles.defaultButton, backgroundColor: this.props.color || Styles.fullWidthButton.backgroundColor}}
        title={this.props.title}
        {...this.props}
      />
    );
  }
}
