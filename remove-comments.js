const vscode = require('vscode');

const SINGLE_LINE = 1;
const MULTI_LINE = 2;
const encodingMarker = '-*-';

var getProperty = (obj, prop, deflt) => { return obj.hasOwnProperty(prop) ? obj[prop] : deflt; };
const getConfig = () => vscode.workspace.getConfiguration("remove-comments", null);
function isString(obj) { return typeof obj === 'string';}

/** @param {string} text */
function regexpEscape(text) {
  return text.replace(/[[\]*|(){}\\.?^$+]/g, m => `\\${m}`);
}

class Parser {
  constructor(languageID, comments, prefix, keepJSDocString, keepCommentRegex, extractStringsCB) {
    this.commentDelimiters = [];
    this.stringDelimiters = [];
    this.singleLineComments = (comments & SINGLE_LINE) !== 0;
    this.multiLineComments = (comments & MULTI_LINE) !== 0;
    this.prefix = prefix;
    this.supportedLanguage = true;
    this.commentLineRE = undefined;
    this.indentComments = false;
    this.indentCommentContinuationLine = false;
    this.previousLineCommentLine = false;
    this.keepCommentLine = false;
    this.nestedBlockComment = false;
    this.blockCommentLevel = undefined;
    this.selectionSplit = undefined;
    this.keepJSDocString = keepJSDocString;
    this.keepCommentRegex = keepCommentRegex;
    this.extractStringsCB = extractStringsCB;
    /** @type RegExpExecArray */
    this.blockCommentEndResult = undefined;
    this.setDelimiter(languageID);
  }
  isCommentLine(text) {
    if (this.commentLineRE === undefined) { return false; }
    if (text.length === 0) { return false; }
    this.indentCommentContinuationLine = false;
    if (this.indentComments && this.previousLineCommentLine && (text.charAt(0) <= ' ')) {
      this.indentCommentContinuationLine = true;
      return true;
    }
    this.commentLineRE.lastIndex = 0; // in case the `g` flag was defined
    return this.commentLineRE.test(text);
  }
  /** @param {string} text @param {RegExp} reEnd */
  findBlockCommentEnd(text, reEnd) {
    let result;
    while ((result = reEnd.exec(text)) !== null) {
      if (this.nestedBlockComment && result[1]) {
        this.blockCommentLevel++;
        continue;
      }
      if (result[2]) {
        this.blockCommentLevel--;
        if (this.blockCommentLevel === 0) {
          this.nestedBlockComment = false;
          this.blockCommentEndResult = result;
          return true;
        }
      }
    }
    return false;
  }
  /** @param {vscode.TextDocument} document @param {vscode.Range} range @param {number} charIdxOpenDelim */
  keepComment(document, range, charIdxOpenDelim) {
    let text = '';
    if (range.start.line === range.end.line) {
      text += document.lineAt(range.start.line).text.substring(range.start.character, range.end.character);
    } else {
      text += document.lineAt(range.start.line).text.substring(range.start.character);
      for (let lineNr = range.start.line+1; lineNr < range.end.line; ++lineNr) {
        text += '\t';
        text += document.lineAt(lineNr).text;
      }
      text += '\t';
      text += document.lineAt(range.end.line).text.substring(0, range.end.character);
    }
    if (this.prefix) { // keep comment if it NOT starts with the prefix
      return !text.startsWith(this.prefix);
    }
    if (charIdxOpenDelim === 0 && this.isEncodingLine(text)) {
      return true;
    }
    for (const keepRegex of this.keepCommentRegex) {
      let regex = getProperty(keepRegex, 'regex');
      if (!isString(regex) || regex.length === 0) { continue; }
      if (new RegExp(regex, getProperty(keepRegex, 'flags')).test(text)) {
        return true;
      }
    }
    return false;
  }
  /** @param {vscode.TextDocument} document @param {vscode.Selection[]} selections */
  *splitSelections(document, selections) {
    for (const selection of selections) {
      if (selection.isEmpty) { continue; }
      if (this.selectionSplit === undefined) {
        yield selection;
        continue;
      }
      let text = document.getText(selection);
      let textOffset = document.offsetAt(selection.start);
      let foundSplit = false;
      let offset = 0;
      while (true) {
        let startIdx = text.indexOf(this.selectionSplit[0], offset);
        if (startIdx === -1) { break; }
        startIdx += this.selectionSplit[0].length;
        let endIdx   = text.indexOf(this.selectionSplit[1], startIdx);
        if (endIdx === -1) { break; }
        offset = endIdx + this.selectionSplit[1].length;
        foundSplit = true;
        yield new vscode.Selection(document.positionAt(textOffset+startIdx), document.positionAt(textOffset+endIdx));
      }
      if (!foundSplit) {
        yield selection;
      }
    }
  }
  /** @param {string} text */
  isEncodingLine(text) {
    text = text.trim();
    return text.startsWith(encodingMarker) && text.endsWith(encodingMarker);
  }
  /** @param {vscode.TextEditor} editor  @param {vscode.TextEditorEdit} edit */
  removeComments(editor, edit) {
    if (!editor) { return; }
    let selections = [...editor.selections];
    if (selections.length === 1 && selections[0].isEmpty) {
      selections = [new vscode.Selection(new vscode.Position(0,0), editor.document.positionAt(editor.document.getText().length))];
    }
    let document = editor.document;
    for (const selection of this.splitSelections(document, selections)) {
      if (selection.isEmpty) { continue; }
      let startLine = selection.start.line;
      let endLine   = selection.end.line;
      let insideString = false;
      let insideComment = false;
      let removeRanges = [];
      let reEnd = new RegExp("_");
      let rangeStart = new vscode.Position(0, 0); // to keep intellisense happy
      let rangeCommentTextStart = new vscode.Position(0, 0);
      let charIdxOpenDelim = -1;
      this.previousLineCommentLine = false;
      this.keepCommentLine = false;
      rangeStart = undefined;
      rangeCommentTextStart = undefined;
      loopLine:
      for (var lineNr = startLine; lineNr <= endLine; ++lineNr) {
        let line = document.lineAt(lineNr);
        let text = line.text;
        if (lineNr === 0 && text.startsWith('#!')) {
          continue loopLine;
        }
        let charStartIdx = 0;
        if (lineNr === endLine) {
          text = text.substring(0, selection.end.character);
          if (text === '') { continue loopLine; }
        }
        if (lineNr === startLine) {
          charStartIdx = selection.start.character;
        }
        if (insideString || insideComment) {
          reEnd.lastIndex = 0;
          if (insideString) {
            let result = reEnd.exec(text);
            if (result === null) {
              continue loopLine;
            }
            this.extractStringsCB(rangeStart, new vscode.Position(lineNr, reEnd.lastIndex));
          } else {
            if (!this.findBlockCommentEnd(text, reEnd)) {
              continue loopLine;
            }
            if (this.multiLineComments && !this.keepComment(document, new vscode.Range(rangeCommentTextStart, new vscode.Position(lineNr, this.blockCommentEndResult.index)), charIdxOpenDelim)) {
              removeRanges.push(new vscode.Range(rangeStart, new vscode.Position(rangeStart.line, document.lineAt(rangeStart.line).text.length)));
              if (rangeStart.line+1 !== lineNr) {
                removeRanges.push(new vscode.Range(new vscode.Position(rangeStart.line+1, 0), new vscode.Position(lineNr, 0)));
              }
              removeRanges.push(new vscode.Range(new vscode.Position(lineNr, 0), new vscode.Position(lineNr, reEnd.lastIndex)));
            }
          }
          rangeStart = undefined;
          rangeCommentTextStart = undefined;
          charIdxOpenDelim = -1;
          insideComment = false;
          insideString = false;
          charStartIdx = reEnd.lastIndex;
        } else {
          if (this.isCommentLine(text)) {
            if (!this.indentCommentContinuationLine) {
              this.keepCommentLine = this.keepComment(document, new vscode.Range(new vscode.Position(lineNr, this.commentLineRE.lastIndex), new vscode.Position(lineNr, text.length)), 0);
            }
            if (this.singleLineComments && !this.keepCommentLine) {
              removeRanges.push(new vscode.Range(new vscode.Position(lineNr, charStartIdx), new vscode.Position(lineNr, text.length)));
            }
            this.previousLineCommentLine = true;
            continue loopLine;
          }
        }
        this.previousLineCommentLine = false;
        this.keepCommentLine = false;
        loopChar:
        for (let charIdx = charStartIdx; charIdx < text.length; ++charIdx) {
          for (const strDelim of this.stringDelimiters) {
            if (text.startsWith(strDelim[0], charIdx)) {
              rangeStart = new vscode.Position(lineNr, charIdx);
              if (strDelim[1] === '\n') {
                this.extractStringsCB(rangeStart, new vscode.Position(lineNr, text.length));
                continue loopLine;
              }
              charIdx += strDelim[0].length;
              reEnd = new RegExp(`(\\\\.|.)*?${regexpEscape(strDelim[1] ? strDelim[1] : strDelim[0])}`, 'y');
              reEnd.lastIndex = charIdx;
              let result = reEnd.exec(text);
              if (result) {
                this.extractStringsCB(rangeStart, new vscode.Position(lineNr, reEnd.lastIndex));
                charIdx = reEnd.lastIndex-1;
                continue loopChar;
              }
              insideString = true;
              continue loopLine;
            }
          }
          for (const commDelim of this.commentDelimiters) {
            if (text.startsWith(commDelim[0], charIdx)) {
              charIdxOpenDelim = charIdx;
              rangeCommentTextStart = new vscode.Position(lineNr, charIdx + commDelim[0].length);
              let pos = charIdx;
              while ((pos > 0) && (text.charAt(pos-1) <= ' ')) {
                pos--;
              }
              rangeStart = new vscode.Position(lineNr, pos);
              charIdx += commDelim[0].length;
              if (commDelim[1] === undefined) {
                if (this.singleLineComments && !this.keepComment(document, new vscode.Range(rangeCommentTextStart, new vscode.Position(lineNr, text.length)), charIdxOpenDelim)) {
                  removeRanges.push(new vscode.Range(rangeStart, new vscode.Position(lineNr, text.length)));
                }
                continue loopLine;
              }
              let [openDelim, closeDelim] = [commDelim[0], commDelim[1]];
              if (commDelim[2]) {
                this.nestedBlockComment = true;
                [openDelim, closeDelim] = [commDelim[1], commDelim[2]];
              }
              reEnd = new RegExp(`(${regexpEscape(openDelim)})|(${regexpEscape(closeDelim)})`, 'g');
              reEnd.lastIndex = charIdx;
              this.blockCommentLevel = 1;
              if (this.findBlockCommentEnd(text, reEnd)) {
                if (this.singleLineComments && !this.keepComment(document, new vscode.Range(rangeCommentTextStart, new vscode.Position(lineNr, this.blockCommentEndResult.index)), charIdxOpenDelim)) {
                  removeRanges.push(new vscode.Range(rangeStart, new vscode.Position(lineNr, reEnd.lastIndex)));
                }
                charIdx = reEnd.lastIndex-1;
                continue loopChar;
              }
              insideComment = true;
              continue loopLine;
            }
          }
        }
      }
      const lineTestRE = new RegExp('^\\s*$');
      while (removeRanges.length > 0) {
        let rangesThisLine = [ removeRanges.shift() ];
        let lineNr = rangesThisLine[0].start.line;
        while ((removeRanges.length > 0) && (removeRanges[0].start.line === lineNr)) {
          rangesThisLine.push(removeRanges.shift());
        }
        if (rangesThisLine[0].end.line !== lineNr) {
          edit.delete(rangesThisLine[0]);
          continue;
        }
        let line = document.lineAt(lineNr);
        if (lineTestRE.test(rangesThisLine.reduceRight((t, range) => t.substring(0, range.start.character) + t.substring(range.end.character), line.text))) {
          edit.delete(line.rangeIncludingLineBreak);
          continue;
        }
        rangesThisLine.forEach(r => { edit.delete(r); });
      }
    }
  }
  setDelimiter(languageID) {
    this.supportedLanguage = true;
    this.commentDelimiters = [];
    this.stringDelimiters = [];

    switch (languageID.toLowerCase()) {

      case "python":
      case "toml":
        this.stringDelimiters.push(['"""']);
        this.stringDelimiters.push(["'''"]);
      case "yaml":
        this.stringDelimiters.push(["'"]);
      case "r":
      case "shellscript":  // bash
        this.stringDelimiters.push(['"']);
        this.commentDelimiters.push(["#"]);
        break;

      case "javascriptreact":
        this.commentDelimiters.push(["{/*", "*/}"]);
      case "javascript":
        if (this.keepJSDocString) {
          this.stringDelimiters.push(["/**", "*/"]);  // JSDOC
        }
      case "typescript":
      case "typescriptreact":
        this.stringDelimiters.push(["`"]);
      case "dart":
      case "haxe":
        this.stringDelimiters.push(["'"]);
      case "cpp":
      case "csharp":
      case "objective-c":
      case "objective-cpp":
      case "go":
      case "java":
      case "kotlin":
      case "scala":
      case "shaderlab":
      case "solidity":
      case "swift":
      case "verilog":
      case "systemverilog":
      case "jsonc":
        if (languageID.toLowerCase() !== 'javascriptreact') {
          this.commentDelimiters.push(["/*", "*/"]);
          this.commentDelimiters.push(["//"]);
        }
        this.stringDelimiters.push(['"']);
        break;

      case "c":
        this.commentDelimiters.push(["/*", "*/"]);
        this.stringDelimiters.push(['"']);
        break;

      case "rust":
        this.commentDelimiters.push(["/*", "/*", "*/"]);
        this.commentDelimiters.push(["//"]);
        this.stringDelimiters.push(['"']);
        break;

      case "racket":
        this.commentDelimiters.push(["#|", "#|", "|#"]);
        this.commentDelimiters.push(["#!"]);
        this.commentDelimiters.push([";"]);
        this.stringDelimiters.push(['"']);
        break;

      case "scheme":
        this.commentDelimiters.push(["#|", "#|", "|#"]);
        this.commentDelimiters.push(["#!", "!#"]);
        this.commentDelimiters.push([";"]);
        this.stringDelimiters.push(['"']);
        break;

      case "elixir":
        this.stringDelimiters.push(['@moduledoc """', '"""']);
        this.stringDelimiters.push(['@doc """', '"""']);
        this.stringDelimiters.push(['"']);
        this.commentDelimiters.push(["#"]);
        break;

      case "graphql":
        this.stringDelimiters.push(['"""']);
        this.stringDelimiters.push(['"']);
        this.commentDelimiters.push(["#"]);
        break;

      case "julia":
        this.commentDelimiters.push(["#=", "=#"]);
        this.commentDelimiters.push(["#"]);
        this.stringDelimiters.push(['"']);
      break;

      case "clojure":
        this.stringDelimiters.push(["'"]);
      case "lisp":
        this.stringDelimiters.push(['"']);
        this.commentDelimiters.push([";"]);
        break;

      case "erlang":
        this.commentDelimiters.push(["%"]);
        this.stringDelimiters.push(['"']);
        break;

      case "latex":
        this.commentLineRE = new RegExp("^%", "g");
        break;

      case "dockerfile":
        this.commentLineRE = new RegExp("^#(?!\\s*(syntax|escape)\\s*=)", 'ig');
        break;

      case "groovy":
        this.stringDelimiters.push(['"""']);
        this.stringDelimiters.push(["'''"]);
        this.commentDelimiters.push(["/*", "*/"]);
      case "al":
        this.stringDelimiters.push(['"']);
        this.stringDelimiters.push(["'"]);
        this.commentDelimiters.push(["//"]);
        break;

      case "lua":
        this.commentDelimiters.push(["--[[", "]]"]);
        this.commentDelimiters.push(["--"]);
        this.stringDelimiters.push(['"']);
        this.stringDelimiters.push(["'"]);
        break;

      case "vhdl":
        this.commentDelimiters.push(["/*", "*/"]);
      case "ada":
      case "haskell":
        this.stringDelimiters.push(['"']);
        this.commentDelimiters.push(["--"]);
        break;

      case "sql":
        this.stringDelimiters.push(['"']);
      case "plsql":
      case "spark":
        this.stringDelimiters.push(["'"]);
        this.commentDelimiters.push(["--"]);
        this.commentDelimiters.push(["/*", "*/"]);
        break;

      case "fsharp":
        this.commentDelimiters.push(["//"]);
        this.commentDelimiters.push(["(*", "*)"]);
        this.stringDelimiters.push(['"']);
        this.stringDelimiters.push(['"""']);
        break;

      case "pascal":
      case "objectpascal":
        this.commentDelimiters.push(["//"]);
        this.commentDelimiters.push(["(*", "*)"]);
        this.commentDelimiters.push(["{", "}"]);
        this.stringDelimiters.push(["'"]);
      break;

      case "makefile":
      case "ini":
      case "properties":  // *.conf
        this.commentLineRE = new RegExp("^\\s*#", "g");
        break;

      case "coffeescript":
        this.commentDelimiters.push(["###", "###"]);
        this.commentDelimiters.push(["#"]);
        this.stringDelimiters.push(['"']);
        break;

      case "cfml":
        this.commentDelimiters.push(["//"]);
        this.commentDelimiters.push(["/*", "*/"]);
        break;

      case "less":
      case "scss":
        this.commentDelimiters.push(["//"]);
      case "css":
        this.stringDelimiters.push(['"']);
        this.stringDelimiters.push(["'"]);
        this.commentDelimiters.push(["/*", "*/"]);
        break;

      case "sass":
        this.commentLineRE = new RegExp("^(//|/\\*)", "g");
        this.indentComments = true;
        this.commentDelimiters.push(["//"]);
        this.commentDelimiters.push(["/*", "*/"]);
        break;

      case "html":
        this.commentDelimiters.push(["<!--", "-->"]);
        break;

      case "terraform":
        this.commentDelimiters.push(["#"]);
        this.commentDelimiters.push(["//"]);
        this.commentDelimiters.push(["/*", "*/"]);
        break;

      case "acucobol":
      case "opencobol":
      case "bitlang-cobol":
      case "cobol":
        this.commentLineRE = new RegExp("^......[*/]", "g");
        break;

      case "powershell":
        this.commentDelimiters.push(["<#", "#>"]);
        this.commentDelimiters.push(["#"]);
        this.stringDelimiters.push(['"']);
        this.stringDelimiters.push(["'"]);
        break;

      case "perl":
        this.stringDelimiters.push(["'"]);
      case "ruby":
        this.commentDelimiters.push(["#"]);
        this.commentDelimiters.push(["=begin", "=cut"]);
        this.stringDelimiters.push(['"']);
        break;

      case "perl6": // Raku, Rakudo - https://raku.org/
        this.stringDelimiters.push(['"']);
        this.stringDelimiters.push(["'"]);
        this.stringDelimiters.push(["｢", "｣"]);  // https://www.evanmiller.org/a-review-of-perl-6.html
        this.stringDelimiters.push(["“", "”"]);
        this.commentDelimiters.push(["#`(", "(", ")"]);
        this.commentDelimiters.push(["#`{", "{", "}"]);
        this.commentDelimiters.push(["#`[", "[", "]"]);
        this.commentDelimiters.push(["#`<", "<", ">"]);
        this.commentDelimiters.push(["#"]);
        this.commentDelimiters.push(["=begin", "=cut"]);
        break;

      case "blade":
        this.commentDelimiters.push(["{{--", "--}}"]);
        this.commentDelimiters.push(["/*", "*/"]);
        this.commentDelimiters.push(["//"]);
        this.commentDelimiters.push(["#"]);
        this.stringDelimiters.push(["'"]);
        break;

      case "php":
        this.selectionSplit = ["<?php", "?>"];
        this.commentDelimiters.push(["/*", "*/"]);
        this.commentDelimiters.push(["//"]);
        this.commentDelimiters.push(["#"]);
        this.stringDelimiters.push(["'"]);
        break;

      case "vb":
        this.commentDelimiters.push(["'"]);
        this.stringDelimiters.push(['"']);
        break;

      case "zig":
        this.commentDelimiters.push(["//"]);
        this.stringDelimiters.push(['"']);
        this.stringDelimiters.push(["'"]);
        this.stringDelimiters.push(['\\\\', '\n']);
        break;

      default:
        this.supportedLanguage = false;
        break;
    }
    return this.supportedLanguage;
  }
}

