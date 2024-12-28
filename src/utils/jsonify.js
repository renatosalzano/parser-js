export function jsonify(input) {
  let output = '';

  switch (input.constructor) {
    case Array:
      output += '[';
      for (const item of input) {
        output += jsonify(item) + ',';
      };
      output = output.replace(/,$/g, '');
      output += ']';
      break;
    case Object:
      output += '{\n';
      for (const key in input) {
        output += `${key}:${jsonify(input[key])},\n`;
      };
      output = output.replace(/,\n$/g, '');
      output += '\n}';
      break;
    case Function:
      input = input
        .toString()
        .replace(/\n/g, '')
        .replace(/anonymous/g, '');
      output += input;
      break;
    default:
      output += `${input}`;
  };
  return output;
}