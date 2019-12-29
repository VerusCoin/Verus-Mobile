import React, { Component } from 'react';
import { connect } from 'react-redux';

import { View } from 'react-native';
import { NavigationActions } from 'react-navigation';
import PlaidAuthenticator from 'react-native-plaid-link';
import Spinner from 'react-native-loading-spinner-overlay';

import {
  selectWyreConfig,
  selectWyreGetConfigIsFetching,
  selectWyrePutAccountIsFetching,
} from '../../../../selectors/paymentMethods';

import {
  getConfig,
  createWyreAccountPaymentMethod
} from '../../../../actions/actions/PaymentMethod/WyreAccount';

import styles from './ManageWyreAccount.styles';

class ManageWyrePaymentMethod extends Component {
  componentDidMount() {
    this.props.getConfig();
  }

  onMessage = (data) => {
    switch (data.action) {
      case 'plaid_link-undefined::exit':
        this.props.navigation.dispatch(NavigationActions.back());
        break;
      case 'plaid_link-undefined::connected':
        this.props.createWyreAccountPaymentMethod(`${data.metadata.public_token}|${data.metadata.account_id}`, this.props.navigation);
        break;
      default:
    }
  }

  renderPlaid = () => {
    if (!Object.keys(this.props.config).length) {
      return null;
    }
    return (
      <PlaidAuthenticator
        onMessage={this.onMessage}
        publicKey={this.props.config.plaidPublicKey}
        env={this.props.config.plaidEnvironment}
        webhook={this.props.config.plaidWebhook}
        product="identity"
        clientName="Wyre"
        selectAccount
      />
    );
  }

  render() {
    return (
      <View style={{ flex: 1 }}>
        {(this.props.isFetching || this.props.updatingAccount) ? (
          <Spinner
            visible
            textContent="Loading..."
            textStyle={{ color: '#FFF' }}
          />
        ) : this.renderPlaid()}
      </View>
    );
  }
}

const mapStateToProps = (state) => ({
  isFetching: selectWyreGetConfigIsFetching(state),
  updatingAccount: selectWyrePutAccountIsFetching(state),
  config: selectWyreConfig(state),
});

const mapDispatchToProps = ({
  getConfig,
  createWyreAccountPaymentMethod,
});

export default connect(mapStateToProps, mapDispatchToProps)(ManageWyrePaymentMethod);
