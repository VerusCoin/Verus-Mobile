import React, { Component } from 'react';
import { connect } from 'react-redux';

import {
  View,
  Text,
  TouchableWithoutFeedback,
} from 'react-native';
import { ListItem } from 'react-native-elements';

import { manageAccount } from '../../../../../actions/actions/PaymentMethod/WyreAccount';

import { Bank } from '../../../../../images/customIcons';

import styles from '../mappings.styles';

class WyreAccount extends Component {
  manageAccount = () => (
    this.props.manageAccount(this.props.navigation)
  )

  render() {
    return (
      <TouchableWithoutFeedback onPress={this.props.onSelect}>
        <View style={styles.bankAccountContainer}>
          <View style={styles.formInput}>
            <ListItem
              roundAvatar
              title={<Text style={styles.coinItemLabel}>Bank Transfer</Text>}
              avatar={Bank}
              containerStyle={styles.coinItemContainer}
              subtitle="ACH with Wyre"
              rightTitle="max $2,500/wk"
            />
          </View>
          <View style={styles.manageAccountView}>
            <Text
              onPress={this.manageAccount}
              style={styles.manageAccountLabel}
            >
                Manage Account
            </Text>
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  }
}



const mapDispatchToProps = {
  manageAccount,
};



export default connect(null, mapDispatchToProps)(WyreAccount);
