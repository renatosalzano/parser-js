import type { Ctx, CtxParams } from "parser/Context";

export class CtxExpression implements Ctx {
  name = 'expression';
}

export class CtxTempateLiteral implements Ctx {

  name = 'template-literal';

  expression = false;

  checkTokenType({ char }: CtxParams) {

    if (this.expression) {
      if (char.curr === '}') {
        this.expression = false;
      }
      return;
    }

    if (char.curr === '`' || (char.curr + char.next) === '${') {
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
          this.expression = true;
          return;
        default:
          return 'next';
      }
    }
  });
}