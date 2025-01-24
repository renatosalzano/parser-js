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

  checkTokenType({ char }: CtxParams) {
    if (char.curr + char.next === '${') {

    }
    return 'string';
  }

  tokenize = ({ getToken }: CtxParams) => ({
    string: () => {
      const token = getToken();
      if (token) {
        console.log(token)
        return
      } else {
        return 'next';
      }
    }
  })
}


export const tokens = {
  bracket,
  comment,
  keyword,
  operator,
  separator,
  specialToken
}