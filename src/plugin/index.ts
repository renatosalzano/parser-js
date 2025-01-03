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
    [key: string]: { eat?: string, props?: { [key: string]: any } } | null;
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
  isBrackets: { [K in Brackets]: (currentChar?: boolean) => boolean };
} & {
  [K in keyof T as K extends string ? `is${K}` : never]: (sequence: string, updateContext?: boolean) => boolean
} & {
  [K in keyof A]: A[K]
}

type DefaultApi = {
  next(breakReg?: RegExp): string;
  startContext(context: string): void;
  endContext(): void;
  isBrackets: { [K in Brackets]: (currentChar?: boolean) => boolean };
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
function createPlugin({ context, api = {}, parse }: plugin) {
  let output = { context, api, parse } as any;
  let Program = new Set<string>();

  for (const ctx of Object.keys(context)) {

    if (ctx === 'Program') {
      Program = new Set(context.Program);
      delete context.Program;
    }

    output.api[`in${ctx}`] = function (this: any, sequence: string, updateContext?: boolean) {

      const ret = output.context[ctx].keyword.hasOwnProperty(sequence);

      if (ret && updateContext) {
        this.api.startContext(ctx, output.context.props[ctx], sequence.length)
      }

      return ret;
    }
  }

  let valid_context = ''
  for (const ctx of Program) {
    if (!output.context.hasOwnProperty(ctx)) {
      log('[warn];y', `Program: [${valid_context}`, `"${ctx}";y`, 'is not defined in', context)
      Program.delete(ctx);
    } else {
      valid_context += `'${ctx}',`
    }
  }

  for (const k of Object.keys(api)) {

    output.api[k] = function (sequence: string) {
      const reg = output.api[k] as RegExp;
      return reg.test(sequence);
    }
  }

  return output as plugin;
}

type plugin = {
  context: { [K in Exclude<string, 'Program'>]: ContextObject } & { Program?: string[] };
  api: Api;
  parse: (api: any) => { [key: string]: () => any }
}

type Plugin = (config?: { [key: string]: any }) => plugin

export {
  Plugin,
  plugin,
  DefaultApi,
  createPlugin
}

// export default Plugin;