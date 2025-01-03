import { Node } from "Progam";
import type { DefaultApi } from "./";

const context = {
  Program: ['Variable', 'Function', 'Expression'],
  Variable: {
    keyword: {
      'let': null
    }
  },
  Function: {
    props: {
      async: false,
      arrow: false,
    },
    keyword: {
      'function': null,
      'async': { eat: "function", props: { async: true } }
    }
  }
}

const api = {
  isIdentifier: /^[a-zA-Z_$][a-zA-Z0-9_$]*$/,
  isArrowFunction: /\(.*?=>/
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

  return {
    context,
    api,
    parse: ({
      next,
      appendNode,
      createNode,
      setRules,
      isIdentifier,
      inFunction,
      isBracket,
    }: Api) => ({
      Variable() { },
      Function({ async, arrow }: Context['Function']['props']) {

        const node = createNode(FuncNode);
        node.async = async;

        if (!arrow) {
          // func declaration
          const sequence = next();
          if (isIdentifier(sequence)) {
            node.id = sequence;
          }
        }

        if (isBracket.L()) {
          // params
          this.Params(node);
        }

        appendNode(node)

        // console.log(node)
      },

      Params(node: FuncNode) {
        setRules({ avoidWhitespace: true, hasExpression: true });
        console.log('paraaaaaaaaams')
      },
    })
  }
}
