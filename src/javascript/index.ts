import { Define } from "define";
import context from "./context";
import lexical from './lexical';

type C = typeof context;
type L = typeof lexical;

function isNumber(str: string) {
  return /^-?\d+(\.\d+)?$/.test(str);
}

function isString(str: string) {
  return /^['"`].*['"`]$/.test(str)
}

function isSpread(str: string) {
  return /^\.{3}/.test(str);
}


function parseValue(value: any) {
  if (value) {
    value = value.trim();
    switch (true) {
      case isNumber(value): {
        value = Number(value)
        break;
      }
      case isString(value): {
        value = value.slice(1, -1)
      }
    }
  }
  return value;
}

const JS: Define<C, L> = {
  context,
  lexical,
  parser: ({
    updateContext,
    endContext,
    setSequenceRule,
    getNode,
    appendNode,
    startNode,
    endNode,
    isDeclarator,
    isKeyword,
    bracketL,
    bracketR,
    curlyL,
    curlyR
  }) => ({

    parseBody({ char, sequence }) {

      if (/[\s(]/.test(char.curr)) {
        switch (true) {
          case isKeyword(sequence, true):
            break;
          case isDeclarator(sequence, true):
            break;
        }

      }

      if (/}/.test(char.curr)) {
        endContext();
      }

    },
    parseVariable() { },

    parseFunction({ char, sequence }) {

      this.params = () => []
      this.body = () => []
      this.node = () => startNode("Function", {
        name: '',
        async: this.async || false,
        params: [],
        body: null,
        returnType: 'void'
      })

      if (bracketL()) {
        this.parsed_params = true;
        updateContext('Params', { params: this.params });
        return
      }

      if (/[{]/.test(char.curr)) {
        updateContext('Body', { body: this.body });
        return
      }

      if (/\s/.test(char.curr)) {
        switch (sequence) {
          case "function":
            break;
          default: {
            if (!this.parsed_params) {
              this.node.name = sequence;
            }
            // fn_node.name = sequence;
          }
        }
      }

      if (/}/.test(char.prev)) {
        endNode(this.node);
        this.node.params = this.params;
        appendNode(this.node);

        // console.log('get node', getNode())
        endContext();
      }
    },

    parseParams({ char }) {

      if (/{/.test(char.curr)) {
        updateContext('Pattern', { type: 'object', params: this.params }, -1);
        return;
      }

      if (/\[/.test(char.curr)) {
        updateContext('Pattern', { type: 'array', params: this.params }, -1);
        return;
      }

      if (/[)]/.test(char.curr)) {
        endContext();
        return;
      }

    },

    parseClass() { },
    parseModule() { },
    parseExpression() { },
    parseObject() { },
    parseArray() { },

    parsePattern({ char, sequence }) {

      if (/[{]/.test(char.curr)) {
        updateContext('Pattern', { type: "object" },)
        return;
      }

      if (/[\[]/.test(char.curr)) {
        updateContext('Pattern', { type: "array" })
        return
      }

      if (this.type === 'object') {

        this.node = () => startNode("Object", {
          properties: []
        })

        if (/[,]/.test(char.curr)) {
          let [key, value] = sequence.split('=');
          key = key.trim();
          value = parseValue(value);
          this.node.properties.push({ key, value })
        }

      } else {
        // array
      }

      if (/[}\]]/.test(char.curr)) {
        // end pattern
        if (isSpread(sequence)) {
          const key = sequence.slice(3)
          this.node.properties.push({ key, type: 'rest' })
        }

        endNode(this.node)

        if (this.params) {
          this.params.push(this.node)
        }

        endContext()
      }

    }

  })
}

export default JS;

// Parser.extend({
//   context,
//   lexical,
//   parser: ({ isDeclarators }) => {

//     return {
//       parseBody() { },
//       parseVariable() { },
//       parseFunction() { },
//       parseParams() { },
//       parseClass() { },
//       parseModule() { },
//       parseExpression() { },
//       parseObject() { },
//       parseArray() { },
//       parsePattern() { },
//     }
//   }
// })