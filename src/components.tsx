import * as React from 'react';
import { RouterAction, ParsedHash, ParsedSearch, dispatchNavigate, dispatchGoBack, dispatchGoForward } from './index';
import { Dispatch } from 'react-use-elmish';


/* Type resolves to dispatch & every prop of the <a /> element except for 'href' */
type RouterLinkProps<Route> = {
  dispatch: Dispatch<RouterAction<Route>>;
} & Omit<
  React.DetailedHTMLProps<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    HTMLAnchorElement
  >,
  'href'
>;

export function Link<Route extends string>({
  dispatch,
  route,
  pushHistory,
  match,
  hash,
  search,
  ...rest
}: RouterLinkProps<Route> & {
  route: Route;
  match?: { [key: string]: string | undefined };
  pushHistory?: boolean;
  hash?: ParsedHash;
  search?: ParsedSearch;
}) {
  return (
    <a
      onClick={() => dispatchNavigate(route, pushHistory ?? false, match ?? {}, dispatch, hash, search)}
      {...rest}
    />
  );
}

export function Back({ dispatch, ...props }: RouterLinkProps<unknown>) {
  return (
    <a
      onClick={() => dispatchGoBack(dispatch)}
      href="#"
      {...props}
    />
  );
}

export function Forward({ dispatch, ...props }: RouterLinkProps<unknown>) {
  return (
    <a
      onClick={() => dispatchGoForward(dispatch)}
      {...props}
    />
  );
}