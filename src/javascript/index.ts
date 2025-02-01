import Parser from "parser/Parser";
import { tokens } from './tokens';

export default (config: any) => {

  return {
    name: 'javascript',
    tokens,
    parser: class extends Parser {
      Program() {
        switch (this.token.type) {
          case "statement": {
            switch (this.token.value) {
              case 'const':
              case 'let':
              case 'var':
                this.Variable(this.token.value);
                break;
            }
            break;
          }
          case "literal":
          case "operator":
          case "bracket":
          case "keyword":
          case "separator":
          case "identifier":
          case "special":
          case "comment":
        }
      }

      Variable(kind: string, implicit = false) {
        console.log('variable')
      }
    }
  }
}
