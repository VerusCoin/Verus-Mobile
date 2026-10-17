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
        title={this.props.title}
        {...this.props}
        titleStyle={[Styles.fullWidthButtonTitle, this.props.titleStyle]}
        buttonStyle={[Styles.defaultButton, {backgroundColor: this.props.color || Styles.fullWidthButton.backgroundColor}, this.props.buttonStyle]}
        containerStyle={[Styles.roundedButton, this.props.containerStyle]}
      />
    );
  }
}
