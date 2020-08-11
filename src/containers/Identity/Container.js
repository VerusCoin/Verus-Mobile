import { connect } from 'react-redux';

import { selectActiveIdentityId } from '../../selectors/identity';


const mapStateToProps = (state) => ({
  activeIdentityId: selectActiveIdentityId(state),
});

export default connect(mapStateToProps);
