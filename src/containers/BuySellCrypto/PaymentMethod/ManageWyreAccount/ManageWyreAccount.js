import React, { Component } from 'react';
import { connect } from 'react-redux';

import {
  View,
  Text,
  TouchableWithoutFeedback,
  TouchableHighlight,
  Keyboard,
  RefreshControl,
  ScrollView,
  Image,
} from 'react-native';
import Button1 from '../../../../symbols/button1';
import Spinner from 'react-native-loading-spinner-overlay';
import {
  selectWyreAccount,
  selectWyreGetAccountIsFetching,
} from '../../../../selectors/paymentMethods';

import { getAccount } from '../../../../actions/actions/PaymentMethod/WyreAccount';

import styles from './ManageWyreAccount.styles';

import Colors from '../../../../globals/colors';

import {
  Email, Phone, File,
  BankBuilding, User,
  Address, Home,
} from '../../../../images/customIcons';

class ManageWyreAccount extends Component {
  componentDidMount() {
    this.forceUpdateHandler = this.props.navigation.addListener(
      'willFocus',
      () => this.forceUpdate()
    );
  }

  componentWillUnmount() {
    if (!this.forceUpdateHandler) return;
    this.forceUpdateHandler.remove();
  }

  forceUpdate = () => {
    this.props.getAccount();
  }

  renderSectionStatus = (status, screen) => {
    switch (status) {
      case 'PENDING':
        return(
          <Button1
            style={styles.statusButtonPending}
            buttonContent="PENDING"
            onPress={() => this.navigate(screen)}
            buttonStyle={styles.statusButtonStyle}
          />
        )
      case 'APPROVED':
        return (
          <Button1
            style={styles.statusButtonApproved}
            buttonContent="APPROVED"
            onPress={() => this.navigate(screen)}
            buttonStyle={styles.statusButtonApprovedStyle}
        />
        )
      default:
        return (
          <Button1
            style={styles.statusButtonAdd}
            buttonContent="ADD"
            onPress={() => this.navigate(screen)}
            buttonStyle={styles.statusButtonStyle}
        />
        )
    }
  }

  renderEmailSection = () => {
    const emailObj = this.props.account.denormalizedProfileFields.individualEmail || {};
    return this.renderSection('ManageWyreEmail', Email, 'Email', emailObj.status);
  }

  renderCellphoneSection = () => {
    const phoneObj = this.props.account.denormalizedProfileFields.individualCellphoneNumber || {};
    return this.renderSection('ManageWyreCellphone', Phone, 'Phone', phoneObj.status);
  }

  renderPersonalDetailsSection = () => {
    const personalDetailsObj = this.props.account.denormalizedProfileFields.individualLegalName
      || {};
    return this.renderSection('ManageWyrePersonalDetails', User, 'Personal Details', personalDetailsObj.status);
  }

  renderAddressSection = () => {
    const addressobj = this.props.account.denormalizedProfileFields.individualResidenceAddress
      || {};
    return this.renderSection('ManageWyreAddress', Home, 'Address', addressobj.status);
  }

  renderDocumentsSection = () => {
    const documentsObj = this.props.account.denormalizedProfileFields.individualGovernmentId || {};
    return this.renderSection('ManageWyreDocuments', File, 'Documents', documentsObj.status);
  }

  renderPaymentMethodSection = () => {
    const paymentMethodObj = this.props.account.denormalizedProfileFields.individualSourceOfFunds
      || {};
    return this.renderSection('ManageWyrePaymentMethod', BankBuilding, 'Bank', paymentMethodObj.status);
  }

  renderProofOfAddressSection = () => {
    const proofOfAddressObj = this.props.account.denormalizedProfileFields.individualProofOfAddress
      || {};
    return this.renderSection('ManageWyreProofOfAddress', Address, 'Proof Of Address', proofOfAddressObj.status);
  }

  renderSection = (screen, icon, label, status) => (
    <TouchableHighlight onPress={() => this.navigate(screen)} style={styles.viewContainer}>
      <View style={styles.wyreCard}>
        <View style={styles.wyreCardIconContainer}>
          <Image
            source={icon}
            style={styles.icon}
            resizeMode="contain"
          />
          <Text style={styles.wyreCardText}>{label}</Text>
        </View>
        <View>
          {this.renderSectionStatus(status, screen)}
        </View>
      </View>
    </TouchableHighlight>
  );

  navigate = (screen) => {
    this.props.navigation.navigate(screen);
  }

  render() {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false} style={{ backgroundColor: '#86939e' }}>
        <View style={styles.userProfileContainer}>
          <Spinner
            visible={this.props.isFetching}
            textContent="Loading..."
            textStyle={{ color: Colors.quinaryColor }}
            color={Colors.quinaryColor}
          />
          <ScrollView
            contentContainerStyle={{ height: '100%', alignItems: 'center', justifyContent: 'center' }}
            refreshControl={(
              <RefreshControl
                refreshing={false}
                onRefresh={this.forceUpdate}
              />
            )}
          >
            <Text style={styles.statusInfoHeader}>Verification Set Up</Text>
            <View style={{padding: 20}}>
              <View style={{ flexDirection: 'row', alignSelf: 'center' }}>
                <Text style={styles.statusInfo}>
                  Account Id: &nbsp; &nbsp;
                </Text>
                <Text style={styles.statusInfoContent}>
                {this.props.account.id}
                </Text>
              </View>
              <View style={{flexDirection: 'row', alignSelf: 'center'}}>
                <Text style={styles.statusInfo}>
                  Account Status: &nbsp; &nbsp;
                </Text>
                <Text style={styles.statusInfoContent}>
                  {this.props.account.status}
                </Text>
              </View>
            </View>
            {this.renderEmailSection()}
            {this.renderCellphoneSection()}
            {this.renderPersonalDetailsSection()}
            {this.renderAddressSection()}
            {this.renderDocumentsSection()}
            {this.renderPaymentMethodSection()}
            {this.renderProofOfAddressSection()}
            
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    );
  }
}

const mapStateToProps = (state) => ({
  isFetching: selectWyreGetAccountIsFetching(state),
  account: selectWyreAccount(state),
});

const mapDispatchToProps = ({
  getAccount,
});

export default connect(mapStateToProps, mapDispatchToProps)(ManageWyreAccount);
