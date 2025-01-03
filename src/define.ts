import javascript from "javascript";

type JS = typeof javascript;

type obj = { [key: string]: any }

type ParseParams = {
  char: {
    curr: string;
    prev: string;
    next: string;
  },
  sequence: string;
}

type ContextData<T> = {
  [K in keyof T]: T[K]
} & {
  [key: string]: any;
}


type ParseCtx<T extends unknown = {}> = (this: ContextData<T>, parser: ParseParams) => any;
type Ctx<C> = (name: keyof C, data?: obj) => (parser: any) => void;

type Lexical<T extends obj = obj> = {
  [K in keyof T]: {
    [key: string]: (parser: any) => void;
  }
}

type IsString<T> = keyof T extends string ? T : never

// type ReturnLexical<T> = {
//   [K in keyof T]: T[K]
// } & {
//   [K in keyof IsString<T> as `is${Capitalize<K>}`]: (sequence: string, updateContext?: boolean) => boolean
// }

type IsValidLexical<T> = { [K in keyof T]: T[K] extends { [key: string]: (parser: any) => void; } ? T[K] : never; };
type Node<T> = {
  type: string;
  start: number;
  end: number;
} & {
  [K in keyof T]: T[K]
}

type ParserApi<C, L> = {
  avoidWhitespace(onlyMultiple?: boolean): boolean;
  setSequenceRule(breakReg?: RegExp, replaceReg?: RegExp): void;
  updateContext<T>(newContext: keyof JS['context'] | keyof C, data?: T, startOffset?: number): void;
  endContext(): void;
  startNode<T>(name: keyof JS['context'] | keyof C, data?: T): Node<T>;
  endNode<T>(node: T): T;
  getNode<T>(index?: number): Node<T>;
  appendNode<T>(node: T): void;
  bracketL(nextChar?: boolean): boolean;
  bracketR(nextChar?: boolean): boolean;
  squareL(nextChar?: boolean): boolean;
  squareR(nextChar?: boolean): boolean;
  curlyL(nextChar?: boolean): boolean;
  curlyR(nextChar?: boolean): boolean;
}
  & JS["lexical"] & L

type Define<
  C,
  L
> = {
  context: C;
  lexical: L;
  parser: (api: ParserApi<C, L>) => {
    [K in keyof C as `parse${K & string}`]: ParseCtx<C[K]>
  }
}


type Extend = <C, L>(define: Define<C, L>) => void;

function ctx<T>(
  context: keyof T,
  context_data = {}
) {
  return (parser: any, sequence_length: number) => {
    parser.update_context(context, context_data, sequence_length);
  }
}


type ContextRules = {
  avoidWhitespace?: boolean | "multiple",
  sequenceRule?: {
    breakReg: RegExp, replaceReg?: RegExp
  }
}


function defineContext<T>(data: T, rules: ContextRules = {}) {
  return { data, rules } as T
}

function defineLexical<T>(define: (ctx: Ctx<any>) => T) {

  const lexical = define(ctx as any) as any;

  for (const group in lexical) {

    const Key = `is${group[0].toUpperCase() + group.slice(1)}`;
    const lexicalGroup = lexical[group];

    lexical[Key] = (parser: any, sequence: string, updateContext?: boolean) => {
      const hasProp = lexicalGroup.hasOwnProperty(sequence);
      if (hasProp && updateContext) {
        lexicalGroup[sequence](parser, sequence.length)
      }
      return hasProp;
    }

  }

  return lexical as { [K in keyof T]: T[K] } & {
    // @ts-ignore
    [K in keyof T as `is${Capitalize<K>}`]: (sequence: string, updateContext?: boolean) => boolean;
  }
}


export {
  Extend,
  Define,
  ContextRules,
  defineContext,
  defineLexical
}

// contextMap