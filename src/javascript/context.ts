import { Define, ContextRules, defineContext } from "plugin";

export default defineContext({
  Body: { parserConfig: { avoidWhitespace: "multiple" } },
  Function: {
    node: {
      tag: 'function',
      name: '',
      async: false,
      arrow: false,
      params: [],
      body: [],
      returnType: 'void'
    },
    contextData: { parsedParams: false, parsedBody: false },
    parserConfig: { avoidWhitespace: "multiple" },
    expected: ['Params', 'Body'],
  },
  Params: {
    contextData: { params: [] },
    parserConfig: { avoidWhitespace: true }
  },
  Expression: { parserConfig: { avoidWhitespace: true } },
  Variable: {
    node: {
      tag: 'var' as 'var' | 'let' | 'const',
      declarations: []
    },
    parserConfig: { avoidWhitespace: 'multiple' },
    expected: ['Declaration']
  },
  Declaration: {},
  Object: {
    node: {
      tag: 'object',
      properties: [] as ({ key: string, value: any })[]
    }
  }
})

// export default {
//   Body: def(null, { avoidWhitespace: "multiple" }),
//   Function: def({ async: false, arrow: false }, { avoidWhitespace: "multiple" }),
//   Params: def({}, { avoidWhitespace: true }),
//   Pattern: def(
//     { type: 'object' as 'object' | 'array' },
//     {
//       avoidWhitespace: true,
//       sequenceRule: { breakReg: /[,{}\[\]]/ }
//     }
//   ),
//   Object: def(null, { avoidWhitespace: true }),
//   Array: null,
//   Expression: null,
//   Variable: def({ kind: 'var' as 'var' | 'const' | 'let' }, { avoidWhitespace: "multiple" }),
//   Module: null,
//   Class: null
// }