import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { addNewIdentityName, changeActiveIdentity } from '../../../actions/actionCreators';
import { selectIdentities, selectActiveIdentityId } from '../../../selectors/identity';

const mapStateToProps = (state) => ({
  identities: selectIdentities(state),
  activeIdentityId: selectActiveIdentityId(state),
});

const mapDispatchToProps = (dispatch) => ({
  actions: bindActionCreators(
    {
      addNewIdentityName,
      changeActiveIdentity,
    },
    dispatch,
  ),
});

export default connect(mapStateToProps, mapDispatchToProps);
