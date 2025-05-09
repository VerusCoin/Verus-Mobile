import { createStore, applyMiddleware, compose } from 'redux';
 import createSagaMiddleware from 'redux-saga';
 import thunk from 'redux-thunk';

 import rootReducer from '../reducers/index';
 import rootSaga from '../sagas'

 const configureStore = () => {
   const sagaMiddleware = createSagaMiddleware();

   const middlewares = [thunk, sagaMiddleware];

   // const ret = createStore(
   //   rootReducer,
   //   compose(
   //     applyMiddleware(...middlewares),
   //     window.__REDUX_DEVTOOLS_EXTENSION__ &&
   //       window.__REDUX_DEVTOOLS_EXTENSION__(),
   //   ),
   // );

   const ret = createStore(rootReducer, applyMiddleware(...middlewares));

   sagaMiddleware.run(rootSaga)

   return ret
 }

 export default store = configureStore();



 // Use this for testing with Jest
 // import { createStore, applyMiddleware } from 'redux';
 // import thunk from 'redux-thunk';
 // import rootReducer from '../reducers/index'

 // export default store = createStore(rootReducer, applyMiddleware(thunk))mport { createStore, applyMiddleware, compose } from 'redux';