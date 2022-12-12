# DeMOSS

## Description

DeMOSS is an anti-thesis to MOSS. It is a tool designed to evade MOSS, a plagiarism detection system used extensively by many universities to prevent students cheat in programming assignments.

## Usage

Online version of the tool is available at http://sohamapps.rf.gd/demoss.

Alternatively, you can run the tool locally by opening the [index.html](index.html) file in your browser.

## Inspiration
[Subtle Art of De-MOSS-ing](https://vivek-kaushal.medium.com/subtle-art-of-de-moss-ing-58ad4ea32c68) by Vivek Kaushal, who is co-incidentally an alumnus of my college.

## Technical details
The tool is written in JavaScript and uses [CodeMirror](https://codemirror.net/) for syntax highlighting. [Tree-sitter](https://tree-sitter.github.io/tree-sitter/) is used to parse the source code into an abstract syntax tree (AST). The AST is then traversed to make the necessary changes to the code.

## How it works
The code relies on various 'tricks' to evade MOSS, such as:
1. for -> while
	```cpp
	for (int i = 0; i < n; i++) {
		// do something
	}
	```
	is converted to
	```cpp
	int i = 0;
	while (i < n) {
		// do something
		i++;
	}
	```
2. a < b -> b > a
3. i++ -> i+=1
4. swapping if-else blocks
	```cpp
	if (a > b) {
		// do something
	} else {
		// do something else
	}
	```
	is converted to
	```cpp
	if (a <= b) {
		// do something else
	} else {
		// do something
	}
	```

## Limitations
- Presently, the tool is not fool-proof. It can be easily detected by a human.
- The tool is not designed to work with all programming languages. It currently supports only C-like languages: C++, Java and JavaScript.

## Future plans
- more 'tricks' to evade MOSS
- a feature to check MOSS similarity with the original code

## Disclaimer
This tool is for educational purposes only.

## License
[MIT](LICENSE)

## Author
Soham Korade



