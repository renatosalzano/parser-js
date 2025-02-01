import { Token } from "./Tokenizer";

interface Api {
  next(): Token;
}


class Parser {

  constructor(
    public token: Token,
    public nextToken: Partial<Token> & { eq: Token['eq'] },
    public next: () => Token,
    public extected: () => boolean,
    public traverse: () => any
  ) {

  }

  Program() {

  }

  parse() {
    try {

    } catch (error) {
      console.error(error);
    }
  }


}

export default Parser;