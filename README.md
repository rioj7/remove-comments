**Remove Comments** will remove all comments from the current selection(s) or the whole document.

This is a rewrite of the extension [Remove Comments](https://marketplace.visualstudio.com/items?itemName=plibither8.remove-comments) by plibither8.

It uses the same command description.<br/>**Be sure to uninstall the extension: `plibither8.remove-comments`**

It fixes a number of issues:

* Remove empty lines (or only whitespace) if comment was the only content of the line
* Parse file for strings and do not modify them.
* Remove whitespace in front of removed comment

If the comment starts and ends on the same line it is a single line comment. If the language does not have an open and matching close comment delimeters you only have single line comments. An example of open and matching close comment delimeters are `/*` and `*/`.

If any of the supported languages contains a mistake or if you use a language not yet supported  please create an issue at the repository.

# Features

* Supports both single line and multi line comments
* Support for 60+ languages
* Keep `#!` first lines
* Keep editor encoding lines, like
    * `# -*- coding: utf-8 -*-`
    * `// -*- coding: utf-8 -*-`
    * `/* -*- coding: utf-8 -*- */`

**Note: This extension does not 'uncomment' the comments present in the code, but removes them completely.**

For **php**: You don't have to create selections for the individual `<?php ?>` blocks, these blocks are searched for in the selections, no HTML will be modified.

# Usage

* Remove comments in your code by opening the command palette (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>), choose any of the following commands:

    * **Comments: Remove All Comments**
    * **Comments: Remove All Comments that have a user entered prefix**
    * **Comments: Remove All Single Line Comments**
    * **Comments: Remove All Multiline Comments**

Javascript has comments that are treated as [JSDOC](https://jsdoc.app/index.html) strings: `/** ..... */`  
They are handled by the removal commands as strings. If you also want to remove these you can mark them as comments with the command: **Comments: Mark JSDOC String as comment. For next removal only.**. In **only the next call** of the Remove commands these will also be removed for JavaScript files.

# Comments with a prefix

If you choose to remove comments with a prefix you have to enter the prefix exact, this is inclusive the whitespace.

The command `remove-comments.removeAllCommentsWithPrefix` can be used in a keybinding. You can pass the prefix in the argument:

```
{
  "key": "ctrl+i p",
  "command": "remove-comments.removeAllCommentsWithPrefix",
  "args": { "prefix": " DELETE" }
}
```

# Supported Languages

<details>

<summary>List of Supported Languages</summary>

* Ada
* AL
* C
* COBOL / ACUCOBOL / OpenCOBOL / BitlangCOBOL
* cfml
* Clojure
* CoffeeScript
* CSS
* C++
* C#
* Dart
* Dockerfile
* Elixir
* Erlang
* F#
* Go
* GraphQL
* Groovy
* Haskell
* Haxe
* HTML
* Java
* JavaScript
* JavaScript React
* JSON with comments
* Julia
* Kotlin
* Laravel Blade
* LaTex
* Less
* Lisp
* Lua
* Makefile
* Objective-C
* Objective-C++
* Pascal
* Perl
* Perl 6, Raku
* PHP
* PL/SQL
* PowerShell
* Properties  (`*.ini`, `*.conf`)
* Python
* R
* Racket
* Ruby
* Rust
* sass
* Scala
* Scheme
* SCSS
* Shaderlab
* Shell Script (bash)
* Spark
* SQL
* Swift
* Terraform
* TypeScript
* TypeScript React
* Visual Basic
* VHDL
* YAML

</details>

# License

Licensed under the [MIT](LICENSE) License.

# Known issues

* Dockerfile: Any line that looks like a parser directive is treated as a parser directive even if it is written after a comment, empty line or build instruction.

# TODO

* Scheme and Racket may have similar Block comments <code>#;(.(.).)</code>, <code>#;{.{.}.}</code>, ...
