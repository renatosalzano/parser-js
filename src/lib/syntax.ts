function Type(
  id: string,
  context: string,
  value?: any
) {

  return (parser: any) => {
    parser.update_context(context, value);
  }
}

const declarators = {
  var: Type('Var', 'variable'),
  let: Type('Let', 'variable'),
  const: Type('Const', 'variable'),
  function: Type('Function', 'function'),
  class: Type('Class', 'class'),
  import: Type('Import', 'module'),
  export: Type('Export', 'module'),
  'function*': Type('GeneratorFunctionDeclaration', 'function')
};


const keywords = {
  async: Type('AsyncModifier', 'function', { async: true }),
  this: Type('ThisExpression', 'expression'),
  super: Type('SuperExpression', 'expression'),
};


const statements = {
  if: Type('IfStatement', 'body'),
  else: Type('ElseStatement', 'body'),
  switch: Type('SwitchStatement', 'body'),
  case: Type('CaseStatement', 'body'),
  default: Type('DefaultStatement', 'body'),
  for: Type('ForStatement', 'body'),
  while: Type('WhileStatement', 'body'),
  try: Type('TryStatement', 'body'),
  catch: Type('CatchStatement', 'body'),
  finally: Type('FinallyStatement', 'body'),
};


const operators = {
  yield: Type('YieldExpression', 'expression'),
  await: Type('AwaitExpression', 'expression'),
  '+': Type('BinaryExpression', 'arithmetic'),
  '-': Type('BinaryExpression', 'arithmetic'),
  '*': Type('BinaryExpression', 'arithmetic'),
  '/': Type('BinaryExpression', 'arithmetic'),
  '%': Type('BinaryExpression', 'arithmetic'),
  '**': Type('BinaryExpression', 'arithmetic'),
  '++': Type('UpdateExpression', 'arithmetic'),
  '--': Type('UpdateExpression', 'arithmetic'),
  '==': Type('BinaryExpression', 'comparison'),
  '!=': Type('BinaryExpression', 'comparison'),
  '===': Type('BinaryExpression', 'comparison'),
  '!==': Type('BinaryExpression', 'comparison'),
  '>': Type('BinaryExpression', 'comparison'),
  '>=': Type('BinaryExpression', 'comparison'),
  '<': Type('BinaryExpression', 'comparison'),
  '<=': Type('BinaryExpression', 'comparison'),
  '&&': Type('LogicalExpression', 'logical'),
  '||': Type('LogicalExpression', 'logical'),
  '!': Type('UnaryExpression', 'logical'),
  '&': Type('BinaryExpression', 'bitwise'),
  '|': Type('BinaryExpression', 'bitwise'),
  '^': Type('BinaryExpression', 'bitwise'),
  '~': Type('UnaryExpression', 'bitwise'),
  '<<': Type('BinaryExpression', 'bitwise'),
  '>>': Type('BinaryExpression', 'bitwise'),
  '>>>': Type('BinaryExpression', 'bitwise'),
  '=': Type('AssignmentExpression', 'assignment'),
  '+=': Type('AssignmentExpression', 'assignment'),
  '-=': Type('AssignmentExpression', 'assignment'),
  '*=': Type('AssignmentExpression', 'assignment'),
  '/=': Type('AssignmentExpression', 'assignment'),
  '%=': Type('AssignmentExpression', 'assignment'),
  '**=': Type('AssignmentExpression', 'assignment'),
  '<<=': Type('AssignmentExpression', 'assignment'),
  '>>=': Type('AssignmentExpression', 'assignment'),
  '>>>=': Type('AssignmentExpression', 'assignment'),
  '&=': Type('AssignmentExpression', 'assignment'),
  '|=': Type('AssignmentExpression', 'assignment'),
  '^=': Type('AssignmentExpression', 'assignment'),
  '=>': Type('ArrowFunctionExpression', 'function'),
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