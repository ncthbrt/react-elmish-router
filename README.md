
# react-elmish-router

## Setup

In your types folder, create the following type definitions: 
```typescript
// This type enumerates all the valid pages in the application
export type Route =
    | 'HELLO'
    | 'PAGE1'
    | 'PAGE2'    
    | 'PAGE_N'
    ;

// Extend your domain state with the router state, this contains all the routing information
export type State =
    DomainState
    & RouterState<Route>;    
    
export type Action =
    // Extend your domain actions with router actions
    | DomainActions
    | RouterAction<Route>;    
```

Now you need to create a mapping from the set of routes, to matching urls. This uses the syntax from https://github.com/rcs/route-parser
```typescript
export const routeDefinitions = {
    'HELLO': '/hello',
    'PAGE1': '/page1',
    'PAGE2': '/page/2',
    'PAGE_N': '/page/more/:pageNumber'    
};
```

In your elmish initialization function, need to initialize the router:
```typescript
function intializer(): StateEffectPair<State, Action> {
    const [state, action] = initializeRouter<Route, Omit<DomainState, 'client'>, Action>(routeDefinitions, [{
        /* Your domain state here */
    }, Effects.none<Action>()]);

    return [state, action];
}
```

Finally in your reducer, you need to handle the `ROUTER` action type. You can of course, extend the router reduce, by handling a subset of the event types. The most useful of which is probably `URL_PATHNAME_UPDATED`. `URL_PATHNAME_UPDATED` is called on page load. 
```typescript
        case 'ROUTER': {
            const [nextState, nextEffects] = routerReducer(prev, action);            
            if(action.subtype === 'URL_PATHNAME_UPDATED') {
              switch(action.route) {
                case 'HELLO': // do stuff here
                case 'PAGE1': // do stuff here
                case 'PAGE2': // do stuff here
                case 'PAGE_N': // do stuff here
                case false: // no matching pages
                default: throwIfNotNever(action.route); // Should never hit the default case
              }
            } else {
              return [nextState, nextEffects];
            }
        }
```

## Usage
React Elmish Router provides various ways to navigate between routes. You can use the effect creators, `goBackEffect`, `goForwardEffect` and `navigateEffect`, or dispatch navigate events using `dispatchGoBack`, `dispatchGoForward` and `dispatchNavigate`, or alternatively use the `Link`, and `Back` and `Forward` react components to dispatch events for you
