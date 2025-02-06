import Parser from "parser/Parser";
import { op, tokens } from './tokens';
import { Expression, Identifier, ObjectExpression, Primitive, TemplateLiteral, Variable } from "./node";
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

      expression(append = false, node = this.createNode(Expression)) {

        const self = this;

        function end() {
          log('end expression');

          if (append) {
            self.appendNode(node);
          }

          return node;
        }

        let parse_expression = true;
        let operand, operator;

        while (parse_expression) {

          log('express tok:;c', this.token.value)

          switch (this.token.type) {
            case "identifier":
              operand = true;
              node.add(this.createNode(Identifier, { name: this.token.type }));
              break;
            case 'literal':
              operand = true;
              node.add(this.createNode(Primitive, this.token));
              break;
            case "operator": {
              if (this.token.binary) {
                if (node.expression.length == 0) {
                  console.log(this.token, this.nextToken)
                  this.error({ title: 'Unexpected token', message: 'Expression expected' });
                }
              }
              node.add(this.token.value);
              this.next();
              continue;
            }
            case "bracket-open": {
              operand = true;
              switch (this.token.value) {
                case '{':
                  node.add(this.object());
                  break;
                case '[':
                  node.add(this.array());
                  break;
                case '(':
                  this.next();

                  const group = this.createNode(Expression, { group: true });
                  node.add(this.expression(false, group));
                  break;
              }
              break;
            }
            case "bracket-close": {
              switch (this.token.value) {
                case ')':
                  return end();
              }
              break;
            }
            case "keyword":
            case "separator": {
              switch (this.token.value) {
                case ',':

                  this.next();
                  if (node.group) {
                    continue;
                  } else {
                    return end();
                  }
                case ';': {
                  this.next();
                  if (node.group) {
                    this.error({ title: 'Unexpected token', message: "expected ')'" });
                  }
                  return end();
                }
              }
              break;
            }
            case "special": {
              operand = true;
              if (this.token.value == '`') {
                node.add(this.templateLiteral())
              }
              break;
            }
            case "statement":
            case "comment":
          }

          this.next();

          if (operand) {
            operand = false;

            if (this.token.postfix) {
              node.add(this.token.value);
              this.next();
            }

            if (this.token.binary) {
              continue;
            }

          }

          return end()

        }

        return node;

      }

      expressionGroup() {
        const node = this.createNode(Expression, { group: true });

      }

      operator(node: Expression) {
        switch (true) {
          case this.token.binary:
            node.add(this.token.value);
            this.next();
            return true;
          case this.token.postfix:
            node.add(this.token.value);
            this.next();


        }
      }

      literalExpression(node: Expression) {
        let parse

      }

      variable(kind: 'const' | 'let' | 'const' | 'var') {
        const node = this.createNode(Variable, { tag: kind, kind });
        const expected_init = kind === 'const';

        this.next();

        this.variableID(node); // parse id

        log('Variable;m', 'ID done;g');

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
        switch (this.token.type) {
          case "identifier":
            node.id = this.createNode(Identifier, { name: this.token.value });
            this.next();
            break;
          case "bracket-open":
            switch (this.token.value) {
              case "{":
                node.id = this.object('pattern');
                break;
              case "[":
                break;
            }
            break;
          default:
          // todo catch error
        }
      }

      variableInit(node: Variable) {

        node.init = this.expression(false);
        console.log(node.init)

      }

      object(type?: 'expression' | 'pattern') {

        if (!type) {
          this.traverse('{', '}').then(() => {
            if (this.token.eq('=')) {
              type = 'pattern';
            }
          })
        }

        const node = this.createNode(ObjectExpression, { type });

        if (this.token.eq('{')) this.next();

        const property: [] = []

        return node;
      }

      objectKey(type: 'expression' | 'pattern') {

        let key: string;
        let node: Node;

        switch (this.token.type) {
          case "identifier":
            key = this.token.value;

            break;
          case 'literal':
            key = this.token.value;

            break;
          case 'bracket-open': {
            // TODO COMPUTED KEY
            if (this.token.eq('[')) {
              //
            }
          }
          default: {
            // unexpected token here
          }
        }

        this.next();
        if (type == 'pattern' && this.token.eq(':')) {
          // alias;

        }

      }

      objectValue() { }

      array(type?: 'expression' | 'pattern') { }

      templateLiteral() {
        const node = this.createNode(TemplateLiteral);

        if (this.token.eq('`')) {
          this.next();
        }

        let parse_template = true;

        while (parse_template) {

          if (this.token.eq('`')) {
            log('Template Literal end;m');

            this.next();
            parse_template = false;
            return node;
          }

          if (this.token.eq('literal')) {
            node.expression.push(this.createNode(Primitive, this.token));
            // ++loop;
          }

          if (this.token.eq('${')) {
            this.next();
            node.expression.push(this.expression());
            // ++loop;
          }

          // if (token.eq('}')) {}

          this.next();

        }

        return node;
      }
    }
  }
}
