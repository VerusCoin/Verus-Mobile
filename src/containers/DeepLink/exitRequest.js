import {CommonActions} from '@react-navigation/native';

export const getRequestExitStackName = (signedIn, hasAccounts) =>
  signedIn
    ? 'SignedInStack'
    : hasAccounts
    ? 'SignedOutStack'
    : 'SignedOutNoKeyStack';

// Finds the navigator that holds the exit stack: the root stack. A request
// screen can sit in the DeepLink stack (one level below the root) or be a root
// screen itself (LoginRequestInfo, InvoiceInfo).
const findExitNavigator = (navigation, name) => {
  let current = navigation;

  while (current != null) {
    const state = current.getState?.();
    if (state?.routes?.some(route => route.name === name)) return current;
    current = current.getParent?.();
  }

  return null;
};

// Leaves a request for the stack `name`, optionally on a nested screen
// (`params` in the nested-navigator form: {screen, params}).
// When that stack is still open below the request (a link that arrives in an
// open wallet), the request closes over it, so Home stays mounted and shows at
// once. A reset mounts the stack again, with an empty Home until its widgets
// and tabs load. It stays only for a request with no such stack below it: a
// cold link that signed in, or a scan that replaced the stack.
export const exitRequestToStack = (navigation, name, params) => {
  const exitNavigation = findExitNavigator(navigation, name);
  const exitState = exitNavigation?.getState?.();
  const exitIndex =
    exitState?.routes?.findIndex(route => route.name === name) ?? -1;

  if (exitIndex >= 0) {
    // The exit stack shows already (another exit ran first) and needs no
    // nested screen: nothing to do.
    if (exitIndex === exitState.index && params === undefined) return;

    // A navigate by key closes every route above the exit stack and keeps the
    // stack's route key, so its screens stay mounted. With params the stack's
    // nested navigators open that screen. The action is not a user Back, so
    // the request's Back handler does not intercept it.
    const exitRoute = exitState.routes[exitIndex];
    exitNavigation.dispatch(
      CommonActions.navigate({
        key: exitRoute.key,
        name,
        params: params === undefined ? exitRoute.params : params,
      }),
    );
    return;
  }

  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [params === undefined ? {name} : {name, params}],
    }),
  );
};

// Leaves the request flow: Home when signed in, else the signed-out start.
export const exitRequest = (navigation, signedIn, hasAccounts, params) =>
  exitRequestToStack(
    navigation,
    getRequestExitStackName(signedIn, hasAccounts),
    params,
  );

export default exitRequest;
