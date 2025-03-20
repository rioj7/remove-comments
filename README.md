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
* Extract the strings of the current editor to a file

**Note: This extension does not 'uncomment' the comments present in the code, but removes them completely.**

For **HTML**: The `<style>` (CSS) and `<script>` (Javascript) sections are searched and the correct comment and string settings are used.

For **PHP**: You don't have to create selections for the individual `<?php ?>` blocks, these blocks are searched for in the selections, no HTML will be modified.

For **[Vue Single Files](https://vuejs.org/guide/scaling-up/sfc.html)**: The language used in a section (tag delimeted) is determined by the `lang` attribute in the start tag.

# Usage

* Remove comments in your code by opening the command palette (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>), choose any of the following commands:

    * **Comments: Remove All Comments**
    * **Comments: Remove All Comments that have a user entered prefix**
    * **Comments: Remove All Single Line Comments**
    * **Comments: Remove All Multiline Comments**
    * **Comments: Extract Strings to a file**

Javascript has comments that are treated as [JSDOC](https://jsdoc.app/index.html) strings: `/** ..... */`  
They are handled by the removal commands as strings. If you also want to remove these you can mark them as comments with the command:  
**Comments: Mark JSDOC String as comment. For next removal only.**.  
In **only the next call** of the Remove commands these will also be removed for JavaScript files.

If you have defined the setting [`remove-comments.keep`](#remove-commentskeep) you can ignore this setting with the command  
**Comments: Ignore any "remove-comments.keep" setting. For next removal only.**  
In **only the next call** of the Remove commands the `remove-comments.keep` setting is not used.

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

# Extract Strings to a file

The command **Comments: Extract Strings to a file** scans the current editor for strings and stores them in a file. The strings are appended to the file and the stored strings also have the delimiters.

Each string is saved on 1 line in the format:

_fileBasename_`::`_line_`:`_character_ _string_

`::`_line_`:`_character_ is the position of the string start.

It uses the settings:

* `remove-comments.extractStrings.filePath`
* `remove-comments.extractStrings.lineJoin`

If you want to extract the strings for a large collection of files you can use the extension: [Command on All Files](https://marketplace.visualstudio.com/items?itemName=rioj7.commandOnAllFiles)

# Settings

## `remove-comments.keep`

With the setting `remove-comments.keep` you are able to define which comments to keep by testing the comment text with a Regular Expression. The comment text is all the text of the comment without the comment delimiters. For a block comment (like `/* ... */`) the lines are separated with a Tab character. The _Indent Comment Continuation_ lines are not part of the comment text, but have the same action (keep/remove) as the first line.

The setting `remove-comments.keep` is an object with the keys a [languageId](https://code.visualstudio.com/docs/languages/overview#_language-id). You can use any known VSC languageId and the special languageId `all`. The `all` key is used for any file.

The key can also be a list of languageId's separated by '`,`' (comma). This way you can use the same rules for multiple languageId's or remove specific rules in the Workspace/Folder settings if you add an _illegal_ languageId to _name_ the group of rules for the languageId's:

```json
"remove-comments.keep": {
  "#grp1,all": {
    "region": {
      "regex": "^\\s*#(end)?region"
    }
  },
  "#grp2,all": {
    "todo": {
      "regex": "^\\s*TODO",
      "flags": "i"
    }
  }
}
```

The value for each languageId is an object with the keys a name for the named regular expression to use. In VSC the setting objects are merged. By using a name you can override/remove a particular named regular expression defined at the User or Workspace level.

Each named regular expression is an object with the following properties:

* `regex` : the regular expression to test on the comment text. If there is a match the comment is not removed
* `flags` : (Optional) the flags to use for the regular expression (default: `""`)

### Example

If you use the `#region`/`#endregion` feature of VSC to create custom folds they are stored in the file using comments like  
`// #region name`  
`// #endregion`  
To keep these lines in any file you can define the setting:

```json
"remove-comments.keep": {
  "all": {
    "region": {
      "regex": "^\\s*#(end)?region"
    }
  }
}
```

Use a particular languageId if you want to limit to certain files.

The [Zig](https://ziglang.org/) language has special comments to generate documentation.  
If you want to keep these comments you can define the setting:

```json
"remove-comments.keep": {
  "zig": {
    "documentation": {
      "regex": "^(/(?!/)|!)"
    }
  }
}
```

### Override or Remove a User or Workspace setting

In VSC the setting objects are merged:

* If you define a new key the key-value is added to the existing object.
* Existing keys get the value replaced or merged.

You can remove a setting by using a `false` value:

* remove any keep-test in User or Workspace setting:
  ```json
  "remove-comments.keep": false
  ```
* remove keep-tests for a particular languageId:
  ```json
  "remove-comments.keep": {
    "all": false,
    "javascript": false
  }
  ```
* remove a particular named regular expression keep-test:
  ```json
  "remove-comments.keep": {
    "all": {
      "region": false
    }
  }
  ```

You can override a named regular expression in the Workspace/Folder settings by redifining the object keys `regex` and/or `flags`:

* override the regular expression:
  ```json
  "remove-comments.keep": {
    "all": {
      "region": {
        "regex": "^\\s*##(end)?region"
      }
    }
  }
  ```
* override the flags defined (in this case remove any flags):
  ```json
  "remove-comments.keep": {
    "all": {
      "region": {
        "flags": ""
      }
    }
  }
  ```

## `remove-comments.extractStrings.filePath`

A string containing a file system path that is to be used to store the strings extracted by the **Comments: Extract Strings to a file** command. The new strings are appended to this file.

## `remove-comments.extractStrings.lineJoin`

A string containing the text to replace a new line in a multi line string. Used the **Comments: Extract Strings to a file** command.

## `remove-comments.removeBlankLines.before`

Remove up to N blank lines **before** a removed comment. If the line with the comment is removed. default 0.  
No lines outside the selection will be removed.

## `remove-comments.removeBlankLines.after`

Remove up to N blank lines **after** a removed comment. If the line with the comment is removed. default 0.  
No lines outside the selection will be removed.

## `remove-comments.c99`

In the C99 standard the single line comment `//` was added.  
If you use C99 or later check this setting, global or in a workspace.

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
* Jade
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
* Pug (Jade)
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
* Solidity
* Spark
* SQL
* Stylus
* Swift
* Terraform
* TOML
* TypeScript
* TypeScript React
* Uiua
* Visual Basic
* Verilog / System Verilog
* VHDL
* Vue Single File
* XML
* YAML
* Zig

</details>

# License

Licensed under the [MIT](LICENSE) License.

# Known issues

* **Dockerfile**: Any line that looks like a parser directive is treated as a parser directive even if it is written after a comment, empty line or build instruction.
* **JavaScript**/**TypeScript** literal Regular Expressions (`/../`) can contain string or comment delimiter(s).  
The search for strings and comments will fail after such a literal Regular Expression. To find out if a `/` is a literal Regular Expressions start or a division operator in a math expression needs a full JavaScript/TypeScript parser or an interface with the language server and analyze its AST.  
The solution is to make selections in the file before and after the literal Regular Expression. And call the Remove Comments multiple times.
* **Bash** The hash character (`#`) is not only used for comments. It is used in variable manipulation and can be an argument of a command. Only lines that start with a `#` (ignore whitespace) are removed. Inline comments are not removed.
  ```bash
  (( $#branch > 32 )) && branch[13,-13]="…"  # comment
  # Following line does not contain comment
  cat file | grep -v -e ^# -e ^$
  # Following line is partial comment
  cat file | grep -v -e ^# -e ^$ ### This part is a comment
  ```
  If the syntax highlighting is wrong it is because the tool to create this HTML uses a simple scanner and not a parser kind. VSC uses an updated TextMate Grammar that correctly identifies the scope tokens. But an extension has no access to these scope tokens.

# TODO

* Scheme and Racket may have similar Block comments <code>#;(.(.).)</code>, <code>#;{.{.}.}</code>, ...
