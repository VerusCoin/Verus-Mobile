import { all, spawn } from 'redux-saga/effects';

import identitySaga from './identity'

const sagas = [
  identitySaga,
];

export default function*() {
  yield all(sagas.map((saga) => spawn(saga)));
}
