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

  log('TEST JS;r')

  try {

    let a = 1

    'string';

    a++

    console.log(1 - +'0');



  } catch (error) {
    console.error(error)
  }


  log('Parser start;g')

  try {

    const code = readFileSync(resolve(process.cwd(), './src/test/test.js'), 'utf-8');

    Parser.tokenize(code).parse();

  } catch (error) {
    console.log('error go here')
    console.log(error)
  }

}

main();
