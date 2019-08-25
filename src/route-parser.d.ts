declare module 'route-parser' {
    class Routes {
      constructor(route: string);
      match(path: string): { [params: string]: string } | false;
      reverse(params: { [property: string]: string | number }): string;
    }
    export = Routes;
  }
  