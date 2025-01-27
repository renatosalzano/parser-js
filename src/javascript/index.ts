import Parser from 'parser/Tokenizer';
import type { Api } from 'parser/extend';
import { log } from 'utils';
import errors from './errors';
import { Variable, Function, Identifier, Block, Primitive, TemplateLiteral, Expression, ObjectExpression, ArrayExpression, Property, Unexpected, Empty } from './node';
import { Node } from 'parser/Progam';
import { tokens } from './tokens';

const program = {
  Block: {
    props: { functionBody: false },
    token: {
      "{": null,
    }
  },
  Variable: {
    props: { implicit: false },
    keyword: {
      'var': { kind: 'var', hoisting: true },
      'const': { kind: 'const' },
      'let': { kind: 'let' }
    }
  },
  Function: {
    props: {
      async: false,
      arrow: false,
      method: false,
      expression: false,
    },
    keyword: {
      'function': null,
      'async': { async: true },
    }
  },
  Class: {
    keyword: {
      'class': null
    }
  },
  Expression: {
    props: { group: false, append: true },
    default: true,
    token: {
      '(': null
    }
  },
  Statement: {
    keyword: {
      'if': null,
      'else': null,
      'switch': null,
      'return': null
    }
  }
}

type JSProgram = typeof program;


function statement_keyword(keyword: string) {
  return /var|let|const|function|async|if|else|switch|for|while|do|return/.test(keyword);
}

// const Test = new PropertyMap();

// Test.set('test', {})

// console.log(Test)

type ExpressionType = 'unary' | 'binary' | 'ternary' | 'access' | 'call'

type ExpressionProps = { group?: boolean, append?: boolean };

