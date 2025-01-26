import type { Ctx, CtxParams } from "parser/Context";

const operator = [
  '+', '-', '*', '/', '%', '**',
  '.', '!', '?',

  '==', '!=', '>', '>=', '<', '<=', '===', '!==', 'instanceof', 'in',

  '++', '--',
  '||', '&&', '??',

  '=',
  '+=', '-=', '/=', '%=', '*=', '**=',
  '&&=', '||=', '??=',
  '|=', '&=', '^=',

  '&', '|', '^', '~', '<<', '>>', '>>>', '>>>=',
  'new', 'typeof', 'delete', 'void'
];

export const op = {

  unary: {
    math: new Set(['++', '--'])
  },
  binary: {
    math: new Set(['+', '-', '*', '/', '%', '**']),
    comparison: new Set(['==', '!=', '>', '>=', '<', '<=', '===', '!==', 'instanceof', 'in'])
  }
}

const bracket = ['(', ')', '[', ']', '{', '}'];

const separator = [',', ':', ';', '\n'];

const keyword = ['true', 'false', 'null', 'this', 'super', 'yield'];

const specialToken = ['=>', '...', '?.', '`', '${'];

const comment = [
  ['//'],
  ['/*', '*/']
]

export const unaryOperators = new Set([
  '++',  // Operatore di incremento
  '--',  // Operatore di decremento
  '+',   // Operatore unario positivo
  '-',   // Operatore unario negativo
  '!',   // Operatore di negazione logica
  '~',   // Operatore di bitwise NOT
  'typeof', // Operatore typeof
  'delete', // Operatore delete
  'void'    // Operatore void
]);

export const tokens = {
  bracket,
  comment,
  keyword,
  operator,
  separator,
  specialToken
}