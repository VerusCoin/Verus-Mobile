import { NavigationActions } from "@react-navigation/compat";
import { Component } from "react"
import { connect } from 'react-redux'
import { modifyPersonalDataForUser } from "../../../../actions/actionDispatchers";
import { createAlert, resolveAlert } from "../../../../actions/actions/alert/dispatchers/alert";
import { requestPersonalData } from "../../../../utils/auth/authBox";
import { CURRENCY_NAMES, SUPPORTED_BANK_CURRENCIES } from "../../../../utils/constants/currencies";
import { ISO_3166_ALPHA_2_CODES, ISO_3166_COUNTRIES } from "../../../../utils/constants/iso3166";
import {
  PERSONAL_BANK_ACCOUNT_NUMBER,
  PERSONAL_BANK_BENEFICIARY_NAME_FIRST,
  PERSONAL_BANK_BENEFICIARY_NAME_FULL,
  PERSONAL_BANK_BENEFICIARY_NAME_LAST,
  PERSONAL_BANK_BRANCH_CODE,
  PERSONAL_BANK_BRANCH_NAME,
  PERSONAL_BANK_BSB_NUMBER,
  PERSONAL_BANK_CHINESE_NATIONAL_ID,
  PERSONAL_BANK_CITY,
  PERSONAL_BANK_CODE,
  PERSONAL_BANK_CPF_CNPJ,
  PERSONAL_BANK_NAME,
  PERSONAL_BANK_PROVINCE,
  PERSONAL_BANK_ROUTING_NUMBER,
  PERSONAL_BANK_SWIFT_BIC,
  PERSONAL_BANK_COUNTRY,
  PERSONAL_BANK_PRIMARY_CURRENCY,
  PERSONAL_BANK_BENEFICIARY_TYPE,
  PERSONAL_BANK_BENEFICIARY_PHYSICAL_ADDRESS,
  PERSONAL_BANK_BENEFICIARY_PHONE,
  PERSONAL_PHONE_TYPE_MOBILE,
  PERSONAL_BANK_BENEFICIARY_DOB,
  PERSONAL_BANK_ACCOUNT_TYPE,
  PERSONAL_BANK_ACCOUNT_TYPE_CHECKING,
  PERSONAL_BANK_ACCOUNT_TYPE_SAVINGS,
  PERSONAL_PAYMENT_METHODS,
  PERSONAL_BENEFICIARY_TYPE_INDIVIDUAL,
  PERSONAL_BANK_CLABE
} from "../../../../utils/constants/personal";
import { PersonalPaymentMethodsEditBankAccountRender } from "./PersonalPaymentMethodsEditBankAccount.render"

