import Parser from "parser/Parser";
import { tokens } from './tokens';

export default (config: any) => {

  return {
    name: 'javascript',
    tokens,
    parser: class extends Parser {
      Program() {
        console.log('program from js')
        console.log(this.token);
        console.log(this.nextToken);
      }
    }
  }
}
