import { TraverseTokens } from "./extend";
import { Token } from "./Tokenizer";

interface Api {
  next(): Token;
}


class Parser {

  constructor(
    public token: Token,
    public nextToken: Partial<Token> & { eq: Token['eq'] },
    /**
     * call next token
     */
    public next: () => Token,
    public extected: () => boolean,
    /**
     * traverse tokens
     */
    public traverse: (startToken: string, endToken: string) => TraverseTokens,
    public skipComment: (skipComment?: boolean) => void
  ) {

  }

  Program() {

  }


}

export default Parser;