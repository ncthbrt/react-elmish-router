// Note: require is *necessary*  as 'route-parser' uses a different module format.
// If you change this code to use `import ParsedRoute from 'router-parser';` it *will* break.
import ParsedRoute = require('route-parser');
import { Dispatch, Effect, Effects, StateEffectPair } from 'react-use-elmish';

export type Match = { [key: string]: string };
type UnfilteredMatch = { [key: string]: string | undefined };

export type ParsedHash = { [key: string]: string | true } | false;
export type ParsedSearch = { [key: string]: string | true } | false;

function assertTrue(condition: boolean, reason: string) {
  if (!condition) {
    throw new Error(reason);
  }
}

function parseHashOrSearch(
  x: string
): { [key: string]: string | true } | false {
  if (x === '' || x === '#' || x === '?') {
    return false;
  } else {
    return x
      .substr(1)
      .split('&')
      .map(el => el.split('='))
      .reduce(
        (prev, curr) => ({
          ...prev,
          [curr[0]]: curr[1] !== '' ? decodeURIComponent(curr[1]) : true,
        }),
        {}
      );
  }
}

function buildHash(values: ParsedHash): string {
  if (!values || Object.keys(values).length == 0) {
    return '';
  } else {
    const keyValuePairs = Object.keys(values).map(key => {
      if (values[key] == true) {
        return key;
      }
      return `${key}=${encodeURIComponent(values[key])}`;
    });

    return keyValuePairs.join('&');
  }
}

export function filterMatch(obj: UnfilteredMatch) {
  return Object.keys(obj)
    .filter(x => obj[x])
    .reduce((prev, key) => ({ ...prev, [key]: obj[key]! }), {} as Match);
}

export type RouteFromRouteDefinitions<
  RouteDefintion extends { [route: string]: string }
  > = keyof RouteDefintion & string;

export type RouteDefinitionsFromRoute<Route extends string> = {
  [R in Route]: string;
};

type ParsedRoutes<Route extends string> = {
  name: Route;
  pattern: string;
  parsed: ParsedRoute;
}[];

export type RouterState<Route extends string> = {
  router: {
    currentRoute: Route | false;
    currentMatch: Match;
    pathname: string;
    hash: string;
    parsedHash: ParsedHash;
    parsedSearch: ParsedSearch;
    search: string;
    _routes: ParsedRoutes<Route>;
  };
};

export type PathnameUpdatedAction<Route> = {
  type: 'ROUTER';
  subtype: 'URL_PATHNAME_UPDATED';
  pathname: string;
  route: Route | false;
  parsedHash: ParsedHash;
  parsedSearch: ParsedSearch;
  match: Match;
  hash: string;
  search: string;
};

type NavigateToRouteAction<Route> = {
  type: 'ROUTER';
  subtype: 'NAVIGATE_TO_ROUTE';
  route: Route;
  pushHistory: boolean;
  match: Match;
  hash?: ParsedHash;
  search?: ParsedSearch;
};

type NavigateBackAction = { type: 'ROUTER'; subtype: 'NAVIGATE_BACK' };

type NavigateForwardAction = { type: 'ROUTER'; subtype: 'NAVIGATE_FORWARD' };

export type RouterAction<Route> =
  | PathnameUpdatedAction<Route>
  | NavigateToRouteAction<Route>
  | NavigateBackAction
  | NavigateForwardAction;

function encodeMatches(matches: Match) {
  return Object.keys(matches).reduce((prev, curr) => {
    const value = matches[curr];
    if (value)
      prev[curr] = encodeURIComponent(value);

    return prev;
  }, {} as Match);
}

function decodeMatches(matches: Match) {
  return Object.keys(matches).filter(x => matches[x]).reduce((prev, curr) => {
    prev[curr] = decodeURIComponent(matches[curr]);
    return prev;
  }, {} as Match);
}

export function navigateEffect<Route extends string>(
  route: Route,
  pushHistory: boolean,
  matches: UnfilteredMatch,
  state: RouterState<Route>,
  hash: ParsedHash = {},
) {
  return Effects.dispatchFromFunction<RouterAction<Route>>(() => {
    const r = state.router._routes.find(x => x.name == route)!;
    const path = r.parsed.reverse(encodeMatches(filterMatch(matches)));
    assertTrue(
      !!path,
      `${route} should match the format '${
      r.pattern
      }' but only received the following parameters ${JSON.stringify(
        matches
      )} `
    );
    const builtHash = buildHash(hash ?? {});
    const pathWithHashAndSearch = path + (builtHash === '' ? '' : '#' + builtHash);
    if (pushHistory) {
      window.history.pushState({}, '', pathWithHashAndSearch);
    } else {
      window.history.replaceState({}, '', pathWithHashAndSearch);
    }
    return ({
      type: 'ROUTER',
      subtype: 'URL_PATHNAME_UPDATED',
      pathname: path,
      route: route,
      match: filterMatch(matches),
      hash: window.location.hash,
      search: window.location.search,
      parsedHash: parseHashOrSearch(window.location.hash),
      parsedSearch: parseHashOrSearch(window.location.search),
    });
  }, (err) => {
    console.error('FAILED TO ROUTE DUE TO ', err);
    return ({
      type: 'ROUTER',
      subtype: 'URL_PATHNAME_UPDATED',
      pathname: window.location.pathname + window.location.search,
      route: false,
      match: {},
      hash: window.location.hash,
      search: window.location.search,
      parsedHash: parseHashOrSearch(window.location.hash),
      parsedSearch: parseHashOrSearch(window.location.search),
    })
  });
}

