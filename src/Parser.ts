import { log } from "utils";
import javascript from "plugin/javascript";
import { Plugin, plugin } from "plugin";
import Program from "Progam";
import { isQuote, toRegExp } from "./utils/parser";

let program: Parser | null = null;

type Config = {

}

class Parser {

  private allow_config = true;
  private plugin: any = {};

  private constructor(config = {}) {
    this.plugin = javascript(config);
  }

  static config = (config: Config) => {
    program ??= new this(config)
    if (!program.allow_config) {
      throw 'should be before extend'
    }
    return program;
  }

  static extend = (plugin: Plugin) => {
    program ??= new this();
    program.allow_config = false;

    log('Extend parser;y');
    // TODO EXTEND PLUG IN

    return program;
  }

  static parse = async (code: string) => {
    program ??= new this() as Parser;
    const parser = new ParserJS(code, program.plugin);
    await parser.Parse()
  }
}


class Context {

  default: string = '';
  context: any = {};
  buffer: any = [];
  current: { name: string, props: any };

  constructor(public Parser: ParserJS) {

    this.buffer.push({
      name: 'Program',
      props: {}
    })

    this.current = this.buffer.at(-1);
  }

  start = (name: string, props: any = {}, instruction: any = {}, start_offset = 0) => {

    log('start context', `${name} at ${this.Parser.index - start_offset - 1};y`, props)
    this.buffer.push({ name, props })
    this.current = this.buffer.at(-1);
    // if (data.eat) {
    //   this.Parser.eat(data.eat);
    // }
  }

  end() {

  }

  load(name: string, config: any) {
    if (config?.default) {
      if (this.default) {
        log(`default context is "${name}", was "${this.default}";y`)
      }
      this.default = name;
    }
    this.context[name] = {
      ...this.context[name],
      ...config
    }
  }

}

type ParserRules = {
  skipWhitespace?: boolean | "multiple",
  hasOperators?: boolean,
}

class ParserJS {

  Program = new Program();
  source = '';
  program_keyword = new Map<string, Function>();
  context: Context;
  api: any = {};
  operators: { [key: string]: string } = {};
  rules: ParserRules = {
    skipWhitespace: 'multiple'
  }

  reference = new Map<string, string>();

  constructor(source: string, plugin: plugin) {
    this.context = new Context(this);
    this.source = source;

    const setRules = (rules?: ParserRules) => {
      if (rules) {
        this.rules = rules;
      } else {
        this.rules = {};
      }
    }

    this.api = {
      char: this.char,
      currentContext: this.context.current,
      eachChar: this.each_char,
      setRules,
      createNode: this.Program.createNode,
      appendNode: this.Program.appendNode,
      startContext: this.context.start,
      endContext: this.context.end,
      next: this.next,
      nextChar: this.next_char,
      eat: this.eat,
      expected: this.expected,
      error: this.error
    }

    this.load_language(plugin);

  }

  load_language({ context, api, operators, parse }: plugin) {

    let context_to_check = new Set<string>();
    const start_context_map: { [key: string]: Function } = {}

    for (const ctx of Object.keys(context)) {

      if (ctx === 'Program') {
        context_to_check = new Set(context.Program);
        continue;
      }

      this.context.load(ctx, context[ctx]);

      const parser = this;
      this.api[`in${ctx}`] = function (sequence: string, updateContext?: boolean) {

        const ret = context[ctx].keyword.hasOwnProperty(sequence);

        if (ret && updateContext) {
          const { props = {}, ...instruction } = context[ctx].keyword[sequence] || {};
          parser.api.startContext(ctx, Object.assign(context[ctx].props || {}, props), instruction, sequence.length);
        }

        return ret;
      }

      start_context_map[ctx] = function (key: string) {
        const { props = {}, ...instruction } = context[ctx].keyword[key] || {};
        parser.api.startContext(ctx, Object.assign(context[ctx].props || {}, props), instruction, key.length);
      }
    }

    let valid_context = ''
    for (const ctx of context_to_check) {

      if (!context.hasOwnProperty(ctx)) {
        log('[warn];y', `Program: [${valid_context}`, `"${ctx}";y`, 'is not defined')
      } else {
        valid_context += `'${ctx}',`;
        for (const kw of Object.keys(context[ctx].keyword)) {
          if (this.program_keyword.has(kw)) {
            log(`duplicate keyword "${kw}" in: ${ctx};r`)
          } else {
            this.program_keyword.set(kw, () => start_context_map[ctx](kw))
          }
        }
      }
    }

    for (const k of Object.keys(api)) {
      let isApi: any = (api as any)[k];

      if (isApi instanceof RegExp) {
        this.api[k] = function (sequence: string) {
          return isApi.test(sequence)
        }
        continue;
      }

      if (isApi instanceof Object) {
        const testMap: { [key: number]: string[] } = {};

        for (const test_key of Object.keys(isApi)) {
          testMap[test_key.length] = isApi
        }

      }



    }

    this.operators = operators;

    this.parse = parse(this.api);

  }


