import { Ctx } from "parser/Context";

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


class TempateLiteral extends Ctx {

  name = 'template-literal';

  start = '`';

  expression = false;

  checkTokenType() {

    if (this.expression) {

      if (this.char.curr === '}') {
        this.expression = false;
      }

      return;
    } else {

      if (this.char.curr === '`') {
        return this.end();
      }

    }

    if ((this.char.curr + this.char.next) === '${') {
      return;
    }

    return 'string';
  }

  tokenize = {
    string: () => {

      const token = this.getToken();
      const end_string = token === '${';

      switch (true) {
        case end_string:
          this.token.type = 'string';
          this.expression = true;
          return;
        default:
          return 'next';
      }
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
    TempateLiteral
  ]
}