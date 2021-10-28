import { NavigationActions } from "@react-navigation/compat";
import { Component } from "react"
import { connect } from 'react-redux'
import { modifyPersonalDataForUser } from "../../../../actions/actionDispatchers";
import { requestPersonalData } from "../../../../utils/auth/authBox";
import {
  PERSONAL_BANK_BENEFICIARY_PHYSICAL_ADDRESS,
  PERSONAL_PAYMENT_METHODS,
  PERSONAL_LOCATIONS
} from "../../../../utils/constants/personal";
import { PersonalPaymentMethodsEditBankAccountAddressRender } from "./PersonalPaymentMethodsEditBankAccountAddress.render"

class PersonalPaymentMethodsEditBankAccountAddress extends Component {
  constructor(props) {
    super(props);
    const initialAccount = props.route.params.bankAccount;

    this.state = {
      payment_methods: props.route.params.payment_methods,
      bankAccount: initialAccount,
      locations: {
        physical_addresses: [],
        tax_countries: [],
      },
      currentTextInputModal: null,
      currentListSelectionModal: null,
      currentDatePickerModal: null,
      currentPhoneNumberModal: null,
      loading: false,
      countryModalOpen: false,
      index: props.route.params.index,
    };
  }

  componentDidMount() {
    this.loadPersonalLocations();
  }

  openAddAddress() {
    this.props.navigation.navigate("PersonalLocationsEditAddress", {
      locations: this.state.locations,
      index: null
    })
  }

  openConfigureAddresses() {
    this.props.navigation.navigate("PersonalLocations")
  }

  componentDidUpdate(lastProps) {
    if (lastProps.encryptedLocations !== this.props.encryptedLocations) {
      this.loadPersonalLocations();
    }
  }

  loadPersonalLocations() {
    this.setState({ loading: true }, async () => {
      this.setState({
        locations: await requestPersonalData(PERSONAL_LOCATIONS),
        loading: false,
      });
    });
  }

  updateBankAccount(cb) {
    this.setState({ loading: true }, async () => {
      let bankAccounts =
        this.state.payment_methods.bank_accounts == null
          ? []
          : this.state.payment_methods.bank_accounts;

      if (this.state.index == null) {
        bankAccounts.push(this.state.bankAccount);
      } else {
        bankAccounts[this.state.index] = this.state.bankAccount;
      }

      await modifyPersonalDataForUser(
        { ...this.state.payment_methods, bank_accounts: bankAccounts },
        PERSONAL_PAYMENT_METHODS,
        this.props.activeAccount.accountHash
      );

      this.setState({
        loading: false,
        index:
          this.state.index == null
            ? bankAccounts.length - 1
            : this.state.index,
      }, cb);
    });
  }

  selectAddress(address) {
    this.setState({
      bankAccount: {
        ...this.state.bankAccount,
        [PERSONAL_BANK_BENEFICIARY_PHYSICAL_ADDRESS]: address
      }
    }, () => this.updateBankAccount(() => this.props.navigation.dispatch(NavigationActions.back())))
  }

  render() {
    return PersonalPaymentMethodsEditBankAccountAddressRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
    encryptedLocations: state.personal.locations
  }
};

export default connect(mapStateToProps)(PersonalPaymentMethodsEditBankAccountAddress);