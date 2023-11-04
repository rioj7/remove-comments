# Change Log

## [1.6.0] 2023-11-XX
### Added
- Keep comments: setting to keep certain comments, test by Regular Expression
### Fixed
- Indent Comment Continuation: continuation lines have the same action (keep/remove) as the first line
- Remove All Comments with Prefix: works for comment defined by regex and Indent Comment Continuation

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