export default (config: any) => {


  return {
    name: 'javascript',
    program,
    tokens,
    parser: ({
      token,
      nextToken,
      next,
      nextLiteral,
      traverseTokens,
      expected,
      eat,
      appendNode,
      createNode,
      createContext,
      endContext,
      error,
      debug,
      $

    }: Api<JSProgram>) => {


      function skip_multiple_token(token: string) {

        next();
        if (expected(token)) {
          skip_multiple_token(token);
        }
      }

      function create_id() {
        return createNode(Identifier, { name: token.value }, token.location);
      }

      return {

        parse_expression({ append }: Partial<ExpressionProps> = {}) {
          log('parse expression;m', token.value, token.type)

          switch (token.type) {
            case 'number':
            case 'string':
            case 'identifier': {
              // current [operator]

              if (expected('operator')) {
                return this.Expression();
              }

              if (expected('=>')) {
                return this.Function({ arrow: true, expression: true });
              }

              if (token.type === 'identifier') {
                if (expected('(')) {
                  // identifier()
                  if (this.check_is_arrow_fn()) {
                    return this.Function({ arrow: true, expression: true });
                  }
                  return this.Expression({ group: true });
                }

                return create_id();
              } else {
                return createNode(Primitive, token);
              }
            }
            case 'keyword': {
              return this.Expression({ append })
            }
            case 'operator': {
              return this.Expression({ append });
            }
            case 'bracket': {
              switch (token.value) {
                case '{':
                  return this.Object();
                case '[':
                  return this.Array();
                case '(':
                  if (this.check_is_arrow_fn()) {
                    return this.Function({ arrow: true, expression: true });
                  }
                  return this.Expression({ append, group: true });
              }
            }
            case 'special': {
              if (token.eq('`')) {
                return this.TemplateLiteral()
              }
              return createNode(Unexpected);
            }
            case 'newline':
            case 'unknown':
            case 'separator':
            default: {
              // TODO
              return createNode(Unexpected);
            }
          }
        },

        check_expression() {

          switch (token.type) {
            case 'string':
            case 'number':
            case 'identifier':
              return 'literal';
            case 'keyword': {
              if (/null|true|false/.test(token.value)) {
                return 'literal';
              }
              break;
            }
            case 'special': {
              if (token.eq('`')) {
                return 'literal'
              }
            }
            case 'bracket': {
              switch (token.value) {
                case '{':
                  return 'object';
                case '[':
                  return 'array';
                case '(':
                  let is_arrow_fn = false;
                  traverseTokens('(', ')').then(() => is_arrow_fn = token.eq('=>'));
                  if (is_arrow_fn) {
                    return 'arrow'
                  }
                  return 'group';
              }
            }
            case 'operator': {
              switch (token.value) {
                case '++':
                case '--': {
                  expected();
                  if (!nextToken.eq('number') || !nextToken.eq('identifier')) {
                    error({ title: errors.syntax, message: errors.expression.prefix });
                  }
                }

              }
            }
          }

        },

        Expression({ group, append }: ExpressionProps = {}): Node {

          // 1. check expression type;
          const type = this.check_expression();

          if (type) {

            const node = createNode(Expression, { group });

            const end = () => {

              log('Expression end;m');

              endContext();

              // if (node.expression.length === 1 && node.expression[0] instanceof Node) {
              //   if (append) {
              //     appendNode(node.expression[0]);
              //   }
              //   return node.expression[0];
              // }

              if (append) {
                appendNode(node);
              }
              return node;
            }
          }

          log('Expression;m', token.value);



          let parsing_expression = true;

          let max = 10;



          // while (max > 0 && parsing_expression) {

          //   log('expr curr:;c', token.value, token.type + ';y', max)

          //   switch (token.type) {
          //     case 'number': {
          //       if (node.expression.at(-1) === '-') {

          //         const last_index = node.expression.length - 1;
          //         node.expression[last_index] = createNode(
          //           Primitive,
          //           { value: `-${token.value}`, type: token.type }
          //         )
          //       } else {
          //         node.add(createNode(Primitive, token));
          //       }
          //       break;
          //     }
          //     case 'string': {
          //       node.add(createNode(Primitive, token));
          //       break;
          //     }
          //     case 'identifier': {
          //       node.add(createNode(Identifier, { name: token.value }));
          //       break;
          //     }
          //     case 'operator': {
          //       node.add(token.value);
          //       break;
          //     }
          //     case 'bracket': {
          //       switch (token.value) {
          //         case '{':
          //           node.add(this.ObjectExpression());
          //           continue;
          //         case '[':
          //           node.add(this.ArrayExpression());
          //           continue;
          //         case '(':
          //           console.log('expression group start');
          //           next();
          //           node.add(this.Expression({ group: true, append }));
          //           break;
          //         case ')':
          //           if (group) {
          //             console.log('expression group end');
          //             parsing_expression = false;
          //             return node;
          //           }
          //           break;
          //         case '}': {
          //           log('Expression end;m', node)
          //           return end();
          //         }
          //       }
          //     }
          //     case 'keyword': {
          //       if (group) {
          //         if ($.Function.has(token.value)) {
          //           // node.add(this.Function({ expression}));
          //           break;
          //         } else {
          //           error({ title: 'keyword', message: 'porca madonna' })
          //         }
          //         break;
          //       }

          //       console.log('wat', token)

          //       if (statement_keyword(token.value)) {
          //         return end();
          //       };

          //       switch (token.value) {
          //         case 'null':
          //         case 'true':
          //         case 'false':
          //           node.add(createNode(Primitive, token))
          //           break;
          //         default:
          //           node.add(token.value);
          //           break;
          //       }
          //       // node.expression.push()
          //       break;
          //     }
          //     case 'special': {
          //       switch (token.value) {
          //         case '`': {
          //           node.add(this.TemplateLiteral());
          //           continue;
          //         }
          //       }
          //     }
          //     case 'separator': {
          //       switch (token.value) {
          //         case ';': {
          //           next();
          //           return end();
          //         }
          //         case ',': {
          //           next();
          //           if (!group) {
          //             return end();
          //           }
          //         }
          //       }
          //     }
          //   }

          //   log('porco dio;r', token.value)
          //   next();

          //   --max;

          //   // next();
          // }

        },

        literal_expression(node: Expression, end: () => void) {
          log('literal expression;m');

          let type = token.type;

          switch (token.type) {
            case 'string':
            case 'number':
              node.add(createNode(Primitive, token));
              break;
            case 'identifier':
              node.add(createNode(Identifier, { name: token.value }));
              break;
            case 'special':
              if (token.eq('`')) {
                type = 'string';
                node.add(this.TemplateLiteral());
                break;
              }
          }

          console.log(type)

          if (expected('operator')) {
            if (type === 'string') {
              switch (nextToken.value) {
                case '+':
                // concat string
                case '.':
                // member access

              }


              console.log('string porco dio')
            }
            console.log(nextToken)
          }

          return end();
        },

        expression: {

          object: (node: Expression) => {
            this
          },
          array: (node: Expression) => { },
          group: (node: Expression) => { },
          arrow: (node: Expression) => { }
        },

        check_is_arrow_fn() {
          let is_arrow_fn = false;
          traverseTokens('(', ')')
            .then(() => {
              is_arrow_fn = token.eq('=>')
            })

          return is_arrow_fn;
        },

        Block({ functionBody = false }: Partial<Block>) {
          log('Block;m');
          const node = createNode(Block, { functionBody });
          let parsing_block = true;
          let max = 10;

          if (token.eq('{')) {
            next();
          }

          if (token.eq(';')) {
            skip_multiple_token(token.value);
            next();
          }

          while (max > 0 && parsing_block) {
            log('block:;c', token.type, token.value)

            if (token.eq('}')) {
              log('Block end;m');
              node.endBlock();
              next();
              parsing_block = false;
              return node;
            }

            switch (token.type) {
              case 'keyword': {
                console.log('keyword', token.value)
                switch (true) {
                  case ($.Variable.has(token.value, true)):
                    break;
                  case ($.Function.has(token.value)):

                    break;
                }
              }
              case 'bracket': {
                switch (token.value) {
                  case '{': {
                    traverseTokens('{', '}').then(() => {
                      if (token.eq('=')) {

                      }
                    })

                    break;
                  }
                  case '[':
                  case '(':
                    break;
                }
              }
              case 'identifier': {
                $.Expression.start({ append: true });
                break;
              }
              case 'separator': {
                switch (token.value) {
                  case ';':
                    skip_multiple_token(token.value)
                    break;
                  case ',':
                    next();
                    if (token.eq(',')) {
                      error({ title: errors.syntax, message: errors.expression.expected })
                    }
                    break;
                }
                break;
              }

            }

            --max;

          }

          return node;
        },

        Variable({ kind, hoisting, implicit }: Partial<Variable> & { implicit?: boolean }) {
          log('Variable;m', kind + ";c", 'implicit:', implicit, 'hoisting', hoisting);

          const node = createNode(Variable, { tag: kind, kind, hoisting });
          const expected_init = kind === 'const';

          this.VariableId(node); // parse id

          log('Variable;m', 'ID done;g', node.id);
          node.endDeclaration();

          if (expected_init && !token.eq('=')) {
            error({ message: errors.variable.expected_init });
          }

          if (token.eq('=')) {
            next(); // over "="

            if (expected_init && /[,;]/.test(token.value)) {
              error({ message: errors.variable.expected_init });
            }

            this.VariableInit(node);
            log('Variable;m', 'init done;y');
          }

          appendNode(node);

          if (token.eq(/[,;]/)) {

            if (token.eq(';')) {
              skip_multiple_token(token.value);
              next();
            }

            if (token.eq(',')) {
              this.Variable({ kind, implicit: true, hoisting });
            }
          }


          log('Variable end;m', token.value)
        },

        VariableId(node: Variable) {
          next();

          switch (token.type) {
            case 'identifier':
              node.id = createNode(Identifier, { name: token.value });
              next();
              break;
            case 'bracket': {
              switch (token.value) {
                case '{':
                  node.id = this.Object('pattern');
                  break;
                case '[':
                  node.id = this.Array('pattern');
                  break;
                default:
                  error({ title: errors.syntax, message: `unexpected token '${token.value}'` });
                  break;
              }
              break;
            }
            default:
              error({ title: errors.syntax, message: `unexpected token '${token.value}'` });
            // unexpected token
          }

        },

        VariableInit(node: Variable) {
          node.init = this.parse_expression();

          if (node.init) {
            switch (node.init.constructor) {
              case Identifier:
              case Primitive:
                next();
                break;
            }
          }
        },

        Function({ async = false, arrow = false, expression = false }: Partial<Function>) {

          const node = createNode(Function, { async, arrow, expression });

          if (token.eq('function')) {
            next();
          }

          if (arrow) {

            log('Arrow Function;m')

            node.startParams();

            switch (true) {
              case (token.eq('(')):
                node.params = this.Params();
                break;
              case (token.eq('identifier')): {

                node.params = [createNode(Identifier, { name: token.value })];
                next();
                break;
              }
              default:
                error({ title: errors.unexpected, message: 'TODO' })
            }

            if (token.eq('=>')) {
              next();

              node.startBody();
              if (token.eq('{')) {
                node.body = this.Block({ functionBody: true });
              } else {
                // implicit return
                node.body = this.parse_expression();
                next();
              }
            }

            log('Arrow Function end;m')
            return node;
          }

          log('Function;m');

          if (token.eq('identifier')) {
            node.id = createNode(Identifier, { name: token.value });
            next();
          }

          node.startParams();

          if (token.eq('(')) {
            console.log('params')
            node.params = this.Params();
          }

          next();

          node.startBody();

          if (token.eq('{')) {
            // block
            node.body = this.Block({ functionBody: true });
          } else {
            error({ title: 'PORCO DIO', message: 'porco dio' })
          }

          node.endBody();

          if (!expression) {
            appendNode(node)
          }

          return node;
        },

        Statement() { },

        Params() {
          const params: Node[] = [];
          let parse_params = true;

          while (parse_params) {
            next();

            if (token.eq(')')) {
              next();
              return params;
            }

            params.push(this.parse_expression());
          }

          return params;

        },

        ObjectExpression() {

          log('Object Expression;m');
          let expected: 'expression' | 'pattern' = 'expression';

          traverseTokens('{', '}')
            .then(() => {
              if (token.eq('=')) {
                expected = 'pattern';
              }
            })

          return this.Object(expected);

        },

        Object(expected: 'expression' | 'pattern' = 'expression') {
          log('Object Expression;m');

          const node = createNode(ObjectExpression);

          let key: [string, Node & { alias?: Node }] | undefined;
          let alias: [string, Node] | undefined;
          let value: Node | null = null;
          let expected_alias = false;
          let expected_value = false;

          let parsing_object = true;
          // return;
          // TODO SPLIT OBJECT PARSER
          while (parsing_object) {
            next();
            log('current token:;c', token.value)

            if (!key) {
              switch (token.type) {
                case "identifier":
                  key = [token.value, createNode(Identifier, { name: token.value })];
                  log('key:;m', token.value);
                  continue;
                case 'string':
                case 'number':
                  key = [token.value, createNode(Primitive, token)];
                  log('key:;m', token.value);
                  continue;
                case 'bracket': {
                  // TODO COMPUTED KEY
                  switch (token.value) {
                    case '[':
                      console.log('object end here')
                      continue;
                  }

                }
                default: {
                  // unexpected token here
                }
              }
            }

            if (key) {
              switch (token.value) {
                case ':':
                  if (expected === 'pattern') {
                    expected_alias = true;
                  } else {
                    expected_value = true;
                  }
                  continue;
                case '=': {
                  if (expected = 'expression') {
                    // unexpected token;
                  } else {
                    expected = 'pattern';
                    expected_value = true;
                    node.type = expected;
                  }
                  continue;
                }
                case ',':
                  log('new property:;y', key[0])
                  const propertyNode = createNode(Property, {
                    key: key[1],
                    value,
                  })
                  node.properties.set(key[0], propertyNode);
                  key = undefined;
                  value = null;
                  continue;
              }
            }

            if (key && expected_alias) {
              log('expected alias;y')
              if (token.type === 'identifier') {
                alias = [token.value, createNode(Identifier, { name: token.value })];
                continue;
              } else {
                // unexpected token
              }
            }

            if (key && expected_value) {
              log('expected value;y')
              // { key: here
              value = this.parse_expression()!;
              continue;
            }

            if (token.eq('}')) {

              if (key) {
                log('new property;y')
                const propertyNode = createNode(Property, {
                  key: key[1],
                  value,
                })
                node.properties.set(key[0], propertyNode)
              }

              next(); // over '{'

              log('Object end;m')

              parsing_object = false;
              return node;
            }
          }

          return node;

          // console.log(token)

        },

        ArrayExpression() {
          let type: 'expression' | 'pattern' = 'expression';

          traverseTokens('[', ']')
            .then(() => {
              if (token.eq('=')) {
                type = 'pattern'
              }
            })

          return this.Array(type);
        },

        Array(type: 'expression' | 'pattern' = 'expression') {
          log('Array;m', type + ';g');
          const node = createNode(ArrayExpression, { type });

          let parsing_array = true;
          let item: Node | undefined = undefined;
          let comma_count = 0;
          let max = 10

          while (max > 0 && parsing_array) {
            next();
            // log('current token:;c', token.value);

            switch (token.value) {
              case ',': {
                ++comma_count;
                if (!item) {
                  node.add(createNode(Empty))
                } else {
                  node.add(item);
                }
                break;
              }
              case ']': {
                parsing_array = false;
                if (comma_count === node.items.length) {
                  node.add(item);
                }
                next() // over [
                log('Array end;m', node.toString())
                return node;
              }
              case '...': {
                if (expected('identifier')) {
                  next();
                  node.add(createNode(Identifier, { name: token.value, rest: true }))
                  break;
                } else {
                  error({ message: 'array porco dio' })
                }
              }
              default: {
                item = this.parse_expression();
              }
            }
            --max

          }

          return node;

        },

        TemplateLiteral() {
          log('Template Literal;m')

          const node = createNode(TemplateLiteral);
          let parsing_lit = true;
          let loop = 10;

          if (token.eq('`')) {
            next();
          }

          while (loop > 0 && parsing_lit) {

            log('templ curr:;c', token.value, token.type + ';y');

            if (token.eq('`')) {
              log('Template Literal end;m');

              next();
              parsing_lit = false;
              return node;
            }

            if (token.eq('string')) {
              node.expression.push(createNode(Primitive, token));
              // ++loop;
            }

            if (token.eq('${')) {
              next();
              console.log('hey there', token)
              node.expression.push(this.parse_expression());
              // ++loop;
            }

            // if (token.eq('}')) {}

            next();

            --loop;
          } // end while

          return node;

        },
      };

    }
  }
}
