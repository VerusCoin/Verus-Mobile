import { createStore, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';
import thunk from 'redux-thunk';
import { composeWithDevTools } from 'redux-devtools-extension';

import rootReducer from '../reducers/index';
import rootSaga from '../sagas'

const sagaMiddleware = createSagaMiddleware();

const middlewares = [thunk, sagaMiddleware];

export default Store = createStore(rootReducer, composeWithDevTools(
  applyMiddleware(...middlewares),
));

sagaMiddleware.run(rootSaga)
