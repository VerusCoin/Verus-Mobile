import { connect } from 'react-redux';

import {
  selectActiveClaim,
  selectIdentities,
} from '../../../../selectors/identity';

const mapStateToProps = (state) => ({
  selectedClaim: selectActiveClaim(state),
  availableIdentities: selectIdentities(state),
});

export default connect(mapStateToProps);
