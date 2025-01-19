import Parser from 'parser/Tokenizer'
import type { DefaultApi } from "./";
import { ContextObject } from 'parser/Context';
import { log } from 'utils';
import errors from './errors';
import { Variable, Function, Identifier, Block, Number, Literal, TemplateLiteral, Expression, ObjectExpression, ArrayExpression, Property, Unexpected } from './node';
import { Node } from 'parser/Progam';


const context = {
  Program: ['Variable', 'Function', 'Expression', 'Block', 'Statement', 'Class', 'Invalid', 'TemplateLiteral'],
  Block: {
    props: { functionBody: false },
    token: {
      "{": null,
    }
  },
  Variable: {
    props: { kind: 'var' as 'var' | 'const' | 'let', implicit: false },
    keyword: {
      'var': { props: { kind: 'var' } },
      'const': { props: { kind: 'const' } },
      'let': { props: { kind: 'let' } }
    },
    step: ['id', 'init']
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
      'async': { eat: "function", props: { async: true } },
    }
  },
  Class: {
    keyword: {
      'class': null
    }
  },
  Expression: {
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
  },
  TemplateLiteral: {
    token: {
      '`': null,
    }
  }
}

const operator = [
  '+', '-', '*', '/', '%', '.', '>', '<', '!', '=', '&', '|', '^', '~', '?', '??', '??=', '++', '--', '==', '!=', '>=', '<=', '&&', '&&=', '||', '||=', '+=', '-=', '*=', '/=', '%=', '<<', '>>', '===', '!==', '>>>', '>>>=', '...', 'new', 'typeof', 'instanceof'
];

const bracket = ['(', ')', '[', ']', '{', '}'];

const separator = [',', ':', ';', '\n'];

const keyword = ['true', 'false', 'null', 'this', 'super'];

const specialToken = ['=>', '...', '?.', '`', '${'];

// const comment = {
//   '//': "comment",
//   "/*": "comment multiline start",
//   "*/": "comment multiline end"
// }


type Context = typeof context;

type Api = DefaultApi & {
  ctx: {
    [K in keyof typeof context]: ContextObject;
  }
}



function statement_keyword(keyword: string) {
  return /var|let|const|function|async|if|else|switch/.test(keyword);
}

// const Test = new PropertyMap();

// Test.set('test', {})

// console.log(Test)

type ExpressionType = 'unary' | 'binary' | 'ternary' | 'access' | 'call'

