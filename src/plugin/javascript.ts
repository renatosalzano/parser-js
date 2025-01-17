import Parser from 'parser/Tokenizer'
import { Node, BlockNode, IdentifierNode } from "parser/Progam";
import type { DefaultApi } from "./";
import { ContextObject } from 'parser/Context';
import { log } from 'utils';

const context = {
  Program: ['Variable', 'Function', 'Expression', 'Block', 'Statement', 'Class', 'Invalid', 'TemplateLiteral'],
  Block: {
    id: 'block',
    props: { node: null as Node | null },
    token: {
      "{": null,
    }
  },
  Variable: {
    id: 'var',
    props: { kind: 'var' as 'var' | 'const' | 'let' },
    keyword: {
      'var': { props: { kind: 'var' } },
      'const': { props: { kind: 'const' } },
      'let': { props: { kind: 'let' } }
    }
  },
  Function: {
    id: 'func',
    default: true,
    props: {
      async: false,
      arrow: false,
      method: false,
      expression: false,
    },
    keyword: {
      'function': null,
      'async': { eat: "function", props: { async: true } },
    }
  },
  Class: {
    id: 'class',
    keyword: {
      'class': null
    }
  },
  Expression: {
    id: 'expr',
    default: true,
    token: {
      '(': null
    }
  },
  Statement: {
    id: 'statement',
    keyword: {
      'if': null,
      'else': null,
      'switch': null,
      'return': null
    }
  },
  TemplateLiteral: {
    id: 'lit',
    token: {
      '`': null,
    }
  }
}

const operator = {
  '+': 'addition',
  '-': 'subtraction',
  '*': 'multiplication',
  '/': 'division',
  '%': 'reminder',
  '.': 'member access',
  '>': 'greater than',
  '<': 'less than',
  '!': 'logical NOT',
  '=': 'assignment',
  '&': 'bitwise AND',
  '|': 'bitwise OR',
  '^': 'bitwise XOR',
  '~': 'bitwise NOT',
  '?': 'ternary start',
  '?.': 'optional chaining',
  '??': 'nullish coalescing',
  '??=': 'nullish coalescing assignment',
  '++': 'increment',
  '--': 'decrement',
  '==': 'equality',
  '!=': 'inequality',
  '>=': 'greater than or equal to',
  '<=': 'less than or equal to',
  '&&': 'logical AND',
  '&&=': 'logical AND assignment',
  '||': 'logical OR',
  '||=': 'logical OR assignment',
  '+=': 'addition assignment',
  '-=': 'subtraction assignment',
  '*=': 'multiplication assignment',
  '/=': 'division assignment',
  '%=': 'modulus assignment',
  '<<': 'left shift',
  '>>': 'right shift',
  '===': 'strict equality',
  '!==': 'strict inequality',
  '>>>': 'unsigned right shift',
  '>>>=': 'unsigned right shift assignment',
  '...': 'spread',
  'new': 'create instance'
}

const bracket = {
  '(': 'paren R',
  ')': 'paren L',
  '[': 'square R',
  ']': 'square L',
  '{': 'curly R',
  '}': 'curly L',
  '`': 'template literal',
  '${': 'dollar curly R'
}

// const comment = {
//   '//': "comment",
//   "/*": "comment multiline start",
//   "*/": "comment multiline end"
// }

const separator = {
  ',': 'comma',
  ':': 'colon',
  ';': 'semicolon',
  '\n': 'line feed',
}

const keyword = {
  'true': 'boolean',
  'false': 'boolean',
  'null': 'null',
  'typeof': 'type of',
  'instanceof': 'instance of',
}

type Context = typeof context;

type Api = DefaultApi & {
  [K in keyof typeof context]: ContextObject;
}

class VarNode extends Node {
  tag = 'var';
  kind = 'var' as 'var' | 'const' | 'let';
  id: Node | string = '';
  init?: Node;

  toString(): string {
    const id = typeof this.id === 'string' ? this.id : this.id.toString();
    const init = this.init
      ? '=' + this.init.toString()
      : '';

    return `${this.kind} ${id}${init};`;
  }
}

class FunctionNode extends Node {
  tag = 'function';
  id = ''
  async?: boolean;
  arrow?: boolean;
  params: Node[] = [];
  body: Node | null = null;
  returnType = 'void';

  toString() {
    const params = this.params.map(n => n.toString()).join(',');
    if (this.arrow) {
      return `(${params})=>{}`
    } else if (true) {

    }
    return `function ${this.id}(${params}){}`
  }
}

class ExpressionNode extends Node {
  tag = 'expression';
  iife = false;
  group = false;
  expression: (Node | string)[] = [];
  toString() {
    let expr: string[] = [];
    for (const item of this.expression) {
      if (typeof item === 'string') {
        expr.push(item);
      } else {
        expr.push(item.toString());
      }
    }
    if (this.group) {
      return `(${expr.join('')})`;
    }
    return expr.join('');
  }
}

