import { Parse } from './parser';

export const parse_body: Parse = ({
  char,
  sequence,
  isKeyword,
  isDeclarator,
  avoid_multiple_whitespace
}) => {

  if (avoid_multiple_whitespace()) {
    return;
  }

  if (/[\s(]/.test(char.curr)) {
    switch (true) {
      case isKeyword(sequence, true):
        break;
      case isDeclarator(sequence, true):
        break;
    }

  }

  // if (/\s/.test(this.char))
}

export const parse_pattern: Parse = ({
  char,
  context_data
}) => {

}

export const parse_object: Parse<{ destructure?: boolean }> = ({
  char,
  context_data,
}) => {

  // if (!this.state.object_node) {
  //   this.state.object_node = this.start_node('Object');
  // }

  // if (this.avoid_multiple_whitespace()) {
  //   return;
  // }

  // if (/[\s,]/.test(this.char)) {
  //   console.log(this.sequence)
  //   // switch (true) {
  //   //   case /[:]/.test(this.sequence)
  //   // }
  //   // if (/[:]/.test(this.sequence)) {
  //   //   const [name, value] = this.sequence.split(':')

  //   // }
  // } else {
  //   this.sequence += this.char;
  // }
}

export const parse_params: Parse = ({
  char,
  update_context
}) => {
  // console.log()

  if (/[\s{[]/.test(char.curr)) {
    switch (char.curr) {
      case '{': {
        update_context('object', { destructure: true })
        break;
      }
    }
  }

}

export const parse_function: Parse<{ async?: boolean }> = ({
  char,
  sequence,
  context_data,
  start_node,
  end_node,
  update_context,
  avoid_multiple_whitespace
}) => {

  if (avoid_multiple_whitespace()) {
    return;
  }

  // context_data.set("fn_node", start_node)

  // const fn_node = context_data.set(({ async }) => start_node('Function', { async }))
  const obj = context_data.set({ foo: 'bar' })


  if (/[(]/.test(char.curr)) {
    update_context('params');
    return
  }

  if (/\s/.test(char.curr)) {
    switch (sequence) {
      case "function":
        break;
      default: {
        // fn_node.name = sequence;
      }
    }
  }


  // console.log('parse function')
}

export const parse_string: Parse = () => {

}

export const parse_expression: Parse = () => {

}