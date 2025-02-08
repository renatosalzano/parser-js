import { Block, Identifier, Node } from "parser/Progam";

class Variable extends Node {
  type = 'variable'
  kind?: 'var' | 'const' | 'let';
  id = {} as Node;
  init?: Node;

  toString(): string {
    const id = typeof this.id === 'string' ? this.id : this.id.toString();
    const init = this.init
      ? '=' + this.init.toString()
      : '';

    return `${this.kind} ${id}${init}`;
  }
}

class Function extends Node {
  type = 'function';
  id?: Identifier;
  expression?: boolean;
  async?: boolean;
  arrow?: boolean;
  params: Node[] = [];
  body = {} as Node;
  returnType = 'void';

  toString() {
    const params = this.params.map(n => n.toString()).join(',');
    if (this.arrow) {
      return `(${params})=>${this.body.toString()}`
    }
    return `function ${this.id}(${params}){}`
  }
}


class Expression extends Node {
  type = 'expression';
  group = false;
  expression: (Node | string)[] = [];

  add(node: Node | string) {
    this.expression.push(node);
  }

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
  type = 'object'
  kind: 'expression' | 'pattern' = 'expression';
  properties = new Map<string, Property>();

  set = (key: string, property: Property) => {
    this.properties.set(key, property);
  }

  toString() {

    const properties: string[] = [];
    for (const [, prop] of this.properties) {
      properties.push(prop.toString())
    }

    return `{${properties.join(',\n')}}`;
  }

  toJSON() {
    const output: any = { properties: [] }
    output.type = this.type;
    output.kind = this.kind;
    this.properties.forEach((value, key) => output.properties.push(value.toJSON()));
    return output;

  }
}

class Property extends Node {
  type = 'property';
  key?: string;
  alias?: string;
  value?: Node;

  toString() {
    const key = this.key;
    if (this.value) {
      return `${key}: ${this.value.toString()}`
    }
    return key || '';
  }
}

class ArrayExpression extends Node {
  type = 'array'
  kind: 'expression' | 'pattern' = 'expression';
  items: (Node | undefined)[] = [];
  add(node?: Node) {
    this.items.push(node);
  }
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

class Primitive extends Node {
  type?: string;
  value?: boolean | string | number | null;

  constructor({ value, type, subtype }: { value: string, type: 'keyword' | 'literal', subtype: string }) {
    super({});
    switch (type) {
      case 'keyword':
        switch (value) {
          case 'true':
          case 'false':
            this.type = 'boolean';
            this.value = value === 'true' ? true : false;
            break;
          case 'null':
            this.type = 'null';
            this.value = null;
            break;
        }
        break;
      case 'literal':
        switch (subtype) {
          case 'string': {
            this.type = 'string';
            this.value = value;
            break;
          }
          case 'number': {
            this.type = 'number';
            this.value = Number(value);
            break;
          }
        }
        break;
    }
  }
  toString(): string {
    switch (this.type) {
      case 'string':
        return `"${this.value}"`;
      default:
        return `${this.value}`;
    }
  }

}

class TemplateLiteral extends Node {
  type = 'template-literal'
  expression: Node[] = [];
  toString() {
    let expr: string[] = [];
    for (const item of this.expression) {

      if (item instanceof Identifier) {
        expr.push(`\${${item.toString()}}`)
      } else {
        expr.push(item.toString());
      }
    }
    return `\`${expr.join('')}\``;
  }
}

class Empty extends Node {
  toString() {
    return '';
  }
}

class Unexpected extends Node {
  tag = 'unexptected';
}

export {
  Empty,
  Block,
  Variable,
  Function,
  Property,
  Primitive,
  Identifier,
  Expression,
  Unexpected,
  ObjectExpression,
  ArrayExpression,
  TemplateLiteral,
}