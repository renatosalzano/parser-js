import Parser from 'parser/Tokenizer'
import type { DefaultApi } from "./";
import { ContextObject } from 'parser/Context';
import { log } from 'utils';
import errors from './errors';
import { Variable, Function, Identifier, Block, Number, Literal, TemplateLiteral, Expression, ObjectExpression, ArrayExpression, Property, Unexpected, Empty } from './node';
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
      'var': { props: { kind: 'var', hoisting: true } },
      'const': { props: { kind: 'const' } },
      'let': { props: { kind: 'let' } }
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
      'async': { eat: "function", props: { async: true } },
    }
  },
  Class: {
    keyword: {
      'class': null
    }
  },
  Expression: {
    props: { group: false },
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
  '+', '-', '*', '/', '%', '.', '>', '<', '!', '=', '&', '|', '^', '~', '?', '??', '??=', '++', '--', '==', '!=', '>=', '<=', '&&', '&&=', '||', '||=', '+=', '-=', '*=', '/=', '%=', '<<', '>>', '===', '!==', '>>>', '>>>=', 'new', 'typeof', 'instanceof'
];

const bracket = ['(', ')', '[', ']', '{', '}'];

const separator = [',', ':', ';', '\n'];

const keyword = ['true', 'false', 'null', 'this', 'super'];

const specialToken = ['=>', '...', '?.', '`', '${'];

const comment = [
  ['//'],
  ['/*', '*/']
]

