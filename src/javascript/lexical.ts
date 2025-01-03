// import context from './context';
// import { defineLexical } from '../plugin';

// type Context = typeof context;

// type Ctx<C> = (name: keyof C, data?: any) => (parser: any) => void;



// export default defineLexical({
//   Variable: {
//     'const': { setNode: { tag: 'const' } },
//     'let': { setNode: { tag: 'let' } },
//     'var': { setNode: { tag: 'var' } }
//   },
//   Function: {
//     'function': null,
//     'async': { eat: 'function', setNode: { async: true } },
//   },
//   Expression: {
//     '=': null
//   },
//   isIdentifier: /^[a-zA-Z_$][a-zA-Z0-9_$]*$/,
//   isArrowFunction: /\(.*?=>/
// })

// declarator: {
//   var: ctx('Variable', { kind: 'var' }),
//     let: ctx('Variable', { kind: 'let' }),
//       const: ctx('Variable', { kind: 'const' }),
//     function: ctx('Function'),
//     class: ctx('Class'),
//       import: ctx('Module'),
//       export: ctx('Module'),
//     'function*': ctx('Function')
// },

// keyword: {
//   async: ctx('Function', { async: true }),
//     this: ctx('Expression'),
//       super: ctx('Expression')
// },

// statement: {
//   if: ctx('Body'),
//       else: ctx('Body'),
//       switch: ctx('Body'),
//       case: ctx('Body'),
//       default: ctx('Body'),
//       for: ctx('Body'),
//       while: ctx('Body'),
//       try: ctx('Body'),
//       catch: ctx('Body'),
//       finally: ctx('Body')
// },

// operator: {
//   '=>': ctx('Function'),
//     yield: ctx('Expression'),
//       await: ctx('Expression'),
//       '-': ctx('arithmetic'),
//       '*': ctx('arithmetic'),
//       '/': ctx('arithmetic'),
//       '%': ctx('arithmetic'),
//       '**': ctx('arithmetic'),
//       '++': ctx('arithmetic'),
//       '--': ctx('arithmetic'),
//       '==': ctx('comparison'),
//       '!=': ctx('comparison'),
//       '===': ctx('comparison'),
//       '!==': ctx('comparison'),
//       '>': ctx('comparison'),
//       '>=': ctx('comparison'),
//       '<': ctx('comparison'),
//       '<=': ctx('comparison'),
//       '&&': ctx('logical'),
//       '||': ctx('logical'),
//       '!': ctx('logical'),
//       '&': ctx('bitwise'),
//       '|': ctx('bitwise'),
//       '^': ctx('bitwise'),
//       '~': ctx('bitwise'),
//       '<<': ctx('bitwise'),
//       '>>': ctx('bitwise'),
//       '>>>': ctx('bitwise'),
//       '=': ctx('assignment'),
//       '+=': ctx('assignment'),
//       '-=': ctx('assignment'),
//       '*=': ctx('assignment'),
//       '/=': ctx('assignment'),
//       '%=': ctx('assignment'),
//       '**=': ctx('assignment'),
//       '<<=': ctx('assignment'),
//       '>>=': ctx('assignment'),
//       '>>>=': ctx('assignment'),
//       '&=': ctx('assignment'),
//       '|=': ctx('assignment'),
//       '^=': ctx('assignment')
//     },

// bracket: {
//   "(": { type: "BracketR" },
//   ")": { type: "BracketL" },
//   "[": { type: "SquareBracketR" },
//   "]": { type: "SquareBracketL" },
//   "{": { type: "CurlyBracketR" },
//   "}": { type: "CurlyBracketL" }
// }
