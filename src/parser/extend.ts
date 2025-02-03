import { log } from "utils";
import Tokenizer from "./Tokenizer";
import { create_token_finder } from "./utils";
import Parser from "./Parser";
import type { Token, TokenProperties, TokenType } from "./Tokenizer";
import { TokenContext } from "./Context";
// import type { ParserMethod } from "./Tokenizer";

interface Ctor<T> {
  new(...args: any): T
}

export type ParserObject = {
  name: string;
  props: { [key: string]: any };
  token: Map<string, any>;
  default?: boolean;
  has: (token: string, parse?: boolean) => boolean;
  start: (props?: any) => any;
}


export function TokenProp(token: string | string[], properties: TokenProperties) {

  return {
    tokens: Array.isArray(token) ? token : [token],
    properties: properties
  }
}


let plugin_name: string;
export function extend(this: Tokenizer, name: string, tokens: any, parser: Ctor<Parser>) {

  plugin_name = name;

  const {
    context = [],
    statement = [],
    keyword = [],
    operator = [],
    bracket = [],
    separator = [],
    specialToken = [],
    comment = [],
    builtIn = []
  } = tokens;

  try {

    extend_tokens.call(this, 'bracket', bracket);
    extend_tokens.call(this, 'keyword', keyword);
    extend_tokens.call(this, 'operator', operator);
    extend_tokens.call(this, 'separator', separator);
    extend_tokens.call(this, 'statement', statement);
    extend_tokens.call(this, 'special', specialToken);
    extend_tokens.call(this, 'comment', comment);
    extend_tokens.call(this, 'built-in', builtIn);

    this.Context.extend(context);

    log('extend parser;y');

    extend_parser.call(this, parser);

  } catch (err) {
    console.log(err)
  }

  // const keys_to_check = extend_parser.call(this, program);

}


function extend_tokens(this: Tokenizer, type: TokenType | 'built-in', tokens: string[] | string[][], prop?: TokenProperties) {

  const that = this;

  function check(token: string | ReturnType<typeof TokenProp>) {
    if (typeof token == 'string') {
      return;
    } else {
      const { tokens, properties } = token;

      if (properties.ternary) {
        console.log('skip ternary')
        extend_ternary.call(that, tokens)
        return true;
      }

      extend_tokens.call(that, type, tokens, properties);
      return true;
    }
  }

  const warn = (token: string) => log(`override "${token}" in;y`, `${plugin_name};g`, `> ${type};y`)

  if (type === 'comment') {

    for (const [start, end] of tokens as string[][]) {

      if (end) {
        if (this.tokens.has(end)) warn(end);
      }

      if (this.tokens.has(start)) warn(start);

      this.comment_token.set(start, {
        multiline: end !== undefined,
        end_token: end || '\n'
      });

    };

    return;
  }

  if (type == 'bracket') {
    for (const brackets of tokens as string[][]) {
      const bracket_type = ['bracket-open', 'bracket-close'] as `bracket-${'open' | 'close'}`[];

      for (const token of brackets) {

        if (check(token)) {
          continue;
        }

        if (prop) {
          this.tokens_prop.set(token, prop)
        }

        if (this.tokens.has(token)) {
          warn(token)
        }

        this.brackets.set(token, bracket_type[0]);
        bracket_type.shift();

        if (token.length > this.max_len.token) {
          this.max_len.token = token.length;

          this.get_token = create_token_finder(this, 'tokens', token.length);
        }

      }
    };

    return;
  }

  for (const token of tokens as string[]) {

    switch (true) {
      case (type == 'built-in'): {

        if (check(token)) {
          continue;
        }

        if (prop) {
          this.tokens_prop.set(token, prop);
        }

        if (this.identifiers.has(token)) {
          warn(token);
        }

        this.identifiers.add(token);

        if (token.length > this.max_len.identifier) {
          this.max_len.identifier = token.length;

          this.get_identifier = create_token_finder(this, 'identifiers', token.length);
        }

        break;
      }
      case (type == 'keyword' || this.is.alpha(token)): {

        if (check(token)) {
          continue;
        }

        if (prop) {
          this.tokens_prop.set(token, prop);
        }

        if (this.keywords.has(token)) {
          warn(token);
        }

        this.keywords.set(token, type);

        if (token.length > this.max_len.keyword) {
          this.max_len.keyword = token.length;

          this.get_keyword = create_token_finder(this, 'keywords', token.length);
        }

        break;
      }
      default: {

        if (check(token)) {
          continue;
        }

        if (prop) {
          this.tokens_prop.set(token, prop);
        }

        if (this.tokens.has(token)) {
          warn(token);
        }

        this.tokens.set(token, type);

        if (token.length > this.max_len.token) {
          this.max_len.token = token.length;

          this.get_token = create_token_finder(this, 'tokens', token.length);
        }

      }

    } // end

  }

}


