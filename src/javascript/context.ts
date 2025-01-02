import { defineContext } from "plugin";

export default defineContext({
  Program: ['Expression', 'Variable', 'Function'],
  Body: {
    parserConfig: { avoidWhitespace: "multiple", hasExpression: true }
  },
  Function: {
    node: {
      tag: 'function',
      id: '',
      async: false,
      arrow: false,
      params: [],
      body: [],
      returnType: 'void'
    },
    contextData: { parsedParams: false, parsedBody: false },
    parserConfig: { avoidWhitespace: "multiple" }
  },
  Params: {
    contextData: { params: [], declaration: false },
    parserConfig: { avoidWhitespace: true }
  },
  Expression: { parserConfig: { avoidWhitespace: true } },
  Variable: {
    node: {
      tag: 'var' as 'var' | 'let' | 'const',
    },
    parserConfig: { avoidWhitespace: 'multiple' },
  },
  Object: {
    node: {
      tag: 'object',
      properties: [] as ({ key: string, value: any })[]
    }
  }
})
