import { Component } from "react"
import { connect } from 'react-redux'
import { modifyPersonalDataForUser } from "../../../../actions/actionDispatchers";
import { PERSONAL_ATTRIBUTES } from "../../../../utils/constants/personal";
import { PersonalAttributesEditNameRender } from "./PersonalAttributesEditName.render"

class PersonalAttributesEditName extends Component {
  constructor(props) {
    super(props);
    this.state = {
      attributes: props.route.params.attributes,
      name: {
        first: props.route.params.attributes.name.first,
        middle: props.route.params.attributes.name.middle,
        last: props.route.params.attributes.name.last
      },
      currentTextInputModal: null,
      loading: false
    };
  }

  updateName() {
    this.setState({ loading: true }, async () => {
      await modifyPersonalDataForUser(
        {...this.props.attributes, name: this.state.name},
        PERSONAL_ATTRIBUTES,
        this.props.activeAccount.accountHash
      );

      this.setState({ loading: false });
    })
  }

  closeTextInputModal() {
    this.setState({currentTextInputModal: null}, () => {
      if (
        this.state.name.first !== this.state.attributes.name.first ||
        this.state.name.middle !== this.state.attributes.name.middle ||
        this.state.name.last !== this.state.attributes.name.last
      ) {
        this.updateName()
      }
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