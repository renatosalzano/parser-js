import Parser from "parser/Parser";
import { tokens } from './tokens';
import { Variable } from "./node";
import { log } from "utils";
import errors from "./errors";

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
                this.variable(this.token.value);
                break;
              case 'import':
              case 'export':
                break;
              case 'function':
                break;
            }
            break;
          }
          default: {
            this.expression()
          }
        }
      }

      expression(append = true) {

      }

      variable(kind: 'const' | 'let' | 'const' | 'var') {
        const node = this.createNode(Variable, { tag: kind, kind });
        const expected_init = kind === 'const';

        this.variableID(node); // parse id

        log('Variable;m', 'ID done;g', node.id);

        if (expected_init && !this.token.eq('=')) {
          this.error({ message: errors.variable.expected_init });
        }

        if (this.token.eq('=')) {
          this.next(); // over "="

          if (expected_init && /[,;]/.test(this.token.value)) {
            this.error({ message: errors.variable.expected_init });
          }

          this.variableInit(node);
          log('Variable;m', 'init done;y');
        }

        this.appendNode(node);

        if (this.token.eq(/[,;]/)) {

          if (this.token.eq(';')) {
            this.eat(this.token.value, true);
            this.next();
          }

          if (this.token.eq(',')) {
            this.variable(kind);
          }
        }

        log('Variable end;m')
      }

      variableID(node: Variable) {
        node.id = this.expression(false);
      }

      variableInit(node: Variable) {

      }

      object(type?: 'expression' | 'pattern') {

        if (!type) {
          this.traverse('{', '}').then(() => {
            if (this.token.eq('=')) {
              type = 'pattern';
            }
          })
        }



      }

      array(type?: 'expression' | 'pattern') { }
    }
  }
}