  line = 1
  pos = 1;

  index = 0;
  char = {
    curr: '',
    prev: '',
    next: ''
  }
  sequence = {
    prev: '',
    curr: ''
  }


  history = new History(this);

  parse_string = '';
  should_continue = false;
  blocking_error = false;

  parse: any = {};

  is_identifier = (sequence: string) => {
    return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(sequence);
  }

  expected_test = () => false;

  is_new_line() {
    if (/[\r\n]/.test(this.char.curr)) {
      if (this.char.curr === '\r') {
        // if is windows eat \r\n
        this.index += 2
      } else {
        this.index += 1
      }
      this.pos = 1;
      ++this.line;
      // log('new line;c')
      return true;
    }
    return false;
  }

  is_parsing_string() {
    if (/['|"|`]/.test(this.char.curr)) {
      if (this.parse_string) {
        if (`${this.char.prev}${this.char}` !== `\\${this.parse_string}`) {
          // end parsing string
          this.parse_string = '';
        }
      } else {
        this.parse_string = this.char.curr;
      }
    }
    if (!!this.parse_string) {
      this.sequence.curr += this.char.curr
      ++this.index;
      ++this.pos;
    }
    return !!this.parse_string;
  }

  skip_whitespace = (debug = false) => {
    // dont eat whitespace during parse string
    if (this.parse_string) return false;

    const rule = this.rules?.skipWhitespace;
    let is_whitespace = false

    switch (true) {
      case (rule === 'multiple'): {
        if (/\s/.test(this.char.curr) && this.sequence.curr === "") {
          /*
            motivo:
            Quando la regola è "multiple", vengono esclusi soltanto gli spazi adiacenti.
            Tuttavia, questo crea un effetto collaterale sulla successiva chiamata a next().
            Se non gestito attraverso i parametri, trovandosi come carattere corrente uno spazio
            (escluso di default) e il carattere precedente che non è uno spazio,
            il parser non avanza restando bloccato sullo spazio.
            Nel contesto di un loop, la chiamata next() in combinazione con questa regola può portare
            ad un ciclo potenzialmente infinito.
            Questo non è il comportamento che ci si aspetterebbe
            utilizzando next() in combinazione con questa regola.

            reason:
            When the rule is "multiple", only adjacent spaces are excluded.
            However, this creates a side effect on the next next() call.
            If not handled through the parameters, finding the current character as a space
            (excluded by default) and the previous character not a space,
            the parser does not advance and gets stuck on the space.
            In the context of a loop, the next() call in combination with this rule can lead
            to a potentially infinite loop.
            This is not the behavior you would expect when using next() in combination with this rule.
          */
          is_whitespace = true;
          break;
        }
        const char_prev = this.char.prev === undefined ? " " : this.char.prev;
        is_whitespace = /\s/.test(this.char.curr) && this.char.curr === char_prev;
        break;
      }
      case (rule === true): {
        is_whitespace = /\s/.test(this.char.curr);
        break;
      }
    }

    if (debug) {
      log(`[${this.line},${this.index + 1}];`, 'is whitespace[;m', `${rule}`, '];m', `"${this.char.curr}"`, is_whitespace)
    }

    if (is_whitespace) {

      ++this.index;
      ++this.pos;
      return true;
    }
  }

  parsing_operator = false;
  expression = [];

  has_operators = (debug = true) => {

    const rule = this.rules?.hasOperators;
    if (rule) {
      // if (/\s/.test(this.char.curr)) return false;
      let sequence = this.sequence.curr + this.char.curr;
      const is_operator = this.operators.hasOwnProperty(sequence);

      if (is_operator) {
        // console.log('operator found', this.sequence)
        this.parsing_operator = true;
        this.sequence.curr += this.char.curr;
        ++this.index, ++this.pos;
        return true;
      } else {
        if (this.parsing_operator) {
          this.should_continue = false;
          this.parsing_operator = false;
          if (debug) log('operator:;m', `"${this.sequence.curr}";y`, 'type:;m', this.operators[this.sequence.curr] + ';g')
        }

      }

    }

    return false;
  }

  eat = (sequence: string, breakReg?: RegExp) => {

    if (sequence !== this.next(breakReg)) {
      this.prev();
    }
  }

  expected = (value: string, debug = false) => {

    let expectation = false;

    const values = value
      .split('|')
      .sort((a, b) => a.length - b.length) // [x, xx, xxx]
      .reduce<{ [key: number]: Set<string> }>((ret, curr) => {
        if (!ret[curr.length]) ret[curr.length] = new Set([curr]);
        else ret[curr.length].add(curr);
        return ret;
      }, {})

    this.expected_test = () => {

      this.sequence.curr += this.char.curr;

      ++this.index, ++this.pos;

      if (values[this.sequence.curr.length]) {

        for (const value of values[this.sequence.curr.length]) {

          if (debug) {
            log('expected;m', `"${value}";y`, 'sequence:;m', `"${this.sequence}";y`)
          }

          if (this.sequence.curr === value) {
            expectation = true;

            this.expected_test = () => false;
            return false; // stop test
          }

        }

        delete values[this.sequence.curr.length]
      }

      if (Object.values(values).length === 0) {
        this.expected_test = () => false;
        return false
      }

      return true;
    }

    this.next()

    if (!expectation) {

      if (debug) {
        log('expected failed;m')
      }
      this.history.prev();

    }

    return expectation;
  }

  prev = () => {
    // const len = this.sequence.length + 1;
    // this.index -= len;
    // this.pos -= len;
  }

  next_char = (debug = false) => {

    // clean old sequence
    this.sequence.prev = this.sequence.curr;
    this.sequence.curr = '';

    while (this.index < this.source.length) {

      this.char.curr = this.source[this.index];

      if (this.is_new_line()) {
        continue
      }

      if (this.skip_whitespace(debug)) {
        continue;
      }

      if (isQuote(this.char.curr)) {
        /*
          se il carattere corrente è un apice (',",`) "index" non viene incrementato,
          perché alla successiva esecuzione di next() il parser non sarebbe in grado di parsare
          correttamente la stringa.

          if the current character is a quote (',",`), "index" is not incremented,
          because on the next execution of next() the parser would not be able to parse
          the string correctly.
        */
        if (debug) log('next char is quote:;m', `(${this.char.curr})`)
        return this.char.curr;
      }

      if (debug) log('current char:;m', `${this.source[this.index + 0]}`)

      ++this.index, ++this.pos, this.history.push();
      return this.char.curr;
    }
  }

  next = (
    include: RegExp | true = true,
    exclude: RegExp | true = /[\s(\[{,;:]/,
    debug = false
  ) => {

    this.history.push()

    let should_continue = true;
    this.sequence.prev = this.sequence.curr;
    this.sequence.curr = '';

    if (debug) {
      var debug_include = typeof include === 'boolean' ? 'boolean' : include;
      var debug_exclude = typeof exclude === 'boolean' ? 'boolean' : exclude;
    }

    while (should_continue && this.index < this.source.length) {

      this.char.prev = this.source[this.index - 1];
      this.char.curr = this.source[this.index];
      this.char.next = this.source[this.index + 1];

      if (this.is_parsing_string()) {
        continue;
      }

      if (this.is_new_line()) {
        continue
      }

      if (this.skip_whitespace()) {
        continue;
      }

      if (this.has_operators()) {
        continue;
      }

      if (this.expected_test()) {
        continue;
      }

      let _include = typeof include === 'boolean' ? true : include.test(this.char.curr);
      let _exclude = typeof exclude === 'boolean' ? true : !exclude.test(this.char.curr);

      if (debug) {
        // @ts-ignore
        log(`[${this.line},${this.index + 1}];`, 'test:;m', this.char.curr, 'include:;m', debug_include, _include, 'exclude:;m', debug_exclude, !_exclude)
      }


      if (_include && _exclude) {
        this.sequence.curr += this.char.curr;
      } else {
        if (debug) {
          log('sequence:;m', `"${this.sequence.curr}";y`);
        }
        if (this.sequence.curr) {
          should_continue = false;
          return this.sequence.curr;
        }
      }

      ++this.index, ++this.pos;

    }

  }

  parse_program() {
    log('start parse program;y');

    this.rules = { skipWhitespace: "multiple", hasOperators: true };

    (a = 1);
    var a = undefined;
    console.log('result', a)

    this.next(undefined, undefined, true)
    this.next(undefined, undefined, true)
    this.next(undefined, undefined, true)
    // if (!this.sequence && this.program_keyword.has(this.char.curr)) {
    //   const start_context = this.program_keyword.get(this.char.curr) as Function;
    //   start_context();
    //   this.next_char();
    //   this.parse[this.context.current.name](this.context.current.props);
    //   return;
    // } else if (this.program_keyword.has(this.sequence)) {
    //   const start_context = this.program_keyword.get(this.sequence) as Function;
    //   start_context();
    //   return;
    // }
    log('end parse program;g')

    // let context_found = false;
    // this.next_char();
    // for (const inContext of this.program_context) {
    //   if (this.api[inContext](this.char.curr, true)) {
    //     const curr = this.context.current
    //     this.parse[curr.name](curr.props)
    //     break;
    //   }
    // }

    // this.next(true, /[\s]/, true);
    // for (const inContext of this.program_context) {
    //   if (this.api[inContext](this.sequence, true)) {
    //     const curr = this.context.current
    //     this.parse[curr.name](curr.props)
    //     break;
    //   }
    // }

  }

  error = (message: string) => {
    log('ERROR;R', `${message} at ${this.line}:${this.pos}`);
  }

  each_char = (callback: (char: string) => boolean, debug = false) => {


    if (debug) {
      log('each char start at;m', this.char.curr)
    }

    let should_continue = true;

    while (should_continue && this.index < this.source.length) {

      this.char.prev = this.source[this.index - 1];
      this.char.curr = this.source[this.index];
      this.char.next = this.source[this.index + 1];

      if (this.is_new_line()) {
        continue
      }

      if (this.skip_whitespace()) {
        continue;
      }

      if (callback(this.char.curr)) {
        should_continue = false;
      }

      ++this.index, ++this.pos;
    }


    if (debug) {
      log('each char end at;m', this.char.curr)
      // console.log(this.source.slice(this.index))
    }

  }


  async Parse() {
    this.parse_program()
  }

}


class History {

  history: [number, number, number][] = []

  constructor(public Parser: ParserJS) {

  }

  push = () => {
    const { index, line, pos } = this.Parser;
    this.history.push([index, line, pos])
  }

  prev = () => {
    if (this.history.length !== 1) {
      this.history.pop()
    }
    const [index, line, pos] = this.history.at(-1) as [number, number, number];
    // console.log('history prev', index)
    this.Parser.index = index;
    this.Parser.line = line;
    this.Parser.pos = pos;
    this.Parser.char.prev = this.Parser.source[index - 1]
    this.Parser.char.curr = this.Parser.source[index]
    this.Parser.char.next = this.Parser.source[index + 1]
    // console.log(this.Parser.char)

  }

}

export {
  ParserRules
}

export default Parser;
