import Tokenizer from "./Tokenizer";


export function create_token_finder(Tokenizer: Tokenizer, type: 'keywords' | 'tokens' | 'identifiers', max_length: number) {

  const cases: string[] = [];

  while (max_length > 0) {
    const source_slice = Array.from({ length: max_length }, (_, i) => `source[index+${i}]`).join('+')
    cases.push(`case ${type}.has(${source_slice}):\nreturn ${source_slice}`)
    --max_length;
  }

  const ret = 'return (() => {'
    + `const {source,index,${type}} = parser;\n`
    + 'switch(true){'
    + cases.join('\n') + '\n'
    + 'default:\n'
    + 'return undefined;'
    + '}})()';

  const finder = Function('parser', ret) as (Tokenizer: Tokenizer) => string | undefined;

  return () => finder(Tokenizer);
}

