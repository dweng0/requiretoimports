#!/usr/bin/env node

const { Generator, LexicalAnalyzer } = require('javascript-compiling-tokenizer');
const program = require('commander');
const shell = require('shelljs');
const path = require('path');
const fs = require('fs');
const _ = require('underscore');

//transformDefineTokens  {tokens: lexicalResult.tokens, path: item.short, fixPathStrings: cmd.path}
const transformDefineTokens = (tokens, variableName, fixPathStrings, verbose) => {
	const log = message => {
		if (verbose) {
			console.log(message);
		}
		
	};

	let importTokens = [];
	
	const getImportToken = (variableName, path) => {
		return[ {type: "import", value: [
			{type: "name", value: variableName},
			{type: "space", value: " "},
			{type: "name", value: "from"},
			{type: "space", value: " "},
			{type: "string", value: path},
			{type: "statementseperator", value: ';'},
			{type: "eol", value: "\r"},
			{type: "carriagereturn", value: "\n"}
		]}]
	}

	/**
	 * returns the value of the type provided as a new arr
	 */
	const returnType = (arr, type) => {
		return arr.reduce((p, c) => {
			if (c.type == type) {
			  p = p.concat(c.value);
			}
			return p;
		 }, [])
	}
	
	const removeType = (arr, type, once) => {
		let ignore = false;
		return arr.reduce((p, c) => {
			if (ignore) {
				p.push(c);
			} 
			else if(c.type !== type)
			{
				p.push(c);
			}
			else {
				if (once) {
					ignore = true;
				}
			}
			return p;
		}, []);
	}

	/**
	 * reducer that pushes the results of the reducer function onto the array, , if its empty then the current item [c] is ignored
	 */
	const conditionalReducer = (arr, type, reducerFn) => {
		return arr.reduce((p, c) => {
			if(c.type === type)
			{
				const results = reducerFn(c);
				if(!_.isEmpty(results))
				{
					p.push(c);
				}
			}
			else
			{
				p.push(c);
			}
			
			return p;
		}, []);
	}

	const conditionalTokenMap = (arr, type, mapFn) => {
		return arr.map(token => {
			if(token.type === type) {
				const newToken = mapFn(token);
				if (!newToken) {
					throw new Error('conditional token map must return an object');
				}
				return newToken
			}
			return token;
		});
	}

	const wrapTokens = (arr, variableName) => {
		return {
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
				value: arr
			  },
			  { "type": "eol", "value": "\r" },
			  { "type": "carriagereturn", "value": "\n" },
			  { "type": "name", "value": "export" },
			  { "type": "space", "value": " " },
			  { "type": "name", "value": "default" },
			  { "type": "space", "value": " " },
			  { "type": "name", "value": variableName },
			  { "type": "statementseperator", "value": ";" },
			  { "type": "eol", "value": "\r" },
			  { "type": "carriagereturn", "value": "\n" }]
		  }
	}

	/**
	 *  returns import tokens array for paths and names array provided
	 * @param {array} paths string path names
	 * @param {array} names  array of variable names
	 */
	const createPathTokens = (paths, names) => {
		let newTokens = [];
		
		paths.forEach((path, index) =>{
			const name = names[index];
			newTokens = newTokens.concat(getImportToken(name, path));
		})
		return newTokens;
	}

	//should always be a define function, but we only care about what is in the params of the define function
	if (tokens.find(token => { return token.type === 'params'})) 
	{
		tokens = returnType(tokens, 'params');
	}
	else 
	{
		log('could not find define function, returning tokens');
		return tokens;
	}
	
	/**
	 * By this point we only have the params of the define token. if the first argument of define is an array
	 * we know we need to build up an import paths list
	 */
	if(!_.isEmpty(tokens) && tokens[0].type === 'array') 
	{
		log('first argument of "define" is an array, pulling results into import path');
		const tokenPaths = returnType(tokens, 'array');		
		let importPaths = tokenPaths.reduce((p, c) => {
			if (c.type === "string") {
				p.push(c.value);
			}
			return p;
		}, []);

		if (fixPathStrings) {
			log('Fixing string paths')
			importPaths = importPaths.map(path => {
				//split on the first char, which will be either ' or "
				return path.split("").reduce((p, c, i) => {
					if (i === 1) {
						p = p + "./";
					}
					return p + c;
				}, '');
			});
		}

		//remove the array when finished, the last arg makes sure that only the first matching type is removed
		tokens = removeType(tokens, 'array', true);

		/**
		 * if the first argument was an array, we now need the params of the function that is the second argument
		 * this is stored in the same depth, so we just search for the array again
		 */
		const functionArray = returnType(tokens, 'params');

		//and build the variablenames
		let importVariables = functionArray.reduce((p, c) => {
			//there can be spaces and all sorts in here, so lets focus on just strings
			if (c.type === 'name') {
				p.push(c.value);
			}
			return p;
		 }, []);

		 //and remove it from the tokens
		 tokens = removeType(tokens, 'array', true);

		 //now we have paths and variables, lets create some tokens :)
		 importTokens = createPathTokens(importPaths, importVariables);
	}

	tokens = returnType(tokens, 'codeblock');

	/**
	 * we now want to look for 'const', 'var' (naughty) and 'let' (naughty) 
	 * check their value arrays for an assignee of 'require'. 
	 * if it has got a require, then create a new import token and push it into the import tokens array, also,  return nothing to the reducer to strip it out of the array. 
	 */
	tokens = conditionalReducer(tokens, 'const', (constToken) => {
		const isRequiredeclarataion = constToken.value.find(assignmentToken => { return (assignmentToken.type === 'assignee' && assignmentToken.value === 'require')});
		const name = constToken.value.find(assignmentToken => { return (assignmentToken.type === 'name')}).value;
		
		const requireToken = constToken.value.find(assignmentToken => { return (assignmentToken.type === 'params')})
		
		if ( requireToken && !_.isEmpty(requireToken.value) && requireToken.value[0].type === 'string') {
			let path = requireToken.value[0].value;
			if (fixPathStrings) {
				if(!path.includes('!'))
				{
					log(`Fixing path ${path}`);
					path = path.split("").reduce((p, c, i) => {
						if (i === 1) {
							p = p + "./";
						}
						return p + c;
					}, '');
				}
				else
				{
					log(`Path ${path} contains an illegal character, stripping`);
					path = "'./" + path.split('!')[1];
				}
				
			}
	
			if (isRequiredeclarataion) {
				importTokens = importTokens.concat(getImportToken(name, path));
			}
			else
			{
				return constToken;
			}
		}
		else {
			return constToken;
		}
	
	});
	
	//now wrap the codeblock in an es6 fn 
	tokens = wrapTokens(tokens, variableName);

	//if we have import tokens, we need to prepend them to the token tree
	if (importTokens) {
		tokens = importTokens.concat(tokens);
	}
	return tokens;
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
		const baseFilePathLength = source.split('/').length;
	
		while (fileIndex--) {
			let file = files[fileIndex];
			if (file.split('.').length < 2) {
				files.splice(fileIndex, 1);
			} else {
				//oddly, shelljs does not give back the absolute path, so we have to stick that back on
				if (dir.split('/').length > 0) {					
					const name = file.split('/').find(part => {return part.includes('.')}).split('.')[0];
					const sourceFile = dir + "/" + file;
					const destinationFile = destination + "/" + file;
					filePaths.push({ name, sourceFile, destinationFile });
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
			log(`${item.name}...`);

			const file = path.resolve(item.sourceFile);
			fs.readFile(file, function (err, data) {
				if (err) {
					throw err;
				}
				if (path.extname(file) === '.js') {
					log(`tokenizing...`);
					const lexer = new LexicalAnalyzer({ verbose: false });
					const lexicalResult = lexer.start(data.toString());
					const newTokens = transformDefineTokens(lexicalResult.tokens, item.name, cmd.fix, cmd.verbose);
					const newFile = new Generator().start(newTokens);
					const destinationDir = item.destinationFile.split('/').reduce((p, c) => {
						if(!c.includes('.'))
						{
							p = p + "/" + c;
						}
						return p;
					}, '.');
					const write = (filePath, file) => {
					
						fs.writeFile(path.resolve(filePath), file, function (err) {
							if (err) {
								return console.log(err);
							}
							console.log("The file was saved!");
						});
					}

					fs.exists(destinationDir, (exists) => {
						if (!exists) {
							fs.mkdir(destinationDir, (err) => {
								if (err) {
									throw err;
								} 
								write(item.destinationFile, newFile);
							});
						}
						else  {
							write(item.destinationFile, newFile);
						}
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
