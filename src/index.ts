import { log } from 'utils';
import Parser from './parser/index';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { TokenContext } from 'parser/Context';

function plugin(config?: any) {

  return (prev: any) => {
    console.log(prev)
    return {
      name: 'test',
      token: {
        context: [
          class TagStart extends TokenContext {
            start = ['<'];
            end = ['>', '/>']

            onStart() {

            }

          }
        ]
      }
    }
  }

}


async function main() {

  log('TEST JS;r')

  try {




  } catch (error) {
    console.error(error)
  }


  log('Parser start;g')

  try {

    const code = readFileSync(resolve(process.cwd(), './src/test/test.js'), 'utf-8');

    Parser.parse(code)

  } catch (error) {
    console.log('error go here')
    console.log(error)
  }

}

main();
