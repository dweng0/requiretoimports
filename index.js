#!/usr/bin/env node

const { Generator, LexicalAnalyzer } = require('javascript-compiling-tokenizer');
const program = require('commander');
const shell = require('shelljs');
const path = require('path');
const fs = require('fs');
//transformDefineTokens  {tokens: lexicalResult.tokens, path: item.short, fixPathStrings: cmd.path}
const transformDefineTokens = (tokens, fileName, fixPathStrings) => {
	const variableName = fileName.split('.')[0].replace("/","_");

	const log = message => {
		console.log(message);
	};

	let enterDefines = false;
	let definedPaths = false;
	let definedVariables = false;
	let importTokens = [];
	let importPaths = [];
	let importVariables = [];

	const buildNewDefinitionTokens = () => {
		importPaths.forEach((path, index) => {
			importTokens.push({type: "name", value: "import"});
			importTokens.push({type: "space", value: " "});
			importTokens.push({type: "name", value: importVariables[index]})
			importTokens.push({type: "space", value: " "});
			importTokens.push({type: "name", value: "from"});
			importTokens.push({type: "space", value: " "});
			importTokens.push({type: "string", value: path});
			importTokens.push({type: "statementseperator", value: ';'});
			importTokens.push({type: "eol", value: "\r"});
			importTokens.push({type: "carriagereturn", value: "\n"});
		});

	}

	tokens.forEach(token => {

		//pull the define paths from the first argument of the define function
		if (enterDefines && !definedPaths && token.type === 'params') {
			log('pulling paths from define function params');
			importPaths = token.value[0].value.reduce((p, c) => {
				if (c.type === "string") {
					p.push(c.value);
				}
				return p;
			}, []);

            if (fixPathStrings) {
                log('fix argument provided. ...Fixing string paths')
                importPaths = importPaths.map(path => {
                    //split on the first char, which will be either ' or "
                    const pathArray = path.split(path[0]);
                    return path.reduce((p, c, i) => {
                    if (c !== path[0]) {
                        if (i === 1) {
                            p + "./";
                        }
                        return p + c;
                    }
                    return p}, '');
                });
            }
			definedPaths =  true;
		}

		//pull the variables from the argument of the function of the second argument of the define function
		if(enterDefines && definedPaths && !definedVariables && token.type === 'params') {

			const functionTokens = token.value.find(({type}) => { return type === 'params'});
			log('pulling variables');
			importVariables = functionTokens.value.reduce((p, c) => {
				if (c.type === "name") {
					p.push(c.value);
				}
				return p;
			}, []);

			const codeBlockTokens = token.value.find(({type}) => { return type === 'codeblock'});

			log('adding new import tokens.');
			buildNewDefinitionTokens();

			log(`adding es6 wrapper, setting variable name to ${variableName}`);

			importTokens.push({
				type: "const",
				value: [
				  { type: "space", value: " " },
				  { type: "name", value: variableName},
				  { type: "space", value: " " },
				  { type: "assigner", value: "=" },
				  { type: "space", value: " " },
				  { type: "params", value: [] },
				  { type: "space", value: " " },
				  { type: "operator", value: "=>" },
				  { type: "space", value: " " },
				  {
					type: "codeblock",
					value: codeBlockTokens.value
				  }]
			  });

			log('adding es6 exports');
			importTokens = importTokens.concat([
				{ "type": "eol", "value": "\r" },
				{ "type": "carriagereturn", "value": "\n" },
				{ "type": "name", "value": "export" },
				{ "type": "space", "value": " " },
				{ "type": "name", "value": "default" },
				{ "type": "space", "value": " " },
				{ "type": "name", "value": variableName },
				{ "type": "statementseperator", "value": ";" },
				{ "type": "eol", "value": "\r" },
				{ "type": "carriagereturn", "value": "\n" }
			])
		}

		if(token.value === "define") { enterDefines = true}
	});

	log('complete...')
	return importTokens;
};

const transformer = (source, destination, cmd) => {
	//file loading
	const verbose = cmd.verbose;
	const log = message => {
		if (verbose) console.log(message);
	};
	const loadDir = dir => {
		const searchDir = dir.split('.').length > 0 ? dir : dir + '/*.js';
		const recursive = cmd.recursive ? '-R' : '';
        const fixPaths = cmd.fix;
		log(`checking path ${dir} exists...`);

		//check path to output to exists.. make if nots
		if (!shell.test('-e', dir)) {
			throw new Error('Could not find directory: ' + dir);
		}

		let files;
		if (recursive) {
			log('recursing');
			files = shell.ls(recursive, searchDir);
		} else {
			files = shell.ls(searchDir);
		}

		log(`filtering out files that are not .js...`);

		let fileIndex = files.length;
		let filePaths = [];

		while (fileIndex--) {
			let file = files[fileIndex];
			if (file.split('.').length < 2) {
				files.splice(fileIndex, 1);
			} else {
				//oddly, shelljs does not give back the absolute path, so we have to stick that back on
				if (dir.split('.').length > 0) {
					filePaths.push({ short: file, long: searchDir + '/' + file });
				} else {
					filePaths.push(searchDir);
				}
			}
		}

		return filePaths;
	};

	const sourceFiles = loadDir(source);

	if (sourceFiles.length === 0) {
		console.log(`no files found in ${source}`);
	} else {
		log(`transpiling...`);
		sourceFiles.forEach(item => {
			log(`${item.short}...`);

			const file = path.resolve(item.long);
			fs.readFile(file, function (err, data) {
				if (err) {
					throw err;
				}
				if (path.extname(file) === '.js') {
					log(`tokenizing...`);
					const lexer = new LexicalAnalyzer({ verbose: false });
					const lexicalResult = lexer.start(data.toString());
					const newTokens = transformDefineTokens(lexicalResult.tokens, item.short, cmd.fix);
					const newFile = new Generator().start(newTokens);
					fs.writeFile(path.resolve(`${destination}/${item.short}`), newFile, function (err) {
						if (err) {
							return console.log(err);
						}
						console.log("The file was saved!");
					});
				}
			});
		});
	}
};

program
	.command('tr <source> <destination>')
	.option('-r, --recursive', 'transpile recursively')
	.option('-l, --verbose', 'verbose')
    .option('-f, --fix', 'fix path strings for imports')
	.action((source, destination, cmd) =>
		transformer(source, destination, cmd)
	);

program.parse(process.argv);
