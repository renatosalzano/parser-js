export const context = {
  Block: {
    props: { functionBody: false },
    token: {
      "{": null,
    }
  },
  Variable: {
    props: { implicit: false },
    keyword: {
      'var': { kind: 'var', hoisting: true },
      'const': { kind: 'const' },
      'let': { kind: 'let' }
    }
  },
  Function: {
    props: {
      async: false,
      arrow: false,
      method: false,
      expression: false,
    },
    keyword: {
      'function': null,
      'async': { async: true },
    }
  },
  Class: {
    keyword: {
      'class': null
    }
  },
  Expression: {
    props: { group: false, append: true },
    default: true,
    token: {
      '(': null
    }
  },
  Statement: {
    keyword: {
      'if': null,
      'else': null,
      'switch': null,
      'return': null
    }
  }
}


const operator = [
  '+', '-', '*', '/', '%', '.', '>', '<', '!', '=', '&', '|', '^', '~', '?', '??', '??=', '++', '--', '==', '!=', '>=', '<=', '&&', '&&=', '||', '||=', '+=', '-=', '*=', '/=', '%=', '<<', '>>', '===', '!==', '>>>', '>>>=', 'new', 'typeof', 'instanceof'
];

const bracket = ['(', ')', '[', ']', '{', '}'];

const separator = [',', ':', ';', '\n'];

const keyword = ['true', 'false', 'null', 'this', 'super'];

const specialToken = ['=>', '...', '?.', '`', '${'];

const comment = [
  ['//'],
  ['/*', '*/']
]

export const tokens = {
  bracket,
  comment,
  keyword,
  operator,
  separator,
  specialToken
}