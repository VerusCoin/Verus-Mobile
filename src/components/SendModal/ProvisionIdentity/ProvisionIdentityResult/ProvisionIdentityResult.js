import {Component} from 'react';
import {connect} from 'react-redux';
import {closeSendModal} from '../../../../actions/actions/sendModal/dispatchers/sendModal';
import {ProvisionIdentityResultRender} from './ProvisionIdentityResult.render';

class ProvisionIdentityResult extends Component {
  constructor(props) {
    super(props);

    this.state = {
      response: props.route.params == null ? null : props.route.params.response,
    };
  }

  finishSend() {
    closeSendModal();
  }

  render() {
    return ProvisionIdentityResultRender.call(this);
  }
}

const mapStateToProps = state => {
  return {
    sendModal: state.sendModal,
  };
};

export default connect(mapStateToProps)(ProvisionIdentityResult);
