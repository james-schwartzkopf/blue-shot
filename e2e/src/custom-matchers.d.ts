declare module jasmine {
  interface Matchers<T> {
    toMatchBaseline(filename: string): boolean;
  }
}
