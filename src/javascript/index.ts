import Parser from "parser/Parser";
import { tokens } from './tokens';
import { Arguments, ArrayExpression, Class, Empty, Expression, Fn, Identifier, Import, Importer, ObjectExpression, Primitive, Property, Statement, TemplateLiteral, Variable } from "./node";
import { log } from "utils";
import errors from "./errors";
import { Block, Node } from "parser/Progam";

export default (config: any) => {

  return {
    name: 'javascript',
    tokens,
    parser: class extends Parser {

      allowReturn = false;
      checkNewline = false;

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
                this.import();
                break;
              case 'export':
                this.export();
                break;
              case 'function':
                this.function(true);
                break;
              case 'class':
                this.class(true);
                break;
              case 'if':
                this.ifElse();
                break;
              case 'return':
                this.error({ message: 'Illegal return' });
            }
            break;
          }
          case "literal":
            if (this.token.eq('\n')) {
              this.next();
              return;
            }
            break;
          case "bracket-open": {
            this.appendNode(this.block());
            break;
          }
          default: {
            this.expression(true)
          }

        }
      }

      block(append = false, fnNode?: Fn) {

        log('block;m')

        const node = this.createNode(Block);

        const end = () => {
          log('block end;g')
          node.endBlock();

          if (append) {
            this.appendNode(node);
          }

          return node;
        }

        if (this.token.eq('{')) this.next();

        let parse = true;

        while (parse) {

          log('block tok:;c', this.token.value);

          switch (this.token.type) {

            case 'statement': {
              switch (this.token.value) {
                case 'var':
                case 'const':
                case 'let':
                  this.variable(this.token.value);
                  continue;
                case 'function':
                  this.function(true);
                  continue;
                case 'if':
                  this.ifElse();
                  continue;
                case 'switch':
                  this.switchCase();
                  continue;
                case 'return':
                  if (this.allowReturn && fnNode) {
                    this.return(fnNode);
                  }
                  return end();
              }
              break;
            }

            case 'bracket-open': {
              if (this.token.eq('{')) {
                this.block(true, fnNode)
              }
            }

            case 'bracket-close': {
              if (this.token.eq('}')) {
                this.next();
                parse = false;
                return end();
              }
              break;
            }

            case 'keyword':
            default: {
              switch (this.token.value) {
                case 'async':
                  this.function(true, { async: true });
                  continue;
              }
              this.expression(true);
            }

          }
        }

        return end();
      }

      return(fnNode: Fn) {
        log('block return;m');

        this.skipNewline(false);
        this.checkNewline = true;

        if (this.token.eq('return')) this.next();

        let unreachable_code = this.token.eq('\n');

        if (unreachable_code) {
          this.next(); // over newline
        }

        const ret_node = this.createNode(Statement, { kind: 'return', argument: [] });

        let after_comma = false;

        while (!this.token.eq('}')) {

          const node = this.expression();

          if (this.token.type == 'bracket-close') {
            this.next();
          }

          if (unreachable_code) {
            continue;
          }

          if (this.token.eq('\n')) {
            this.next();
          }

          if (after_comma) {
            after_comma = false;

            if (node instanceof Expression && node.empty()) continue;
            ret_node.add(node);
            continue
          }

          if (this.token.eq(',')) {
            this.next();
            after_comma = true;

            if (node instanceof Expression && node.empty()) continue;
            ret_node.add(node);
          }

          if (this.token.eq('\n')) {
            this.next();
          }

          if (this.token.eq(';')) {
            this.next();
          }

        }

        this.skipNewline(true);
        this.checkNewline = false;

        this.next();

        fnNode.returnType = ret_node?.argument?.at(-1)?.type || 'void';

        this.appendNode(ret_node);

      }

      import() {
        log('import;m');
        const node = this.createNode(Import);

        const end = () => {
          this.appendNode(node);
          return node;
        }

        if (this.token.eq('import')) this.next();

        let parse = true;
        let alias = false;
        let pattern = false;

        import_loop: while (parse) {
          const importer = this.createNode(Importer);
          log('import tok:;c', this.token.value, this.token.type);

          switch (this.token.type) {
            case 'literal': {
              if (this.token.subtype == 'string') {
                const module_name = this.createNode(Primitive, this.token);
                this.next();

                switch (this.token.value) {
                  case 'import':
                  case ';':
                    if (this.token.eq(';')) this.next();
                    parse = false;
                    node.source = module_name;
                    return end();
                }

                importer.imported = module_name;
                console.log('importer', importer)
                break;
              }
            }
            case 'identifier': {
              importer.imported = this.createNode(Identifier, { name: this.token.value });
              console.log('importer', importer);
              this.next();
              break;
            }
            case 'operator': {
              if (this.token.eq('*')) {
                this.next();
                importer.module = true;
                break;
              }
            }
            case 'bracket-open': {
              if (this.token.eq('{')) {
                this.next();
                pattern = true;
                continue import_loop;
              }
            }
            case 'bracket-close': {
              if (this.token.eq('}')) {
                this.next();
                pattern = false;
                continue import_loop;
              }
            }
            case 'separator': {
              if (this.token.eq(',')) {
                this.next();
                if (importer.imported) {
                  node.add(importer);
                }
                continue import_loop;
              }
            }
            case 'keyword': {
              switch (this.token.value) {
                case 'as':
                  this.next();
                  alias = true;
                  break;
                case 'default': {
                  if (pattern) {
                    this.next();
                    importer.default = true;
                    break;
                  }
                }
                case 'from': {
                  this.next();
                  parse = false;
                  continue import_loop;
                }
                default: {
                  this.error({ message: 'unexpected token: ' + this.token.value });
                }
              }
              break;
            }
            default: {
              this.error({ message: 'unexpected token: ' + this.token.value });
            }
          }

          if (this.token.eq('as')) {
            this.next();
            alias = true;
          }

          if (alias) {
            alias = false;
            if (this.token.eq('identifier')) {
              importer.alias = this.createNode(Identifier, { name: this.token.value });
              this.next();
              log('with alias', importer)
            } else {
              this.error({ message: 'unexpected token: ' + this.token.value });
            }
          }

          node.add(importer);

        }// end loop

        if (this.token.subtype == 'string') {
          node.source = this.createNode(Primitive, this.token);
          this.next();
          if (this.token.eq(';')) this.next();
        } else {
          this.error({ message: 'unexpected token: ' + this.token.value });
        }

        log('import end;g');

        return end();
      };

      export() { }

      ifElse(kind: 'if' | 'else' = 'if') {

        log(`statement ${kind};m`);

        const node = this.createNode(Statement, { kind })

        if (this.token.eq(kind)) this.next();

        let expected_condition = kind == 'else'
          ? this.token.eq('if')
          : true;

        if (kind == 'else' && expected_condition) {
          node.kind = 'else if';
          this.next();
        }

        if (expected_condition) {
          log('expected condition;y')

          if (this.token.eq('(')) {
            this.next();

            node.condition = this.expression();


            if (this.token.eq(')')) {
              this.next();
            } else {
              // error
            }

          } else {
            // error
          }

        } // end condition

        if (this.token.eq('{')) {
          node.body = this.block();
        }

        if (this.token.eq('else')) {
          node.next = this.ifElse('else');
        }

        if (node.kind == 'if') {
          this.appendNode(node);
        }
        return node;
      }

      switchCase() { }


      expression(append = false, node: Expression = this.createNode(Expression)) {

        log('expression;m', this.token.value);

        const end = () => {
          log('end expression;g', this.token.value);

          let output = node;

          if (node.expression.length == 1 && !node.group) {
            if (typeof node.expression[0] != 'string') {
              output = node.expression[0] as any;
            }
          }

          if (node.kind == 'call') {
            console.log(node.expression.at(-1))
          }

          if (append) {
            this.appendNode(output);
          }

          return output;
        }

        let parse_expression = true;
        let max = 10

        while (max > 0 && parse_expression) {

          --max;

          log('expr tok:;c', this.token.value);

          switch (this.token.type) {
            case "identifier":
              node.add(this.createNode(Identifier, { name: this.token.value }));
              this.next();

              if (this.token.eq('(')) {
                node.kind = 'call';
                continue;
              }

              continue;
            case 'literal': {

              if (this.checkNewline && this.token.eq('\n')) {
                return end();
              }

              if (this.token.value == "1") {
                console.log('hey', this.token)
              }

              node.add(this.createNode(Primitive, this.token));

              this.next();
              continue;
            }
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
                      continue;
                    }
                  }

                  this.next();

                  if (node.kind == 'call') {
                    node.add(this.arguments());
                    continue;
                  }

                  const group = this.createNode(Expression, { group: true });

                  if (node.empty()) {
                    node = group;
                  } else {
                    node.add(this.expression(false, group));
                  }

                  continue;
                }
              }
              break;
            }
            case "bracket-close": {
              return end();
            }
            case "keyword": {

              switch (this.token.value) {
                case 'true':
                case 'false':
                case 'null':
                  node.add(this.createNode(Primitive, this.token));
                  this.next()
                  continue;
                case 'this':
                  node.add('this');
                  this.next()
                  continue;
                case 'super':
                  node.add('super');
                  this.next()

                  if (this.token.eq('(')) {
                    this.next();
                    node.kind = 'call';
                    continue;
                  }
                  break;
                default:
                // error
              }

              break;
            }
            case "statement":
            case "separator": {

              switch (this.token.value) {
                case ',':
                  if (node.group) {
                    this.next();
                    continue;
                  } else {
                    break;
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
              if (this.token.value == '`') {
                node.add(this.templateLiteral());
                continue;
              }
              break;
            }
            case "comment":
          }

          return end()

        }

        return node;

      }


      arguments() {
        log('arguments;m');

        const node = this.createNode(Arguments);
        let parse = true;

        if (this.token.eq(')')) {
          this.next();
          return node;
        }

        while (parse) {

          node.add(this.expression());

          log('args tok:;c', this.token.value)

          if (this.token.eq(',')) {
            this.next();
            continue;
          }

          if (this.token.eq(')')) {
            this.next();
            log('arguments end;g')
            return node;
          }

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

        const node = this.createNode(Fn, { arrow, async, expression });

        const end = () => {

          log('function end;g');
          if (append) {
            this.appendNode(node);
          }

          return node;
        }

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
          log('arrow fn body expression;y');

          node.body = this.expression(false);
          return end();
        }

        if (this.token.eq('{')) {
          // block
          this.allowReturn = true;
          node.body = this.block(false, node);
          this.allowReturn = false;
        } else {
          // error
        }


        return end();

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

          if (this.token.eq(/[;\n]/)) {
            this.eat(this.token.value, true);
            this.next();
          }

          if (this.token.eq(',')) {
            this.variable(kind);
          }
        }

        log('variable end;g', this.token.value);
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

      class(append = false, { expression }: { expression?: boolean } = {}) {

        log('class;m');

        const node = this.createNode(Class);

        if (this.token.eq('class')) this.next();

        if (this.token.eq('identifier')) {
          node.id = this.createNode(Identifier, { name: this.token.value });
          this.next();
        } else {
          node.expression = true;
        }

        if (this.token.eq('extends')) {
          this.next();
          if (this.token.eq('identifiers')) {
            node.extends = this.createNode(Identifier, { name: this.token.value });
            this.next();
          } else {
            // error
          }
        }



      }

      classBody(node: Class) {

        if (this.token.eq('{')) {
          this.next();
        }

        let parse = true;

        while (parse) {
          const property = this.createNode(Property);
          const { key } = this.objectKey('expression');

          property.key = key;

          switch (this.token.value) {
            case '=':
              this.next();
              property.value = this.objectValue();
              break;
            case '(':
              property.value = this.function(false, { expression: true })

            case ';':
              this.next();
          }

        }
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
        log('object end;m');
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
            case '}': {
              this.error({ title: 'unexpected token', message: 'porca la madonna' })
            }
            default: {
              item = this.expression(false);
            }
          }
        }

        return node;
      }

      templateLiteral() {
        log('template literal;m');
        const node = this.createNode(TemplateLiteral);

        if (this.token.eq('`')) {
          this.next();
        }

        let parse_template = true;

        while (parse_template) {

          log('templ tok:;c', this.token.value);

          if (this.token.eq('`')) {

            this.next();
            parse_template = false;

            log('template literal end;g', this.token.value);
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

          // if (this.token.eq('}')) {
          //   this.next();
          // }

          this.next();

        }

        return node;
      }
    }
  }
}