class ObjectNode extends Node {
  tag = 'object';
  properties = new Map<string, PropertyNode>();
  toString() {
    const properties: string[] = [];
    for (const prop of this.properties) {
      properties.push(prop.toString())
    }

    return `{${properties.join(',\n')}};`;
  }
}

class PropertyNode {
  key = {} as Node;
  alias?: Node;
  value: Node | null = null;
  toString() {
    return ''
  }
}

class ArrayNode extends Node {
  tag = 'array';
  items: Node[] = [];
}

class PatternNode extends Node {
  tag = 'object-pattern' as `${'object' | 'array'}-pattern`;
  keys: string[] = [];
  properties = new Map<string, PropertyNode>();
}

class LiteralNode extends Node {
  tag = 'literal';
  value = '';
  toString(): string {
    return `"${this.value}"`;
  }
}

class NumberNode extends Node {
  tag = 'number';
  value = '';
  toString(): string {
    return this.value;
  }
}

class TemplateLiteral extends Node {
  tag = 'template-literal';
  expression: Node[] = [];
}

class Unexpected extends Node {
  tag = 'unexptected';
}

function statement_keyword(keyword: string) {
  return /var|let|const|function|async|if|else|switch/.test(keyword);
}

// const Test = new PropertyMap();

// Test.set('test', {})

// console.log(Test)

type ExpressionType = 'unary' | 'binary' | 'ternary' | 'access' | 'call'