/** @param {vscode.Uri} fileURI */
function findTextDocument(fileURI) {
  for (const document of vscode.workspace.textDocuments) {
    if (document.isClosed) { continue; }
    if (document.uri.scheme != 'file') { continue; }
    if (document.uri.fsPath === fileURI.fsPath) { return document; }
  }
  return undefined;
}

function activate(context) {

  let keepJSDocString = true;
  let useKeepCommentSetting = true;
  let extractStrings = false;
  let extractedStrings = [];

  /** @param {vscode.TextEditor} editor  @param {vscode.TextEditorEdit} edit @param {number} comments */
  let removeComments = function (editor, edit, comments, prefix) {
    let document_languageId = editor.document.languageId;
    let keepCommentRegex = [];
    const config = getConfig();
    let keepConfig = config.get("keep");
    if (useKeepCommentSetting && keepConfig !== false) {
      let fillCommentRegex = (regexes) => {
        if (regexes === false) { return; }
        for (const key in regexes) {
          if (!regexes.hasOwnProperty(key)) { continue; }
          let namedRegex = regexes[key];
          if (namedRegex === false) { continue; }
          keepCommentRegex.push(namedRegex);
        }
      };
      for (const key in keepConfig) {
        if (!keepConfig.hasOwnProperty(key)) { continue; }
        let regexes = keepConfig[key];
        for (const languageId of key.split(',')) {
          if (languageId === 'all' || languageId === document_languageId) {
            fillCommentRegex(regexes);
          }
        }
      }
    }
    let extractStringsCB = (s, e) => {};
    if (extractStrings) {
      extractStringsCB = (startPosition, endPosition) => {
        extractedStrings.push([startPosition, endPosition]);
      };
    }
    let parser = new Parser(document_languageId, comments, prefix, keepJSDocString, keepCommentRegex, extractStringsCB);
    if (!parser.supportedLanguage) {
      vscode.window.showInformationMessage(`Cannot remove comments: unknown language (${document_languageId})`);
      return;
    }
    parser.removeComments(editor, edit);
    let saveExtractedStrings = () => {
      const config = getConfig();
      let stringsFilePath = config.get("extractStrings.filePath");
      let lineJoin = config.get("extractStrings.lineJoin");
      if (!stringsFilePath) {
        vscode.window.showErrorMessage('Setting remove-comments.extractStrings.filePath is not defined');
        return;
      }
      const stringsFileURI = vscode.Uri.file(stringsFilePath);
      const stringsDocument = findTextDocument(stringsFileURI);
      if (!stringsDocument) {
        vscode.window.showErrorMessage(`Please visit file, and keep tab: ${stringsFileURI.fsPath}`, "Open file")
          .then( result => {
            if (!result) { return; }
            vscode.commands.executeCommand('vscode.open', stringsFileURI);
          });
        return;
      }
      let document = editor.document;
      const fileBasename = document.uri.path.replace(/^.*\//, '');
      let strings = '';
      const newlineRE = new RegExp(/\r?\n/g);
      for (const textrange of extractedStrings) {
        let text = document.getText(new vscode.Range(textrange[0], textrange[1]));
        text = text.replace(newlineRE, lineJoin);
        strings += `${fileBasename}::${textrange[0].line+1}:${textrange[0].character+1} ${text}\n`;
      }
      let wsedit = new vscode.WorkspaceEdit();
      wsedit.insert(stringsFileURI, new vscode.Position(stringsDocument.lineCount-1, 0), strings);
      vscode.workspace.applyEdit(wsedit);
    };
    if (extractedStrings.length > 0) {
      saveExtractedStrings();
    }
    keepJSDocString = true;
    useKeepCommentSetting = true;
    extractStrings = false;
    extractedStrings = [];
  };

  context.subscriptions.push(vscode.commands.registerTextEditorCommand('remove-comments.removeAllComments', (editor, edit, args) => {
    removeComments(editor, edit, SINGLE_LINE | MULTI_LINE);
  }));
  context.subscriptions.push(vscode.commands.registerTextEditorCommand('remove-comments.removeAllCommentsWithPrefix', async (editor, edit, args) => {
    let prefix = undefined;
    if (args) {
      prefix = getProperty(args, 'prefix');
    } else {
      prefix = await vscode.window.showInputBox({title: 'Comment Prefix'});
    }
    if (prefix === undefined || prefix.length === 0) { return; }
    editor.edit( editBuilder => { removeComments(editor, editBuilder, SINGLE_LINE | MULTI_LINE, prefix); }); // because of the possible await
  }));
  context.subscriptions.push(vscode.commands.registerTextEditorCommand('remove-comments.removeSingleLineComments', (editor, edit, args) => {
    removeComments(editor, edit, SINGLE_LINE);
  }));
  context.subscriptions.push(vscode.commands.registerTextEditorCommand('remove-comments.removeMultilineComments', (editor, edit, args) => {
    removeComments(editor, edit, MULTI_LINE);
  }));
  context.subscriptions.push(vscode.commands.registerTextEditorCommand('remove-comments.markJSDocStringAsComment', () => {
    keepJSDocString = false;
  }));
  context.subscriptions.push(vscode.commands.registerTextEditorCommand('remove-comments.ignoreKeepCommentSetting', () => {
    useKeepCommentSetting = false;
  }));
  context.subscriptions.push(vscode.commands.registerTextEditorCommand('remove-comments.extractStrings', (editor, edit, args) => {
    extractStrings = true;
    removeComments(editor, edit, 0);
  }));
}

function deactivate() { }

module.exports = {
  activate,
  deactivate
}
