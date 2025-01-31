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

class Declarator extends TokenContext {
  name = 'declarator';
  start = ['var', 'const', 'let', 'function'];

  onStart() {
    this.token.type = 'declarator';
  }

  onEnd() {
    console.log('end immediate')
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

  onStart() {
    this.token.type = this.token.value == '${' ? 'template-expression-start' : 'bracket'
  }

  onEnd() {
    this.token.type = 'porco dio'
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
      this.token.type = 'template-start';
    } else {
      this.token.type = 'string';
    }
  }

  onEnd() {
    this.token.type = 'template-end';
  }

  tokenize() {
    if (this.state.expression || this.char.curr == '`') {
      // expected end
      this.token.type = 'string';
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
    Declarator,
    ExpressionContainer,
    TempateLiteral
  ]
}