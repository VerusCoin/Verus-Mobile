import { connect } from 'react-redux';

import { ManageWyreDocuments } from './ManageWyreDocuments';

import {
  selectWyreAccountField,
  selectWyrePutAccountIsFetching,
} from '../../../../selectors/paymentMethods';

import {
  uploadWyreAccountDocument
} from '../../../../actions/actions/PaymentMethod/WyreAccount';


const mapStateToProps = (state) => ({
  isFetching: selectWyrePutAccountIsFetching(state),
  field: selectWyreAccountField(state, 'individualProofOfAddress'),
  fieldId: 'individualProofOfAddress',
});

const mapDispatchToProps = ({
  uploadWyreAccountDocument,
});

export default connect(mapStateToProps, mapDispatchToProps)(ManageWyreDocuments);
