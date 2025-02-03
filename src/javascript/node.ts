import { Block, Identifier, Node } from "parser/Progam";

class Variable extends Node {
  tag = 'variable'
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
  tag = 'function';
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
  tag = 'expression';
  group = false;
  expression: (Node | string)[] = [];
  id: Identifier[] = []

  add(node: Node | string) {

    if (node instanceof Node && node.id) {
      switch (node.id.constructor) {
        case Array:
          this.id = this.id.concat(node.id as Array<Identifier>);
          break;
        case Identifier:
          this.id.push(node.id as Identifier);
          break;
      }
    }

    if (node instanceof Identifier) {
      this.id.push(node);
    }

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
  id: Node[] = [];
  items: (Node | undefined)[] = [];
  add(node?: Node) {
    if (node instanceof Identifier) {
      this.id.push(node);
    }
    if (node?.id) {
      console.log(node)
    }
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
  constructor({ value, type }: { value: string, type: 'keyword' | 'string' | 'number' }) {
    super({});
    switch (type) {
      case 'keyword':
        switch (value) {
          case 'true':
          case 'false':
            this.tag = 'boolean';
            this.value = value === 'true' ? true : false;
            break;
          case 'null':
            this.tag = 'null';
            this.value = null;
            break;
        }
        break;
      case 'string':
        this.tag = 'string';
        this.value = value;
        break;
      case 'number':
        this.tag = 'number';
        this.value = Number(value);
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
  tag = 'template-literal'
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