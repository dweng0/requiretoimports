#!/usr/bin/env node

var program = require('commander');

program
  .command('tr <source> <destination>')
  .option('-r, --recursive', 'transpile recursively')
  .action(function (dir, cmd) {
    console.log('remove ' + dir + (cmd.recursive ? ' recursively' : ''))
  })

program.parse(process.argv)