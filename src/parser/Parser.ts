import { TokenType } from "acorn";
import { TraverseTokens } from "./extend";
import Program from "./Progam";
import Tokenizer, { Token } from "./Tokenizer";

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
    public skipComment: (skipComment?: boolean) => void,
    public eat: (token: string, multiple?: boolean) => void,
    public error: Tokenizer['error'],
    public createNode: Program['create_node'],
    public appendNode: Program['append_node']
  ) {

  }

  Program() {

  }


}

export default Parser;