import { Define } from "define";
import context from "./context";
import lexical from './lexical';

type C = typeof context;
type L = typeof lexical;

const JS: Define<C, L> = {
  context,
  lexical,
  parser: ({ isDeclarator }) => {

    return {
      parseBody() { },
      parseVariable() { },
      parseFunction() { },
      parseParams() { },
      parseClass() { },
      parseModule() { },
      parseExpression() { },
      parseObject() { },
      parseArray() { },
      parsePattern() { }
    }
  }
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