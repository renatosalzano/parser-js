import { context } from "esbuild";
import { aliasPath } from "esbuild-plugin-alias-path"
import { log } from "./src/utils/index.js";
import { resolve } from "path";

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');
const bundle = process.argv.includes('--bundle')
console.log(watch)

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',

  setup(build) {
    build.onStart(() => {
      console.log('[watch] build started');
    });
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        console.error(`    ${location.file}:${location.line}:${location.column}:`);
      });
      console.log('[watch] build finished');
    });
  },
};


async function main() {

  const ctx = await context({
    entryPoints: [
      'src/index.ts'
    ],
    bundle: true,
    format: 'esm',
    // minify: production,
    // sourcemap: !production,
    // sourcesContent: false,
    platform: 'node',
    target: 'es6',
    packages: 'external',
    outfile: 'dist/index.js',
    // external: ['vscode'],
    logLevel: 'silent',
    tsconfig: 'tsconfig.json',
    plugins: [
      aliasPath({
        alias: {
          'utils': './src/utils'
        }
      })
    ]
  });

  if (watch) {
    await ctx.watch();

    // const { host, port } = await ctx.serve({
    //   port: 5500,
    //   servedir: 'www',
    //   fallback: "www/index.html"
    // });

  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch(e => {
  log('ERROR ;r')
  console.error(e);
  process.exit(1);
});
