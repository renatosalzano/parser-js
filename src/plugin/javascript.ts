import Parser from 'parser/Parser'
import { Node, BlockNode } from "parser/Progam";
import type { DefaultApi } from "./";
import { ContextObject } from 'parser/Context';
import { log } from 'utils';

const context = {
  Program: ['Variable', 'Function', 'Expression', 'Block', 'Statement', 'Class', 'Invalid'],
  Block: {
    props: { node: null as Node | null },
    token: {
      "{": null,
    }
  },
  Variable: {
    props: { kind: 'var' as 'var' | 'const' | 'let' },
    keyword: {
      'var': { props: { kind: 'var' } },
      'const': { props: { kind: 'const' } },
      'let': { props: { kind: 'let' } }
    }
  },
  Function: {
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
    keyword: {
      'class': null
    }
  },
  Expression: {
    default: true,
    token: {
      '(': null
    }
  },
  Statement: {
    keyword: {
      'if': null,
      'else': null,
      'switch': null,
      'return': null
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
  "(": "paren R",
  ")": "paren L",
  "[": "square R",
  "]": "square L",
  "{": "curly R",
  "}": "curly L",
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
  'null': 'null'
}

type Context = typeof context;

type Api = DefaultApi & {
  [K in keyof typeof context]: ContextObject;
}

class VarNode implements Node {
  tag = 'var';
  id: Node | string = '';
  init?: Node;
}

class FunctionNode implements Node {
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

class ExpressionNode implements Node {
  tag = 'expression';
  iife = false;
  expression: Node[] = [];
  appendNode(node: Node) {
    this.expression.push(node);
  }
}

class ObjectNode implements Node {
  tag = 'object';
  properties = new Map<string, PropertyNode>();
}

class PropertyNode {
  key = {} as Node;
  value: Node | null = null;
}

class ArrayNode implements Node {
  tag = 'array';
  items: Node[] = [];
}

class LiteralNode implements Node {
  tag = 'literal';
  value = '';
}

class NumberNode implements Node {
  tag = 'number';
  value = '';
}


// const Test = new PropertyMap();

// Test.set('test', {})

// console.log(Test)

export default (config: any) => {

  const identifiers = new Map<string, string>()

  return {
    context,
    keyword,
    bracket,
    operator,
    separator,
    parse: ({
      char,
      token,
      next,
      eat,
      expected,
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

        Expression() {
          switch (token.type) {
            case 'literal':
              const literalNode = createNode(LiteralNode, { value: token.value });
              appendNode(literalNode);
              break;
            case 'identifier':
            case 'operator':
            case 'bracket':
              const node = createNode(ExpressionNode);
              appendNode(node);
              if (token.eq('(')) {
                this.Group();
              }
          }

          endContext()
        },

        Group() {
          console.log('expression group');
          switch (next().type) {
            case "keyword": {
              console.log('group keyword')
              if (Function.has(token.value, true)) {
                console.log('end function')
                // unexpected
              }
            }
          }
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

        Variable({ kind }: Context['Variable']['props']) {

          const node = createNode(VarNode, { tag: kind });
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
            switch (token.type) {
              case 'identifier':
                break;
              case 'number':
              case 'literal':
                node.init = createNode(token.literal ? LiteralNode : NumberNode, { value: token.value })
                break;
              case 'bracket':
                node.init = this.Object();
                break;
            }
            next();
          }

          appendNode(node)
          console.log(node)

          if (token.eq(',')) {
            Variable.start({ kind });
          }

          endContext();

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

          return createNode(ObjectNode);

        },

        Object() {
          log('PARSING OBJECT;m');

          const node = createNode(ObjectNode);



          let property = new Map<string, { key: string, node: Node } | Node | undefined>()

          let parsing_object = true;
          // return;
          while (parsing_object) {
            next();

            if (!property.has('key')) {
              switch (token.type) {
                case "identifier":
                case 'literal':
                  const literalNode = createNode(LiteralNode, { value: token.value });
                  property.set('key', { key: token.value, node: literalNode });
                  log('KEY:;y', token.value);
                  break;
                case 'bracket': {

                  break;
                }
              }
            }

            if (property.has('key')) {
              switch (token.value) {
                case ':':
                  property.set('value', undefined);
                  continue;
                case ',':
                  const propertyNode = createNode(PropertyNode, {
                    key: property.get('key')?.node,
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

          while (parsing_array) {
            next();
            if (token.eq(',')) { continue; }
            switch (token.type) {
              case 'literal':
                node.items.push(createNode(LiteralNode, { value: token.value }))
                continue;
              case 'number':
                node.items.push(createNode(NumberNode, { value: token.value }))
                continue;
              case 'identifier':
                // TODO
                continue;
              case 'bracket':
                switch (token.value) {
                  case "{":
                    log('item is object;y')
                    node.items.push(this.Object());
                    continue;
                  case "[":
                  case "(":
                    continue;
                  case "]":
                    parsing_array = false;
                    return node;
                }
            }

          }
          return node;
        }
      })
    }
  }
}
