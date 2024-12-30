import { Define } from "define";
import context from "./context";
import lexical from './lexical';

type C = typeof context;
type L = typeof lexical;

const JS: Define<C, L> = {
  context,
  lexical,
  parser: ({ avoidMultipleWhitespace, isDeclarator, isKeyword }) => {

    return {
      parseBody({ char, sequence }) {

        if (avoidMultipleWhitespace()) {
          return;
        }

        if (/[\s(]/.test(char.curr)) {
          console.log(sequence)
          switch (true) {
            case isKeyword(sequence, true):
              break;
            case isDeclarator(sequence, true):
              break;
          }

        }

      },
      parseVariable() { },
      parseFunction() {
        console.log('parse function')
      },
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