import { createStore, applyMiddleware, compose } from 'redux';
import createSagaMiddleware from 'redux-saga';
import thunk from 'redux-thunk';

import rootReducer from '../reducers/index';
import rootSaga from '../sagas';

import reactotron from '../../ReactotronConfig';

//const middleware = [thunk, sagaMiddleware];

/*const store = createStore(
  rootReducer,
  compose(
    applyMiddleware(...middleware),
    reactotron.createEnhancer() // Add Reactotron as an enhancer
  )
);

sagaMiddleware.run(rootSaga); // Run the root saga

export default store;
*/
const configureStore = () => {
  const sagaMonitor = reactotron.createSagaMonitor();
  const sagaMiddleware = createSagaMiddleware( { sagaMonitor });

  const middlewares = [thunk, sagaMiddleware];

  const createEnhancers = (getDefaultEnhancers: GetDefaultEnhancers<any>) => {
    if (__DEV__) {
      return getDefaultEnhancers().concat(reactotron.createEnhancer())
    } else {
      return getDefaultEnhancers()
    }
  }

  const ret = createStore(rootReducer, compose(applyMiddleware(...middlewares), reactotron.createEnhancer()));

  sagaMiddleware.run(rootSaga)

  return ret
}

export default store = configureStore();



// Use this for testing with Jest
// import { createStore, applyMiddleware } from 'redux';
// import thunk from 'redux-thunk';
// import rootReducer from '../reducers/index'

// export default store = createStore(rootReducer, applyMiddleware(thunk))