export default (config: any) => {


  return {
    context,
    tokens: {
      keyword,
      bracket,
      operator,
      separator,
      specialToken,
    },
    parse: ({
      ctx,
      token,
      expectedToken,
      next,
      nextLiteral,
      expected,
      eat,
      isIdentifier,
      appendNode,
      createNode,
      createRef,
      logNode,
      error,
      currentContext,
      startContext,
      endContext,
    }: Api) => {

      function recursiveObjectPattern(node: any) {

        // const id = next(true, /[:=,}]/, true);

        // switch (nextChar()) {
        //   case ":":
        //     // alias | nested destructuring
        //     console.log('alias|destructuring', id)
        //     if (expected('{')) {
        //       console.log('nested pattern')
        //     } else {
        //       console.log('alias')
        //     }
        //     break;
        //   case "=":
        //     // assignament
        //     console.log('assignament')
        //     break;
        //   case ",":
        //     // next
        //     node.properties.push({ tag: 'identifier', id })
        //     recursiveObjectPattern(node)
        //     console.log('end prop')
        //     break;
        //   case "}":
        //     // end pattern
        //     console.log('next')
        // }

      }

      function skip_multiple_token(token: string) {

        next();
        if (expected(token)) {
          skip_multiple_token(token);
        }
      }


      return ({

        parse_expression() {
          log('parse expression;m', 'at', token.value)

          switch (token.type) {
            case 'number':
            case 'literal':
            case 'identifier': {
              // current [operator]
              if (expected('operator')) {
                return this.Expression();
              }

              if (token.type === 'identifier') {
                if (expected('(')) {
                  // identifier()
                  return this.Expression(true);
                }
                return createNode(Identifier, { name: token.value })
              } else {
                const Node = token.literal ? Literal : Number;
                return createNode(Node, { value: token.value });
              }
            }
            case 'keyword': {
              return this.Expression();
            }
            case 'operator': {
              return this.Expression();
            }
            case 'bracket': {
              switch (token.value) {
                case '{':
                  return this.Object();
                case '[':
                  return this.Array();
                case '(':
                  return this.Expression(true);
                case '`':
                  return this.TemplateLiteral();
              }
            }
            case 'unknown':
            case 'separator': {
              // TODO
              return createNode(Unexpected);
            }
          }
        },

        Expression(is_group = false): Node {
          log('Expression;m', token.value)
          const node = createNode(Expression, { group: is_group });
          const curr_ctx = currentContext();
          const ctx_expression = curr_ctx.name === 'Expression';

          let parsing_expression = true;

          let max = 10

          while (max > 0 && parsing_expression) {

            log('current token;c', token.value)

            switch (token.type) {
              case 'number':
              case 'literal': {
                const Node = token.literal ? Literal : Number;
                node.expression.push(createNode(Node, { value: token.value }));
                break;
              }
              case 'identifier': {
                node.expression.push(createNode(Identifier, { name: token.value }));
                break;
              }
              case 'operator': {
                node.expression.push(token.value);
                break;
              }
              case 'bracket': {
                switch (token.value) {
                  case '{':
                    node.expression.push(this.Object());
                    break;
                  case '[':
                    if (ctx_expression) {
                      error({ title: errors.syntax, message: `unexpected token '${token.value}'` });
                    }
                    node.expression.push(this.Array());
                    break;
                  case '(':
                    console.log('expression group start');
                    next();
                    node.expression.push(this.Expression(true));
                    break;
                  case ')':
                    if (is_group) {
                      console.log('expression group end');
                      parsing_expression = false;
                      return node;
                    }
                    break;
                  case '}': {
                    log('Expression end;m')
                    console.log('current tok', token.value)
                    return node;
                  }
                }
              }
              case 'keyword': {
                if (is_group) {
                  if (ctx.Function.has(token.value)) {
                    node.expression.push(ctx.Function.start());
                    break;
                  }
                  if (statement_keyword(token.value)) {
                    // TODO ERROR
                    log(`unexpected keyword "${token.value}";r`)
                    break;
                  }
                  node.expression.push(token.value);
                  break;
                }
                // node.expression.push()
                break;
              }
            }

            expected();

            log('expected token;c', expectedToken.value)

            switch (expectedToken.type) {
              case 'keyword': {
                if (!is_group && statement_keyword(expectedToken.value)) {
                  log('Expression end;m')
                  return node;
                }
              }
              case 'separator': {
                switch (expectedToken.value) {
                  case ';': {
                    if (curr_ctx.name === 'Expression') {
                      appendNode(node);
                    } else {
                      return node;
                    }
                    return node;
                  }
                  case ',': {
                    if (!is_group && curr_ctx.name !== 'Expression') {
                      log('Expression end;m')
                      return node;
                    }
                  }
                }
              }
            }

            next();
            --max;

            // next();
          }

          return node;

        },

        ExpressionGroup() {

        },

        Block({ functionBody }: Context['Block']['props']) {
          const node = createNode(Block, { functionBody });
          let parsing_block = true;
          while (parsing_block) {
            next();
            switch (true) {
              case token.literal:
                const literalNode = createNode(Literal, { value: token.value });
                appendNode(literalNode);
                break;
              case ctx.Function.has(token.value, true):
                break;
              case ctx.Variable.has(token.value, { props: { kind: token.value } }):
                break;
              case token.eq('}'):
                parsing_block = false;
                break;
            }

          }
        },

        Variable({ kind, implicit }: Context['Variable']['props']) {
          log('Variable;m', kind + ";c", 'implicit:', implicit)

          const node = createNode(Variable, { tag: kind, kind });
          const curr_ctx = currentContext();
          const expected_init = kind === 'const';

          this.VariableId(node); // parse id

          curr_ctx.next(); // id done

          if (expected_init) {
            if (!expected('=')) {

              error({ message: errors.variable.expected_init });
            }
          }

          if (expected('=')) {
            next();
            next(); // over "="

            if (expected_init && /[,;]/.test(token.value)) {
              error({ message: errors.variable.expected_init });
            }

            this.VariableInit(node);
          }

          appendNode(node);

          if (expected((token) => /[,;]/.test(token.value))) {

            next();

            if (token.eq(';')) {
              skip_multiple_token(token.value);
            }

            if (token.eq(',')) {
              startContext('Variable', { kind, implicit: true });
            }
          }


          endContext();
          log('Variable end;m', node.toString())
        },

        VariableId(node: Variable) {
          next();

          switch (token.type) {
            case 'identifier':
              node.id = token.value;
              break;
            case 'bracket': {
              switch (token.value) {
                case '{':
                  node.id = this.Object('pattern');
                  break;
                case '[':
                  node.id = this.Array();
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
        },

        Function({ async, arrow }: Context['Function']['props']) {

          const node = createNode(Function, { async });
          appendNode(node)
          // node.async = async;
          next();

          if (!arrow && token.type === 'identifier') {
            // check if have identifier
            node.id = token.value;
            next();
          }

          if (token.eq('(')) {
            console.log('params')
            this.Params(node);
          } else {
            // throw error
          }

          next();
          if (token.eq('{')) {
            // block
            node.body = createNode(Block);
            ctx.Block.start({ functionBody: true });
          }
        },

        Params(node: Function) {
          let parse_params = true;
          while (parse_params) {
            next();
            switch (token.type) {
              case "bracket":
                if (token.eq(')')) {
                  console.log('end parse params')
                  parse_params = false;
                }
            }
          }

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
                case 'literal':
                case 'number':
                  const Node = token.literal ? Literal : Number;
                  key = [token.value, createNode(Node, { value: token.value })];
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

        Array(expected: 'expression' | 'pattern' = 'expression') {
          log('PARSING ARRAY;m');
          const node = createNode(ArrayExpression);

          let parsing_array = true;

          while (parsing_array) {
            next();
            log('current token:;c', token.value);



          }

          return node;

          // while (parsing_array) {
          //   next();
          //   if (token.eq(',')) { continue; }
          //   switch (token.type) {
          //     case 'literal':
          //     case 'number':
          //     case 'identifier':
          //       if (expected('operator')) {

          //       }
          //       if (token.type === 'identifier') {
          //         node.items.push(createNode(IdentifierNode, { name: token.value }))
          //       } else {
          //         node.items.push(createNode(node_map[token.type], { value: token.value }))
          //       }
          //       continue;
          //     case 'operator':
          //       continue
          //     case 'bracket':
          //       switch (token.value) {
          //         case "{":
          //           log('item is object;y')
          //           node.items.push(this.Object());
          //           continue;
          //         case "[":
          //           node.items.push(this.Array());
          //           continue;
          //         case "(":
          //           // node.items.push(this.Expression())
          //           continue;
          //         case "]":
          //           parsing_array = false;
          //           return node;
          //       }
          //     default:
          //       console.log('unexpected token')
          //   }

          // }
          // return node;
        },

        TemplateLiteral() {
          log('Template Literal;m')

          const node = createNode(TemplateLiteral);
          let parsing_lit = true;
          let loop = 5;
          while (loop > 0 && parsing_lit) {

            nextLiteral(['${', '`']);
            node.expression.push(createNode(Literal, { value: token.value }));
            next();

            if (token.eq('`')) {
              log('Template Literal end;m')
              parsing_lit = false;
              console.log(node.expression)
              return node;
            }

            next() // over ${

            node.expression.push(this.parse_expression()!);

            --loop;
          }

          console.log('end lit', node)

          return node;

        }
      })
    }
  }
}
