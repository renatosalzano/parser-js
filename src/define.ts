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
type ParseCtx<T extends unknown = {}> = (this: T, parser: ParseParams) => any;
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

export function ctx<T>(
  context: keyof T,
  context_data = {}
) {
  return (parser: any) => {
    parser.update_context(context, context_data);
  }
}


function defineLexical<T>(defineLexical: (ctx: Ctx<any>) => T) {

  const lexical = defineLexical(ctx as any) as any;

  for (const key in lexical) {

    const Key = `is${key[0].toUpperCase() + key.slice(1)}`;
    lexical[Key] = function (this: any, sequence: string, updateContext?: boolean) {
      const ret = lexical.hasOwnProperty(sequence);
      if (updateContext) {
        lexical[sequence](this)
      }
      return ret;
    }
  }

  return lexical as { [K in keyof T]: T[K] } & {
    // @ts-ignore
    [K in keyof T as `is${Capitalize<K>}`]: (this: any, sequence: string, updateContext?: boolean) => boolean;
  }
}

type ParserApi<C, L> = {
  avoidMultipleWhitespace(): boolean;
  updateContext(newContext: keyof JS['context'] | keyof C): void;
  startNode(...args: any[]): any;
  endNode(): void;
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

export {
  Extend,
  Define,
  defineLexical
}

// contextMap