import History from "./History";
import { Token } from "./Tokenizer";

interface Api {
  next(): Token;
}

// @ts-ignore
class Parser {

  constructor(
    public token: Token | null,
    public next: () => Token,
  ) {

  }

  expect() { }

  eat() { }

  traverse() { }

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