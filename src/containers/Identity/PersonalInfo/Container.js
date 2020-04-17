import { connect } from 'react-redux';

import { selectClaimCategories } from '../../../selectors/identity';

const mapStateToProps = (state) => ({
  claimCategories: selectClaimCategories(state),
});

export default connect(mapStateToProps);
