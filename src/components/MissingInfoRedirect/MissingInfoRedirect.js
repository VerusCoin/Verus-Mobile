import React, {Component} from 'react';
import {ScrollView, View} from 'react-native';
import {Text, Button} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../../globals/colors';
import Styles from '../../styles';
import {connect} from 'react-redux';

class MissingInfoRedirect extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <ScrollView
        style={
          (Styles.flexBackground,
          {
            backgroundColor: this.props.darkMode
              ? Colors.darkModeColor
              : Colors.secondaryColor,
          })
        }
        contentContainerStyle={Styles.centerContainer}>
        <MaterialCommunityIcons
          name={this.props.icon}
          color={Colors.lightGrey}
          size={104}
        />
        <Text
          style={{
            ...Styles.centeredText,
            ...Styles.standardWidthCenterBlock,
            color: Colors.lightGrey,
            fontSize: 20,
            maxWidth: 300,
          }}>
          {this.props.label}
        </Text>
        {this.props.buttonLabel != null && (
          <Button
            onPress={() => this.props.onPress()}
            color={Colors.primaryColor}>
            {this.props.buttonLabel}
          </Button>
        )}
      </ScrollView>
    );
  }
}

const mapStateToProps = state => {
  return {
    darkMode: state.settings.darkModeState,
  };
};
export default connect(mapStateToProps)(MissingInfoRedirect);
