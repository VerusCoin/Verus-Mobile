import { Component } from "react"
import { connect } from 'react-redux'
import { modifyPersonalDataForUser } from "../../../actions/actionDispatchers";
import { requestPersonalData } from "../../../utils/auth/authBox";
import {
  PERSONAL_PAYMENT_METHODS,
} from "../../../utils/constants/personal";
import { PersonalPaymentMethodsRender } from "./PersonalPaymentMethods.render"

class PersonalPaymentMethods extends Component {
  constructor() {
    super();
    this.state = {
      payment_methods: {
        bank_accounts: [],
        bank_cards: [],
      },
      loading: false,
    };
  }

  openEditBankAccount(index) {
    this.props.navigation.navigate("PersonalPaymentMethodsEditBankAccount", {
      payment_methods: this.state.payment_methods,
      index
    })
  }

  updatePaymentMethods(key, value) {
    this.setState(
      { payment_methods: { ...this.state.payment_methods, [key]: value }, loading: true },
      async () => {
        await modifyPersonalDataForUser(
          this.state.payment_methods,
          PERSONAL_PAYMENT_METHODS,
          this.props.activeAccount.accountHash
        );

        this.setState({ loading: false });
      }
    );
  }

  componentDidMount() {
    this.loadPersonalPaymentMethods();
  }

  componentDidUpdate(lastProps) {
    if (lastProps.encryptedPaymentMethods !== this.props.encryptedPaymentMethods) {
      this.loadPersonalPaymentMethods();
    }
  }

  loadPersonalPaymentMethods() {
    this.setState({ loading: true }, async () => {
      this.setState({
        payment_methods: await requestPersonalData(PERSONAL_PAYMENT_METHODS),
        loading: false,
      });
    });
  }

  render() {
    return PersonalPaymentMethodsRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
    encryptedPaymentMethods: state.personal.payment_methods
  }
};

export default connect(mapStateToProps)(PersonalPaymentMethods);