export function goBackEffect() {
  return [
    (_: unknown) => {
      window.history.back();
    },
  ];
}

export function goForwardEffect() {
  return [
    (_: unknown) => {
      window.history.forward();
    },
  ];
}

function parseRoutes<RouteDefinitions extends { [name: string]: string }>(
  routes: RouteDefinitions
): ParsedRoutes<RouteFromRouteDefinitions<RouteDefinitions>> {
  return Object.keys(routes).sort().reduce(
    (prev, route) => [
      ...prev,
      {
        name: route as RouteFromRouteDefinitions<RouteDefinitions>,
        pattern: routes[route],
        parsed: new ParsedRoute(routes[route]),
      },
    ],
    [] as ParsedRoutes<RouteFromRouteDefinitions<RouteDefinitions>>
  );
}

function findMatchingRoute<Route extends string>(
  pathname: string,
  routes: ParsedRoutes<Route>
): [Match, Route | false] {
  for (const route in routes) {
    const routeInfo = routes[route];
    const match = routeInfo.parsed.match(pathname);
    if (!!match) {
      return [decodeMatches(match), routeInfo.name];
    }
  }
  return [{}, false];
}

export function routerReducer<
  State extends RouterState<Route>,
  Route extends string,
  Action extends RouterAction<Route>
>(prev: State, action: RouterAction<Route>): StateEffectPair<State, Action> {
  switch (action.subtype) {
    case 'URL_PATHNAME_UPDATED':
      return [
        {
          ...prev,
          router: {
            ...prev.router,
            currentRoute: action.route || false,
            currentMatch: action.match,
            pathname: action.pathname,
            hash: action.hash,
            search: action.search,
          },
        },
        Effects.none(),
      ];
    case 'NAVIGATE_TO_ROUTE':
      return [
        prev,
        navigateEffect(
          action.route,
          action.pushHistory,
          action.match,
          prev,
          action.hash
        ) as Effect<Action>,
      ];
    case 'NAVIGATE_BACK':
      return [prev, goBackEffect()];
    case 'NAVIGATE_FORWARD':
      return [prev, goForwardEffect()];
  }
}

export function initializeRouter<
  Routes extends string,
  State,
  Action extends unknown | RouterAction<Routes>
>(
  routes: RouteDefinitionsFromRoute<Routes>,
  stateEffectPair: StateEffectPair<State, Action>
): StateEffectPair<
  State & RouterState<Routes>,
  Action
> {
  const parsedRoutes = parseRoutes(routes);
  const pathname = window.location.pathname;
  const search = window.location.search;
  const hash = window.location.hash;
  const [match, route] = findMatchingRoute(pathname + search, parsedRoutes);
  console.log(match);

  const state: State &
    RouterState<Routes> = {
    ...stateEffectPair[0],
    router: {
      _routes: parsedRoutes,
      currentRoute: route,
      currentMatch: match,
      pathname: location.pathname,
      hash: location.hash,
      search: location.search,
      parsedHash: parseHashOrSearch(hash),
      parsedSearch: parseHashOrSearch(search),
    },
  };

  const pathnameUpdatedAction = Effects.action({
    type: 'ROUTER',
    subtype: 'URL_PATHNAME_UPDATED',
    match,
    route,
    pathname,
    search,
    hash,
    parsedHash: parseHashOrSearch(hash),
    parsedSearch: parseHashOrSearch(search),
  } as Action);

  return [
    state,
    Effects.combine(
      pathnameUpdatedAction,
      listenToHistoryPopEffect(state),
      stateEffectPair[1]
    ),
  ];
}

function listenToHistoryPopEffect<
  Route extends string,
  Action extends unknown | RouterAction<Route>
>(state: RouterState<Route>): Effect<Action> {
  return [
    (dispatch: Dispatch<Action>) => {
      const listener = () => {
        const pathname = window.location.pathname;
        const search = window.location.search;
        const hash = window.location.hash;
        const [match, route] = findMatchingRoute(
          pathname + search,
          state.router._routes
        );
        dispatch({
          type: 'ROUTER',
          subtype: 'URL_PATHNAME_UPDATED',
          match,
          route,
          pathname,
          search,
          hash,
          parsedHash: parseHashOrSearch(hash),
          parsedSearch: parseHashOrSearch(search),
        } as Action);
      };
      window.addEventListener('popstate', listener);
      window.addEventListener('hashchange', listener);
    },
  ];
}

export function dispatchNavigate<Route extends string>(
  route: Route,
  pushHistory: boolean,
  match: UnfilteredMatch,
  dispatch: Dispatch<RouterAction<Route>>,
  hash?: ParsedHash,
  search?: ParsedSearch
) {
  dispatch({
    type: 'ROUTER',
    subtype: 'NAVIGATE_TO_ROUTE',
    pushHistory,
    match: filterMatch(match),
    route,
    hash,
    search,
  });
}

export function dispatchGoBack(dispatch: Dispatch<RouterAction<unknown>>) {
  dispatch({ type: 'ROUTER', subtype: 'NAVIGATE_BACK' });
}

export function dispatchGoForward(dispatch: Dispatch<RouterAction<unknown>>) {
  dispatch({ type: 'ROUTER', subtype: 'NAVIGATE_FORWARD' });
}

