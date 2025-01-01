// import javascript from "javascript";

type LiteralObject = { [key: string]: any };

type Node<T extends unknown = LiteralObject> = {
  tag: string;
} & {
  [K in keyof T]: T[K]
}

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
type IsString<T> = keyof T extends string ? T : never



type IsValidLexical<T> = { [K in keyof T]: T[K] extends { [key: string]: (parser: any) => void; } ? T[K] : never; };


type ParserApi<C, L> = {
  avoidWhitespace(onlyMultiple?: boolean): boolean;
  setSequenceRule(breakReg?: RegExp, replaceReg?: RegExp): void;
  // updateContext<T>(newContext: keyof JS['context'] | keyof C, data?: T, startOffset?: number): void;
  endContext(): void;
  // startNode<T>(name: keyof JS['context'] | keyof C, data?: T): Node<T>;
  // endNode<T>(node: T): T;
  // getNode<T>(index?: number): Node<T>;
  appendNode<T>(node: T): void;
  bracketL(currChar?: boolean): boolean;
  bracketR(currChar?: boolean): boolean;
  squareL(currChar?: boolean): boolean;
  squareR(currChar?: boolean): boolean;
  curlyL(currChar?: boolean): boolean;
  curlyR(currChar?: boolean): boolean;
}

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

type Obj<T> = { [key: string]: T }

type ContextRules = {
  avoidWhitespace?: boolean | "multiple",
  hasExpression?: boolean,
  sequenceRule?: {
    breakReg: RegExp, replaceReg?: RegExp
  }
}

type ContextObject = {
  node?: Node;
  contextData?: LiteralObject;
  parserConfig?: ContextRules;
  expected?: (string)[]
}


type DefineContext<T extends { [key: string]: ContextObject } = { [key: string]: ContextObject }> = {
  [K in keyof T as K extends string ? K : never]: T[K]
}

function defineContext<T extends DefineContext = DefineContext>(context: T) {
  console.log('define context')
  return context as T
}

type DefineLexical<T extends DefineContext = DefineContext> = {
  [K in keyof T]?: {
    [key: string]: Partial<T[K]['node']> | null
  }
} & {
  [key: string]: any
} & {
  Program?: (keyof T)[]
}

function defineLexical<T extends DefineContext = DefineContext>(lexical: DefineLexical<T>) {

  console.log('define lexical')
  const kw = {};
  const regexp = {};
  for (const context of Object.keys(lexical)) {
    if (context === 'Program') continue;
    const keyword_map = lexical[context];

    for (const kw of Object.keys(keyword_map)) {
      console.log(kw)
    }

  }

  return lexical
}

function define<T, C extends DefineContext = DefineContext, L = DefineLexical>(
  define: T & {
    context: C,
    lexical: L,
    parse: (api: any) => {
      [K in keyof C]: C[K] extends { node: infer U }
      ? (this: C[K]['contextData'] & (U extends undefined ? {} : { node: U })) => void
      : (this: C[K]['contextData']) => void
    }

  }
) {

  console.log('plugin define')
  // console.log(define)

  // todo
  return define;
}


export {
  Extend,
  Define,
  ContextRules,
  define,
  defineContext,
  defineLexical
}

// contextMap