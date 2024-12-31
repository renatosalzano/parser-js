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
    startNode,
    endNode,
    isDeclarator,
    isKeyword
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

    },
    parseVariable() { },

    parseFunction({ char, sequence }) {

      this.node = startNode("Function", {
        name: '',
        async: this.async || false,
        params: [],
        body: null,
        returnType: ''
      })

      if (/[(]/.test(char.curr)) {
        updateContext('Params', { functionNode: this.node });
        return
      }

      if (/\s/.test(char.curr)) {
        switch (sequence) {
          case "function":
            break;
          default: {
            console.log(sequence)
            this.node.name = sequence;
            // fn_node.name = sequence;
          }
        }
      }
    },

    parseParams({ char }) {

      if (/{/.test(char.curr)) {
        updateContext('Pattern', { type: 'object' });
        return;
      }

      if (/\[/.test(char.curr)) {
        updateContext('Pattern', { type: 'array' });
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
        updateContext('Pattern', { type: "object" })
        return;
      }

      if (/[\[]/.test(char.curr)) {
        updateContext('Pattern', { type: "array" })
        return
      }

      if (this.type === 'object') {

        this.node = startNode("Object", {
          properties: []
        })

        if (/[,]/.test(char.curr)) {
          console.log(sequence)
          let [key, value] = sequence.split('=');
          key = key.trim();
          value = parseValue(value);

          this.node.properties.push({ key, value })
        }

      } else {
        // array
      }

      if (/[}\]]/.test(char.curr)) {
        console.log(sequence)
        if (isSpread(sequence)) {
          console.log(sequence)
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