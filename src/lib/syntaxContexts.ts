function createContext(
  context: string,
  value?: any
) {

  return (parser: any) => {
    parser.update_context(context, value);
  }
}

const declarators = {
  var: createContext('variable', { kind: 'var' }),
  let: createContext('variable', { kind: 'let' }),
  const: createContext('variable', { kind: 'const' }),
  function: createContext('function'),
  class: createContext('class'),
  import: createContext('module'),
  export: createContext('module'),
  'function*': createContext('function')
};

const keywords = {
  async: createContext('function', { async: true }),
  this: createContext('expression'),
  super: createContext('expression')
};

const statements = {
  if: createContext('body'),
  else: createContext('body'),
  switch: createContext('body'),
  case: createContext('body'),
  default: createContext('body'),
  for: createContext('body'),
  while: createContext('body'),
  try: createContext('body'),
  catch: createContext('body'),
  finally: createContext('body')
};

const operators = {
  yield: createContext('expression'),
  await: createContext('expression'),
  '+': createContext('arithmetic'),
  '-': createContext('arithmetic'),
  '*': createContext('arithmetic'),
  '/': createContext('arithmetic'),
  '%': createContext('arithmetic'),
  '**': createContext('arithmetic'),
  '++': createContext('arithmetic'),
  '--': createContext('arithmetic'),
  '==': createContext('comparison'),
  '!=': createContext('comparison'),
  '===': createContext('comparison'),
  '!==': createContext('comparison'),
  '>': createContext('comparison'),
  '>=': createContext('comparison'),
  '<': createContext('comparison'),
  '<=': createContext('comparison'),
  '&&': createContext('logical'),
  '||': createContext('logical'),
  '!': createContext('logical'),
  '&': createContext('bitwise'),
  '|': createContext('bitwise'),
  '^': createContext('bitwise'),
  '~': createContext('bitwise'),
  '<<': createContext('bitwise'),
  '>>': createContext('bitwise'),
  '>>>': createContext('bitwise'),
  '=': createContext('assignment'),
  '+=': createContext('assignment'),
  '-=': createContext('assignment'),
  '*=': createContext('assignment'),
  '/=': createContext('assignment'),
  '%=': createContext('assignment'),
  '**=': createContext('assignment'),
  '<<=': createContext('assignment'),
  '>>=': createContext('assignment'),
  '>>>=': createContext('assignment'),
  '&=': createContext('assignment'),
  '|=': createContext('assignment'),
  '^=': createContext('assignment'),
  '=>': createContext('function')
};

const brackets = {
  "(": { type: "BracketR" },
  ")": { type: "BracketL" },
  "[": { type: "SquareBracketR" },
  "]": { type: "SquareBracketL" },
  "{": { type: "CurlyBracketR" },
  "}": { type: "CurlyBracketL" }
};

function isDeclarator(parser: any, value: string, update_context = false) {
  if (declarators.hasOwnProperty(value)) {
    if (update_context) {
      declarators[value as Declarators](parser)
    }
    return true;
  }
  return false;
}

function isStatement(parser: any, value: string, update_context = false) {
  if (statements.hasOwnProperty(value)) {
    if (update_context) {
      statements[value as Statements](parser)
    }
    return true;
  }
  return false;
}

function isKeyword(parser: any, value: string, update_context = false) {
  if (keywords.hasOwnProperty(value)) {
    if (update_context) {
      keywords[value as Keywords](parser)
    }
    return true;
  }
  return false;
}

function isOperator(parser: any, value: string, update_context = false) {
  if (operators.hasOwnProperty(value)) {
    if (update_context) {
      operators[value as Operators](parser)
    }
    return true;
  }
  return false;
}

export default {
  declarators,
  statements,
  operators,
  keywords,
  brackets,
  isKeyword,
  isOperator,
  isStatement,
  isDeclarator,
}

export type Declarators = keyof typeof declarators;
export type Statements = keyof typeof statements;
export type Operators = keyof typeof operators;
export type Keywords = keyof typeof keywords;

export type Utils = {
  isKeyword(value: string, update_context?: boolean): boolean;
  isOperator(value: string, update_context?: boolean): boolean;
  isStatement(value: string, update_context?: boolean): boolean;
  isDeclarator(value: string, update_context?: boolean): boolean;
}