export default (config: any) => {


  return {
    context,
    keyword,
    bracket,
    operator,
    separator,
    parse: ({
      ctx,
      token,
      expectedToken,
      next,
      nextLiteral,
      expected,
      eat,
      isIdentifier,
      appendNode,
      createNode,
      createRef,
      logNode,
      Function,
      Variable,
      Block,
      endContext,
      currentContext,
    }: Api) => {

      function recursiveObjectPattern(node: any) {

        // const id = next(true, /[:=,}]/, true);

        // switch (nextChar()) {
        //   case ":":
        //     // alias | nested destructuring
        //     console.log('alias|destructuring', id)
        //     if (expected('{')) {
        //       console.log('nested pattern')
        //     } else {
        //       console.log('alias')
        //     }
        //     break;
        //   case "=":
        //     // assignament
        //     console.log('assignament')
        //     break;
        //   case ",":
        //     // next
        //     node.properties.push({ tag: 'identifier', id })
        //     recursiveObjectPattern(node)
        //     console.log('end prop')
        //     break;
        //   case "}":
        //     // end pattern
        //     console.log('next')
        // }

      }

      let expressionNode: ExpressionNode | null = null;

      return ({

        check_is_expression() {
          log('check is expression;g')

          switch (token.type) {
            case 'number':
            case 'literal':
            case 'identifier': {
              // current [operator]
              if (expected('operator')) {
                return this.Expression();
              }

              if (token.type === 'identifier') {
                if (expected('(')) {
                  // identifier()
                  return this.Expression(true);
                }
                return createNode(IdentifierNode, { name: token.value })
              } else {
                const Node = token.literal ? LiteralNode : NumberNode;
                return createNode(Node, { value: token.value });
              }
            }
            case 'keyword': {
              return this.Expression();
            }
            case 'operator': {
              return this.Expression();
            }
            case 'bracket': {
              switch (token.value) {
                case '{':
                  return this.Object();
                case '[':
                  return this.Array();
                case '(':
                  return this.Expression(true);
                case '`':
                  return this.TemplateLiteral();
              }
            }
            case 'unknown':
            case 'separator': {
              // TODO
              console.log(token)
              return createNode(Unexpected);
            }
          }
        },

        check_is_destructure() { },

        Expression(is_group = false): Node {
          log('Expression;m')
          const node = createNode(ExpressionNode, { group: is_group });
          const curr_ctx = currentContext();

          let parsing_expression = true;

          let max = 10

          while (max > 0 && parsing_expression) {

            console.log('current token', token.type, token.value)

            switch (token.type) {
              case 'number':
              case 'literal': {
                const Node = token.literal ? LiteralNode : NumberNode;
                node.expression.push(createNode(Node, { value: token.value }));
                break;
              }
              case 'identifier': {
                node.expression.push(createNode(IdentifierNode, { name: token.value }));
                break;
              }
              case 'operator': {
                node.expression.push(token.value);
                break;
              }
              case 'bracket': {
                switch (token.value) {
                  case '{':
                    node.expression.push(this.Object());
                    break;
                  case '[':
                    node.expression.push(this.Array());
                    break;
                  case '(':
                    console.log('expression group start');
                    next();
                    node.expression.push(this.Expression(true));
                    break;
                  case ')':
                    if (is_group) {
                      console.log('expression group end');
                      parsing_expression = false;
                      return node;
                    }
                    break;
                  case '}': {
                    log('Expression end;m')
                    console.log('current tok', token.value)
                    return node;
                  }
                }
              }
              case 'keyword': {
                if (is_group) {
                  if (Function.has(token.value)) {
                    node.expression.push(Function.start());
                    break;
                  }
                  if (statement_keyword(token.value)) {
                    // TODO ERROR
                    log(`unexpected keyword "${token.value}";r`)
                    break;
                  }
                  node.expression.push(token.value);
                  break;
                }
                // node.expression.push()
                break;
              }
            }

            expected();

            console.log('expected token', expectedToken.value)

            switch (expectedToken.type) {
              case 'keyword': {
                if (!is_group && statement_keyword(expectedToken.value)) {
                  return node;
                }
              }
              case 'separator': {
                switch (expectedToken.value) {
                  case ';': {
                    if (curr_ctx === ctx.expr) {
                      appendNode(node);
                    } else {
                      return node;
                    }
                    return node;
                  }
                  case ',': {
                    if (!is_group && curr_ctx !== ctx.expr) {
                      return node;
                    }
                  }
                }
              }
            }

            next();
            console.log('next token', token.value)
            --max;

            // next();
          }

          return node;

        },

        Block({ node }: Context['Block']['props']) {
          node ??= createNode(BlockNode);
          let parsing_block = true;
          while (parsing_block) {
            next();
            switch (true) {
              case token.literal:
                const literalNode = createNode(LiteralNode, { value: token.value });
                appendNode(literalNode);
                break;
              case Function.has(token.value, true):
                break;
              case Variable.has(token.value, { props: { kind: token.value } }):
                break;
              case token.eq('}'):
                parsing_block = false;
                break;
            }

          }
        },

        Variable({ kind }: Context['Variable']['props'], implicit = false) {
          log('Variable;m', kind + ";c", 'implicit:', implicit)

          const node = createNode(VarNode, { tag: kind, kind });
          next();

          switch (token.type) {
            case 'identifier':
              node.id = token.value;
              break;
            case 'bracket':
              node.id = this.Pattern(token.eq('{') ? 'object' : 'array');
              break;
            default:
            // unexpected token
          }

          next();

          if (token.eq('=')) {
            // parse init
            next();
            node.init = this.check_is_expression();
            console.log(node.init)
          }

          appendNode(node)

          if (expected(',')) {
            next();
            this.Variable({ kind }, true)
          }

          if (!implicit) {
            endContext();
          }
        },

        Function({ async, arrow }: Context['Function']['props']) {

          const node = createNode(FunctionNode, { async });
          appendNode(node)
          // node.async = async;
          next();

          if (!arrow && token.type === 'identifier') {
            // check if have identifier
            node.id = token.value;
            next();
          }

          if (token.eq('(')) {
            console.log('params')
            this.Params(node);
          } else {
            // throw error
          }

          next();
          if (token.eq('{')) {
            // block
            node.body = createNode(BlockNode);
            Block.has(token.value, { props: { node: node.body } })
          }
        },

        Params(node: FunctionNode) {
          let parse_params = true;
          while (parse_params) {
            next();
            switch (token.type) {
              case "bracket":
                if (token.eq(')')) {
                  console.log('end parse params')
                  parse_params = false;
                }
            }
          }

        },

        Pattern(type: "object" | 'array') {
          const node = createNode(PatternNode, { tag: `${type}-pattern` });
          console.log('parsing pattern', type)

          let key: [string, Node] | undefined;
          let value: Node | null = null;
          let parsing_pattern = true;

          if (type === 'object') {
            let expected_alias = false;
            let expected_value = false;

            while (parsing_pattern) {
              next();

              if (!key) {

                switch (token.type) {
                  case 'literal':
                    expected_alias = isIdentifier(token.value) ? false : true;
                    key = [token.value, createNode(LiteralNode, { value: token.value })]
                    break;
                  case 'identifier':
                    key = [token.value, createNode(IdentifierNode, { name: token.value })]
                    break;
                  case 'bracket': {
                    switch (token.value) {
                      case '[': {
                        expected_alias = true;
                        console.log(token)
                        const { items } = this.Array();
                        if (items.length === 1) {
                          const computed = items[0];
                          switch (computed.constructor) {
                            case IdentifierNode:
                            case LiteralNode:
                            case ExpressionNode:
                          }
                        }
                        break;
                      }
                    }
                  } // end bracket
                }
              } // end key

              if (expected_alias) {
                if (token.eq(':')) {
                  console.log('expected alias', token)
                  next();
                  if (token.identifier)
                    console.log(token)
                }
              }

              if (key) {
                switch (token.value) {
                  case '=':
                    expected_value = true;
                    continue;
                  case ',':
                    const propertyNode = createNode(PropertyNode, {
                      key: key[1],
                      value,
                    })
                    node.properties.set(key[0], propertyNode);
                    key = undefined;
                    value = null;
                    continue;
                }
              }

              if (token.eq('}')) {
                parsing_pattern = false;
              }

            }

          }


          return node;

        },

        Object() {
          log('PARSING OBJECT;m');

          const node = createNode(ObjectNode);

          let property = new Map<string, { key: string, node: Node } | Node | undefined>()
          let key: [string, Node] | undefined;
          let value: Node | null = null;

          let parsing_object = true;
          // return;
          while (parsing_object) {
            next();

            if (!key) {
              switch (token.type) {
                case "identifier":
                  key = [token.value, createNode(IdentifierNode, { name: token.value })];
                  break;
                case 'literal':
                case 'number':
                  const Node = token.literal ? LiteralNode : NumberNode;
                  key = [token.value, createNode(Node, { value: token.value })];
                  log('KEY:;y', token.value);
                  break;
                case 'bracket': {
                  // TODO COMPUTED KEY
                  break;
                }
              }
            }

            if (key) {
              switch (token.value) {
                case ':':
                  property.set('value', undefined);
                  continue;
                case ',':
                  const propertyNode = createNode(PropertyNode, {
                    key: key[1],
                    value: property.get('value') || null,
                  })
                  node.properties.set(property.get('key')?.key, propertyNode)
                  property.delete('key');
                  property.delete('value');
                  continue;
              }
            }

            if (property.has('key') && property.has('value')) {
              // { key: here
              switch (token.type) {
                case "literal":
                  property.set('value', createNode(LiteralNode, { value: token.value }));
                  continue;
                case "number":
                  property.set('value', createNode(NumberNode, { value: token.value }));
                  continue;
                case "identifier":
                  property.set('value', createNode(LiteralNode, { value: token.value }));
                  continue;
                case "bracket": {
                  switch (token.value) {
                    case "[":
                      property.set('value', this.Array());
                      continue;
                    case '{':
                      property.set('value', this.Object());
                      continue;
                    case "(":
                      property.set('value', undefined);
                      continue;
                    default:
                    // unexpected token
                  }
                  break;
                }
              }

            }

            if (token.eq('}')) {

              if (property.has('key')) {
                const propertyNode = createNode(PropertyNode, {
                  key: property.get('key')?.node,
                  value: property.get('value') || null,
                })
                node.properties.set(property.get('key')?.key, propertyNode)
              }

              parsing_object = false;
              return node;
            }
          }

          return node;

          // console.log(token)

        },

        Array() {
          log('PARSING ARRAY;m');
          const node = createNode(ArrayNode);
          let parsing_array = true;

          const node_map = {
            'literal': LiteralNode,
            'number': NumberNode
          }

          while (parsing_array) {
            next();
            if (token.eq(',')) { continue; }
            switch (token.type) {
              case 'literal':
              case 'number':
              case 'identifier':
                if (expected('operator')) {

                }
                if (token.type === 'identifier') {
                  node.items.push(createNode(IdentifierNode, { name: token.value }))
                } else {
                  node.items.push(createNode(node_map[token.type], { value: token.value }))
                }
                continue;
              case 'operator':
                continue
              case 'bracket':
                switch (token.value) {
                  case "{":
                    log('item is object;y')
                    node.items.push(this.Object());
                    continue;
                  case "[":
                    node.items.push(this.Array());
                    continue;
                  case "(":
                    // node.items.push(this.Expression())
                    continue;
                  case "]":
                    parsing_array = false;
                    return node;
                }
              default:
                console.log('unexpected token')
            }

          }
          return node;
        },

        TemplateLiteral() {
          log('Template Literal;m')

          const node = createNode(TemplateLiteral);
          let parsing_lit = true;
          let loop = 5;
          while (loop > 0 && parsing_lit) {

            nextLiteral(['${', '`']);
            node.expression.push(createNode(LiteralNode, { value: token.value }));
            next();

            if (token.eq('`')) {
              log('Template Literal end;m')
              parsing_lit = false;
              console.log(node.expression)
              return node;
            }

            next() // over ${
            node.expression.push(this.check_is_expression());
            // if (expected('`')) {
            //   console.log('end parsing literal')
            //   parsing_lit = false;
            //   next();
            //   return node;
            // } else {
            //   console.log('CURRENT TOKEN', token)
            //   next();
            //   console.log('CURRENT TOKEN', token)
            //   node.expression.push(this.check_is_expression())

            // }
            --loop;
          }

          console.log('end lit', node)

          return node;

        }
      })
    }
  }
}
