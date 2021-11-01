import { NavigationActions } from "@react-navigation/compat";
import { Component } from "react"
import { connect } from 'react-redux'
import { modifyPersonalDataForUser } from "../../../../actions/actionDispatchers";
import { createAlert, resolveAlert } from "../../../../actions/actions/alert/dispatchers/alert";
import { PERSONAL_LOCATIONS } from "../../../../utils/constants/personal";
import { PersonalLocationsEditTaxCountryRender } from "./PersonalLocationsEditTaxCountry.render"

class PersonalLocationsEditTaxCountry extends Component {
  constructor(props) {
    super(props);
    const initialTaxCountry =
      props.route.params.index != null &&
      props.route.params.locations.tax_countries[
        props.route.params.index
      ] != null
        ? props.route.params.locations.tax_countries[
            props.route.params.index
          ]
        : {
            country: "",
            tin: ""
          };

    this.state = {
      locations: props.route.params.locations,
      taxCountry: initialTaxCountry,
      currentTextInputModal: null,
      loading: false,
      countryModalOpen: false,
      index: props.route.params.index
    };

    this.textInputLabels = {
      tin: {
        title: "Taxpayer ID",
        description: "Taxpayer ID, specific to chosen country (e.g. SSN for USA, CPF for Brazil, etc.)",
        placeholder: "optional"
      }
    }
  }

  updateTaxCountry() {
    this.setState({ loading: true }, async () => {
      let taxCountries = this.state.locations.tax_countries
      
      if (taxCountries == null) {
        taxCountries = [this.state.taxCountry]
      } else if (this.state.index == null) {
        taxCountries.push(this.state.taxCountry)
      } else {
        taxCountries[this.state.index] = this.state.taxCountry
      }

      await modifyPersonalDataForUser(
        {...this.state.locations, tax_countries: taxCountries},
        PERSONAL_LOCATIONS,
        this.props.activeAccount.accountHash
      );

      this.setState({
        loading: false,
        index:
          this.state.locations.tax_countries == null
            ? 0
            : this.state.index == null
            ? this.state.locations.tax_countries.length - 1
            : this.state.index,
      });
    })
  }

  tryDeleteTaxCountry() {
    createAlert(
      'Delete tax country?',
      'Are you sure you would like to remove this tax country from your personal profile?',
      [
        {text: 'No', onPress: () => {
          resolveAlert()
        }},
        {text: 'Yes', onPress: () => {
          this.deleteTaxCountry()
          resolveAlert()
        }},
      ],
      {
        cancelable: false,
      },
    )
  }

  deleteTaxCountry() {
    this.setState({ loading: true }, async () => {
      if (this.state.index != null) {
        let taxCountries = this.state.locations.tax_countries
        taxCountries.splice(this.state.index, 1);
  
        await modifyPersonalDataForUser(
          {...this.state.locations, tax_countries: taxCountries},
          PERSONAL_LOCATIONS,
          this.props.activeAccount.accountHash
        );
      }

      this.props.navigation.dispatch(NavigationActions.back())
    })
  }

  selectCountry(countryCode) {
    this.setState({
      taxCountry: {
        ...this.state.taxCountry,
        country: countryCode
      }
    }, () => this.updateTaxCountry())
  }

  closeTextInputModal() {
    this.setState({currentTextInputModal: null}, () => {
      this.updateTaxCountry()
    })
  }

  render() {
    return PersonalLocationsEditTaxCountryRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
  }
};

export default connect(mapStateToProps)(PersonalLocationsEditTaxCountry);