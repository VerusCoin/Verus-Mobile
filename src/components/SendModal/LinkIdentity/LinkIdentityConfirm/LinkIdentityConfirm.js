import {Component} from 'react';
import {Alert} from 'react-native';
import {connect} from 'react-redux';
import {SEND_MODAL_FORM_STEP_FORM} from '../../../../utils/constants/sendModal';
import {LinkIdentityConfirmRender} from './LinkIdentityConfirm.render';

class LinkIdentityConfirm extends Component {
  constructor(props) {
    super(props);

    this.state = {
      verusId: props.route.params.verusId,
      friendlyNames: props.route.params.friendlyNames,
    };
  }

  goBack() {
    this.props.setModalHeight();
    this.props.navigation.navigate(SEND_MODAL_FORM_STEP_FORM);
  }

  submitData = async () => {
    await this.props.setLoading(true);
    await this.props.setPreventExit(true);

    try {
      //this.props.navigation.navigate(SEND_MODAL_FORM_STEP_RESULT, { txResult: res });
    } catch (e) {
      Alert.alert('Error', e.message);
    }

    this.props.setPreventExit(false);
    this.props.setLoading(false);
  };

  render() {
    return LinkIdentityConfirmRender.call(this);
  }
}

const mapStateToProps = (state, ownProps) => {
  return {};
};

export default connect(mapStateToProps)(LinkIdentityConfirm);
