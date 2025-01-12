import Parser from 'parser/Parser'
import { Node } from "parser/Progam";
import type { DefaultApi } from "./";
import { ContextObject } from 'parser/Context';

const context = {
  Program: ['Variable', 'Function', 'Expression', 'Block', 'Statement', 'Class', 'Invalid'],
  Block: {
    token: {
      "{": null,
    }
  },
  Variable: {
    keyword: {
      'var': { hoisting: true, props: { kind: 'var' } },
      'const': { props: { kind: 'const' } },
      'let': { props: { kind: 'let' } }
    }
  },
  Function: {
    default: true,
    props: {
      async: false,
      arrow: false,
    },
    keyword: {
      'function': { hoisting: true },
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
}

type Context = typeof context;

type Api = DefaultApi & {
  [K in keyof typeof context]: ContextObject;
}

class FuncNode implements Node {
  tag = 'function';
  id = ''
  async?: boolean;
  arrow?: boolean;
  params: Node[] = [];
  body: Node[] = [];
  returnType = 'void';

  appendNode(node: Node) {
    this.body.push(node)
  }

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
}

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
      eachChar,
      eat,
      expected,
      appendNode,
      createNode,
      Function,
      Block,
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

      return ({

        Expression(expression: any[]) {
          console.log(token)
          next();
          console.log(token)
          next();
          console.log(token)
          // switch (token.type) {
          //   case 'literal':
          //     console.log(token)
          //     break;
          //   case 'bracket':
          // }
        },

        Group() {
          const node = createNode(ExpressionNode);
          console.log('expression group');
          switch (next().type) {
            case "keyword":
              if (token.eq('function')) {
                Function.has(token.value, true)
              }
          }
        },

        Block() {
          const block = [];
          next();
          console.log(token)
        },

        Variable() { },

        Function({ async, arrow }: Context['Function']['props']) {

          const node = createNode(FuncNode);
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
          if (!Block.has(token.value, true)) {
            // throw error
          }



          // setRules({ skipWhitespace: true });

          // if (expected("(")) {
          //   // params
          //   this.Params(node);
          // } else {
          //   // throw error
          // }

          // appendNode(node)

          // // console.log(node)
        },

        Params(node: FuncNode) {
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

          const entries: { key?: string, value?: any }[] = [];
          let entry: { key?: string, value?: any } = {}

          let sequence = '';

          if (type === 'object') {

            const node = recursiveObjectPattern({
              tag: 'pattern',
              type: 'object',
              properties: []
            })
          }
        },

        Object() {
          // key: value
          // 'key-string': value
          // [computed]: value
          // const entries: { key?: string, value?: any }[] = [];

          // let entry: { key?: string, value?: any } = {}

          // let sequence = ''
          // eachChar((ch) => {

          //   if (/[:]/.test(ch)) {
          //     entry.key = sequence;
          //     // TODO check computed key reference
          //     sequence = ''
          //     return
          //   }

          //   if (entry.key && /[(\[{]/.test(ch)) {
          //     switch (ch) {
          //       case "(":
          //         // TODO
          //         break;
          //       case "[":
          //         this.Array()
          //         break;
          //       case "{":
          //         nextChar()
          //         console.log('nested object')
          //         entry.value = this.Object()
          //         break;
          //     }
          //     return
          //   }

          //   if (/[,}]/.test(ch)) {
          //     if (!entry.value) {
          //       entry.value = sequence;
          //     }
          //     entries.push(entry)
          //     entry = {}
          //     sequence = ''
          //     if (ch === '}') {
          //       console.log('end object')
          //     }
          //     return ch === '}'
          //   }

          //   sequence += ch;
          //   return
          // }, true)
          // return entries;

        },

        Array() {

        }
      })
    }
  }
}
