import { log } from "utils";
import Tokenizer from "./Tokenizer";
import Program from "./Progam";
import { create_token_finder } from "./utils";
import Parser from "./Parser";
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

// export type Api<T> =
//   & Tokenizer['api']
//   & {
//     appendNode: Program['append_node'];
//     createNode: Program['create_node'];
//     isFnBody: Program['is_fn_body'];

//   }

let plugin_name: string;
export function extend(this: Tokenizer, name: string, tokens: any, parser: Ctor<Parser>) {
  plugin_name = name;

  const { context = [], keyword = [], operator = [], bracket = [], separator = [], specialToken = [], comment = [] } = tokens;
  extend_tokens.call(this, 'bracket', bracket);
  extend_tokens.call(this, 'keyword', keyword);
  extend_tokens.call(this, 'operator', operator);
  extend_tokens.call(this, 'separator', separator);
  extend_tokens.call(this, 'special', specialToken);
  extend_tokens.call(this, 'comment', comment);

  this.Context.extend(context);

  log('extend parser;y');

  console.log(parser)

  extend_parser.call(this, parser);

  // const keys_to_check = extend_parser.call(this, program);

}

function extend_tokens(this: Tokenizer, type: string, tokens: string[] | string[][]) {

  if (type === 'comment') {

    for (const [start, end] of tokens as string[][]) {

      if (end) {

        if (this.tokens.has(end)) {
          log(`Duplicate token "${end}" found in ${this.tokens.get(end)};y`);
        } else {
          this.tokens.set(end, 'comment');
        }
      }

      if (this.tokens.has(start)) {
        log(`Duplicate token "${start}" found in ${this.tokens.get(start)};y`);
      } else {
        this.tokens.set(start, 'comment');
      }

      this.comment_token.set(start, {
        multiline: end !== undefined,
        end_token: end || '\n'
      });

    };

    return;
  }

  for (const token of tokens as string[]) {

    if (this.tokens.has(token)) {
      log(`warn: duplicate "${token}" found in ${type};y`);
    } else {

      if (this.is.alpha(token) || type === 'keyword') {

        this.keywords.set(token, type);

        if (token.length > this.max_len.keyword) {
          this.max_len.keyword = token.length;

          this.get_keyword = create_token_finder(this, 'keywords', token.length);
        }

      } else {
        this.tokens.set(token, type);

        if (token.length > this.max_len.token) {
          this.max_len.token = token.length;

          this.get_token = create_token_finder(this, 'tokens', token.length);
        }
      }
    }
  }

}

function extend_parser(this: Tokenizer, Parser: Ctor<Parser>) {
  this.Parser = new Parser(
    this.api.token,
    this.api.next
  );
}

// function extend_parser(this: Tokenizer, program: { [key: string]: { [key: string]: any } }) {

//   const keys_to_check = new Set<string>();

//   for (const name of Object.keys(program)) {

//     if (!program[name]?.keyword && !program[name]?.token) {
//       log(`invalid Parser ${name};r`);
//       continue;
//     }

//     const key = program[name].hasOwnProperty('keyword') ? 'keyword' : 'token';

//     program[name].token = new Map(Object.entries(program[name][key]));

//     delete program[name].keyword;

//     const Parser = program[name] as ParserObject;

//     Parser.name = name;
//     Parser.props = Parser.props || {};

//     if (key === 'keyword') {

//       const Parser_keyword: string[] = []

//       for (const [token] of Parser.token) {

//         if (this.is.alpha(token)) {
//           if (!this.keywords.has(token)) {
//             // Parser.keyword.set(lexical, name);
//             Parser_keyword.push(token)
//           } else {
//             Parser.token.delete(token);
//             log(`duplicate keyword "${token}", found in Parser: ${name};r`);
//           }
//         } else {
//           Parser.token.delete(token);
//           log(`invalid "${token}", should be [a-z] found in Parser: ${name};r`);
//         }
//       }

//       extend_tokens.call(this, 'keyword', Parser_keyword);
//     }


//     Parser.has = (token: string, parse?: boolean) => {
//       const check = Parser.token.has(token);
//       if (check && parse) {
//         let props = Parser.token.get(token) || {};
//         this.parser[name]({ ...Parser.props, ...props });
//       }
//       return check;
//     }

//     Parser.start = (props = {}) => {
//       props = { ...Parser.props, ...props };
//       return this.parser[name](props);
//     }

//     for (const [token] of Parser.token) {
//       this.program.set(token, () => Parser.has(token, true))
//     }

//     if (Parser?.default) {
//       if (this.program.has('default')) {
//         log(`default Parser is setted to "${Parser.name}";y`)
//       }
//       this.program.set('default', Parser.start);
//     }

//     Object.freeze(Parser);

//     this.api.$[name] = Parser;

//     keys_to_check.add(name);

//   } // end for

//   return keys_to_check;
// }

