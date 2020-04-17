import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { setActiveIdentity } from '../../../actions/actionCreators';
import { selectIdentities, selectActiveIdentityId } from '../../../selectors/identity';

const mapStateToProps = (state) => ({
  identities: selectIdentities(state),
  activeIdentity: selectActiveIdentityId(state),
});

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators(
    {
      setActiveIdentity
    },
    dispatch
  ),
});

export default connect(mapStateToProps, mapDispatchToProps);
