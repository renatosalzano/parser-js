import contextMap from './context';
import { defineLexical } from '../define';

const brackets = {
  "(": { type: "BracketR" },
  ")": { type: "BracketL" },
  "[": { type: "SquareBracketR" },
  "]": { type: "SquareBracketL" },
  "{": { type: "CurlyBracketR" },
  "}": { type: "CurlyBracketL" }
};

type ContextJS = typeof contextMap;

type Ctx<C> = (name: keyof C, data?: any) => (parser: any) => void;

const lexical = defineLexical((ctx: Ctx<ContextJS>) => {
  return {

    declarator: {
      var: ctx('Variable', { kind: 'var' }),
      let: ctx('Variable', { kind: 'let' }),
      const: ctx('Variable', { kind: 'const' }),
      Function: ctx('Function'),
      Class: ctx('Class'),
      import: ctx('Module'),
      export: ctx('Module'),
      'Function*': ctx('Function')
    },

    keyword: {
      async: ctx('Function', { async: true }),
      this: ctx('Expression'),
      super: ctx('Expression')
    },

    statement: {
      if: ctx('Body'),
      else: ctx('Body'),
      switch: ctx('Body'),
      case: ctx('Body'),
      default: ctx('Body'),
      for: ctx('Body'),
      while: ctx('Body'),
      try: ctx('Body'),
      catch: ctx('Body'),
      finally: ctx('Body')
    },

    operator: {
      '=>': ctx('Function'),
      yield: ctx('Expression'),
      await: ctx('Expression'),
      // '-': ctx('arithmetic'),
      // '*': ctx('arithmetic'),
      // '/': ctx('arithmetic'),
      // '%': ctx('arithmetic'),
      // '**': ctx('arithmetic'),
      // '++': ctx('arithmetic'),
      // '--': ctx('arithmetic'),
      // '==': ctx('comparison'),
      // '!=': ctx('comparison'),
      // '===': ctx('comparison'),
      // '!==': ctx('comparison'),
      // '>': ctx('comparison'),
      // '>=': ctx('comparison'),
      // '<': ctx('comparison'),
      // '<=': ctx('comparison'),
      // '&&': ctx('logical'),
      // '||': ctx('logical'),
      // '!': ctx('logical'),
      // '&': ctx('bitwise'),
      // '|': ctx('bitwise'),
      // '^': ctx('bitwise'),
      // '~': ctx('bitwise'),
      // '<<': ctx('bitwise'),
      // '>>': ctx('bitwise'),
      // '>>>': ctx('bitwise'),
      // '=': ctx('assignment'),
      // '+=': ctx('assignment'),
      // '-=': ctx('assignment'),
      // '*=': ctx('assignment'),
      // '/=': ctx('assignment'),
      // '%=': ctx('assignment'),
      // '**=': ctx('assignment'),
      // '<<=': ctx('assignment'),
      // '>>=': ctx('assignment'),
      // '>>>=': ctx('assignment'),
      // '&=': ctx('assignment'),
      // '|=': ctx('assignment'),
      // '^=': ctx('assignment')
    },

    // bracket: {
    //   "(": { type: "BracketR" },
    //   ")": { type: "BracketL" },
    //   "[": { type: "SquareBracketR" },
    //   "]": { type: "SquareBracketL" },
    //   "{": { type: "CurlyBracketR" },
    //   "}": { type: "CurlyBracketL" }
    // }
  }
})

export default lexical;