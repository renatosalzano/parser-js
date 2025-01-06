import { ParserRules } from "Parser";
import Program from "Progam";
import { log } from "utils";

type Brackets =
  | 'L'
  | 'R'
  | 'squareL'
  | 'squareR'
  | 'curlyL'
  | 'curlyR'

type ContextObject = {
  props?: { [key: string]: any };
  rules?: {
    avoidWhitespace?: boolean | "multiple",
    hasExpression?: boolean,
  },
  keyword: {
    [key: string]: { hoisting?: boolean, eat?: string, props?: { [key: string]: any } } | null;
  }
}

// type Context<T extends { [key: string]: ContextObject<any> } = { [key: string]: ContextObject<any> }> = {
//   [K in keyof T]: T[K] & ContextObject<T[K]>
// }

type Api = {
  [K in string extends `is${string}` ? K : never]: RegExp
}

type ParserApi<T, A> = {
  startContext(context: string): void;
  endContext(): void;
  brackets: { [K in Brackets]: (currentChar?: boolean) => boolean };
} & {
  [K in keyof T as K extends string ? `is${K}` : never]: (sequence: string, updateContext?: boolean) => boolean
} & {
  [K in keyof A]: A[K]
}

type DefaultApi = {
  char: { curr: string, prev: string, next: string },
  setRules(rules: ParserRules): void;
  appendNode: Program['appendNode'];
  createNode: Program['createNode'];
  eat(sequence: string, breakReg?: RegExp): void;
  expected(value: string, debug?: boolean): boolean;
  /**
   * Advances the parsing of the source and constructs a sequence of characters.
   * 
   * @param {RegExp|true} [include=true] - Regular expression to include characters or boolean to include all characters.
   * @param {RegExp|false} [exclude=RegExp] - Regular expression to exclude characters or boolean to exclude nothing.
   * @param {boolean} [debug=false] - If true, enables debugging and logs inclusion/exclusion information.
   * @returns {string} - The constructed sequence of characters.
  */
  next(include?: RegExp | true, exclude?: RegExp | false, debug?: boolean): string;
  nextChar(): string;
  eachChar(callback: (char: string) => any, debug?: boolean): void;
  startContext(context: string): void;
  endContext(): void;
  error(message: string): void;
  currentContext: { name: string, props: { [key: string]: any } }
}


// type ParserPlugin<T extends Context = Context, A extends Api = Api> = {
//   context: T,
//   api?: A,
//   parse: (api: ParserApi<T, A>) => { [K in keyof T]: () => any }
// }


// function Plugin<T, A = Api>(config: (prev: any) => {
//   context: T,
//   api?: A,
//   parse: (api: ParserApi<T, A>) => { [K in keyof T]: () => any }
// }) {

// }


type plugin = {
  context: { [K in Exclude<string, 'Program'>]: ContextObject } & { Program?: string[] };
  api: Api;
  operators: { [key: string]: string };
  parse: (api: any) => { [key: string]: () => any }
}

type Plugin = (config?: { [key: string]: any }) => plugin

export {
  Plugin,
  plugin,
  DefaultApi
}

// export default Plugin;


