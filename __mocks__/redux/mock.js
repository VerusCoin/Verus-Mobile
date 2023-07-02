const MockStore = require('./store')

const store = new MockStore({})

function mockRedux() {
  return {
    combineReducers: (reducers) => {
      store.setReducers(reducers)
      Object.keys(reducers).map(reducerName => {
        store.setStore({...store.getState(), [reducerName]: reducers[reducerName](undefined, {})})
      })
    },
    setStore: (store) => store.setStore(store),
    getActions: () => store.getActions(),
    applyMiddleware: () => 0,
    createStore: (rootReducer, middleware) => {
      return {
        getState: () => store.getState(),
        dispatch: (action) => {
          store.dispatch(action)
        }
      }
    },
    compose: () => {}
  } 
}

module.exports = mockRedux