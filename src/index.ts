import { log } from 'utils';
import Parser from './parser/index';
import { resolve } from 'path';
import { readFileSync } from 'fs';

function plugin(config?: any) {

  return (prev: any) => {
    console.log(prev)
    return {
      name: 'test',
      parser: () => ({
        parse_expression() {
          console.log('override')
        }
      })
    }
  }

}


async function main() {


  log('Parser start;g')

  try {

    const code = readFileSync(resolve(process.cwd(), './src/test/test.js'), 'utf-8');

    Parser.parse(code)

  } catch (error) {
    console.log(error)
  }

}

main();
