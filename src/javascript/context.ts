import { defineContext as def } from "define";

export default {
  Body: def(null, { avoidWhitespace: "multiple" }),
  Function: def({ async: false, arrow: false }, { avoidWhitespace: "multiple" }),
  Params: def(null, { avoidWhitespace: true }),
  Pattern: def(
    { type: 'object' as 'object' | 'array' },
    {
      avoidWhitespace: true,
      sequenceRule: { breakReg: /[,{}\[\]]/ }
    }
  ),
  Object: def(null, { avoidWhitespace: true }),
  Array: null,
  Expression: null,
  Variable: def({ kind: 'var' as 'var' | 'const' | 'let' }, { avoidWhitespace: "multiple" }),
  Module: null,
  Class: null
}