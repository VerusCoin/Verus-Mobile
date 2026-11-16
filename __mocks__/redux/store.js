class MockStore  {
  constructor(state) {
    this.state = state
    this.reducers = {}
    this.actionHistory = []
    this.listeners = []
  }

  dispatch(action) {
    this.actionHistory = [...this.actionHistory, action]

    Object.keys(this.reducers).map(reducerName => {
      this.state = {...this.state, [reducerName]: this.reducers[reducerName](this.state[reducerName], action)}
    })

    this.listeners.slice().forEach(listener => listener())
  }

  subscribe(listener) {
    this.listeners = [...this.listeners, listener]

    return () => {
      this.listeners = this.listeners.filter(item => item !== listener)
    }
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