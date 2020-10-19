const mockedModule = jest.mock('redux-saga');

module.exports = function() {
  return {
    run: jest.fn()
  }
}