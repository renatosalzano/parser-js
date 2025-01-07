const colors = {
  // fg
  0: 30,
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

function log(...logs) {
  let output = [];
  for (let message of logs) {

    if (typeof message !== 'string') {
      output.push(message);
      continue;
    }

    let match = message.match(/([;].){1}$/gm);

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