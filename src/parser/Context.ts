import Tokenizer from "./Tokenizer";

type Char = { curr: string; next: string };

interface TokenContext {
  start: string | string[];
  end: string | string[];
  checkTokenType(char: { curr: string; next: string }): void;
  tokenize: { [key: string]: Function };
}

class Tag implements TokenContext {
  start = '<';
  end = '>';

  checkTokenType(char: Char) {
    if (/[a-z]/.test(char.curr)) {
      // expected native
    }

    if (/[A-Z]/.test(char.curr)) {
      // expected native
    }
  }

  tokenize = {
    tagname: () => { },
  }
}

/* 
  context = {
    'tag': Tag
  }

*/