class PersonalPaymentMethodsEditBankAccount extends Component {
  constructor(props) {
    super(props);
    const initialAccount =
      props.route.params.index != null &&
      props.route.params.payment_methods.bank_accounts[
        props.route.params.index
      ] != null
        ? props.route.params.payment_methods.bank_accounts[
            props.route.params.index
          ]
        : {
            [PERSONAL_BANK_COUNTRY]: "",
            [PERSONAL_BANK_PRIMARY_CURRENCY]: "",
            [PERSONAL_BANK_BENEFICIARY_TYPE]:
              PERSONAL_BENEFICIARY_TYPE_INDIVIDUAL,
            [PERSONAL_BANK_BENEFICIARY_PHYSICAL_ADDRESS]: {
              street1: "",
              street2: "",
              city: "",
              state_province_region: "",
              postal_code: "",
              country: "",
            },
            [PERSONAL_BANK_BENEFICIARY_NAME_FIRST]: "",
            [PERSONAL_BANK_BENEFICIARY_NAME_LAST]: "",
            [PERSONAL_BANK_BENEFICIARY_PHONE]: {
              calling_code: "",
              number: "",
              type: PERSONAL_PHONE_TYPE_MOBILE,
            },
            [PERSONAL_BANK_SWIFT_BIC]: "",
            [PERSONAL_BANK_BENEFICIARY_DOB]: {
              day: null,
              month: null,
              year: null,
            },
            [PERSONAL_BANK_ACCOUNT_NUMBER]: "",
            [PERSONAL_BANK_ACCOUNT_TYPE]: "",
          };

    this.state = {
      payment_methods: props.route.params.payment_methods,
      bankAccount: initialAccount,
      currentTextInputModal: null,
      currentListSelectionModal: null,
      currentDatePickerModal: null,
      currentPhoneNumberModal: null,
      loading: false,
      countryModalOpen: false,
      index: props.route.params.index,
    };

    this.TEXT_INPUT_FIELDS = {
      [PERSONAL_BANK_BENEFICIARY_NAME_FIRST]: {
        title: "First name",
        description: "The legal first name of the account holder",
        placeholder: "Enter first name",
      },
      [PERSONAL_BANK_BENEFICIARY_NAME_LAST]: {
        title: "Last name",
        description: "The legal last name of the account holder",
        placeholder: "Enter last name",
      },
      [PERSONAL_BANK_BENEFICIARY_NAME_FULL]: {
        title: "Full name",
        description: "The legal full name of the account holder",
        placeholder: "Enter full name",
      },
      [PERSONAL_BANK_SWIFT_BIC]: {
        title: "SWIFT/BIC",
        description: "The SWIFT/BIC code of this bank",
        placeholder: "Enter SWIFT/BIC",
      },
      [PERSONAL_BANK_ACCOUNT_NUMBER]: {
        title: "Account number",
        description: "The bank account number",
        placeholder: "Enter account number",
      },
      [PERSONAL_BANK_BSB_NUMBER]: {
        title: "BSB number",
        description: "The bank state branch number",
        placeholder: "Enter BSB number",
      },
      [PERSONAL_BANK_CODE]: {
        title: "Bank code",
        description: "The code for this bank",
        placeholder: "Enter bank code",
      },
      [PERSONAL_BANK_NAME]: {
        title: "Bank name",
        description: "The name of this bank",
        placeholder: "Enter full name",
      },
      [PERSONAL_BANK_BRANCH_CODE]: {
        title: "Bank branch code",
        description: "The code for this bank branch",
        placeholder: "Enter branch code",
      },
      [PERSONAL_BANK_BRANCH_NAME]: {
        title: "Bank branch name",
        description: "The name for this bank branch",
        placeholder: "Enter branch name",
      },
      [PERSONAL_BANK_CPF_CNPJ]: {
        title: "CNPJ",
        description: "Your CNPJ",
        placeholder: "Enter CNPJ",
      },
      [PERSONAL_BANK_CHINESE_NATIONAL_ID]: {
        title: "Bank ID",
        description: "This bank's Chinese National ID",
        placeholder: "Enter bank ID",
      },
      [PERSONAL_BANK_CITY]: {
        title: "Bank city",
        description: "The city where this bank is located",
        placeholder: "Enter city",
      },
      [PERSONAL_BANK_PROVINCE]: {
        title: "Bank province",
        description: "The province where this bank is located",
        placeholder: "Enter province",
      },
      [PERSONAL_BANK_ROUTING_NUMBER]: {
        title: "Routing number",
        description: "This bank's routing number",
        placeholder: "Enter routing number",
      },
      [PERSONAL_BANK_CLABE]: {
        title: "CLABE Number",
        description: "Your standardized bank key",
        placeholder: "Enter CLABE",
      },
    };

    this.LIST_SELECTION_FIELDS = {
      [PERSONAL_BANK_COUNTRY]: {
        data: ISO_3166_ALPHA_2_CODES.map((code) => {
          const item = ISO_3166_COUNTRIES[code];

          return {
            key: code,
            title: `${item.emoji} ${item.name}`,
          };
        }),
        title: "Bank country",
        placeholder: "Select bank country",
      },
      [PERSONAL_BANK_PRIMARY_CURRENCY]: {
        data: SUPPORTED_BANK_CURRENCIES.map((code) => {
          const name = CURRENCY_NAMES[code];

          return {
            key: code,
            title: code,
            description: name,
          };
        }),
        title: "Primary currency",
        placeholder: "Select currency",
        description: "The primary currency of this bank account",
      },
      [PERSONAL_BANK_ACCOUNT_TYPE]: {
        data: [
          {
            key: PERSONAL_BANK_ACCOUNT_TYPE_CHECKING,
            title: "Checking",
          },
          {
            key: PERSONAL_BANK_ACCOUNT_TYPE_SAVINGS,
            title: "Savings",
          },
        ],
        title: "Account type",
        placeholder: "Select account type",
      },
    };

    this.DATE_PICKER_FIELDS = {
      [PERSONAL_BANK_BENEFICIARY_DOB]: {
        title: "Date of birth",
        description: "The account holder's date of birth",
        placeholder: "Select birthday",
      },
    };

    this.PHONE_NUMBER_FIELDS = {
      [PERSONAL_BANK_BENEFICIARY_PHONE]: {
        title: "Phone number",
        description: "The account holder's phone number",
        placeholder: "Enter phone number",
      },
    };

    this.ADDRESS_SELECTION_FIELDS = {
      [PERSONAL_BANK_BENEFICIARY_PHYSICAL_ADDRESS]: {
        title: "Account holder address",
      },
    };
  }

