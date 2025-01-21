import { Block, Identifier, Node } from "parser/Progam";

class Variable extends Node {
  tag = 'variable'
  kind = 'var' as 'var' | 'const' | 'let';
  id: Node | string = '';
  init?: Node;

  toString(): string {
    const id = typeof this.id === 'string' ? this.id : this.id.toString();
    const init = this.init
      ? '=' + this.init.toString()
      : '';

    return `${this.kind} ${id}${init};`;
  }
}

class Function extends Node {
  tag = 'function';
  id = ''
  async?: boolean;
  arrow?: boolean;
  params: Node[] = [];
  body: Node | null = null;
  returnType = 'void';

  toString() {
    const params = this.params.map(n => n.toString()).join(',');
    if (this.arrow) {
      return `(${params})=>{}`
    } else if (true) {

    }
    return `function ${this.id}(${params}){}`
  }
}

class Expression extends Node {
  tag = 'expression';
  group = false;
  expression: (Node | string)[] = [];
  toString() {
    let expr: string[] = [];
    for (const item of this.expression) {
      if (typeof item === 'string') {
        expr.push(item);
      } else {
        expr.push(item.toString());
      }
    }
    if (this.group) {
      return `(${expr.join('')})`;
    }
    return expr.join('');
  }
}

class ObjectExpression extends Node {
  tag = 'object'
  type: 'expression' | 'pattern' = 'expression';
  properties = new Map<string, Property>();
  toString() {

    const properties: string[] = [];
    for (const [, prop] of this.properties) {
      properties.push(prop.toString())
    }

    return `{${properties.join(',\n')}}`;
  }
}

class Property {
  key = {} as Node;
  alias?: Node;
  value: Node | null = null;
  toString() {
    const key = this.key.toString();
    if (this.value) {
      return `${key}: ${this.value.toString()}`
    }
    return key
  }
}

class ArrayExpression extends Node {
  tag = 'array'
  type: 'expression' | 'pattern' = 'expression';
  items: (Node | undefined)[] = [];
  toString(): string {
    const output: string[] = [];
    for (const item of this.items) {
      if (item) {
        output.push(item.toString())
      } else {
        output.push('undefined');
      }
    }
    return `[${output.join(',')}]`;
  }
}

class Literal extends Node {
  tag = 'literal'
  value = '';
  toString(): string {
    return `"${this.value}"`;
  }
}

class Number extends Node {
  tag = 'number'
  value = '';
  toString(): string {
    return this.value;
  }
}

class TemplateLiteral extends Node {
  tag = 'template-literal'
  expression: Node[] = [];
  toString() {
    let expr: string[] = [];
    for (const item of this.expression) {
      expr.push(item.toString());
    }
    return expr.join('');
  }
}

class Unexpected extends Node {
  tag = 'unexptected';
}

export {
  Block,
  Number,
  Literal,
  Variable,
  Function,
  Property,
  Identifier,
  Expression,
  Unexpected,
  ObjectExpression,
  ArrayExpression,
  TemplateLiteral,
}