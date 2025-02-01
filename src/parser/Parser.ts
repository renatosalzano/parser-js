import { TraverseTokens } from "./extend";
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
    public traverse: (startToken: string, endToken: string) => TraverseTokens
  ) {

  }

  Program() {

  }


}

export default Parser;