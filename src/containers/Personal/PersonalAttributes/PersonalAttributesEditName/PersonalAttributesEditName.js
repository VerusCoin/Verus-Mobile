import { Component } from "react"
import { connect } from 'react-redux'
import { modifyPersonalDataForUser } from "../../../../actions/actionDispatchers";
import { PERSONAL_ATTRIBUTES } from "../../../../utils/constants/personal";
import { provideCustomBackButton } from "../../../../utils/navigation/customBack";
import { PersonalAttributesEditNameRender } from "./PersonalAttributesEditName.render"
import { primitives } from "verusid-ts-client"
const { IDENTITYDATA_PERSONAL_DETAILS, IDENTITYDATA_DATEOFBIRTH} = primitives;

class PersonalAttributesEditName extends Component {
  constructor(props) {
    super(props);
    this.state = {
      attributes: props.route.params.attributes,
      currentTextInputModal: null,
      loading: false,
    };
  }

  componentDidMount() {
    if (this.props.route.params != null && this.props.route.params.customBack != null) {
      provideCustomBackButton(
        this,
        this.props.route.params.customBack.route,
        this.props.route.params.customBack.params
      );
    }
  }

  updateName() {
    this.setState({ loading: true }, async () => {
      await modifyPersonalDataForUser(
        this.state.attributes,
        PERSONAL_ATTRIBUTES,
        this.props.activeAccount.accountHash
      );

      this.setState({ loading: false });
    })
  }

  closeTextInputModal() {
    this.setState({currentTextInputModal: null}, () => {
      this.updateName()
    })
  }

  render() {
    return PersonalAttributesEditNameRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
  }
};

export default connect(mapStateToProps)(PersonalAttributesEditName);