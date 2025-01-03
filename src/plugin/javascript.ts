import type { DefaultApi } from "./";

const context = {
  Program: ['Variable', 'Function', 'Expression'],
  Variable: {
    keyword: {
      'let': null
    }
  },
  Function: {
    props: {
      async: false,
      arrow: false,
    },
    keyword: {
      'function': null,
      'async': { eat: "function", props: { async: true } }
    }
  }
}

const api = {
  isIdentifier: /^[a-zA-Z_$][a-zA-Z0-9_$]*$/,
  isArrowFunction: /\(.*?=>/
}

type Api = DefaultApi & {
  [K in keyof typeof context as `in${K}`]: (sequence: string, startContext?: boolean) => boolean;
}

export default (config: any) => {

  return {
    context,
    api,
    parse: ({
      inFunction
    }: Api) => ({
      Variable() { },
      Function() { }
    })
  }
}
