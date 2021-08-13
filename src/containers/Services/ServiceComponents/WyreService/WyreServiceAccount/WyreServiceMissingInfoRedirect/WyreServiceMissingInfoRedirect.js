import React, { Component } from "react"
import { ScrollView, View } from 'react-native'
import { Text, Button } from 'react-native-paper'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { connect } from 'react-redux'
import Colors from "../../../../../../globals/colors";
import Styles from "../../../../../../styles";

class WyreServiceMissingInfoRedirect extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <ScrollView
        style={Styles.flexBackground}
        contentContainerStyle={Styles.centerContainer}
      >
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
          }}
        >
          {this.props.label}
        </Text>
        <View style={{ width: "75%" }}>
          <Button
            onPress={() => this.props.onPress()}
            color={Colors.primaryColor}
          >
            {this.props.buttonLabel}
          </Button>
        </View>
      </ScrollView>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    loading: state.services.loading,
  };
};

export default connect(mapStateToProps)(WyreServiceMissingInfoRedirect);