type Context = typeof context;
type VariableProps = Context['Variable']['props'] & Context['Variable']['keyword']['var']['props']

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
      comment,
      operator,
      separator,
      specialToken,
    },
    parse: ({
      ctx,
      token,
      nextToken,
      next,
      nextLiteral,
      traverseTokens,
      expected,
      eat,
      isIdentifier,
      appendNode,
      createNode,
      logNode,
      error,
      currentContext,
      startContext,
      endContext,
      debug,
    }: Api) => {


      function skip_multiple_token(token: string) {

        next();
        if (expected(token)) {
          skip_multiple_token(token);
        }
      }

      function create_id() {
        return createNode(Identifier, { name: token.value }, token.location);
      }


      return ({

        parse_expression() {
          log('parse expression;m', token.value, token.type)

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
                  if (this.check_is_arrow_fn()) {
                    return ctx.Function.start({ arrow: true });
                  }
                  return this.Expression({ group: true });
                }

                return create_id();
              } else {
                const Node = token.type === 'literal' ? Literal : Number;
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
                  if (this.check_is_arrow_fn()) {
                    return ctx.Function.start({ arrow: true });
                  }
                  return this.Expression({ group: true });
                case '`':
                  return this.TemplateLiteral();
              }
            }
            case 'newline':
            case 'special':
            case 'unknown':
            case 'separator': {
              // TODO
              return createNode(Unexpected);
            }
          }
        },

        Expression({ group } = { group: false } as Context['Expression']['props']): Node {
          log('Expression;m', token.value)
          const curr_ctx = currentContext();
          const ctx_expression = curr_ctx.name === 'Expression';
          const node = createNode(Expression, { group });

          function end_context() {
            if (ctx_expression) {
              log('Expression end;m', node.toString());
              appendNode(node);
              endContext();
              return node;
            }
          }

          let parsing_expression = true;

          let max = 10

          while (max > 0 && parsing_expression) {

            log('current token;c', token.value, max)

            switch (token.type) {
              case 'number':
              case 'literal': {
                const Node = token.eq('literal') ? Literal : Number;
                node.add(createNode(Node, { value: token.value }));
                break;
              }
              case 'identifier': {
                node.add(createNode(Identifier, { name: token.value }));
                break;
              }
              case 'operator': {
                node.add(token.value);
                break;
              }
              case 'bracket': {
                switch (token.value) {
                  case '{':
                    node.add(this.ObjectExpression());
                    continue;
                  case '[':
                    node.add(this.ArrayExpression());
                    continue;
                  case '(':
                    console.log('expression group start');
                    next();
                    node.add(this.Expression({ group: true }));
                    break;
                  case ')':
                    if (group) {
                      console.log('expression group end');
                      parsing_expression = false;
                      return node;
                    }
                    break;
                  case '}': {
                    log('Expression end;m')
                    return node;
                  }
                }
              }
              case 'keyword': {
                if (group) {
                  if (ctx.Function.has(token.value)) {
                    node.add(ctx.Function.start());
                    break;
                  }
                  if (statement_keyword(token.value)) {
                    // TODO ERROR
                    log(`unexpected keyword "${token.value}";r`)
                    break;
                  }
                  node.add(token.value);
                  break;
                }
                node.add(token.value);
                // node.expression.push()
                break;
              }
              case 'separator': {
                switch (token.value) {
                  case ';': {
                    next();
                    end_context();
                    return node;
                  }
                }
              }
            }

            expected();

            log('next token;y', nextToken.value)

            switch (nextToken.type) {
              case 'keyword': {
                if (!group && statement_keyword(nextToken.value)) {
                  log('Expression end;m')
                  return node;
                }
              }
              case 'separator': {
                switch (nextToken.value) {
                  case ';': {
                    next();
                    if (curr_ctx.name === 'Expression') {
                      appendNode(node);
                      endContext();
                      return node;
                    }
                    return node;
                  }
                  case ',': {
                    if (!group && curr_ctx.name !== 'Expression') {
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

        check_is_arrow_fn() {
          let is_arrow_fn = false;
          traverseTokens('(', ')')
            .then(() => {
              console.log('TEST ', token.value)
              is_arrow_fn = token.eq('=>')
            })

          return is_arrow_fn;
        },

        Block({ functionBody }: Context['Block']['props']) {
          const node = createNode(Block, { functionBody });
          let parsing_block = true;
          // while (parsing_block) {
          //   next();
          //   switch (true) {
          //     case token.literal:
          //       const literalNode = createNode(Literal, { value: token.value });
          //       appendNode(literalNode);
          //       break;
          //     case ctx.Function.has(token.value, true):
          //       break;
          //     case ctx.Variable.has(token.value, { props: { kind: token.value } }):
          //       break;
          //     case token.eq('}'):
          //       parsing_block = false;
          //       break;
          //   }

          // }
        },

        Variable({ kind, hoisting, implicit }: VariableProps) {
          log('Variable;m', kind + ";c", 'implicit:', implicit, 'hoisting', hoisting)

          const node = createNode(Variable, { tag: kind, kind, hoisting });
          const expected_init = kind === 'const';

          this.VariableId(node); // parse id
          log('Variable;m', 'ID done;g');

          if (expected_init && !token.eq('=')) {
            error({ message: errors.variable.expected_init });
          }
          /* 
            l'appendNode in questo punto non è casuale,
            oltre ad aggiungerlo nel blocco statement corrente,
            essendo Variable un nodo dichiarante, salvo tutti i riferimenti
            della stessa
          */
          appendNode(node);

          if (token.eq('=')) {
            next(); // over "="

            if (expected_init && /[,;]/.test(token.value)) {
              error({ message: errors.variable.expected_init });
            }

            this.VariableInit(node);
            log('Variable;m', 'init done;y');
          }


          if (token.eq(/[,;]/)) {

            if (token.eq(';')) {
              skip_multiple_token(token.value);
            }

            if (token.eq(',')) {
              startContext('Variable', { kind, implicit: true, hoisting });
            }
          }

          endContext();
          log('Variable end;m', node.toString())
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
              case Number:
              case Literal:
                next();
                break;
            }
          }
        },

        Function({ async, arrow }: Context['Function']['props']) {

          const node = createNode(Function, { async, arrow });
          appendNode(node)

          if (token.eq('function')) {
            next();
          }

          if (arrow) {

            switch (true) {
              case (token.eq('(')):
                node.params = this.Params();
                break;
              case (token.eq('identifier')): {
                node.params = [createNode(Identifier, { param: true })]
                break;
              }
              default:
                error({ title: errors.unexpected, message: 'TODO' })
            }

            if (token.eq('=>')) {
              next();
              if (token.eq('{')) {
                node.body = ctx.Block.start({ functionBody: true });
              } else {
                node.body = this.parse_expression()
                node.returnType = node.body?.tag || 'void';

                console.log(node)
              }
            }

            log('Arrow Function end;m')
            endContext();
            return node;
          }

          log('Function;m');

          if (token.eq('identifier')) {
            node.id = createNode(Identifier, { name: token.value });
            next();
          }


          if (token.eq('(')) {
            console.log('params')
            node.params = this.Params();
          }

          next();
          if (token.eq('{')) {
            // block
            node.body = ctx.Block.start({ functionBody: true });
          }
        },

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
                console.log('object is pattern')
                expected = 'pattern'
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
                case 'literal':
                case 'number':
                  const Node = token.eq('literal') ? Literal : Number;
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
