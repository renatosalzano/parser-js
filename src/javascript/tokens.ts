import { TokenContext } from 'parser/Context';
import { TokenProp as T } from 'parser/extend';

const
  prefix = true,
  postfix = true,
  bitwise = true,
  binary = true,
  ternary = true,
  assignment = true

const operator = [
  T(['+', '-', '*', '/', '%', '**'], { binary }),
  T(['+=', '-=', '/=', '%=', '*=', '**='], { assignment }),
  T('=', { assignment }),
  T('!', { prefix }),
  T('~', { prefix, bitwise }),
  T(['?', ':'], { ternary }),
  T(['==', '!=', '>', '>=', '<', '<=', '===', '!=='], { binary }),
  T('typeof', { prefix }),
  T('instanceof', { binary }),
  T(['||', '&&', '??'], { binary }),
  T(['await', 'new', 'delete', 'void'], { prefix }),
  T(['++', '--'], { prefix, postfix }),
  T('.', { binary }),
  T(['&', '|', '^', '<<', '>>', '>>>'], { bitwise, binary }),
  T(['|=', '&=', '^=', '<<=', '>>=', '>>>='], { bitwise, assignment })
]

const bracket = [['(', ')'], ['[', ']'], ['{', '}']];

const separator = [',', ':', ';', '\n'];

const keyword = ['true', 'false', 'null', 'this', 'super', 'yield', 'async', 'as', 'from', 'default', 'case', 'extends'];

const statement = [
  'var', 'const', 'let', 'function', 'class',
  'if', 'else',
  'switch', 'for', 'while', 'do',
  'return', 'continue', 'break',
  'try', 'catch', 'throw',
  'import', 'export',
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
  'window', 'console', 'log', 'error', 'info'
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

class PlusNegation extends TokenContext {
  name = 'plus-negation'
  start = ['+', '-'];

  onBefore(cancel: () => void) {

    if (this.prevToken.type != 'literal' && this.prevToken.type != 'identifier' && this.prevToken.type != 'bracket-close' && !this.prevToken.postfix) {
      this.token.prefix = true;
      delete this.token.binary;
    }

    cancel();
  }
}


class IncDecr extends TokenContext {
  name = 'increment/decrement'
  start = ['++', '--'];

  onBefore(cancel: () => void) {

    if (this.prevToken.value == '++' || this.prevToken.value == '--') {
      // TODO ERROR BLOCKING
      this.error({ message: 'expected expression' });
    }

    cancel();
  }
}


class ExpressionContainer extends TokenContext {
  name = 'expression-container';
  start = ['{', '[', '(', '${'];
  end = ['}', ']', ')'];

  state = {
    expression: true
  }

}


class Return extends TokenContext {
  name = 'return-statement';
  start = ['return'];

  state = {
    expression: true
  }

}


class TempateLiteral extends TokenContext {
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
    Return,
    IncDecr,
    Declarator,
    PlusNegation,
    ExpressionContainer,
    TempateLiteral
  ]
}