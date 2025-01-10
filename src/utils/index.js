const colors = {
  // fg
  0: 30,
  1: 90,
  r: 31,
  g: 32,
  y: 33,
  b: 34,
  m: 95,
  c: 36,
  w: 37,
  // bg
  R: 41,
  G: 42,
  Y: 43,
  B: 44,
  M: 45,
  C: 46,
  W: 47
};

function color(n, s) {
  return `\x1b[${n}m${s}\x1b[0m`
}

function extend_string_proto() {
  String.prototype.red = function () { return color(colors.r, this) }
  String.prototype.green = function () { return color(colors.g, this) }
  String.prototype.yellow = function () { return color(colors.y, this) }
  String.prototype.cyan = function () { return color(colors.c, this) }
  String.prototype.magenta = function () { return color(colors.m, this) }
  String.prototype.gray = function () { return color(colors[1], this) }
}

extend_string_proto();

function log(...logs) {
  let output = [];
  for (let message of logs) {

    if (typeof message !== 'string') {
      output.push(message);
      continue;
    }

    let match = message.match(/;[a-zA-Z0-9]+$/gm);

    if (match) {
      match = match[0].trim();
      message = message.replace(match, '');
      for (let index = 1; index < match.length; ++index) {

        message = `\x1b[${colors[match[index]]}m${message}`;
      }
      message += '\x1b[0m';
    };

    output.push(message);
  };
  console.log(...output);
};

function time(...message) {
  const start = new Date().getTime();
  if (message.length) {
    log(...message)
  };
  return (...message) => {
    const result = (new Date().getTime() - start) / 1000 + 's';
    log(...message, result);
  }
}

export {
  log,
  time
}



// "\x1b[41m Output with red background \x1b[0m"