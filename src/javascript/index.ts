import Parser from "parser/Parser";
import { tokens } from './tokens';
import { ArrayExpression, Empty, Expression, Function, Identifier, ObjectExpression, Primitive, Property, TemplateLiteral, Variable } from "./node";
import { log } from "utils";
import errors from "./errors";
import { Node } from "parser/Progam";

export default (config: any) => {

  return {
    name: 'javascript',
    tokens,
    parser: class extends Parser {
      Program() {

        log('program tok:;c', this.token.value);
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
                this.module(this.token.value);
                break;
              case 'function':
                break;
            }
            break;
          }
          case "literal":
            if (this.token.eq('\n')) {
              this.next();
              return;
            }
            break;
          default: {
            this.expression()
          }

        }
      }

      module(type: 'import' | 'export') {

      };

      expression(append = false, node = this.createNode(Expression)) {

        log('expression;m')

        const self = this;

        function end() {
          log('end expression;g');

          let output = node;

          if (node.expression.length == 1) {
            if (typeof node.expression[0] != 'string') {
              output = node.expression[0] as any;
            }
          }

          if (append) {
            self.appendNode(output);
          }

          return output;
        }

        let parse_expression = true;
        let operand, operator;

        while (parse_expression) {

          log('expr tok:;c', this.token.value)

          switch (this.token.type) {
            case "identifier":
              operand = true;
              node.add(this.createNode(Identifier, { name: this.token.value }));
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
                  continue;
                case '[':
                  node.add(this.array());
                  continue;
                case '(': {
                  // check if arrow fn
                  let is_arrow_fn = false;

                  this.traverse('(', ')').then(() => {
                    if (this.token.eq('=>')) {
                      is_arrow_fn = true;
                    }
                  });

                  if (is_arrow_fn) {
                    const fn_node = this.function(append, { arrow: true, expression: true });
                    if (node.expression.length == 0) {
                      return fn_node;
                    } else {
                      node.add(fn_node);
                      break;
                    }
                  }

                  this.next();
                  const group = this.createNode(Expression, { group: true });
                  node.add(this.expression(false, group));
                  break;
                }
              }
              break;
            }
            case "bracket-close": {
              switch (this.token.value) {
                case ')':
                  return end();
              }
              return end();
            }
            // case "keyword":
            case "statement":
            case "separator": {

              switch (this.token.value) {
                case ',':
                  if (node.group) {
                    this.next();
                    continue;
                  } else {
                    return end();
                  }
                case ';': {
                  this.next();
                  if (node.group) {
                    this.error({ title: 'Unexpected token', message: "expected ')'" });
                  }
                  break;
                }
              }

              return end();
            }
            case "special": {
              operand = true;
              if (this.token.value == '`') {
                node.add(this.templateLiteral())
              }
              break;
            }
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


      function(append = false, { arrow, async, expression }: { arrow?: boolean, async?: boolean, expression?: boolean } = {}) {
        log('function;m', `arrow:${arrow};y`);

        if (this.token.eq('async')) {
          this.next();
        }

        if (this.token.eq('function')) {
          this.next();
        }

        const node = this.createNode(Function, { arrow, async, expression });

        if (this.token.eq('identifier')) {
          node.id = this.createNode(Identifier, { name: this.token.value });
          this.next();
        }

        if (this.token.eq('(')) {
          this.next();
          node.params = this.functionParams();
        }

        if (this.token.eq('=>')) {
          this.next();
        }

        if (arrow && !this.token.eq('{')) {
          log('arrow fn body expression;y')
          node.body = this.expression(false);
          console.log(node)
          return node;
        }

        if (this.token.eq('{')) {
          // block

        } else {
          // error
        }


        return node;

      }

      functionParams() {
        log('params;m')

        const params: Node[] = [];
        let parse_params = true;

        if (this.token.eq(')')) {
          this.next();
          return params;
        }

        while (parse_params) {

          params.push(this.expression());
          log('param tok:;c', this.token.value)

          if (this.token.eq(',')) {
            this.next();
            continue;
          }

          if (this.token.eq(')')) {
            this.next();
            log('params end;g')
            return params;
          }

        }

        return params;
      }

      variable(kind: 'const' | 'let' | 'const' | 'var') {
        log('variable;m');
        const node = this.createNode(Variable, { kind });
        const expected_init = kind === 'const';

        this.next();

        this.variableID(node); // parse id

        log('variable;m', 'id done;g');

        if (expected_init && !this.token.eq('=')) {
          this.error({ message: errors.variable.expected_init });
        }

        if (this.token.eq('=')) {
          this.next(); // over "="

          if (expected_init && /[,;]/.test(this.token.value)) {
            this.error({ message: errors.variable.expected_init });
          }

          this.variableInit(node);
          log('variable;m', 'init done;g');
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

        log('variable end;g', this.token)
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

      }

      object(type?: 'expression' | 'pattern') {

        log('object expression;m', type + ';y')

        if (!type) {

          type = 'expression';

          this.traverse('{', '}').then(() => {
            if (this.token.eq('=')) {
              type = 'pattern';
            }
          });
        }

        const node = this.createNode(ObjectExpression, { type });

        if (this.token.eq('{')) this.next();

        let parse_object = true;
        let max = 10;

        while (/* max > 0 &&  */parse_object) {

          const { key, alias } = this.objectKey(type);
          let value: Expression | Node | undefined = undefined;

          log('key:;c', key, 'alias:;c', alias, this.token.value);

          if (type == 'expression') {
            if (this.token.eq(':')) {
              this.next();
              value = this.objectValue();
            }
          } else {
            if (this.token.eq('=')) {
              this.next();
              value = this.objectValue();
              console.log('after value', this.token.value)
            }
          }

          if (this.token.eq(',')) {
            node.set(key, this.createNode(Property, { key, alias, value }));
            continue;
          }

          if (this.token.eq('}')) {
            parse_object = false;
            if (key) {
              node.set(key, this.createNode(Property, { key, alias, value }));
            }
            this.next();
          }

          --max;
        }
        log('objece end;m');
        return node;
      }

      objectKey(type: 'expression' | 'pattern') {

        let key = '';
        let alias: string | undefined = undefined;

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
              log('computed crap')
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
          this.next();
          if (this.token.eq('identifier')) {
            alias = this.token.value;
            this.next();
          }

        }

        return { key, alias };

      }

      objectValue() {
        const value = this.expression(false);
        return value;
      }

      array(kind?: 'expression' | 'pattern') {

        if (!kind) {

          kind = 'expression';

          this.traverse('[', ']').then(() => {

            if (this.token.eq('=')) {
              console.log('after traverse')
              kind = 'pattern';
            }
          });

        };

        log('array;m', kind);

        if (this.token.eq('[')) this.next();

        const node = this.createNode(ArrayExpression, { kind });

        let parsing = true,
          comma = 0,
          item = undefined;

        while (parsing) {
          log('array tok:;c', this.token.value)

          switch (this.token.value) {
            case ',': {
              this.next();
              ++comma;
              if (!item) {
                node.add(this.createNode(Empty))
              } else {
                node.add(item);
              }
              continue;
            }
            case ']': {
              this.next();
              parsing = false;
              if (comma == node.items.length) {
                node.add(item);
              }
              log('array end;g', this.token.value + ';y');
              return node;
            }
            default: {
              item = this.expression(false);
            }
          }
        }

        return node;
      }

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
