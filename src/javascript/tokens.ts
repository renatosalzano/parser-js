
const operator = [
  '+', '-', '*', '/', '%', '.', '>', '<', '!', '=', '&', '|', '^', '~', '?', '??', '??=', '++', '--', '==', '!=', '>=', '<=', '&&', '&&=', '||', '||=', '+=', '-=', '*=', '/=', '%=', '<<', '>>', '===', '!==', '>>>', '>>>=', 'new', 'typeof', 'instanceof'
];

const bracket = ['(', ')', '[', ']', '{', '}'];

const separator = [',', ':', ';', '\n'];

const keyword = ['true', 'false', 'null', 'this', 'super'];

const specialToken = ['=>', '...', '?.', '`', '${'];

const comment = [
  ['//'],
  ['/*', '*/']
]

export const tokens = {
  bracket,
  comment,
  keyword,
  operator,
  separator,
  specialToken
}