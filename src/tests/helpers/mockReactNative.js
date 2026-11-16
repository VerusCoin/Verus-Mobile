// Builds a 'react-native' mock from the real module plus a test's overrides.
// The copy keeps the real module's lazy getters, so native modules that the
// test never touches do not load. A plain-object override (for example
// Platform, Keyboard or Dimensions) extends the real object, so screens and
// shared styles can still call the members that the test does not override.
const lazyCopy = source =>
  Object.defineProperties({}, Object.getOwnPropertyDescriptors(source));

const isPlainObject = value =>
  value != null && Object.getPrototypeOf(value) === Object.prototype;

const extendObject = (source, value) =>
  Object.create(Object.getPrototypeOf(source), {
    ...Object.getOwnPropertyDescriptors(source),
    ...Object.getOwnPropertyDescriptors(value),
  });

module.exports = (overrides = {}) => {
  const actual = jest.requireActual('react-native');
  const mock = lazyCopy(actual);
  for (const [name, value] of Object.entries(overrides)) {
    const extend =
      isPlainObject(value) && actual[name] != null && typeof actual[name] === 'object';
    Object.defineProperty(mock, name, {
      value: extend ? extendObject(actual[name], value) : value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  return mock;
};
