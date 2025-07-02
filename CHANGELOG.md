# Change Log

## [1.15.0] 2025-07-02
### Added
- add LAMMPS

## [1.14.1] 2025-04-08
### Fixed
- React (JSX) comments

## [1.14.0] 2025-03-20
### Added
- add XML

## [1.13.3] 2025-01-13
### Fixed
- shellscript (`bash`): comment lines have first non whitespace character `#`, inline comments are not removed
- section split's inside Multiline comments

## [1.13.0] 2024-12-25
### Added
- Javascript: `/*** ... */` is always a comment
- C: `//` comment for C99+ by setting

## [1.12.0] 2024-12-13
### Added
- add Uiua

## [1.11.0] 2024-11-13
### Added
- add Vue Single File
- section split for: HTML, Vue SF, PHP

## [1.10.0] 2024-10-31
### Added
- add Pug, Jade
- add Stylus

## [1.9.0] 2024-09-13
### Added
- settings to remove up to N Blank lines before/after a removed comment line.

## [1.8.1] 2024-06-18
### Fixed
- CSS, Less, SCSS - add string delimiters for url()

## [1.8.0] 2024-03-28
### Added
- extract all strings to a file
- add Verilog / System Verilog

## [1.7.0] 2024-01-06
### Added
- add Zig

## [1.6.0] 2023-11-04
### Added
- Keep comments: setting to keep certain comments, test by Regular Expression
### Fixed
- Indent Comment Continuation: continuation lines have the same action (keep/remove) as the first line
- Remove All Comments with Prefix: works for comment defined by regex and Indent Comment Continuation
- Encoding line: works for comment defined by regex

## [1.5.5] 2023-05-30
### Added
- add TOML
### Fixed
- YAML: quoted scalars

## [1.5.4] 2023-05-18
### Added
- add Solidity
### Fixed
- processing of escaped characters inside strings

## [1.5.2] 2023-04-03
### Added
- `javascriptreact` : JavaScript React (JSX) only `{/* ... */}` as comment delimiter

## [1.5.1] 2023-02-22
### Added
- `jsonc`: allow `/* ... */` as comment delimiter
- README: how to deal with JavaScript/TypeScript literal Regular Expressions (`/../`) containing string or comment delimiter(s)

## [1.5.0] 2022-04-13
### Added
- mark JSDOC strings as comments

## [1.4.0] 2022-02-21
### Added
- remove comments with a user entered prefix
- add CHANGELOG.md

## [1.3.0] 2022-01-17
### Added
- add Laravel Blade

## [1.2.0] 2022-01-12
### Added
- keep editor encoding lines (`-*-`)

## [1.1.0] 2022-01-06
### Added
- Perl 6 (Raku) Block comments <code>#\`(.(.).)</code>, <code>#\`{.{.}.}</code>, ...
