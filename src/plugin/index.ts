import { Error, Token, TokenType } from "parser/Tokenizer";
import Program from "parser/Progam";
import { log } from "utils";
import { ContextObject } from "parser/Context";

type Brackets =
  | 'L'
  | 'R'
  | 'squareL'
  | 'squareR'
  | 'curlyL'
  | 'curlyR'

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
  ctx: { [key: string]: ContextObject };
  char: { curr: string, prev: string, next: string };
  token: Token;
  expectedToken: Token;
  next(debug?: boolean): Token;
  expected(comparator?: string | ((token: Token) => boolean)): boolean;
  nextLiteral(endToken: string | string[]): Token;
  appendNode: Program['appendNode'];
  createNode: Program['createNode'];
  createRef: Program['createRef'];
  logNode: Program['log'];
  eat(sequence: string, breakReg?: RegExp): void;
  startContext(context: string, props?: ContextObject['props'], instruction?: { [key: string]: any }): void;
  endContext(): void;
  error(message: string, type?: 'error' | 'warn' | 'info'): void;
  isIdentifier(value: string): boolean;
  currentContext(): ContextObject;
}




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