  componentDidUpdate(lastProps) {
    if (lastProps.encryptedPaymentMethods !== this.props.encryptedPaymentMethods) {
      this.loadPersonalPaymentMethods();
    }
  }

  loadPersonalPaymentMethods() {
    this.setState({ loading: true }, async () => {
      const newPaymentMethods = await requestPersonalData(
        PERSONAL_PAYMENT_METHODS
      );
      const newIndex =
        newPaymentMethods.bank_accounts.length == 0
          ? null
          : this.state.index == null
          ? newPaymentMethods.bank_accounts.length - 1
          : this.state.index;
      const newBankAccount =
        newPaymentMethods.bank_accounts.length == 0
          ? this.state.bankAccount
          : newPaymentMethods.bank_accounts[newIndex];

      this.setState({
        payment_methods: newPaymentMethods,
        bankAccount: newBankAccount,
        loading: false,
      });
    });
  }

  openEditBankAccountAddress() {
    this.props.navigation.navigate("PersonalPaymentMethodsEditBankAccountAddress", {
      payment_methods: this.state.payment_methods,
      index: this.state.index,
      bankAccount: this.state.bankAccount
    })
  }

  updateBankAccount() {
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
      });
    });
  }

  getDateClassInstance(day, month, year) {
    return new Date(Date.UTC(year, month, day, 3, 0, 0));
  }

  renderDate(day, month, year) {
    if (day == null || month == null || year == null) return ""
    
    const date = this.getDateClassInstance(day, month, year)

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  tryDeleteBankAccount() {
    createAlert(
      "Delete address?",
      "Are you sure you would like to remove this bank account from your personal profile?",
      [
        {
          text: "No",
          onPress: () => {
            resolveAlert();
          },
        },
        {
          text: "Yes",
          onPress: () => {
            this.deleteBankAccount();
            resolveAlert();
          },
        },
      ],
      {
        cancelable: false,
      }
    );
  }

  deleteBankAccount() {
    this.setState({ loading: true }, async () => {
      if (this.state.index != null) {
        let bankAccounts = this.state.payment_methods.bank_accounts;
        bankAccounts.splice(this.state.index, 1);

        await modifyPersonalDataForUser(
          { ...this.state.payment_methods, bank_accounts: bankAccounts },
          PERSONAL_PAYMENT_METHODS,
          this.props.activeAccount.accountHash
        );
      }

      this.props.navigation.dispatch(NavigationActions.back());
    });
  }

  closeModal() {
    this.setState(
      {
        currentTextInputModal: null,
        currentListSelectionModal: null,
        currentDatePickerModal: null,
        currentPhoneNumberModal: null,
      },
      () => {
        this.updateBankAccount();
      }
    );
  }

  render() {
    return PersonalPaymentMethodsEditBankAccountRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
    encryptedPaymentMethods: state.personal.payment_methods
  }
};

export default connect(mapStateToProps)(PersonalPaymentMethodsEditBankAccount);