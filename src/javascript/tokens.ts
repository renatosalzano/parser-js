import type { Ctx, CtxParams } from "parser/Context";

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

export class CtxTempateLiteral implements Ctx {

  name = 'template-literal';

  expression = false;
  active = true;

  checkTokenType({ char }: CtxParams) {
    if (char.curr === '`') {
      return;
    }
    return 'string';
  }

  tokenize = ({ Token, getToken }: CtxParams) => ({
    string: () => {

      const token = getToken();
      const end_string = token === '${';

      switch (true) {
        case end_string:
          Token.type = 'string';
          this.active = false;
          return;
        default:
          return 'next';
      }
    }
  });
}


export const tokens = {
  bracket,
  comment,
  keyword,
  operator,
  separator,
  specialToken
}