function extend_ternary(this: Tokenizer, tokens: string[]) {

  if (tokens.length > 2) {
    this.error({ title: 'Invalid ternary', message: 'porco dio e la madonna' });
  }

  const [t, f] = tokens;

  extend_tokens.call(this, 'operator', [t]);

  class Ternary extends TokenContext {
    name = 'ternary';
    start = [t];
    end = [f];

    onStart() {
      this.token.subtype = 'daniel-ternary-start'
    }

    onBefore(cancel: () => void) {
      if (this.currContext() == 'ternary' && this.token.value == ':') {
        console.log('false')
      }
    }

    onEnd() {
      this.token.type = 'operator';
      this.token.subtype = 'daniel-ternary-before-new-ternary'
      console.log('porco dio')
    }
  }

  this.Context.extend([Ternary]);
}


// PARSER API

function next(this: Tokenizer) {

  if (this.token_index > this.History.tokens.length - 1) {
    this.tokens_end = true;
    this.History.last_token();
    return;
  }

  this.History.get_token(this.token_index);
  ++this.token_index;

  if (this.skip_comment && this.token.type == 'comment') {
    next.call(this);
  }

}


function traverse_tokens(this: Tokenizer, startToken: string, endToken: string) {

  if (startToken == endToken) {
    this.error({ title: 'Error', message: 'start and end tokens must be different' });
  };

  this.temp = { buffer: [] };

  const that = this;
  const start_index = this.token_index;

  const next_token = () => next.call(this);
  let then_pipe = false;

  function then(callback: () => any) {
    if (then_pipe) {
      recursive_next.call(that, startToken, endToken, next_token);
      next_token();
    }
    callback();
    that.History.get_token(start_index);
    return ({
      eat: () => {
      }
    })
  }

  function eat(this: Tokenizer) {
    return ({ then })
  };

  return ({
    eat: () => {
      recursive_next.call(that, startToken, endToken, next_token);
      return ({ then });
    },
    each: (callback: (token: Token) => void) => {
      recursive_next.call(that, startToken, endToken, next_token, callback);
      return ({
        eat,
        then
      })
    },
    then: (callback: () => any) => {
      then_pipe = true;
      return then(callback);
    },
    catch() { }
  })
}


function recursive_next(this: Tokenizer, ts: string, te: string, next: () => void, each?: (token: Token) => void) {

  while (!this.tokens_end) {

    next();

    if (each) {
      each(this.token);
    }

    if (this.token.value == ts) {
      this.temp.buffer.push(0);
      continue;
    }

    if (this.token.value == te) {
      this.temp.buffer.shift();
      if (this.temp.buffer.length == 0) {
        this.temp = undefined;
        return;
      }
    }

  }

}


function eat(this: Tokenizer, t: string, m = false) {
  if (this.token.value == t) {
    next.call(this);
  } else {
    return;
  }
  while (this.token.value == t) {
    next.call(this);
    if (!m) { return }
  }
}


function extend_parser(this: Tokenizer, Parser: Ctor<Parser>) {

  this.Parser = new Parser(
    this.token,
    this.next_token,
    () => next.call(this),
    () => true,
    (s: string, e: string) => traverse_tokens.call(this, s, e),
    (skip_comment = true) => this.skip_comment = skip_comment,
    (token: string, multiple = false) => eat.call(this, token, multiple),
    this.error,
    // Program
    this.Program.create_node,
    this.Program.append_node
  );
}


export type TraverseTokens = ReturnType<typeof traverse_tokens>;