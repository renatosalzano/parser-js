import Parser from "parser/Parser";
import { tokens } from './tokens';

export default (config: any) => {

  return {
    name: 'javascript',
    tokens,
    parser: class extends Parser {
      Program() {
        console.log('before', this.token)
        this.traverse('{', '{').then(() => {
          console.log(this.token)
        });

        console.log('after traverse', this.token)
      }
    }
  }
}
