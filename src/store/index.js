import { createStore, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';
import thunk from 'redux-thunk';
import { composeWithDevTools } from 'remote-redux-devtools';

import rootReducer from '../reducers/index';
import rootSaga from '../sagas'

const configureStore = () => {
  if (global.ENABLE_VERUS_IDENTITIES) {
    const sagaMiddleware = createSagaMiddleware();
  
    const middlewares = [thunk, sagaMiddleware];
    
    const composeEnhancers = composeWithDevTools({ realtime: true, port: 8000 });

    const ret = createStore(rootReducer, composeEnhancers(
      applyMiddleware(...middlewares)
    ));

    sagaMiddleware.run(rootSaga)

    return ret
  } else {
    const composeEnhancers = composeWithDevTools({ realtime: true, port: 8000 });
  
    return createStore(rootReducer, composeEnhancers(
      applyMiddleware()
    ));
  }  
}

export default store = configureStore();



// Use this for testing with Jest
// import { createStore, applyMiddleware } from 'redux';
// import thunk from 'redux-thunk';
// import rootReducer from '../reducers/index'

// export default store = createStore(rootReducer, applyMiddleware(thunk))