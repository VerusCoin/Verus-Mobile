import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { selectClaimCategories } from '../../../selectors/identity';
import { setActiveClaimCategory } from '../../../actions/actionCreators';

const mapStateToProps = (state) => ({
  claimCategories: selectClaimCategories(state),
});

const mapDispatchToProps = (dispatch) => ({
  actions: bindActionCreators(
    {
      setActiveClaimCategory,
    },
    dispatch,
  ),
});

export default connect(mapStateToProps, mapDispatchToProps);
