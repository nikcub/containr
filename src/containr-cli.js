#!/usr/bin/env node

/**
 * Containr
 *
 * (c) 2016 Nik Cubrilovic MIT License (see LICENSE)
 *
 * containr entry point for cli
 */

import program from 'commander';
import 'source-map-support/register';
import pkg from '../package.json';
import l, { logLevels } from './logger';
import commands from './commands';

program
  .version(pkg.version);

program
  .command('build [file]', null, { isDefault: true })
  .description('run a build')
  .option('-p, --production', 'Production build')
  .option('-d, --development', 'Development build')
  .option('-v --verbose', 'Verbose output')
  .action(commands.build);

program
  .command('tag [tag]')
  .option('-v --verbose', 'Verbose output')
  .action(commands.tag);

program
  .command('push [tag]')
  .option('-v --verbose', 'Verbose output')
  .action(commands.push);

program
  .command('release')
  .option('-v --verbose', 'Verbose output')
  .action(commands.release);

program
  .command('test [command]')
  .option('-v --verbose', 'Verbose output')
  .action(commands.test);

program
  .command('shell')
  .action(commands.shell);


commands.printBanner();
program.parse(process.argv);

process.on('SIGINT', () => {
  process.exit();
});
