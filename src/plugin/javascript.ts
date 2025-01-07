import { Node } from "Progam";
import type { DefaultApi } from "./";

const context = {
  Program: ['Variable', 'Function', 'Expression', 'Block'],
  Block: {
    keyword: {
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
      'async': { hoisting: true, eat: "function", props: { async: true } }
    }
  },
  Expression: {
    default: true,
    keyword: {
      '(': null,
    },
  }
}

const api = {
  isIdentifier: /^[a-zA-Z_$][a-zA-Z0-9_$]*$/
}

const operators = {
  '+': 'addition',
  '-': 'subtraction',
  '*': 'multiplication',
  '/': 'division',
  '%': 'modulus',
  '>': 'greater than',
  '<': 'less than',
  '!': 'logical NOT',
  '=': 'assignment',
  '&': 'bitwise AND',
  '|': 'bitwise OR',
  '^': 'bitwise XOR',
  '~': 'bitwise NOT',
  '++': 'increment',
  '--': 'decrement',
  '==': 'equality',
  '!=': 'inequality',
  '>=': 'greater than or equal to',
  '<=': 'less than or equal to',
  '&&': 'logical AND',
  '||': 'logical OR',
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
}

type Context = typeof context;

type Api = DefaultApi & {
  [K in keyof typeof context as `in${K}`]: (sequence: string, startContext?: boolean) => boolean;
} & {
  [K in keyof typeof api]: (sequence: string) => boolean;
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
    }
    return `function ${this.id}(${params}){}`
  }
}

export default (config: any) => {

  const identifiers = new Map<string, string>()

  return {
    context,
    api,
    operators,
    parse: ({
      char,
      next,
      nextChar,
      eachChar,
      eat,
      expected,
      appendNode,
      createNode,
      setRules,
      isIdentifier,
      inFunction,
      currentContext,
    }: Api) => {

      function recursiveObjectPattern(node: any) {

        const id = next(true, /[:=,}]/, true);

        switch (nextChar()) {
          case ":":
            // alias | nested destructuring
            console.log('alias|destructuring', id)
            if (expected('{')) {
              console.log('nested pattern')
            } else {
              console.log('alias')
            }
            break;
          case "=":
            // assignament
            console.log('assignament')
            break;
          case ",":
            // next
            node.properties.push({ tag: 'identifier', id })
            recursiveObjectPattern(node)
            console.log('end prop')
            break;
          case "}":
            // end pattern
            console.log('next')
        }

      }

      return ({

        // Group({ context, expression }: Context['Group']['props']) {
        //   setRules({ skipWhitespace: true })
        //   console.log('parse group', context)

        //   if (context === 'Program') {
        //     if (expected('(|function', true)) {
        //       // possibly IIFE
        //       console.log('work')
        //     } else {
        //       if (expected('(|[|{', true)) {
        //         // possibly group, destructured array or object
        //       } else {

        //         let key = ''
        //         const seq = next(true, /[,=]/, true)
        //         if (isIdentifier(seq)) {
        //           key = seq;
        //           console.log(seq)
        //         } else {
        //           // ERROR!
        //         }
        //         switch (char.curr) {
        //           case "=":
        //           // assignament

        //           case ",":
        //           // end instruction
        //         }

        //       }


        //     }
        //   }
        //   // next(undefined, undefined, true)
        // },

        Expression(expression: any[]) {
          let entry
        },

        Block() { },

        Variable() { },

        Function({ async, arrow }: Context['Function']['props']) {

          const node = createNode(FuncNode);
          node.async = async;

          if (!arrow) {
            // check if have identifier
            const id = next(/[a-zA-Z_$]/);
            if (isIdentifier(id)) {
              node.id = id;
            }
          }

          setRules({ skipWhitespace: true });

          if (expected("(")) {
            // params
            this.Params(node);
          } else {
            // throw error
          }

          appendNode(node)

          // console.log(node)
        },

        Params(node: FuncNode) {

          let params = [];

          switch (nextChar()) {
            case "{":
              this.Pattern('object')
              break;
            case "[":
              this.Pattern('array')
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

            // console.log(char)
            // next(true, /[:=,}]/, true)
            // switch (nextChar()) {
            //   case ":":
            //     // alias | nested destructuring
            //     console.log('alias')
            //     break;
            //   case "=":
            //     // assignament
            //     console.log('assignament')
            //     break;
            //   case ",":
            //     // next
            //     console.log('end prop')
            //   case "}":
            //     // end pattern
            //     console.log('next')
            // }
            // console.log(char.curr)

            // eachChar((ch) => {

            //   if (!entry.key && /[a-zA-Z0-9\[\]:'"`$_=]/.test(ch)) {

            //   }

            //   if (!/[a-zA-Z0-9\[\]:'"`$_=]/.test(ch)) {
            //     console.log(sequence)
            //     entry.key = sequence;
            //     sequence = '';
            //     return;
            //   }

            //   if (entry.key && /[{\[]/.test(ch)) {
            //     switch (ch) {
            //       case "{":
            //         nextChar()
            //         entry.value = this.Object()
            //         break;
            //       case "[":
            //         nextChar()
            //         entry.value = this.Array()
            //         break;
            //     }
            //     return;
            //   }

            //   if (/[,}]/.test(ch)) {
            //     console.log(sequence, entry)
            //     if (!entry.key) {
            //       entry.key = sequence;
            //     } else if (!entry.value) {
            //       entry.value = sequence;
            //     }
            //     entries.push(entry)
            //     entry = {}
            //     sequence = ''
            //     if (ch === '}') {
            //       console.log('end pattern object')
            //     }
            //     return ch === '}'
            //   }

            //   sequence += ch;
            //   return
            // }, true)

          }
        },

        Object() {
          // key: value
          // 'key-string': value
          // [computed]: value
          const entries: { key?: string, value?: any }[] = [];

          let entry: { key?: string, value?: any } = {}

          let sequence = ''
          eachChar((ch) => {

            if (/[:]/.test(ch)) {
              entry.key = sequence;
              // TODO check computed key reference
              sequence = ''
              return
            }

            if (entry.key && /[(\[{]/.test(ch)) {
              switch (ch) {
                case "(":
                  // TODO
                  break;
                case "[":
                  this.Array()
                  break;
                case "{":
                  nextChar()
                  console.log('nested object')
                  entry.value = this.Object()
                  break;
              }
              return
            }

            if (/[,}]/.test(ch)) {
              if (!entry.value) {
                entry.value = sequence;
              }
              entries.push(entry)
              entry = {}
              sequence = ''
              if (ch === '}') {
                console.log('end object')
              }
              return ch === '}'
            }

            sequence += ch;
            return
          }, true)
          return entries;

        },

        Array() {

        }
      })
    }
  }
}
