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


function ctx<T>(
  context: keyof T,
  context_data = {}
) {
  return (parser: any, sequence_length: number) => {
    parser.update_context(context, context_data, sequence_length);
  }
}

type Obj<T> = { [key: string]: T }

type ParserConfig = {
  skipWhitespace?: boolean | "multiple",
  hasExpression?: boolean,
  sequenceRule?: RegExp
}

type ContextObject = {
  node?: Node;
  contextData?: LiteralObject;
  parserConfig?: ParserConfig;
  include?: (string | [string, LiteralObject])[]
}


type DefineContext<T extends { [key: string]: ContextObject } = { [key: string]: ContextObject }> = {
  [K in keyof T as K extends string ? K : never]: T[K]
} & {
  Program: string[]
}

function defineContext<T extends DefineContext = DefineContext>(context: T) {
  console.log('define context')
  return context as T
}


type LexicalOptions = {
  test?: RegExp,
  eat?: string,
  setNode?: { [key: string]: any }
} | null

type Lexical = {
  [key: string]: {
    [key: string]: LexicalOptions
  }
} | {
  [K in string as `is${string}`]: RegExp
}

type DefineLexical<T extends Lexical = Lexical> = {
  [K in keyof T as K extends string ? K : never]: T[K]
}

function defineLexical<T extends DefineLexical = DefineLexical>(lexical: T) {

  console.log('define lexical')
  const output: any = lexical;

  for (const key of Object.keys(lexical)) {

    if (key.startsWith('is')) {

      output[key] = function (sequence: string) {
        const reg = output[key] as RegExp;
        return reg.test(sequence);
      };

    } else {
      output[`is${key}`] = function (this: any, sequence: string, updateContext?: boolean) {

        const ret = output[key].hasOwnProperty(sequence);

        if (ret && updateContext) {
          this.api.startContext(key, output[key], sequence.length)
        }

        return ret;
      }
    }

  }

  return output as T;
}

type Brackets =
  | 'L'
  | 'R'
  | 'squareL'
  | 'squareR'
  | 'curlyL'
  | 'curlyR'

type ParserApi<L> = {
  startContext(context: string): void;
  endContext(): void;
  isBrackets: { [K in Brackets]: (currentChar?: boolean) => boolean };
} & {
  [K in keyof L as K extends string ? `is${K}` : never]: (sequence: string, updateContext?: boolean) => boolean
}

function define<T, C extends DefineContext = DefineContext, L = DefineLexical>(
  define: T & {
    context: C,
    lexical: L,
    parse: (api: ParserApi<L>) => {
      [K in keyof C]?: C[K] extends { node: infer U }
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
  ParserConfig,
  DefineLexical,
  define,
  defineContext,
  defineLexical
}

// contextMap