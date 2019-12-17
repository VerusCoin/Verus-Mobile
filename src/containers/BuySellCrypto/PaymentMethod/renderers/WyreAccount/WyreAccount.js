import React, { Component } from 'react';
import { connect } from 'react-redux';

import {
  View,
  Text,
  TouchableWithoutFeedback,
} from 'react-native';
import { ListItem } from 'react-native-elements';
import Button1 from '../../../../../symbols/button1';

import { manageAccount } from '../../../../../actions/actions/PaymentMethod/WyreAccount';

import { BankBuildingBlack } from '../../../../../images/customIcons';

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
              title={<Text style={styles.coinItemLabel}>Bank Transfer</Text>}
              avatar={BankBuildingBlack}
              avatarOverlayContainerStyle={{backgroundColor: 'transparent'}}
              avatarStyle={{resizeMode: 'contain'}}
              containerStyle={styles.coinItemContainer}
              subtitle="ACH with Wyre"
              subtitleStyle={{fontFamily: 'Avenir-Book'}}
              rightTitle="max $2,500/wk"
              rightTitleStyle={styles.rightTitleStyle}
            />
          </View>
          <View style={styles.manageAccountView}>
            <Button1
                style={styles.manageAccountLabel}
                buttonContent="MANAGE ACCOUNT"
                onPress={this.manageAccount}
              />
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
