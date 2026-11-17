// Builds a 'react-redux' mock from the real module plus a test's hooks.
// Tests pass useSelector (and optionally useDispatch) that read their own
// mock state. connect() reads the same state through those hooks, so shared
// connected components (for example Modal) render without a Provider.
module.exports = (overrides = {}) => {
  const React = require('react');
  const mock = {
    ...jest.requireActual('react-redux'),
    useDispatch: () => jest.fn(),
    ...overrides,
  };
  if (!overrides.connect) {
    mock.connect = (mapStateToProps, mapDispatchToProps) => Component => {
      const Connected = React.forwardRef((props, ref) => {
        const state = mock.useSelector(value => value);
        const dispatch = mock.useDispatch();
        const stateProps = mapStateToProps ? mapStateToProps(state, props) : {};
        let dispatchProps = {dispatch};
        if (typeof mapDispatchToProps === 'function') {
          dispatchProps = mapDispatchToProps(dispatch, props);
        } else if (mapDispatchToProps) {
          dispatchProps = Object.fromEntries(
            Object.entries(mapDispatchToProps).map(([name, create]) => [
              name,
              (...args) => dispatch(create(...args)),
            ]),
          );
        }
        return React.createElement(Component, {...props, ...stateProps, ...dispatchProps, ref});
      });
      Connected.displayName = `Connect(${Component.displayName || Component.name})`;
      return Connected;
    };
  }
  return mock;
};
