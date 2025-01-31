import Parser from "parser/Parser";
import { tokens } from './tokens';

export default (config: any) => {

  return {
    name: 'javascript',
    tokens,
    parser: class extends Parser {
      Program() {
        console.log('program from js')
        this.next();
        this.next();
        this.next();
        this.next();
        console.log(this.token);
      }
    }
  }
}
