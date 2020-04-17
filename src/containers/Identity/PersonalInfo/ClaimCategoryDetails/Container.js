import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { selectClaimsByCategoryId } from '../../../../selectors/identity';
import { setActiveClaim } from '../../../../actions/actionCreators';

const mapStateToProps = (state) => ({
  claims: selectClaimsByCategoryId(state),
});

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators(
    {
      setActiveClaim
    },
    dispatch
  ),
});

export default connect(mapStateToProps, mapDispatchToProps);
