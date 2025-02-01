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
  'new', 'typeof', 'delete', 'void',

  'await'
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

const keyword = ['true', 'false', 'null', 'this', 'super', 'yield', 'async'];

const statement = [
  'var', 'const', 'let', 'function',
  'if', 'else',
  'switch', 'for', 'while',
  'return',
  'try', 'catch', 'throw',
  'with', // deprecated
  'import', 'export', 'default'
]

const specialToken = ['=>', '...', '?.', '`', '${'];

const comment = [
  ['//'],
  ['/*', '*/']
]

class Declarator extends TokenContext {
  name = 'declarator';
  start = ['var', 'const', 'let', 'function'];

  // onBefore(cancel: () => void) {
  //   // cancel();
  // }

  onStart() {
    this.token.subtype = 'declarator';
    console.log(this.token)
  }

}

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
    if (this.token.eq('`')) {
      this.token.subtype = 'template-start';
    } else {
      this.token.subtype = 'string';
    }
  }

  onEnd() {
    this.token.subtype = 'template-end';
  }

  tokenize() {
    if (this.state.expression || this.char.curr == '`') {
      // expected end
      this.token.subtype = 'string';
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
  statement,
  specialToken,
  context: [
    Declarator,
    ExpressionContainer,
    TempateLiteral
  ]
}