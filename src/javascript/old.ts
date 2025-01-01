// import { Define } from "define";
// import context from "./context";
// import lexical from './lexical';

// type C = typeof context;
// type L = typeof lexical;

// function isNumber(str: string) {
//   return /^-?\d+(\.\d+)?$/.test(str);
// }

// function isString(str: string) {
//   return /^['"`].*['"`]$/.test(str)
// }

// function isSpread(str: string) {
//   return /^\.{3}/.test(str);
// }


// function parseValue(value: any) {
//   if (value) {
//     value = value.trim();
//     switch (true) {
//       case isNumber(value): {
//         value = Number(value)
//         break;
//       }
//       case isString(value): {
//         value = value.slice(1, -1)
//       }
//     }
//   }
//   return value;
// }

// const JS: Define<C, L> = {
//   context,
//   lexical,
//   parser: ({
//     updateContext,
//     endContext,
//     setSequenceRule,
//     getNode,
//     appendNode,
//     startNode,
//     endNode,
//     isDeclarator,
//     isKeyword,
//     bracketL,
//     bracketR,
//     curlyL,
//     curlyR
//   }) => ({

//     parseBody({ char, sequence }) {

//       if (/[\s(]/.test(char.curr)) {
//         switch (true) {
//           case isKeyword(sequence, true):
//             break;
//           case isDeclarator(sequence, true):
//             break;
//         }

//       }

//       if (curlyR(true)) {
//         endContext();
//       }

//     },
//     parseVariable() { },

//     parseFunction({ char, sequence }) {

//       this.params = () => []
//       this.body = () => []
//       this.node = () => startNode("Function", {
//         name: '',
//         async: this.async || false,
//         params: [],
//         body: null,
//         returnType: 'void'
//       })

//       if (bracketL()) {
//         this.parsed_params = true;
//         if (sequence) {
//           this.node.name = sequence
//         }
//         updateContext('Params', { params: this.params });
//         return
//       }

//       if (curlyL()) {
//         this.parsed_body = true;
//         updateContext('Body', { body: this.body });
//         return
//       }

//       if (/\s/.test(char.curr)) {
//         switch (sequence) {
//           case "function":
//             break;
//           default: {
//             if (!this.parsed_params) {
//               this.node.name = sequence;
//             }
//             // fn_node.name = sequence;
//           }
//         }
//       }

//       if (curlyR(true)) {
//         console.log('end')
//       }

//       if (this.parsed_body) {
//         console.log('end function')
//         endNode(this.node);
//         this.node.params = this.params;
//         appendNode(this.node);

//         // console.log('get node', getNode())
//         endContext();
//       }

//     },

//     parseParams({ char }) {

//       if (curlyL()) {
//         updateContext('Pattern', { type: 'object', params: this.params });
//         return;
//       }

//       if (/\[/.test(char.curr)) {
//         updateContext('Pattern', { type: 'array', params: this.params });
//         return;
//       }

//       if (bracketR(true)) {
//         endContext();
//         return;
//       }

//     },

//     parseClass() { },
//     parseModule() { },
//     parseExpression() { },
//     parseObject() { },
//     parseArray() { },

//     parsePattern({ char, sequence }) {

//       if (curlyL()) {
//         updateContext('Pattern', { type: "object" },)
//         return;
//       }

//       if (/[\[]/.test(char.curr)) {
//         updateContext('Pattern', { type: "array" })
//         return
//       }

//       if (this.type === 'object') {

//         this.node = () => startNode("Object", {
//           properties: []
//         })

//         if (/[,]/.test(char.curr)) {
//           let [key, value] = sequence.split('=');
//           key = key.trim();
//           value = parseValue(value);
//           this.node.properties.push({ key, value })
//         }

//       } else {
//         // array
//       }

//       if (curlyR(true)) {
//         // end pattern
//         if (isSpread(sequence)) {
//           const key = sequence.slice(3)
//           this.node.properties.push({ key, type: 'rest' })
//         }

//         endNode(this.node)

//         if (this.params) {
//           this.params.push(this.node)
//         }

//         endContext()
//       }

//     }

//   })
// }

// export default JS;

// // Parser.extend({
// //   context,
// //   lexical,
// //   parser: ({ isDeclarators }) => {

// //     return {
// //       parseBody() { },
// //       parseVariable() { },
// //       parseFunction() { },
// //       parseParams() { },
// //       parseClass() { },
// //       parseModule() { },
// //       parseExpression() { },
// //       parseObject() { },
// //       parseArray() { },
// //       parsePattern() { },
// //     }
// //   }
// // })