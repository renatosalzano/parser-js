import Tokenizer from "./Tokenizer";

type GetToken = ((Tokenizer: Tokenizer) => string | undefined);

export function create_fast_get(type: 'keyword' | 'token' | 'comment_token', max_length: number): GetToken {

  const cases: string[] = [];

  while (max_length > 0) {
    const source_slice = Array.from({ length: max_length }, (_, i) => `source[index+${i}]`).join('+')
    cases.push(`case ${type}.has(${source_slice}):\nreturn ${source_slice}`)
    --max_length;
  }

  // case num:{source}

  const ret = 'return (() => {'
    + `const {source,index,${type}} = parser;\n`
    + 'switch(true){'
    + cases.join('\n') + '\n'
    + 'default:\n'
    + 'return undefined;'
    + '}})()'

  return Function('parser', ret) as GetToken;
}
