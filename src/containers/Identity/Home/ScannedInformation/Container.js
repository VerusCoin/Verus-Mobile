import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { setScanInfoModalVisibility } from '../../../../actions/actionCreators';

const mapDispatchToProps = (dispatch) => ({
  actions: bindActionCreators(
    {
      setScanInfoModalVisibility,
    },
    dispatch,
  ),
});

export default connect(null, mapDispatchToProps);
