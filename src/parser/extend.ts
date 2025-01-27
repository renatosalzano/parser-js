import { log } from "utils";
import Tokenizer from "./Tokenizer";
import Program from "./Progam";
import Context from "./Context";
import { create_fast_get } from "./utils";
// import type { ParserMethod } from "./Tokenizer";

export type ParserObject = {
  name: string;
  props: { [key: string]: any };
  token: Map<string, any>;
  default?: boolean;
  has: (token: string, parse?: boolean) => boolean;
  start: (props?: any) => any;
}

export type Api<T> =
  & Tokenizer['api']
  & {
    appendNode: Program['append_node'];
    createNode: Program['create_node'];
    isFnBody: Program['is_fn_body'];

    createContext: Context['create_context'];
    endContext: Context['end_context'];
  }

let plugin_name: string;
export function extend(this: Tokenizer, name: string, program: any, tokens: any, parser: any) {
  plugin_name = name;

  const { keyword = [], operator = [], bracket = [], separator = [], specialToken = [], comment = [], context = [] } = tokens;
  extend_tokens.call(this, 'bracket', bracket);
  extend_tokens.call(this, 'keyword', keyword);
  extend_tokens.call(this, 'operator', operator);
  extend_tokens.call(this, 'separator', separator);
  extend_tokens.call(this, 'special', specialToken);
  extend_tokens.call(this, 'comment', comment);

  this.Context.extend(context);

  const keys_to_check = extend_parser.call(this, program);

  parser = parser(this.api);

  for (const key in parser) {
    if (keys_to_check.has(key)) {
      keys_to_check.delete(key);
    }
    if (this.parser[key]) {
      log(`plugin '${name}' override method '${key}';y`)
    }
    this.parser[key] = parser[key];
  }

  if (keys_to_check.size) {
    for (const invalid_key of keys_to_check) {
      log(' Plugin Error ;R', `\n name: ${name}`, `\n '${invalid_key}' was defined in program, but not found in parser;r`);
    }
  }
}

function extend_tokens(this: Tokenizer, type: string, tokens: string[] | string[][]) {

  if (type === 'comment') {

    for (const [start, end] of tokens as string[][]) {

      if (end) {

        if (this.token.has(end)) {
          log(`Duplicate token "${end}" found in ${this.token.get(end)};y`);
        } else {
          this.token.set(end, 'comment');
        }
      }

      if (this.token.has(start)) {
        log(`Duplicate token "${start}" found in ${this.token.get(start)};y`);
      } else {
        this.token.set(start, 'comment');
      }

      this.comment_token.set(start, {
        multiline: end !== undefined,
        end_token: end || '\n'
      });

    };

    return;
  }

  for (const token of tokens as string[]) {

    if (this.token.has(token)) {
      log(`warn: duplicate "${token}" found in ${type};y`);
    } else {

      if (this.is.alpha(token) || type === 'keyword') {

        this.keyword.set(token, type);

        if (token.length > this.max_len.keyword) {
          this.max_len.keyword = token.length;
          this.get_keyword = create_fast_get('keyword', token.length);
        }

      } else {
        this.token.set(token, type);

        if (token.length > this.max_len.token) {
          this.max_len.token = token.length;
          this.get_token = create_fast_get('token', token.length);
        }
      }
    }
  }

}

function extend_parser(this: Tokenizer, program: { [key: string]: { [key: string]: any } }) {

  const keys_to_check = new Set<string>();

  for (const name of Object.keys(program)) {

    if (!program[name]?.keyword && !program[name]?.token) {
      log(`invalid Parser ${name};r`);
      continue;
    }

    const key = program[name].hasOwnProperty('keyword') ? 'keyword' : 'token';

    program[name].token = new Map(Object.entries(program[name][key]));

    delete program[name].keyword;

    const Parser = program[name] as ParserObject;

    Parser.name = name;
    Parser.props = Parser.props || {};

    if (key === 'keyword') {

      const Parser_keyword: string[] = []

      for (const [token] of Parser.token) {

        if (this.is.alpha(token)) {
          if (!this.keyword.has(token)) {
            // Parser.keyword.set(lexical, name);
            Parser_keyword.push(token)
          } else {
            Parser.token.delete(token);
            log(`duplicate keyword "${token}", found in Parser: ${name};r`);
          }
        } else {
          Parser.token.delete(token);
          log(`invalid "${token}", should be [a-z] found in Parser: ${name};r`);
        }
      }

      extend_tokens.call(this, 'keyword', Parser_keyword);
    }


    Parser.has = (token: string, parse?: boolean) => {
      const check = Parser.token.has(token);
      if (check && parse) {
        let props = Parser.token.get(token) || {};
        this.parser[name]({ ...Parser.props, ...props });
      }
      return check;
    }

    Parser.start = (props = {}) => {
      props = { ...Parser.props, ...props };
      return this.parser[name](props);
    }

    for (const [token] of Parser.token) {
      this.program.set(token, () => Parser.has(token, true))
    }

    if (Parser?.default) {
      if (this.program.has('default')) {
        log(`default Parser is setted to "${Parser.name}";y`)
      }
      this.program.set('default', Parser.start);
    }

    Object.freeze(Parser);

    this.api.$[name] = Parser;

    keys_to_check.add(name);

  } // end for

  return keys_to_check;
}

