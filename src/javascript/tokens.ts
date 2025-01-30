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
  state = {
    expression: false
  }
}

class ExpressionContainer extends Ctx {
  name = 'expression-container';
  start = ['{', '[', '(', '${'];
  end = ['}', ']', ')']

  state = {
    expression: true
  }
}

class TempateLiteral extends Ctx {
  name = 'template-literal';
  start = ['`'];
  end = ['`'];
  state = {
    expression: false
  }

  onStart() {
    this.skipWhitespace(false);
    if (this.char.curr === '`') {
      this.increment();
    }
  }

  onEnd() {
    this.Token.type = 'string';
  }

  tokenize() {
    if (this.state.expression) {
      // expected end
      this.Token.type = 'string';
    } else {
      return 'next';
    }
  }
}

class TagStart extends Ctx {
  name = 'tag';
  start = ['<'];

  is_tag_name(name: string) {
    /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/.test(name);
  }

  // tokenize() {
  //   if ()
  // }
}

export const tokens = {
  bracket,
  comment,
  keyword,
  operator,
  separator,
  specialToken,
  context: [
    ExpressionContainer,
    TempateLiteral
  ]
}