import { all, spawn } from 'redux-saga/effects';

import identitySaga from './identity'
import transactionsSaga from './transactions';

const sagas = [
  identitySaga,
  transactionsSaga,
];

export default function*() {
  yield all(sagas.map((saga) => spawn(saga)));
}
