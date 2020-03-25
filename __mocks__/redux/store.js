class MockStore  {
  constructor(state) {
    this.state = state
    this.reducers = {}
    this.actionHistory = []
  }

  dispatch(action) {
    this.actionHistory = [...this.actionHistory, action]

    Object.keys(this.reducers).map(reducerName => {
      this.state = {...this.state, [reducerName]: this.reducers[reducerName](this.state[reducerName], action)}
    })
  }

  setStore(store) {
    this.state = store
  }

  setReducers(reducers) {
    this.reducers = reducers
  }

  getState() {
    return this.state
  }

  getActions() {
    return this.actionHistory
  }
}

module.exports = MockStore