import { TokenContext } from "parser/Context";

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

class Ctx extends TokenContext {
  expression = false;
}

class ExpressionStart extends Ctx {
  name = 'expression';
  start = ['{', '[', '(', '${'];
  end = ['}', ']', ')']
  expression = true;

  onEnd() {
    this.expression = false;
  }
}


class TempateLiteral extends Ctx {
  name = 'template-literal';
  start = ['`'];
  end = ['`'];
  expression = false;

  tokenize() {
    if (this.expression) {
      // expected end
      this.Token.type = 'string';
    } else {
      return 'next';
    }
  }
}

export const tokens = {
  bracket,
  comment,
  keyword,
  operator,
  separator,
  specialToken,
  context: [
    ExpressionStart,
    TempateLiteral
  ]
}