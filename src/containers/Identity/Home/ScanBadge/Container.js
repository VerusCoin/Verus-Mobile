import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import {
  selectScanInfoModalVisibility,
} from '../../../../selectors/identity';
import { setScanInfoModalVisibility } from '../../../../actions/actionCreators';

const mapStateToProps = (state) => ({
  scanInfoModalVisibility: selectScanInfoModalVisibility(state),
});

const mapDispatchToProps = (dispatch) => ({
  actions: bindActionCreators(
    {
      setScanInfoModalVisibility,
    },
    dispatch,
  ),
});

export default connect(mapStateToProps, mapDispatchToProps);
