import {Component} from 'react';
import {connect} from 'react-redux';
import {closeSendModal} from '../../../../actions/actions/sendModal/dispatchers/sendModal';
import {LinkIdentityResultRender} from './LinkIdentityResult.render';

class LinkIdentityResult extends Component {
  constructor(props) {
    super(props);

    this.state = {
      verusId: props.route.params == null ? {} : props.route.params.verusId,
      friendlyNames:
        props.route.params == null ? {} : props.route.params.friendlyNames,
    };
  }

  finishSend() {
    closeSendModal();
  }

  render() {
    return LinkIdentityResultRender.call(this);
  }
}

const mapStateToProps = state => {
  return {
    sendModal: state.sendModal,
  };
};

export default connect(mapStateToProps)(LinkIdentityResult);
