import { TokenContext } from 'parser/Context';

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
  'switch', 'for', 'while', 'do',
  'return', 'continue', 'break',
  'try', 'catch', 'throw',
  'import', 'export', 'default',
  'with', // deprecated
]

const specialToken = ['=>', '...', '?.', '`', '${'];

const comment = [
  ['//'],
  ['/*', '*/']
]

const builtIn = [
  'eval', 'isFinite', 'isNaN', 'parseFloat', 'parseInt', 'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent', 'escape', 'unescape',
  'Object', 'Function', 'Boolean', 'Symbol',
  'Error', 'AggregateError', 'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError', 'URIError', 'InternalError',
  'Number', 'BigInt', 'Math', 'Date', 'Temporal', 'String', 'RegExp',
  'Array', 'Int8Array', 'Uint8Array', 'Uint8ClampedArray', 'Int16Array', 'Uint16Array', 'Int32Array', 'Uint32Array', 'BigInt64Array', 'BigUint64Array', 'Float16Array', 'Float32Array', 'Float64Array',
  'Map', 'Set', 'WeakMap', 'WeakSet',
  'prototype', 'constructor',
  'ArrayBuffer', 'SharedArrayBuffer', 'DataView', 'Atomics', 'JSON',
  'WeakRef', 'FinalizationRegistry',
  'Iterator', 'AsyncIterator', 'Promise', 'GeneratorFunction', 'AsyncGeneratorFunction', 'Generator', 'AsyncGenerator', 'AsyncFunction',
  'Reflect', 'Proxy',
  'Intl',
]

class Declarator extends TokenContext {
  name = 'declarator';
  start = ['var', 'const', 'let', 'function'];

  // onBefore(cancel: () => void) {
  //   // cancel();
  // }

  onStart() {
    this.token.subtype = 'declarator';
  }
}

class Expression extends TokenContext {
  state = {
    expression: false
  }
}

class Operator extends Expression {

}

class ExpressionContainer extends Expression {
  name = 'expression-container';
  start = ['{', '[', '(', '${'];
  end = ['}', ']', ')'];

  state = {
    expression: true
  }

}

class TempateLiteral extends Expression {
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
      this.token.type = 'literal';
      this.token.subtype = 'string';
    }
  }

  onEnd() {
    this.token.subtype = 'template-end';
  }

  tokenize() {
    if (this.state.expression || this.char.curr == '`') {
      // expected end
      this.token.type = 'literal';
      this.token.subtype = 'string';
    } else {
      return 'next';
    }
  }
}

class TagStart extends Expression {
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
  builtIn,
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