"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/js-yaml/lib/common.js
var require_common = __commonJS({
  "node_modules/js-yaml/lib/common.js"(exports, module2) {
    "use strict";
    function isNothing(subject) {
      return typeof subject === "undefined" || subject === null;
    }
    function isObject(subject) {
      return typeof subject === "object" && subject !== null;
    }
    function toArray(sequence) {
      if (Array.isArray(sequence))
        return sequence;
      else if (isNothing(sequence))
        return [];
      return [sequence];
    }
    function extend(target, source) {
      var index, length, key, sourceKeys;
      if (source) {
        sourceKeys = Object.keys(source);
        for (index = 0, length = sourceKeys.length; index < length; index += 1) {
          key = sourceKeys[index];
          target[key] = source[key];
        }
      }
      return target;
    }
    function repeat(string, count) {
      var result = "", cycle;
      for (cycle = 0; cycle < count; cycle += 1) {
        result += string;
      }
      return result;
    }
    function isNegativeZero(number) {
      return number === 0 && Number.NEGATIVE_INFINITY === 1 / number;
    }
    module2.exports.isNothing = isNothing;
    module2.exports.isObject = isObject;
    module2.exports.toArray = toArray;
    module2.exports.repeat = repeat;
    module2.exports.isNegativeZero = isNegativeZero;
    module2.exports.extend = extend;
  }
});

// node_modules/js-yaml/lib/exception.js
var require_exception = __commonJS({
  "node_modules/js-yaml/lib/exception.js"(exports, module2) {
    "use strict";
    function formatError(exception, compact) {
      var where = "", message = exception.reason || "(unknown reason)";
      if (!exception.mark)
        return message;
      if (exception.mark.name) {
        where += 'in "' + exception.mark.name + '" ';
      }
      where += "(" + (exception.mark.line + 1) + ":" + (exception.mark.column + 1) + ")";
      if (!compact && exception.mark.snippet) {
        where += "\n\n" + exception.mark.snippet;
      }
      return message + " " + where;
    }
    function YAMLException(reason, mark) {
      Error.call(this);
      this.name = "YAMLException";
      this.reason = reason;
      this.mark = mark;
      this.message = formatError(this, false);
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      } else {
        this.stack = new Error().stack || "";
      }
    }
    YAMLException.prototype = Object.create(Error.prototype);
    YAMLException.prototype.constructor = YAMLException;
    YAMLException.prototype.toString = function toString(compact) {
      return this.name + ": " + formatError(this, compact);
    };
    module2.exports = YAMLException;
  }
});

// node_modules/js-yaml/lib/snippet.js
var require_snippet = __commonJS({
  "node_modules/js-yaml/lib/snippet.js"(exports, module2) {
    "use strict";
    var common = require_common();
    function getLine(buffer, lineStart, lineEnd, position, maxLineLength) {
      var head = "";
      var tail = "";
      var maxHalfLength = Math.floor(maxLineLength / 2) - 1;
      if (position - lineStart > maxHalfLength) {
        head = " ... ";
        lineStart = position - maxHalfLength + head.length;
      }
      if (lineEnd - position > maxHalfLength) {
        tail = " ...";
        lineEnd = position + maxHalfLength - tail.length;
      }
      return {
        str: head + buffer.slice(lineStart, lineEnd).replace(/\t/g, "\u2192") + tail,
        pos: position - lineStart + head.length
        // relative position
      };
    }
    function padStart(string, max) {
      return common.repeat(" ", max - string.length) + string;
    }
    function makeSnippet(mark, options) {
      options = Object.create(options || null);
      if (!mark.buffer)
        return null;
      if (!options.maxLength)
        options.maxLength = 79;
      if (typeof options.indent !== "number")
        options.indent = 1;
      if (typeof options.linesBefore !== "number")
        options.linesBefore = 3;
      if (typeof options.linesAfter !== "number")
        options.linesAfter = 2;
      var re = /\r?\n|\r|\0/g;
      var lineStarts = [0];
      var lineEnds = [];
      var match;
      var foundLineNo = -1;
      while (match = re.exec(mark.buffer)) {
        lineEnds.push(match.index);
        lineStarts.push(match.index + match[0].length);
        if (mark.position <= match.index && foundLineNo < 0) {
          foundLineNo = lineStarts.length - 2;
        }
      }
      if (foundLineNo < 0)
        foundLineNo = lineStarts.length - 1;
      var result = "", i, line;
      var lineNoLength = Math.min(mark.line + options.linesAfter, lineEnds.length).toString().length;
      var maxLineLength = options.maxLength - (options.indent + lineNoLength + 3);
      for (i = 1; i <= options.linesBefore; i++) {
        if (foundLineNo - i < 0)
          break;
        line = getLine(
          mark.buffer,
          lineStarts[foundLineNo - i],
          lineEnds[foundLineNo - i],
          mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo - i]),
          maxLineLength
        );
        result = common.repeat(" ", options.indent) + padStart((mark.line - i + 1).toString(), lineNoLength) + " | " + line.str + "\n" + result;
      }
      line = getLine(mark.buffer, lineStarts[foundLineNo], lineEnds[foundLineNo], mark.position, maxLineLength);
      result += common.repeat(" ", options.indent) + padStart((mark.line + 1).toString(), lineNoLength) + " | " + line.str + "\n";
      result += common.repeat("-", options.indent + lineNoLength + 3 + line.pos) + "^\n";
      for (i = 1; i <= options.linesAfter; i++) {
        if (foundLineNo + i >= lineEnds.length)
          break;
        line = getLine(
          mark.buffer,
          lineStarts[foundLineNo + i],
          lineEnds[foundLineNo + i],
          mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo + i]),
          maxLineLength
        );
        result += common.repeat(" ", options.indent) + padStart((mark.line + i + 1).toString(), lineNoLength) + " | " + line.str + "\n";
      }
      return result.replace(/\n$/, "");
    }
    module2.exports = makeSnippet;
  }
});

// node_modules/js-yaml/lib/type.js
var require_type = __commonJS({
  "node_modules/js-yaml/lib/type.js"(exports, module2) {
    "use strict";
    var YAMLException = require_exception();
    var TYPE_CONSTRUCTOR_OPTIONS = [
      "kind",
      "multi",
      "resolve",
      "construct",
      "instanceOf",
      "predicate",
      "represent",
      "representName",
      "defaultStyle",
      "styleAliases"
    ];
    var YAML_NODE_KINDS = [
      "scalar",
      "sequence",
      "mapping"
    ];
    function compileStyleAliases(map) {
      var result = {};
      if (map !== null) {
        Object.keys(map).forEach(function(style) {
          map[style].forEach(function(alias) {
            result[String(alias)] = style;
          });
        });
      }
      return result;
    }
    function Type(tag, options) {
      options = options || {};
      Object.keys(options).forEach(function(name) {
        if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) {
          throw new YAMLException('Unknown option "' + name + '" is met in definition of "' + tag + '" YAML type.');
        }
      });
      this.options = options;
      this.tag = tag;
      this.kind = options["kind"] || null;
      this.resolve = options["resolve"] || function() {
        return true;
      };
      this.construct = options["construct"] || function(data) {
        return data;
      };
      this.instanceOf = options["instanceOf"] || null;
      this.predicate = options["predicate"] || null;
      this.represent = options["represent"] || null;
      this.representName = options["representName"] || null;
      this.defaultStyle = options["defaultStyle"] || null;
      this.multi = options["multi"] || false;
      this.styleAliases = compileStyleAliases(options["styleAliases"] || null);
      if (YAML_NODE_KINDS.indexOf(this.kind) === -1) {
        throw new YAMLException('Unknown kind "' + this.kind + '" is specified for "' + tag + '" YAML type.');
      }
    }
    module2.exports = Type;
  }
});

// node_modules/js-yaml/lib/schema.js
var require_schema = __commonJS({
  "node_modules/js-yaml/lib/schema.js"(exports, module2) {
    "use strict";
    var YAMLException = require_exception();
    var Type = require_type();
    function compileList(schema, name) {
      var result = [];
      schema[name].forEach(function(currentType) {
        var newIndex = result.length;
        result.forEach(function(previousType, previousIndex) {
          if (previousType.tag === currentType.tag && previousType.kind === currentType.kind && previousType.multi === currentType.multi) {
            newIndex = previousIndex;
          }
        });
        result[newIndex] = currentType;
      });
      return result;
    }
    function compileMap() {
      var result = {
        scalar: {},
        sequence: {},
        mapping: {},
        fallback: {},
        multi: {
          scalar: [],
          sequence: [],
          mapping: [],
          fallback: []
        }
      }, index, length;
      function collectType(type) {
        if (type.multi) {
          result.multi[type.kind].push(type);
          result.multi["fallback"].push(type);
        } else {
          result[type.kind][type.tag] = result["fallback"][type.tag] = type;
        }
      }
      for (index = 0, length = arguments.length; index < length; index += 1) {
        arguments[index].forEach(collectType);
      }
      return result;
    }
    function Schema(definition) {
      return this.extend(definition);
    }
    Schema.prototype.extend = function extend(definition) {
      var implicit = [];
      var explicit = [];
      if (definition instanceof Type) {
        explicit.push(definition);
      } else if (Array.isArray(definition)) {
        explicit = explicit.concat(definition);
      } else if (definition && (Array.isArray(definition.implicit) || Array.isArray(definition.explicit))) {
        if (definition.implicit)
          implicit = implicit.concat(definition.implicit);
        if (definition.explicit)
          explicit = explicit.concat(definition.explicit);
      } else {
        throw new YAMLException("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");
      }
      implicit.forEach(function(type) {
        if (!(type instanceof Type)) {
          throw new YAMLException("Specified list of YAML types (or a single Type object) contains a non-Type object.");
        }
        if (type.loadKind && type.loadKind !== "scalar") {
          throw new YAMLException("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
        }
        if (type.multi) {
          throw new YAMLException("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.");
        }
      });
      explicit.forEach(function(type) {
        if (!(type instanceof Type)) {
          throw new YAMLException("Specified list of YAML types (or a single Type object) contains a non-Type object.");
        }
      });
      var result = Object.create(Schema.prototype);
      result.implicit = (this.implicit || []).concat(implicit);
      result.explicit = (this.explicit || []).concat(explicit);
      result.compiledImplicit = compileList(result, "implicit");
      result.compiledExplicit = compileList(result, "explicit");
      result.compiledTypeMap = compileMap(result.compiledImplicit, result.compiledExplicit);
      return result;
    };
    module2.exports = Schema;
  }
});

// node_modules/js-yaml/lib/type/str.js
var require_str = __commonJS({
  "node_modules/js-yaml/lib/type/str.js"(exports, module2) {
    "use strict";
    var Type = require_type();
    module2.exports = new Type("tag:yaml.org,2002:str", {
      kind: "scalar",
      construct: function(data) {
        return data !== null ? data : "";
      }
    });
  }
});

// node_modules/js-yaml/lib/type/seq.js
var require_seq = __commonJS({
  "node_modules/js-yaml/lib/type/seq.js"(exports, module2) {
    "use strict";
    var Type = require_type();
    module2.exports = new Type("tag:yaml.org,2002:seq", {
      kind: "sequence",
      construct: function(data) {
        return data !== null ? data : [];
      }
    });
  }
});

// node_modules/js-yaml/lib/type/map.js
var require_map = __commonJS({
  "node_modules/js-yaml/lib/type/map.js"(exports, module2) {
    "use strict";
    var Type = require_type();
    module2.exports = new Type("tag:yaml.org,2002:map", {
      kind: "mapping",
      construct: function(data) {
        return data !== null ? data : {};
      }
    });
  }
});

// node_modules/js-yaml/lib/schema/failsafe.js
var require_failsafe = __commonJS({
  "node_modules/js-yaml/lib/schema/failsafe.js"(exports, module2) {
    "use strict";
    var Schema = require_schema();
    module2.exports = new Schema({
      explicit: [
        require_str(),
        require_seq(),
        require_map()
      ]
    });
  }
});

// node_modules/js-yaml/lib/type/null.js
var require_null = __commonJS({
  "node_modules/js-yaml/lib/type/null.js"(exports, module2) {
    "use strict";
    var Type = require_type();
    function resolveYamlNull(data) {
      if (data === null)
        return true;
      var max = data.length;
      return max === 1 && data === "~" || max === 4 && (data === "null" || data === "Null" || data === "NULL");
    }
    function constructYamlNull() {
      return null;
    }
    function isNull(object) {
      return object === null;
    }
    module2.exports = new Type("tag:yaml.org,2002:null", {
      kind: "scalar",
      resolve: resolveYamlNull,
      construct: constructYamlNull,
      predicate: isNull,
      represent: {
        canonical: function() {
          return "~";
        },
        lowercase: function() {
          return "null";
        },
        uppercase: function() {
          return "NULL";
        },
        camelcase: function() {
          return "Null";
        },
        empty: function() {
          return "";
        }
      },
      defaultStyle: "lowercase"
    });
  }
});

// node_modules/js-yaml/lib/type/bool.js
var require_bool = __commonJS({
  "node_modules/js-yaml/lib/type/bool.js"(exports, module2) {
    "use strict";
    var Type = require_type();
    function resolveYamlBoolean(data) {
      if (data === null)
        return false;
      var max = data.length;
      return max === 4 && (data === "true" || data === "True" || data === "TRUE") || max === 5 && (data === "false" || data === "False" || data === "FALSE");
    }
    function constructYamlBoolean(data) {
      return data === "true" || data === "True" || data === "TRUE";
    }
    function isBoolean(object) {
      return Object.prototype.toString.call(object) === "[object Boolean]";
    }
    module2.exports = new Type("tag:yaml.org,2002:bool", {
      kind: "scalar",
      resolve: resolveYamlBoolean,
      construct: constructYamlBoolean,
      predicate: isBoolean,
      represent: {
        lowercase: function(object) {
          return object ? "true" : "false";
        },
        uppercase: function(object) {
          return object ? "TRUE" : "FALSE";
        },
        camelcase: function(object) {
          return object ? "True" : "False";
        }
      },
      defaultStyle: "lowercase"
    });
  }
});

// node_modules/js-yaml/lib/type/int.js
var require_int = __commonJS({
  "node_modules/js-yaml/lib/type/int.js"(exports, module2) {
    "use strict";
    var common = require_common();
    var Type = require_type();
    function isHexCode(c) {
      return 48 <= c && c <= 57 || 65 <= c && c <= 70 || 97 <= c && c <= 102;
    }
    function isOctCode(c) {
      return 48 <= c && c <= 55;
    }
    function isDecCode(c) {
      return 48 <= c && c <= 57;
    }
    function resolveYamlInteger(data) {
      if (data === null)
        return false;
      var max = data.length, index = 0, hasDigits = false, ch;
      if (!max)
        return false;
      ch = data[index];
      if (ch === "-" || ch === "+") {
        ch = data[++index];
      }
      if (ch === "0") {
        if (index + 1 === max)
          return true;
        ch = data[++index];
        if (ch === "b") {
          index++;
          for (; index < max; index++) {
            ch = data[index];
            if (ch === "_")
              continue;
            if (ch !== "0" && ch !== "1")
              return false;
            hasDigits = true;
          }
          return hasDigits && ch !== "_";
        }
        if (ch === "x") {
          index++;
          for (; index < max; index++) {
            ch = data[index];
            if (ch === "_")
              continue;
            if (!isHexCode(data.charCodeAt(index)))
              return false;
            hasDigits = true;
          }
          return hasDigits && ch !== "_";
        }
        if (ch === "o") {
          index++;
          for (; index < max; index++) {
            ch = data[index];
            if (ch === "_")
              continue;
            if (!isOctCode(data.charCodeAt(index)))
              return false;
            hasDigits = true;
          }
          return hasDigits && ch !== "_";
        }
      }
      if (ch === "_")
        return false;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_")
          continue;
        if (!isDecCode(data.charCodeAt(index))) {
          return false;
        }
        hasDigits = true;
      }
      if (!hasDigits || ch === "_")
        return false;
      return true;
    }
    function constructYamlInteger(data) {
      var value = data, sign = 1, ch;
      if (value.indexOf("_") !== -1) {
        value = value.replace(/_/g, "");
      }
      ch = value[0];
      if (ch === "-" || ch === "+") {
        if (ch === "-")
          sign = -1;
        value = value.slice(1);
        ch = value[0];
      }
      if (value === "0")
        return 0;
      if (ch === "0") {
        if (value[1] === "b")
          return sign * parseInt(value.slice(2), 2);
        if (value[1] === "x")
          return sign * parseInt(value.slice(2), 16);
        if (value[1] === "o")
          return sign * parseInt(value.slice(2), 8);
      }
      return sign * parseInt(value, 10);
    }
    function isInteger(object) {
      return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 === 0 && !common.isNegativeZero(object));
    }
    module2.exports = new Type("tag:yaml.org,2002:int", {
      kind: "scalar",
      resolve: resolveYamlInteger,
      construct: constructYamlInteger,
      predicate: isInteger,
      represent: {
        binary: function(obj) {
          return obj >= 0 ? "0b" + obj.toString(2) : "-0b" + obj.toString(2).slice(1);
        },
        octal: function(obj) {
          return obj >= 0 ? "0o" + obj.toString(8) : "-0o" + obj.toString(8).slice(1);
        },
        decimal: function(obj) {
          return obj.toString(10);
        },
        /* eslint-disable max-len */
        hexadecimal: function(obj) {
          return obj >= 0 ? "0x" + obj.toString(16).toUpperCase() : "-0x" + obj.toString(16).toUpperCase().slice(1);
        }
      },
      defaultStyle: "decimal",
      styleAliases: {
        binary: [2, "bin"],
        octal: [8, "oct"],
        decimal: [10, "dec"],
        hexadecimal: [16, "hex"]
      }
    });
  }
});

// node_modules/js-yaml/lib/type/float.js
var require_float = __commonJS({
  "node_modules/js-yaml/lib/type/float.js"(exports, module2) {
    "use strict";
    var common = require_common();
    var Type = require_type();
    var YAML_FLOAT_PATTERN = new RegExp(
      // 2.5e4, 2.5 and integers
      "^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"
    );
    function resolveYamlFloat(data) {
      if (data === null)
        return false;
      if (!YAML_FLOAT_PATTERN.test(data) || // Quick hack to not allow integers end with `_`
      // Probably should update regexp & check speed
      data[data.length - 1] === "_") {
        return false;
      }
      return true;
    }
    function constructYamlFloat(data) {
      var value, sign;
      value = data.replace(/_/g, "").toLowerCase();
      sign = value[0] === "-" ? -1 : 1;
      if ("+-".indexOf(value[0]) >= 0) {
        value = value.slice(1);
      }
      if (value === ".inf") {
        return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
      } else if (value === ".nan") {
        return NaN;
      }
      return sign * parseFloat(value, 10);
    }
    var SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
    function representYamlFloat(object, style) {
      var res;
      if (isNaN(object)) {
        switch (style) {
          case "lowercase":
            return ".nan";
          case "uppercase":
            return ".NAN";
          case "camelcase":
            return ".NaN";
        }
      } else if (Number.POSITIVE_INFINITY === object) {
        switch (style) {
          case "lowercase":
            return ".inf";
          case "uppercase":
            return ".INF";
          case "camelcase":
            return ".Inf";
        }
      } else if (Number.NEGATIVE_INFINITY === object) {
        switch (style) {
          case "lowercase":
            return "-.inf";
          case "uppercase":
            return "-.INF";
          case "camelcase":
            return "-.Inf";
        }
      } else if (common.isNegativeZero(object)) {
        return "-0.0";
      }
      res = object.toString(10);
      return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
    }
    function isFloat(object) {
      return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 !== 0 || common.isNegativeZero(object));
    }
    module2.exports = new Type("tag:yaml.org,2002:float", {
      kind: "scalar",
      resolve: resolveYamlFloat,
      construct: constructYamlFloat,
      predicate: isFloat,
      represent: representYamlFloat,
      defaultStyle: "lowercase"
    });
  }
});

// node_modules/js-yaml/lib/schema/json.js
var require_json = __commonJS({
  "node_modules/js-yaml/lib/schema/json.js"(exports, module2) {
    "use strict";
    module2.exports = require_failsafe().extend({
      implicit: [
        require_null(),
        require_bool(),
        require_int(),
        require_float()
      ]
    });
  }
});

// node_modules/js-yaml/lib/schema/core.js
var require_core = __commonJS({
  "node_modules/js-yaml/lib/schema/core.js"(exports, module2) {
    "use strict";
    module2.exports = require_json();
  }
});

// node_modules/js-yaml/lib/type/timestamp.js
var require_timestamp = __commonJS({
  "node_modules/js-yaml/lib/type/timestamp.js"(exports, module2) {
    "use strict";
    var Type = require_type();
    var YAML_DATE_REGEXP = new RegExp(
      "^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"
    );
    var YAML_TIMESTAMP_REGEXP = new RegExp(
      "^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$"
    );
    function resolveYamlTimestamp(data) {
      if (data === null)
        return false;
      if (YAML_DATE_REGEXP.exec(data) !== null)
        return true;
      if (YAML_TIMESTAMP_REGEXP.exec(data) !== null)
        return true;
      return false;
    }
    function constructYamlTimestamp(data) {
      var match, year, month, day, hour, minute, second, fraction = 0, delta = null, tz_hour, tz_minute, date;
      match = YAML_DATE_REGEXP.exec(data);
      if (match === null)
        match = YAML_TIMESTAMP_REGEXP.exec(data);
      if (match === null)
        throw new Error("Date resolve error");
      year = +match[1];
      month = +match[2] - 1;
      day = +match[3];
      if (!match[4]) {
        return new Date(Date.UTC(year, month, day));
      }
      hour = +match[4];
      minute = +match[5];
      second = +match[6];
      if (match[7]) {
        fraction = match[7].slice(0, 3);
        while (fraction.length < 3) {
          fraction += "0";
        }
        fraction = +fraction;
      }
      if (match[9]) {
        tz_hour = +match[10];
        tz_minute = +(match[11] || 0);
        delta = (tz_hour * 60 + tz_minute) * 6e4;
        if (match[9] === "-")
          delta = -delta;
      }
      date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
      if (delta)
        date.setTime(date.getTime() - delta);
      return date;
    }
    function representYamlTimestamp(object) {
      return object.toISOString();
    }
    module2.exports = new Type("tag:yaml.org,2002:timestamp", {
      kind: "scalar",
      resolve: resolveYamlTimestamp,
      construct: constructYamlTimestamp,
      instanceOf: Date,
      represent: representYamlTimestamp
    });
  }
});

// node_modules/js-yaml/lib/type/merge.js
var require_merge = __commonJS({
  "node_modules/js-yaml/lib/type/merge.js"(exports, module2) {
    "use strict";
    var Type = require_type();
    function resolveYamlMerge(data) {
      return data === "<<" || data === null;
    }
    module2.exports = new Type("tag:yaml.org,2002:merge", {
      kind: "scalar",
      resolve: resolveYamlMerge
    });
  }
});

// node_modules/js-yaml/lib/type/binary.js
var require_binary = __commonJS({
  "node_modules/js-yaml/lib/type/binary.js"(exports, module2) {
    "use strict";
    var Type = require_type();
    var BASE64_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
    function resolveYamlBinary(data) {
      if (data === null)
        return false;
      var code, idx, bitlen = 0, max = data.length, map = BASE64_MAP;
      for (idx = 0; idx < max; idx++) {
        code = map.indexOf(data.charAt(idx));
        if (code > 64)
          continue;
        if (code < 0)
          return false;
        bitlen += 6;
      }
      return bitlen % 8 === 0;
    }
    function constructYamlBinary(data) {
      var idx, tailbits, input = data.replace(/[\r\n=]/g, ""), max = input.length, map = BASE64_MAP, bits = 0, result = [];
      for (idx = 0; idx < max; idx++) {
        if (idx % 4 === 0 && idx) {
          result.push(bits >> 16 & 255);
          result.push(bits >> 8 & 255);
          result.push(bits & 255);
        }
        bits = bits << 6 | map.indexOf(input.charAt(idx));
      }
      tailbits = max % 4 * 6;
      if (tailbits === 0) {
        result.push(bits >> 16 & 255);
        result.push(bits >> 8 & 255);
        result.push(bits & 255);
      } else if (tailbits === 18) {
        result.push(bits >> 10 & 255);
        result.push(bits >> 2 & 255);
      } else if (tailbits === 12) {
        result.push(bits >> 4 & 255);
      }
      return new Uint8Array(result);
    }
    function representYamlBinary(object) {
      var result = "", bits = 0, idx, tail, max = object.length, map = BASE64_MAP;
      for (idx = 0; idx < max; idx++) {
        if (idx % 3 === 0 && idx) {
          result += map[bits >> 18 & 63];
          result += map[bits >> 12 & 63];
          result += map[bits >> 6 & 63];
          result += map[bits & 63];
        }
        bits = (bits << 8) + object[idx];
      }
      tail = max % 3;
      if (tail === 0) {
        result += map[bits >> 18 & 63];
        result += map[bits >> 12 & 63];
        result += map[bits >> 6 & 63];
        result += map[bits & 63];
      } else if (tail === 2) {
        result += map[bits >> 10 & 63];
        result += map[bits >> 4 & 63];
        result += map[bits << 2 & 63];
        result += map[64];
      } else if (tail === 1) {
        result += map[bits >> 2 & 63];
        result += map[bits << 4 & 63];
        result += map[64];
        result += map[64];
      }
      return result;
    }
    function isBinary(obj) {
      return Object.prototype.toString.call(obj) === "[object Uint8Array]";
    }
    module2.exports = new Type("tag:yaml.org,2002:binary", {
      kind: "scalar",
      resolve: resolveYamlBinary,
      construct: constructYamlBinary,
      predicate: isBinary,
      represent: representYamlBinary
    });
  }
});

// node_modules/js-yaml/lib/type/omap.js
var require_omap = __commonJS({
  "node_modules/js-yaml/lib/type/omap.js"(exports, module2) {
    "use strict";
    var Type = require_type();
    var _hasOwnProperty = Object.prototype.hasOwnProperty;
    var _toString = Object.prototype.toString;
    function resolveYamlOmap(data) {
      if (data === null)
        return true;
      var objectKeys = [], index, length, pair, pairKey, pairHasKey, object = data;
      for (index = 0, length = object.length; index < length; index += 1) {
        pair = object[index];
        pairHasKey = false;
        if (_toString.call(pair) !== "[object Object]")
          return false;
        for (pairKey in pair) {
          if (_hasOwnProperty.call(pair, pairKey)) {
            if (!pairHasKey)
              pairHasKey = true;
            else
              return false;
          }
        }
        if (!pairHasKey)
          return false;
        if (objectKeys.indexOf(pairKey) === -1)
          objectKeys.push(pairKey);
        else
          return false;
      }
      return true;
    }
    function constructYamlOmap(data) {
      return data !== null ? data : [];
    }
    module2.exports = new Type("tag:yaml.org,2002:omap", {
      kind: "sequence",
      resolve: resolveYamlOmap,
      construct: constructYamlOmap
    });
  }
});

// node_modules/js-yaml/lib/type/pairs.js
var require_pairs = __commonJS({
  "node_modules/js-yaml/lib/type/pairs.js"(exports, module2) {
    "use strict";
    var Type = require_type();
    var _toString = Object.prototype.toString;
    function resolveYamlPairs(data) {
      if (data === null)
        return true;
      var index, length, pair, keys, result, object = data;
      result = new Array(object.length);
      for (index = 0, length = object.length; index < length; index += 1) {
        pair = object[index];
        if (_toString.call(pair) !== "[object Object]")
          return false;
        keys = Object.keys(pair);
        if (keys.length !== 1)
          return false;
        result[index] = [keys[0], pair[keys[0]]];
      }
      return true;
    }
    function constructYamlPairs(data) {
      if (data === null)
        return [];
      var index, length, pair, keys, result, object = data;
      result = new Array(object.length);
      for (index = 0, length = object.length; index < length; index += 1) {
        pair = object[index];
        keys = Object.keys(pair);
        result[index] = [keys[0], pair[keys[0]]];
      }
      return result;
    }
    module2.exports = new Type("tag:yaml.org,2002:pairs", {
      kind: "sequence",
      resolve: resolveYamlPairs,
      construct: constructYamlPairs
    });
  }
});

// node_modules/js-yaml/lib/type/set.js
var require_set = __commonJS({
  "node_modules/js-yaml/lib/type/set.js"(exports, module2) {
    "use strict";
    var Type = require_type();
    var _hasOwnProperty = Object.prototype.hasOwnProperty;
    function resolveYamlSet(data) {
      if (data === null)
        return true;
      var key, object = data;
      for (key in object) {
        if (_hasOwnProperty.call(object, key)) {
          if (object[key] !== null)
            return false;
        }
      }
      return true;
    }
    function constructYamlSet(data) {
      return data !== null ? data : {};
    }
    module2.exports = new Type("tag:yaml.org,2002:set", {
      kind: "mapping",
      resolve: resolveYamlSet,
      construct: constructYamlSet
    });
  }
});

// node_modules/js-yaml/lib/schema/default.js
var require_default = __commonJS({
  "node_modules/js-yaml/lib/schema/default.js"(exports, module2) {
    "use strict";
    module2.exports = require_core().extend({
      implicit: [
        require_timestamp(),
        require_merge()
      ],
      explicit: [
        require_binary(),
        require_omap(),
        require_pairs(),
        require_set()
      ]
    });
  }
});

// node_modules/js-yaml/lib/loader.js
var require_loader = __commonJS({
  "node_modules/js-yaml/lib/loader.js"(exports, module2) {
    "use strict";
    var common = require_common();
    var YAMLException = require_exception();
    var makeSnippet = require_snippet();
    var DEFAULT_SCHEMA = require_default();
    var _hasOwnProperty = Object.prototype.hasOwnProperty;
    var CONTEXT_FLOW_IN = 1;
    var CONTEXT_FLOW_OUT = 2;
    var CONTEXT_BLOCK_IN = 3;
    var CONTEXT_BLOCK_OUT = 4;
    var CHOMPING_CLIP = 1;
    var CHOMPING_STRIP = 2;
    var CHOMPING_KEEP = 3;
    var PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
    var PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
    var PATTERN_FLOW_INDICATORS = /[,\[\]\{\}]/;
    var PATTERN_TAG_HANDLE = /^(?:!|!!|![a-z\-]+!)$/i;
    var PATTERN_TAG_URI = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
    function _class(obj) {
      return Object.prototype.toString.call(obj);
    }
    function is_EOL(c) {
      return c === 10 || c === 13;
    }
    function is_WHITE_SPACE(c) {
      return c === 9 || c === 32;
    }
    function is_WS_OR_EOL(c) {
      return c === 9 || c === 32 || c === 10 || c === 13;
    }
    function is_FLOW_INDICATOR(c) {
      return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
    }
    function fromHexCode(c) {
      var lc;
      if (48 <= c && c <= 57) {
        return c - 48;
      }
      lc = c | 32;
      if (97 <= lc && lc <= 102) {
        return lc - 97 + 10;
      }
      return -1;
    }
    function escapedHexLen(c) {
      if (c === 120) {
        return 2;
      }
      if (c === 117) {
        return 4;
      }
      if (c === 85) {
        return 8;
      }
      return 0;
    }
    function fromDecimalCode(c) {
      if (48 <= c && c <= 57) {
        return c - 48;
      }
      return -1;
    }
    function simpleEscapeSequence(c) {
      return c === 48 ? "\0" : c === 97 ? "\x07" : c === 98 ? "\b" : c === 116 ? "	" : c === 9 ? "	" : c === 110 ? "\n" : c === 118 ? "\v" : c === 102 ? "\f" : c === 114 ? "\r" : c === 101 ? "\x1B" : c === 32 ? " " : c === 34 ? '"' : c === 47 ? "/" : c === 92 ? "\\" : c === 78 ? "\x85" : c === 95 ? "\xA0" : c === 76 ? "\u2028" : c === 80 ? "\u2029" : "";
    }
    function charFromCodepoint(c) {
      if (c <= 65535) {
        return String.fromCharCode(c);
      }
      return String.fromCharCode(
        (c - 65536 >> 10) + 55296,
        (c - 65536 & 1023) + 56320
      );
    }
    var simpleEscapeCheck = new Array(256);
    var simpleEscapeMap = new Array(256);
    for (i = 0; i < 256; i++) {
      simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
      simpleEscapeMap[i] = simpleEscapeSequence(i);
    }
    var i;
    function State(input, options) {
      this.input = input;
      this.filename = options["filename"] || null;
      this.schema = options["schema"] || DEFAULT_SCHEMA;
      this.onWarning = options["onWarning"] || null;
      this.legacy = options["legacy"] || false;
      this.json = options["json"] || false;
      this.listener = options["listener"] || null;
      this.implicitTypes = this.schema.compiledImplicit;
      this.typeMap = this.schema.compiledTypeMap;
      this.length = input.length;
      this.position = 0;
      this.line = 0;
      this.lineStart = 0;
      this.lineIndent = 0;
      this.firstTabInLine = -1;
      this.documents = [];
    }
    function generateError(state, message) {
      var mark = {
        name: state.filename,
        buffer: state.input.slice(0, -1),
        // omit trailing \0
        position: state.position,
        line: state.line,
        column: state.position - state.lineStart
      };
      mark.snippet = makeSnippet(mark);
      return new YAMLException(message, mark);
    }
    function throwError(state, message) {
      throw generateError(state, message);
    }
    function throwWarning(state, message) {
      if (state.onWarning) {
        state.onWarning.call(null, generateError(state, message));
      }
    }
    var directiveHandlers = {
      YAML: function handleYamlDirective(state, name, args) {
        var match, major, minor;
        if (state.version !== null) {
          throwError(state, "duplication of %YAML directive");
        }
        if (args.length !== 1) {
          throwError(state, "YAML directive accepts exactly one argument");
        }
        match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
        if (match === null) {
          throwError(state, "ill-formed argument of the YAML directive");
        }
        major = parseInt(match[1], 10);
        minor = parseInt(match[2], 10);
        if (major !== 1) {
          throwError(state, "unacceptable YAML version of the document");
        }
        state.version = args[0];
        state.checkLineBreaks = minor < 2;
        if (minor !== 1 && minor !== 2) {
          throwWarning(state, "unsupported YAML version of the document");
        }
      },
      TAG: function handleTagDirective(state, name, args) {
        var handle, prefix;
        if (args.length !== 2) {
          throwError(state, "TAG directive accepts exactly two arguments");
        }
        handle = args[0];
        prefix = args[1];
        if (!PATTERN_TAG_HANDLE.test(handle)) {
          throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
        }
        if (_hasOwnProperty.call(state.tagMap, handle)) {
          throwError(state, 'there is a previously declared suffix for "' + handle + '" tag handle');
        }
        if (!PATTERN_TAG_URI.test(prefix)) {
          throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
        }
        try {
          prefix = decodeURIComponent(prefix);
        } catch (err) {
          throwError(state, "tag prefix is malformed: " + prefix);
        }
        state.tagMap[handle] = prefix;
      }
    };
    function captureSegment(state, start, end, checkJson) {
      var _position, _length, _character, _result;
      if (start < end) {
        _result = state.input.slice(start, end);
        if (checkJson) {
          for (_position = 0, _length = _result.length; _position < _length; _position += 1) {
            _character = _result.charCodeAt(_position);
            if (!(_character === 9 || 32 <= _character && _character <= 1114111)) {
              throwError(state, "expected valid JSON character");
            }
          }
        } else if (PATTERN_NON_PRINTABLE.test(_result)) {
          throwError(state, "the stream contains non-printable characters");
        }
        state.result += _result;
      }
    }
    function mergeMappings(state, destination, source, overridableKeys) {
      var sourceKeys, key, index, quantity;
      if (!common.isObject(source)) {
        throwError(state, "cannot merge mappings; the provided source object is unacceptable");
      }
      sourceKeys = Object.keys(source);
      for (index = 0, quantity = sourceKeys.length; index < quantity; index += 1) {
        key = sourceKeys[index];
        if (!_hasOwnProperty.call(destination, key)) {
          destination[key] = source[key];
          overridableKeys[key] = true;
        }
      }
    }
    function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startLineStart, startPos) {
      var index, quantity;
      if (Array.isArray(keyNode)) {
        keyNode = Array.prototype.slice.call(keyNode);
        for (index = 0, quantity = keyNode.length; index < quantity; index += 1) {
          if (Array.isArray(keyNode[index])) {
            throwError(state, "nested arrays are not supported inside keys");
          }
          if (typeof keyNode === "object" && _class(keyNode[index]) === "[object Object]") {
            keyNode[index] = "[object Object]";
          }
        }
      }
      if (typeof keyNode === "object" && _class(keyNode) === "[object Object]") {
        keyNode = "[object Object]";
      }
      keyNode = String(keyNode);
      if (_result === null) {
        _result = {};
      }
      if (keyTag === "tag:yaml.org,2002:merge") {
        if (Array.isArray(valueNode)) {
          for (index = 0, quantity = valueNode.length; index < quantity; index += 1) {
            mergeMappings(state, _result, valueNode[index], overridableKeys);
          }
        } else {
          mergeMappings(state, _result, valueNode, overridableKeys);
        }
      } else {
        if (!state.json && !_hasOwnProperty.call(overridableKeys, keyNode) && _hasOwnProperty.call(_result, keyNode)) {
          state.line = startLine || state.line;
          state.lineStart = startLineStart || state.lineStart;
          state.position = startPos || state.position;
          throwError(state, "duplicated mapping key");
        }
        if (keyNode === "__proto__") {
          Object.defineProperty(_result, keyNode, {
            configurable: true,
            enumerable: true,
            writable: true,
            value: valueNode
          });
        } else {
          _result[keyNode] = valueNode;
        }
        delete overridableKeys[keyNode];
      }
      return _result;
    }
    function readLineBreak(state) {
      var ch;
      ch = state.input.charCodeAt(state.position);
      if (ch === 10) {
        state.position++;
      } else if (ch === 13) {
        state.position++;
        if (state.input.charCodeAt(state.position) === 10) {
          state.position++;
        }
      } else {
        throwError(state, "a line break is expected");
      }
      state.line += 1;
      state.lineStart = state.position;
      state.firstTabInLine = -1;
    }
    function skipSeparationSpace(state, allowComments, checkIndent) {
      var lineBreaks = 0, ch = state.input.charCodeAt(state.position);
      while (ch !== 0) {
        while (is_WHITE_SPACE(ch)) {
          if (ch === 9 && state.firstTabInLine === -1) {
            state.firstTabInLine = state.position;
          }
          ch = state.input.charCodeAt(++state.position);
        }
        if (allowComments && ch === 35) {
          do {
            ch = state.input.charCodeAt(++state.position);
          } while (ch !== 10 && ch !== 13 && ch !== 0);
        }
        if (is_EOL(ch)) {
          readLineBreak(state);
          ch = state.input.charCodeAt(state.position);
          lineBreaks++;
          state.lineIndent = 0;
          while (ch === 32) {
            state.lineIndent++;
            ch = state.input.charCodeAt(++state.position);
          }
        } else {
          break;
        }
      }
      if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) {
        throwWarning(state, "deficient indentation");
      }
      return lineBreaks;
    }
    function testDocumentSeparator(state) {
      var _position = state.position, ch;
      ch = state.input.charCodeAt(_position);
      if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(_position + 1) && ch === state.input.charCodeAt(_position + 2)) {
        _position += 3;
        ch = state.input.charCodeAt(_position);
        if (ch === 0 || is_WS_OR_EOL(ch)) {
          return true;
        }
      }
      return false;
    }
    function writeFoldedLines(state, count) {
      if (count === 1) {
        state.result += " ";
      } else if (count > 1) {
        state.result += common.repeat("\n", count - 1);
      }
    }
    function readPlainScalar(state, nodeIndent, withinFlowCollection) {
      var preceding, following, captureStart, captureEnd, hasPendingContent, _line, _lineStart, _lineIndent, _kind = state.kind, _result = state.result, ch;
      ch = state.input.charCodeAt(state.position);
      if (is_WS_OR_EOL(ch) || is_FLOW_INDICATOR(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96) {
        return false;
      }
      if (ch === 63 || ch === 45) {
        following = state.input.charCodeAt(state.position + 1);
        if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
          return false;
        }
      }
      state.kind = "scalar";
      state.result = "";
      captureStart = captureEnd = state.position;
      hasPendingContent = false;
      while (ch !== 0) {
        if (ch === 58) {
          following = state.input.charCodeAt(state.position + 1);
          if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
            break;
          }
        } else if (ch === 35) {
          preceding = state.input.charCodeAt(state.position - 1);
          if (is_WS_OR_EOL(preceding)) {
            break;
          }
        } else if (state.position === state.lineStart && testDocumentSeparator(state) || withinFlowCollection && is_FLOW_INDICATOR(ch)) {
          break;
        } else if (is_EOL(ch)) {
          _line = state.line;
          _lineStart = state.lineStart;
          _lineIndent = state.lineIndent;
          skipSeparationSpace(state, false, -1);
          if (state.lineIndent >= nodeIndent) {
            hasPendingContent = true;
            ch = state.input.charCodeAt(state.position);
            continue;
          } else {
            state.position = captureEnd;
            state.line = _line;
            state.lineStart = _lineStart;
            state.lineIndent = _lineIndent;
            break;
          }
        }
        if (hasPendingContent) {
          captureSegment(state, captureStart, captureEnd, false);
          writeFoldedLines(state, state.line - _line);
          captureStart = captureEnd = state.position;
          hasPendingContent = false;
        }
        if (!is_WHITE_SPACE(ch)) {
          captureEnd = state.position + 1;
        }
        ch = state.input.charCodeAt(++state.position);
      }
      captureSegment(state, captureStart, captureEnd, false);
      if (state.result) {
        return true;
      }
      state.kind = _kind;
      state.result = _result;
      return false;
    }
    function readSingleQuotedScalar(state, nodeIndent) {
      var ch, captureStart, captureEnd;
      ch = state.input.charCodeAt(state.position);
      if (ch !== 39) {
        return false;
      }
      state.kind = "scalar";
      state.result = "";
      state.position++;
      captureStart = captureEnd = state.position;
      while ((ch = state.input.charCodeAt(state.position)) !== 0) {
        if (ch === 39) {
          captureSegment(state, captureStart, state.position, true);
          ch = state.input.charCodeAt(++state.position);
          if (ch === 39) {
            captureStart = state.position;
            state.position++;
            captureEnd = state.position;
          } else {
            return true;
          }
        } else if (is_EOL(ch)) {
          captureSegment(state, captureStart, captureEnd, true);
          writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
          captureStart = captureEnd = state.position;
        } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
          throwError(state, "unexpected end of the document within a single quoted scalar");
        } else {
          state.position++;
          captureEnd = state.position;
        }
      }
      throwError(state, "unexpected end of the stream within a single quoted scalar");
    }
    function readDoubleQuotedScalar(state, nodeIndent) {
      var captureStart, captureEnd, hexLength, hexResult, tmp, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch !== 34) {
        return false;
      }
      state.kind = "scalar";
      state.result = "";
      state.position++;
      captureStart = captureEnd = state.position;
      while ((ch = state.input.charCodeAt(state.position)) !== 0) {
        if (ch === 34) {
          captureSegment(state, captureStart, state.position, true);
          state.position++;
          return true;
        } else if (ch === 92) {
          captureSegment(state, captureStart, state.position, true);
          ch = state.input.charCodeAt(++state.position);
          if (is_EOL(ch)) {
            skipSeparationSpace(state, false, nodeIndent);
          } else if (ch < 256 && simpleEscapeCheck[ch]) {
            state.result += simpleEscapeMap[ch];
            state.position++;
          } else if ((tmp = escapedHexLen(ch)) > 0) {
            hexLength = tmp;
            hexResult = 0;
            for (; hexLength > 0; hexLength--) {
              ch = state.input.charCodeAt(++state.position);
              if ((tmp = fromHexCode(ch)) >= 0) {
                hexResult = (hexResult << 4) + tmp;
              } else {
                throwError(state, "expected hexadecimal character");
              }
            }
            state.result += charFromCodepoint(hexResult);
            state.position++;
          } else {
            throwError(state, "unknown escape sequence");
          }
          captureStart = captureEnd = state.position;
        } else if (is_EOL(ch)) {
          captureSegment(state, captureStart, captureEnd, true);
          writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
          captureStart = captureEnd = state.position;
        } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
          throwError(state, "unexpected end of the document within a double quoted scalar");
        } else {
          state.position++;
          captureEnd = state.position;
        }
      }
      throwError(state, "unexpected end of the stream within a double quoted scalar");
    }
    function readFlowCollection(state, nodeIndent) {
      var readNext = true, _line, _lineStart, _pos, _tag = state.tag, _result, _anchor = state.anchor, following, terminator, isPair, isExplicitPair, isMapping, overridableKeys = /* @__PURE__ */ Object.create(null), keyNode, keyTag, valueNode, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch === 91) {
        terminator = 93;
        isMapping = false;
        _result = [];
      } else if (ch === 123) {
        terminator = 125;
        isMapping = true;
        _result = {};
      } else {
        return false;
      }
      if (state.anchor !== null) {
        state.anchorMap[state.anchor] = _result;
      }
      ch = state.input.charCodeAt(++state.position);
      while (ch !== 0) {
        skipSeparationSpace(state, true, nodeIndent);
        ch = state.input.charCodeAt(state.position);
        if (ch === terminator) {
          state.position++;
          state.tag = _tag;
          state.anchor = _anchor;
          state.kind = isMapping ? "mapping" : "sequence";
          state.result = _result;
          return true;
        } else if (!readNext) {
          throwError(state, "missed comma between flow collection entries");
        } else if (ch === 44) {
          throwError(state, "expected the node content, but found ','");
        }
        keyTag = keyNode = valueNode = null;
        isPair = isExplicitPair = false;
        if (ch === 63) {
          following = state.input.charCodeAt(state.position + 1);
          if (is_WS_OR_EOL(following)) {
            isPair = isExplicitPair = true;
            state.position++;
            skipSeparationSpace(state, true, nodeIndent);
          }
        }
        _line = state.line;
        _lineStart = state.lineStart;
        _pos = state.position;
        composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
        keyTag = state.tag;
        keyNode = state.result;
        skipSeparationSpace(state, true, nodeIndent);
        ch = state.input.charCodeAt(state.position);
        if ((isExplicitPair || state.line === _line) && ch === 58) {
          isPair = true;
          ch = state.input.charCodeAt(++state.position);
          skipSeparationSpace(state, true, nodeIndent);
          composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
          valueNode = state.result;
        }
        if (isMapping) {
          storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos);
        } else if (isPair) {
          _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos));
        } else {
          _result.push(keyNode);
        }
        skipSeparationSpace(state, true, nodeIndent);
        ch = state.input.charCodeAt(state.position);
        if (ch === 44) {
          readNext = true;
          ch = state.input.charCodeAt(++state.position);
        } else {
          readNext = false;
        }
      }
      throwError(state, "unexpected end of the stream within a flow collection");
    }
    function readBlockScalar(state, nodeIndent) {
      var captureStart, folding, chomping = CHOMPING_CLIP, didReadContent = false, detectedIndent = false, textIndent = nodeIndent, emptyLines = 0, atMoreIndented = false, tmp, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch === 124) {
        folding = false;
      } else if (ch === 62) {
        folding = true;
      } else {
        return false;
      }
      state.kind = "scalar";
      state.result = "";
      while (ch !== 0) {
        ch = state.input.charCodeAt(++state.position);
        if (ch === 43 || ch === 45) {
          if (CHOMPING_CLIP === chomping) {
            chomping = ch === 43 ? CHOMPING_KEEP : CHOMPING_STRIP;
          } else {
            throwError(state, "repeat of a chomping mode identifier");
          }
        } else if ((tmp = fromDecimalCode(ch)) >= 0) {
          if (tmp === 0) {
            throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
          } else if (!detectedIndent) {
            textIndent = nodeIndent + tmp - 1;
            detectedIndent = true;
          } else {
            throwError(state, "repeat of an indentation width identifier");
          }
        } else {
          break;
        }
      }
      if (is_WHITE_SPACE(ch)) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (is_WHITE_SPACE(ch));
        if (ch === 35) {
          do {
            ch = state.input.charCodeAt(++state.position);
          } while (!is_EOL(ch) && ch !== 0);
        }
      }
      while (ch !== 0) {
        readLineBreak(state);
        state.lineIndent = 0;
        ch = state.input.charCodeAt(state.position);
        while ((!detectedIndent || state.lineIndent < textIndent) && ch === 32) {
          state.lineIndent++;
          ch = state.input.charCodeAt(++state.position);
        }
        if (!detectedIndent && state.lineIndent > textIndent) {
          textIndent = state.lineIndent;
        }
        if (is_EOL(ch)) {
          emptyLines++;
          continue;
        }
        if (state.lineIndent < textIndent) {
          if (chomping === CHOMPING_KEEP) {
            state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
          } else if (chomping === CHOMPING_CLIP) {
            if (didReadContent) {
              state.result += "\n";
            }
          }
          break;
        }
        if (folding) {
          if (is_WHITE_SPACE(ch)) {
            atMoreIndented = true;
            state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
          } else if (atMoreIndented) {
            atMoreIndented = false;
            state.result += common.repeat("\n", emptyLines + 1);
          } else if (emptyLines === 0) {
            if (didReadContent) {
              state.result += " ";
            }
          } else {
            state.result += common.repeat("\n", emptyLines);
          }
        } else {
          state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
        }
        didReadContent = true;
        detectedIndent = true;
        emptyLines = 0;
        captureStart = state.position;
        while (!is_EOL(ch) && ch !== 0) {
          ch = state.input.charCodeAt(++state.position);
        }
        captureSegment(state, captureStart, state.position, false);
      }
      return true;
    }
    function readBlockSequence(state, nodeIndent) {
      var _line, _tag = state.tag, _anchor = state.anchor, _result = [], following, detected = false, ch;
      if (state.firstTabInLine !== -1)
        return false;
      if (state.anchor !== null) {
        state.anchorMap[state.anchor] = _result;
      }
      ch = state.input.charCodeAt(state.position);
      while (ch !== 0) {
        if (state.firstTabInLine !== -1) {
          state.position = state.firstTabInLine;
          throwError(state, "tab characters must not be used in indentation");
        }
        if (ch !== 45) {
          break;
        }
        following = state.input.charCodeAt(state.position + 1);
        if (!is_WS_OR_EOL(following)) {
          break;
        }
        detected = true;
        state.position++;
        if (skipSeparationSpace(state, true, -1)) {
          if (state.lineIndent <= nodeIndent) {
            _result.push(null);
            ch = state.input.charCodeAt(state.position);
            continue;
          }
        }
        _line = state.line;
        composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
        _result.push(state.result);
        skipSeparationSpace(state, true, -1);
        ch = state.input.charCodeAt(state.position);
        if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
          throwError(state, "bad indentation of a sequence entry");
        } else if (state.lineIndent < nodeIndent) {
          break;
        }
      }
      if (detected) {
        state.tag = _tag;
        state.anchor = _anchor;
        state.kind = "sequence";
        state.result = _result;
        return true;
      }
      return false;
    }
    function readBlockMapping(state, nodeIndent, flowIndent) {
      var following, allowCompact, _line, _keyLine, _keyLineStart, _keyPos, _tag = state.tag, _anchor = state.anchor, _result = {}, overridableKeys = /* @__PURE__ */ Object.create(null), keyTag = null, keyNode = null, valueNode = null, atExplicitKey = false, detected = false, ch;
      if (state.firstTabInLine !== -1)
        return false;
      if (state.anchor !== null) {
        state.anchorMap[state.anchor] = _result;
      }
      ch = state.input.charCodeAt(state.position);
      while (ch !== 0) {
        if (!atExplicitKey && state.firstTabInLine !== -1) {
          state.position = state.firstTabInLine;
          throwError(state, "tab characters must not be used in indentation");
        }
        following = state.input.charCodeAt(state.position + 1);
        _line = state.line;
        if ((ch === 63 || ch === 58) && is_WS_OR_EOL(following)) {
          if (ch === 63) {
            if (atExplicitKey) {
              storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
              keyTag = keyNode = valueNode = null;
            }
            detected = true;
            atExplicitKey = true;
            allowCompact = true;
          } else if (atExplicitKey) {
            atExplicitKey = false;
            allowCompact = true;
          } else {
            throwError(state, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line");
          }
          state.position += 1;
          ch = following;
        } else {
          _keyLine = state.line;
          _keyLineStart = state.lineStart;
          _keyPos = state.position;
          if (!composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) {
            break;
          }
          if (state.line === _line) {
            ch = state.input.charCodeAt(state.position);
            while (is_WHITE_SPACE(ch)) {
              ch = state.input.charCodeAt(++state.position);
            }
            if (ch === 58) {
              ch = state.input.charCodeAt(++state.position);
              if (!is_WS_OR_EOL(ch)) {
                throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
              }
              if (atExplicitKey) {
                storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
                keyTag = keyNode = valueNode = null;
              }
              detected = true;
              atExplicitKey = false;
              allowCompact = false;
              keyTag = state.tag;
              keyNode = state.result;
            } else if (detected) {
              throwError(state, "can not read an implicit mapping pair; a colon is missed");
            } else {
              state.tag = _tag;
              state.anchor = _anchor;
              return true;
            }
          } else if (detected) {
            throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
          } else {
            state.tag = _tag;
            state.anchor = _anchor;
            return true;
          }
        }
        if (state.line === _line || state.lineIndent > nodeIndent) {
          if (atExplicitKey) {
            _keyLine = state.line;
            _keyLineStart = state.lineStart;
            _keyPos = state.position;
          }
          if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) {
            if (atExplicitKey) {
              keyNode = state.result;
            } else {
              valueNode = state.result;
            }
          }
          if (!atExplicitKey) {
            storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _keyLine, _keyLineStart, _keyPos);
            keyTag = keyNode = valueNode = null;
          }
          skipSeparationSpace(state, true, -1);
          ch = state.input.charCodeAt(state.position);
        }
        if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
          throwError(state, "bad indentation of a mapping entry");
        } else if (state.lineIndent < nodeIndent) {
          break;
        }
      }
      if (atExplicitKey) {
        storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
      }
      if (detected) {
        state.tag = _tag;
        state.anchor = _anchor;
        state.kind = "mapping";
        state.result = _result;
      }
      return detected;
    }
    function readTagProperty(state) {
      var _position, isVerbatim = false, isNamed = false, tagHandle, tagName, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch !== 33)
        return false;
      if (state.tag !== null) {
        throwError(state, "duplication of a tag property");
      }
      ch = state.input.charCodeAt(++state.position);
      if (ch === 60) {
        isVerbatim = true;
        ch = state.input.charCodeAt(++state.position);
      } else if (ch === 33) {
        isNamed = true;
        tagHandle = "!!";
        ch = state.input.charCodeAt(++state.position);
      } else {
        tagHandle = "!";
      }
      _position = state.position;
      if (isVerbatim) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (ch !== 0 && ch !== 62);
        if (state.position < state.length) {
          tagName = state.input.slice(_position, state.position);
          ch = state.input.charCodeAt(++state.position);
        } else {
          throwError(state, "unexpected end of the stream within a verbatim tag");
        }
      } else {
        while (ch !== 0 && !is_WS_OR_EOL(ch)) {
          if (ch === 33) {
            if (!isNamed) {
              tagHandle = state.input.slice(_position - 1, state.position + 1);
              if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
                throwError(state, "named tag handle cannot contain such characters");
              }
              isNamed = true;
              _position = state.position + 1;
            } else {
              throwError(state, "tag suffix cannot contain exclamation marks");
            }
          }
          ch = state.input.charCodeAt(++state.position);
        }
        tagName = state.input.slice(_position, state.position);
        if (PATTERN_FLOW_INDICATORS.test(tagName)) {
          throwError(state, "tag suffix cannot contain flow indicator characters");
        }
      }
      if (tagName && !PATTERN_TAG_URI.test(tagName)) {
        throwError(state, "tag name cannot contain such characters: " + tagName);
      }
      try {
        tagName = decodeURIComponent(tagName);
      } catch (err) {
        throwError(state, "tag name is malformed: " + tagName);
      }
      if (isVerbatim) {
        state.tag = tagName;
      } else if (_hasOwnProperty.call(state.tagMap, tagHandle)) {
        state.tag = state.tagMap[tagHandle] + tagName;
      } else if (tagHandle === "!") {
        state.tag = "!" + tagName;
      } else if (tagHandle === "!!") {
        state.tag = "tag:yaml.org,2002:" + tagName;
      } else {
        throwError(state, 'undeclared tag handle "' + tagHandle + '"');
      }
      return true;
    }
    function readAnchorProperty(state) {
      var _position, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch !== 38)
        return false;
      if (state.anchor !== null) {
        throwError(state, "duplication of an anchor property");
      }
      ch = state.input.charCodeAt(++state.position);
      _position = state.position;
      while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      if (state.position === _position) {
        throwError(state, "name of an anchor node must contain at least one character");
      }
      state.anchor = state.input.slice(_position, state.position);
      return true;
    }
    function readAlias(state) {
      var _position, alias, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch !== 42)
        return false;
      ch = state.input.charCodeAt(++state.position);
      _position = state.position;
      while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      if (state.position === _position) {
        throwError(state, "name of an alias node must contain at least one character");
      }
      alias = state.input.slice(_position, state.position);
      if (!_hasOwnProperty.call(state.anchorMap, alias)) {
        throwError(state, 'unidentified alias "' + alias + '"');
      }
      state.result = state.anchorMap[alias];
      skipSeparationSpace(state, true, -1);
      return true;
    }
    function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
      var allowBlockStyles, allowBlockScalars, allowBlockCollections, indentStatus = 1, atNewLine = false, hasContent = false, typeIndex, typeQuantity, typeList, type, flowIndent, blockIndent;
      if (state.listener !== null) {
        state.listener("open", state);
      }
      state.tag = null;
      state.anchor = null;
      state.kind = null;
      state.result = null;
      allowBlockStyles = allowBlockScalars = allowBlockCollections = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
      if (allowToSeek) {
        if (skipSeparationSpace(state, true, -1)) {
          atNewLine = true;
          if (state.lineIndent > parentIndent) {
            indentStatus = 1;
          } else if (state.lineIndent === parentIndent) {
            indentStatus = 0;
          } else if (state.lineIndent < parentIndent) {
            indentStatus = -1;
          }
        }
      }
      if (indentStatus === 1) {
        while (readTagProperty(state) || readAnchorProperty(state)) {
          if (skipSeparationSpace(state, true, -1)) {
            atNewLine = true;
            allowBlockCollections = allowBlockStyles;
            if (state.lineIndent > parentIndent) {
              indentStatus = 1;
            } else if (state.lineIndent === parentIndent) {
              indentStatus = 0;
            } else if (state.lineIndent < parentIndent) {
              indentStatus = -1;
            }
          } else {
            allowBlockCollections = false;
          }
        }
      }
      if (allowBlockCollections) {
        allowBlockCollections = atNewLine || allowCompact;
      }
      if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
        if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) {
          flowIndent = parentIndent;
        } else {
          flowIndent = parentIndent + 1;
        }
        blockIndent = state.position - state.lineStart;
        if (indentStatus === 1) {
          if (allowBlockCollections && (readBlockSequence(state, blockIndent) || readBlockMapping(state, blockIndent, flowIndent)) || readFlowCollection(state, flowIndent)) {
            hasContent = true;
          } else {
            if (allowBlockScalars && readBlockScalar(state, flowIndent) || readSingleQuotedScalar(state, flowIndent) || readDoubleQuotedScalar(state, flowIndent)) {
              hasContent = true;
            } else if (readAlias(state)) {
              hasContent = true;
              if (state.tag !== null || state.anchor !== null) {
                throwError(state, "alias node should not have any properties");
              }
            } else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
              hasContent = true;
              if (state.tag === null) {
                state.tag = "?";
              }
            }
            if (state.anchor !== null) {
              state.anchorMap[state.anchor] = state.result;
            }
          }
        } else if (indentStatus === 0) {
          hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
        }
      }
      if (state.tag === null) {
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
      } else if (state.tag === "?") {
        if (state.result !== null && state.kind !== "scalar") {
          throwError(state, 'unacceptable node kind for !<?> tag; it should be "scalar", not "' + state.kind + '"');
        }
        for (typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) {
          type = state.implicitTypes[typeIndex];
          if (type.resolve(state.result)) {
            state.result = type.construct(state.result);
            state.tag = type.tag;
            if (state.anchor !== null) {
              state.anchorMap[state.anchor] = state.result;
            }
            break;
          }
        }
      } else if (state.tag !== "!") {
        if (_hasOwnProperty.call(state.typeMap[state.kind || "fallback"], state.tag)) {
          type = state.typeMap[state.kind || "fallback"][state.tag];
        } else {
          type = null;
          typeList = state.typeMap.multi[state.kind || "fallback"];
          for (typeIndex = 0, typeQuantity = typeList.length; typeIndex < typeQuantity; typeIndex += 1) {
            if (state.tag.slice(0, typeList[typeIndex].tag.length) === typeList[typeIndex].tag) {
              type = typeList[typeIndex];
              break;
            }
          }
        }
        if (!type) {
          throwError(state, "unknown tag !<" + state.tag + ">");
        }
        if (state.result !== null && type.kind !== state.kind) {
          throwError(state, "unacceptable node kind for !<" + state.tag + '> tag; it should be "' + type.kind + '", not "' + state.kind + '"');
        }
        if (!type.resolve(state.result, state.tag)) {
          throwError(state, "cannot resolve a node with !<" + state.tag + "> explicit tag");
        } else {
          state.result = type.construct(state.result, state.tag);
          if (state.anchor !== null) {
            state.anchorMap[state.anchor] = state.result;
          }
        }
      }
      if (state.listener !== null) {
        state.listener("close", state);
      }
      return state.tag !== null || state.anchor !== null || hasContent;
    }
    function readDocument(state) {
      var documentStart = state.position, _position, directiveName, directiveArgs, hasDirectives = false, ch;
      state.version = null;
      state.checkLineBreaks = state.legacy;
      state.tagMap = /* @__PURE__ */ Object.create(null);
      state.anchorMap = /* @__PURE__ */ Object.create(null);
      while ((ch = state.input.charCodeAt(state.position)) !== 0) {
        skipSeparationSpace(state, true, -1);
        ch = state.input.charCodeAt(state.position);
        if (state.lineIndent > 0 || ch !== 37) {
          break;
        }
        hasDirectives = true;
        ch = state.input.charCodeAt(++state.position);
        _position = state.position;
        while (ch !== 0 && !is_WS_OR_EOL(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }
        directiveName = state.input.slice(_position, state.position);
        directiveArgs = [];
        if (directiveName.length < 1) {
          throwError(state, "directive name must not be less than one character in length");
        }
        while (ch !== 0) {
          while (is_WHITE_SPACE(ch)) {
            ch = state.input.charCodeAt(++state.position);
          }
          if (ch === 35) {
            do {
              ch = state.input.charCodeAt(++state.position);
            } while (ch !== 0 && !is_EOL(ch));
            break;
          }
          if (is_EOL(ch))
            break;
          _position = state.position;
          while (ch !== 0 && !is_WS_OR_EOL(ch)) {
            ch = state.input.charCodeAt(++state.position);
          }
          directiveArgs.push(state.input.slice(_position, state.position));
        }
        if (ch !== 0)
          readLineBreak(state);
        if (_hasOwnProperty.call(directiveHandlers, directiveName)) {
          directiveHandlers[directiveName](state, directiveName, directiveArgs);
        } else {
          throwWarning(state, 'unknown document directive "' + directiveName + '"');
        }
      }
      skipSeparationSpace(state, true, -1);
      if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45) {
        state.position += 3;
        skipSeparationSpace(state, true, -1);
      } else if (hasDirectives) {
        throwError(state, "directives end mark is expected");
      }
      composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
      skipSeparationSpace(state, true, -1);
      if (state.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) {
        throwWarning(state, "non-ASCII line breaks are interpreted as content");
      }
      state.documents.push(state.result);
      if (state.position === state.lineStart && testDocumentSeparator(state)) {
        if (state.input.charCodeAt(state.position) === 46) {
          state.position += 3;
          skipSeparationSpace(state, true, -1);
        }
        return;
      }
      if (state.position < state.length - 1) {
        throwError(state, "end of the stream or a document separator is expected");
      } else {
        return;
      }
    }
    function loadDocuments(input, options) {
      input = String(input);
      options = options || {};
      if (input.length !== 0) {
        if (input.charCodeAt(input.length - 1) !== 10 && input.charCodeAt(input.length - 1) !== 13) {
          input += "\n";
        }
        if (input.charCodeAt(0) === 65279) {
          input = input.slice(1);
        }
      }
      var state = new State(input, options);
      var nullpos = input.indexOf("\0");
      if (nullpos !== -1) {
        state.position = nullpos;
        throwError(state, "null byte is not allowed in input");
      }
      state.input += "\0";
      while (state.input.charCodeAt(state.position) === 32) {
        state.lineIndent += 1;
        state.position += 1;
      }
      while (state.position < state.length - 1) {
        readDocument(state);
      }
      return state.documents;
    }
    function loadAll(input, iterator, options) {
      if (iterator !== null && typeof iterator === "object" && typeof options === "undefined") {
        options = iterator;
        iterator = null;
      }
      var documents = loadDocuments(input, options);
      if (typeof iterator !== "function") {
        return documents;
      }
      for (var index = 0, length = documents.length; index < length; index += 1) {
        iterator(documents[index]);
      }
    }
    function load(input, options) {
      var documents = loadDocuments(input, options);
      if (documents.length === 0) {
        return void 0;
      } else if (documents.length === 1) {
        return documents[0];
      }
      throw new YAMLException("expected a single document in the stream, but found more");
    }
    module2.exports.loadAll = loadAll;
    module2.exports.load = load;
  }
});

// node_modules/js-yaml/lib/dumper.js
var require_dumper = __commonJS({
  "node_modules/js-yaml/lib/dumper.js"(exports, module2) {
    "use strict";
    var common = require_common();
    var YAMLException = require_exception();
    var DEFAULT_SCHEMA = require_default();
    var _toString = Object.prototype.toString;
    var _hasOwnProperty = Object.prototype.hasOwnProperty;
    var CHAR_BOM = 65279;
    var CHAR_TAB = 9;
    var CHAR_LINE_FEED = 10;
    var CHAR_CARRIAGE_RETURN = 13;
    var CHAR_SPACE = 32;
    var CHAR_EXCLAMATION = 33;
    var CHAR_DOUBLE_QUOTE = 34;
    var CHAR_SHARP = 35;
    var CHAR_PERCENT = 37;
    var CHAR_AMPERSAND = 38;
    var CHAR_SINGLE_QUOTE = 39;
    var CHAR_ASTERISK = 42;
    var CHAR_COMMA = 44;
    var CHAR_MINUS = 45;
    var CHAR_COLON = 58;
    var CHAR_EQUALS = 61;
    var CHAR_GREATER_THAN = 62;
    var CHAR_QUESTION = 63;
    var CHAR_COMMERCIAL_AT = 64;
    var CHAR_LEFT_SQUARE_BRACKET = 91;
    var CHAR_RIGHT_SQUARE_BRACKET = 93;
    var CHAR_GRAVE_ACCENT = 96;
    var CHAR_LEFT_CURLY_BRACKET = 123;
    var CHAR_VERTICAL_LINE = 124;
    var CHAR_RIGHT_CURLY_BRACKET = 125;
    var ESCAPE_SEQUENCES = {};
    ESCAPE_SEQUENCES[0] = "\\0";
    ESCAPE_SEQUENCES[7] = "\\a";
    ESCAPE_SEQUENCES[8] = "\\b";
    ESCAPE_SEQUENCES[9] = "\\t";
    ESCAPE_SEQUENCES[10] = "\\n";
    ESCAPE_SEQUENCES[11] = "\\v";
    ESCAPE_SEQUENCES[12] = "\\f";
    ESCAPE_SEQUENCES[13] = "\\r";
    ESCAPE_SEQUENCES[27] = "\\e";
    ESCAPE_SEQUENCES[34] = '\\"';
    ESCAPE_SEQUENCES[92] = "\\\\";
    ESCAPE_SEQUENCES[133] = "\\N";
    ESCAPE_SEQUENCES[160] = "\\_";
    ESCAPE_SEQUENCES[8232] = "\\L";
    ESCAPE_SEQUENCES[8233] = "\\P";
    var DEPRECATED_BOOLEANS_SYNTAX = [
      "y",
      "Y",
      "yes",
      "Yes",
      "YES",
      "on",
      "On",
      "ON",
      "n",
      "N",
      "no",
      "No",
      "NO",
      "off",
      "Off",
      "OFF"
    ];
    var DEPRECATED_BASE60_SYNTAX = /^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;
    function compileStyleMap(schema, map) {
      var result, keys, index, length, tag, style, type;
      if (map === null)
        return {};
      result = {};
      keys = Object.keys(map);
      for (index = 0, length = keys.length; index < length; index += 1) {
        tag = keys[index];
        style = String(map[tag]);
        if (tag.slice(0, 2) === "!!") {
          tag = "tag:yaml.org,2002:" + tag.slice(2);
        }
        type = schema.compiledTypeMap["fallback"][tag];
        if (type && _hasOwnProperty.call(type.styleAliases, style)) {
          style = type.styleAliases[style];
        }
        result[tag] = style;
      }
      return result;
    }
    function encodeHex(character) {
      var string, handle, length;
      string = character.toString(16).toUpperCase();
      if (character <= 255) {
        handle = "x";
        length = 2;
      } else if (character <= 65535) {
        handle = "u";
        length = 4;
      } else if (character <= 4294967295) {
        handle = "U";
        length = 8;
      } else {
        throw new YAMLException("code point within a string may not be greater than 0xFFFFFFFF");
      }
      return "\\" + handle + common.repeat("0", length - string.length) + string;
    }
    var QUOTING_TYPE_SINGLE = 1;
    var QUOTING_TYPE_DOUBLE = 2;
    function State(options) {
      this.schema = options["schema"] || DEFAULT_SCHEMA;
      this.indent = Math.max(1, options["indent"] || 2);
      this.noArrayIndent = options["noArrayIndent"] || false;
      this.skipInvalid = options["skipInvalid"] || false;
      this.flowLevel = common.isNothing(options["flowLevel"]) ? -1 : options["flowLevel"];
      this.styleMap = compileStyleMap(this.schema, options["styles"] || null);
      this.sortKeys = options["sortKeys"] || false;
      this.lineWidth = options["lineWidth"] || 80;
      this.noRefs = options["noRefs"] || false;
      this.noCompatMode = options["noCompatMode"] || false;
      this.condenseFlow = options["condenseFlow"] || false;
      this.quotingType = options["quotingType"] === '"' ? QUOTING_TYPE_DOUBLE : QUOTING_TYPE_SINGLE;
      this.forceQuotes = options["forceQuotes"] || false;
      this.replacer = typeof options["replacer"] === "function" ? options["replacer"] : null;
      this.implicitTypes = this.schema.compiledImplicit;
      this.explicitTypes = this.schema.compiledExplicit;
      this.tag = null;
      this.result = "";
      this.duplicates = [];
      this.usedDuplicates = null;
    }
    function indentString(string, spaces) {
      var ind = common.repeat(" ", spaces), position = 0, next = -1, result = "", line, length = string.length;
      while (position < length) {
        next = string.indexOf("\n", position);
        if (next === -1) {
          line = string.slice(position);
          position = length;
        } else {
          line = string.slice(position, next + 1);
          position = next + 1;
        }
        if (line.length && line !== "\n")
          result += ind;
        result += line;
      }
      return result;
    }
    function generateNextLine(state, level) {
      return "\n" + common.repeat(" ", state.indent * level);
    }
    function testImplicitResolving(state, str) {
      var index, length, type;
      for (index = 0, length = state.implicitTypes.length; index < length; index += 1) {
        type = state.implicitTypes[index];
        if (type.resolve(str)) {
          return true;
        }
      }
      return false;
    }
    function isWhitespace(c) {
      return c === CHAR_SPACE || c === CHAR_TAB;
    }
    function isPrintable(c) {
      return 32 <= c && c <= 126 || 161 <= c && c <= 55295 && c !== 8232 && c !== 8233 || 57344 <= c && c <= 65533 && c !== CHAR_BOM || 65536 <= c && c <= 1114111;
    }
    function isNsCharOrWhitespace(c) {
      return isPrintable(c) && c !== CHAR_BOM && c !== CHAR_CARRIAGE_RETURN && c !== CHAR_LINE_FEED;
    }
    function isPlainSafe(c, prev, inblock) {
      var cIsNsCharOrWhitespace = isNsCharOrWhitespace(c);
      var cIsNsChar = cIsNsCharOrWhitespace && !isWhitespace(c);
      return (
        // ns-plain-safe
        (inblock ? (
          // c = flow-in
          cIsNsCharOrWhitespace
        ) : cIsNsCharOrWhitespace && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET) && c !== CHAR_SHARP && !(prev === CHAR_COLON && !cIsNsChar) || isNsCharOrWhitespace(prev) && !isWhitespace(prev) && c === CHAR_SHARP || prev === CHAR_COLON && cIsNsChar
      );
    }
    function isPlainSafeFirst(c) {
      return isPrintable(c) && c !== CHAR_BOM && !isWhitespace(c) && c !== CHAR_MINUS && c !== CHAR_QUESTION && c !== CHAR_COLON && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && c !== CHAR_SHARP && c !== CHAR_AMPERSAND && c !== CHAR_ASTERISK && c !== CHAR_EXCLAMATION && c !== CHAR_VERTICAL_LINE && c !== CHAR_EQUALS && c !== CHAR_GREATER_THAN && c !== CHAR_SINGLE_QUOTE && c !== CHAR_DOUBLE_QUOTE && c !== CHAR_PERCENT && c !== CHAR_COMMERCIAL_AT && c !== CHAR_GRAVE_ACCENT;
    }
    function isPlainSafeLast(c) {
      return !isWhitespace(c) && c !== CHAR_COLON;
    }
    function codePointAt(string, pos) {
      var first = string.charCodeAt(pos), second;
      if (first >= 55296 && first <= 56319 && pos + 1 < string.length) {
        second = string.charCodeAt(pos + 1);
        if (second >= 56320 && second <= 57343) {
          return (first - 55296) * 1024 + second - 56320 + 65536;
        }
      }
      return first;
    }
    function needIndentIndicator(string) {
      var leadingSpaceRe = /^\n* /;
      return leadingSpaceRe.test(string);
    }
    var STYLE_PLAIN = 1;
    var STYLE_SINGLE = 2;
    var STYLE_LITERAL = 3;
    var STYLE_FOLDED = 4;
    var STYLE_DOUBLE = 5;
    function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType, quotingType, forceQuotes, inblock) {
      var i;
      var char = 0;
      var prevChar = null;
      var hasLineBreak = false;
      var hasFoldableLine = false;
      var shouldTrackWidth = lineWidth !== -1;
      var previousLineBreak = -1;
      var plain = isPlainSafeFirst(codePointAt(string, 0)) && isPlainSafeLast(codePointAt(string, string.length - 1));
      if (singleLineOnly || forceQuotes) {
        for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
          char = codePointAt(string, i);
          if (!isPrintable(char)) {
            return STYLE_DOUBLE;
          }
          plain = plain && isPlainSafe(char, prevChar, inblock);
          prevChar = char;
        }
      } else {
        for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
          char = codePointAt(string, i);
          if (char === CHAR_LINE_FEED) {
            hasLineBreak = true;
            if (shouldTrackWidth) {
              hasFoldableLine = hasFoldableLine || // Foldable line = too long, and not more-indented.
              i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
              previousLineBreak = i;
            }
          } else if (!isPrintable(char)) {
            return STYLE_DOUBLE;
          }
          plain = plain && isPlainSafe(char, prevChar, inblock);
          prevChar = char;
        }
        hasFoldableLine = hasFoldableLine || shouldTrackWidth && (i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ");
      }
      if (!hasLineBreak && !hasFoldableLine) {
        if (plain && !forceQuotes && !testAmbiguousType(string)) {
          return STYLE_PLAIN;
        }
        return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
      }
      if (indentPerLevel > 9 && needIndentIndicator(string)) {
        return STYLE_DOUBLE;
      }
      if (!forceQuotes) {
        return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
      }
      return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
    }
    function writeScalar(state, string, level, iskey, inblock) {
      state.dump = function() {
        if (string.length === 0) {
          return state.quotingType === QUOTING_TYPE_DOUBLE ? '""' : "''";
        }
        if (!state.noCompatMode) {
          if (DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1 || DEPRECATED_BASE60_SYNTAX.test(string)) {
            return state.quotingType === QUOTING_TYPE_DOUBLE ? '"' + string + '"' : "'" + string + "'";
          }
        }
        var indent = state.indent * Math.max(1, level);
        var lineWidth = state.lineWidth === -1 ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);
        var singleLineOnly = iskey || state.flowLevel > -1 && level >= state.flowLevel;
        function testAmbiguity(string2) {
          return testImplicitResolving(state, string2);
        }
        switch (chooseScalarStyle(
          string,
          singleLineOnly,
          state.indent,
          lineWidth,
          testAmbiguity,
          state.quotingType,
          state.forceQuotes && !iskey,
          inblock
        )) {
          case STYLE_PLAIN:
            return string;
          case STYLE_SINGLE:
            return "'" + string.replace(/'/g, "''") + "'";
          case STYLE_LITERAL:
            return "|" + blockHeader(string, state.indent) + dropEndingNewline(indentString(string, indent));
          case STYLE_FOLDED:
            return ">" + blockHeader(string, state.indent) + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
          case STYLE_DOUBLE:
            return '"' + escapeString(string, lineWidth) + '"';
          default:
            throw new YAMLException("impossible error: invalid scalar style");
        }
      }();
    }
    function blockHeader(string, indentPerLevel) {
      var indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : "";
      var clip = string[string.length - 1] === "\n";
      var keep = clip && (string[string.length - 2] === "\n" || string === "\n");
      var chomp = keep ? "+" : clip ? "" : "-";
      return indentIndicator + chomp + "\n";
    }
    function dropEndingNewline(string) {
      return string[string.length - 1] === "\n" ? string.slice(0, -1) : string;
    }
    function foldString(string, width) {
      var lineRe = /(\n+)([^\n]*)/g;
      var result = function() {
        var nextLF = string.indexOf("\n");
        nextLF = nextLF !== -1 ? nextLF : string.length;
        lineRe.lastIndex = nextLF;
        return foldLine(string.slice(0, nextLF), width);
      }();
      var prevMoreIndented = string[0] === "\n" || string[0] === " ";
      var moreIndented;
      var match;
      while (match = lineRe.exec(string)) {
        var prefix = match[1], line = match[2];
        moreIndented = line[0] === " ";
        result += prefix + (!prevMoreIndented && !moreIndented && line !== "" ? "\n" : "") + foldLine(line, width);
        prevMoreIndented = moreIndented;
      }
      return result;
    }
    function foldLine(line, width) {
      if (line === "" || line[0] === " ")
        return line;
      var breakRe = / [^ ]/g;
      var match;
      var start = 0, end, curr = 0, next = 0;
      var result = "";
      while (match = breakRe.exec(line)) {
        next = match.index;
        if (next - start > width) {
          end = curr > start ? curr : next;
          result += "\n" + line.slice(start, end);
          start = end + 1;
        }
        curr = next;
      }
      result += "\n";
      if (line.length - start > width && curr > start) {
        result += line.slice(start, curr) + "\n" + line.slice(curr + 1);
      } else {
        result += line.slice(start);
      }
      return result.slice(1);
    }
    function escapeString(string) {
      var result = "";
      var char = 0;
      var escapeSeq;
      for (var i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
        char = codePointAt(string, i);
        escapeSeq = ESCAPE_SEQUENCES[char];
        if (!escapeSeq && isPrintable(char)) {
          result += string[i];
          if (char >= 65536)
            result += string[i + 1];
        } else {
          result += escapeSeq || encodeHex(char);
        }
      }
      return result;
    }
    function writeFlowSequence(state, level, object) {
      var _result = "", _tag = state.tag, index, length, value;
      for (index = 0, length = object.length; index < length; index += 1) {
        value = object[index];
        if (state.replacer) {
          value = state.replacer.call(object, String(index), value);
        }
        if (writeNode(state, level, value, false, false) || typeof value === "undefined" && writeNode(state, level, null, false, false)) {
          if (_result !== "")
            _result += "," + (!state.condenseFlow ? " " : "");
          _result += state.dump;
        }
      }
      state.tag = _tag;
      state.dump = "[" + _result + "]";
    }
    function writeBlockSequence(state, level, object, compact) {
      var _result = "", _tag = state.tag, index, length, value;
      for (index = 0, length = object.length; index < length; index += 1) {
        value = object[index];
        if (state.replacer) {
          value = state.replacer.call(object, String(index), value);
        }
        if (writeNode(state, level + 1, value, true, true, false, true) || typeof value === "undefined" && writeNode(state, level + 1, null, true, true, false, true)) {
          if (!compact || _result !== "") {
            _result += generateNextLine(state, level);
          }
          if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
            _result += "-";
          } else {
            _result += "- ";
          }
          _result += state.dump;
        }
      }
      state.tag = _tag;
      state.dump = _result || "[]";
    }
    function writeFlowMapping(state, level, object) {
      var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, pairBuffer;
      for (index = 0, length = objectKeyList.length; index < length; index += 1) {
        pairBuffer = "";
        if (_result !== "")
          pairBuffer += ", ";
        if (state.condenseFlow)
          pairBuffer += '"';
        objectKey = objectKeyList[index];
        objectValue = object[objectKey];
        if (state.replacer) {
          objectValue = state.replacer.call(object, objectKey, objectValue);
        }
        if (!writeNode(state, level, objectKey, false, false)) {
          continue;
        }
        if (state.dump.length > 1024)
          pairBuffer += "? ";
        pairBuffer += state.dump + (state.condenseFlow ? '"' : "") + ":" + (state.condenseFlow ? "" : " ");
        if (!writeNode(state, level, objectValue, false, false)) {
          continue;
        }
        pairBuffer += state.dump;
        _result += pairBuffer;
      }
      state.tag = _tag;
      state.dump = "{" + _result + "}";
    }
    function writeBlockMapping(state, level, object, compact) {
      var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, explicitPair, pairBuffer;
      if (state.sortKeys === true) {
        objectKeyList.sort();
      } else if (typeof state.sortKeys === "function") {
        objectKeyList.sort(state.sortKeys);
      } else if (state.sortKeys) {
        throw new YAMLException("sortKeys must be a boolean or a function");
      }
      for (index = 0, length = objectKeyList.length; index < length; index += 1) {
        pairBuffer = "";
        if (!compact || _result !== "") {
          pairBuffer += generateNextLine(state, level);
        }
        objectKey = objectKeyList[index];
        objectValue = object[objectKey];
        if (state.replacer) {
          objectValue = state.replacer.call(object, objectKey, objectValue);
        }
        if (!writeNode(state, level + 1, objectKey, true, true, true)) {
          continue;
        }
        explicitPair = state.tag !== null && state.tag !== "?" || state.dump && state.dump.length > 1024;
        if (explicitPair) {
          if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
            pairBuffer += "?";
          } else {
            pairBuffer += "? ";
          }
        }
        pairBuffer += state.dump;
        if (explicitPair) {
          pairBuffer += generateNextLine(state, level);
        }
        if (!writeNode(state, level + 1, objectValue, true, explicitPair)) {
          continue;
        }
        if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
          pairBuffer += ":";
        } else {
          pairBuffer += ": ";
        }
        pairBuffer += state.dump;
        _result += pairBuffer;
      }
      state.tag = _tag;
      state.dump = _result || "{}";
    }
    function detectType(state, object, explicit) {
      var _result, typeList, index, length, type, style;
      typeList = explicit ? state.explicitTypes : state.implicitTypes;
      for (index = 0, length = typeList.length; index < length; index += 1) {
        type = typeList[index];
        if ((type.instanceOf || type.predicate) && (!type.instanceOf || typeof object === "object" && object instanceof type.instanceOf) && (!type.predicate || type.predicate(object))) {
          if (explicit) {
            if (type.multi && type.representName) {
              state.tag = type.representName(object);
            } else {
              state.tag = type.tag;
            }
          } else {
            state.tag = "?";
          }
          if (type.represent) {
            style = state.styleMap[type.tag] || type.defaultStyle;
            if (_toString.call(type.represent) === "[object Function]") {
              _result = type.represent(object, style);
            } else if (_hasOwnProperty.call(type.represent, style)) {
              _result = type.represent[style](object, style);
            } else {
              throw new YAMLException("!<" + type.tag + '> tag resolver accepts not "' + style + '" style');
            }
            state.dump = _result;
          }
          return true;
        }
      }
      return false;
    }
    function writeNode(state, level, object, block, compact, iskey, isblockseq) {
      state.tag = null;
      state.dump = object;
      if (!detectType(state, object, false)) {
        detectType(state, object, true);
      }
      var type = _toString.call(state.dump);
      var inblock = block;
      var tagStr;
      if (block) {
        block = state.flowLevel < 0 || state.flowLevel > level;
      }
      var objectOrArray = type === "[object Object]" || type === "[object Array]", duplicateIndex, duplicate;
      if (objectOrArray) {
        duplicateIndex = state.duplicates.indexOf(object);
        duplicate = duplicateIndex !== -1;
      }
      if (state.tag !== null && state.tag !== "?" || duplicate || state.indent !== 2 && level > 0) {
        compact = false;
      }
      if (duplicate && state.usedDuplicates[duplicateIndex]) {
        state.dump = "*ref_" + duplicateIndex;
      } else {
        if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) {
          state.usedDuplicates[duplicateIndex] = true;
        }
        if (type === "[object Object]") {
          if (block && Object.keys(state.dump).length !== 0) {
            writeBlockMapping(state, level, state.dump, compact);
            if (duplicate) {
              state.dump = "&ref_" + duplicateIndex + state.dump;
            }
          } else {
            writeFlowMapping(state, level, state.dump);
            if (duplicate) {
              state.dump = "&ref_" + duplicateIndex + " " + state.dump;
            }
          }
        } else if (type === "[object Array]") {
          if (block && state.dump.length !== 0) {
            if (state.noArrayIndent && !isblockseq && level > 0) {
              writeBlockSequence(state, level - 1, state.dump, compact);
            } else {
              writeBlockSequence(state, level, state.dump, compact);
            }
            if (duplicate) {
              state.dump = "&ref_" + duplicateIndex + state.dump;
            }
          } else {
            writeFlowSequence(state, level, state.dump);
            if (duplicate) {
              state.dump = "&ref_" + duplicateIndex + " " + state.dump;
            }
          }
        } else if (type === "[object String]") {
          if (state.tag !== "?") {
            writeScalar(state, state.dump, level, iskey, inblock);
          }
        } else if (type === "[object Undefined]") {
          return false;
        } else {
          if (state.skipInvalid)
            return false;
          throw new YAMLException("unacceptable kind of an object to dump " + type);
        }
        if (state.tag !== null && state.tag !== "?") {
          tagStr = encodeURI(
            state.tag[0] === "!" ? state.tag.slice(1) : state.tag
          ).replace(/!/g, "%21");
          if (state.tag[0] === "!") {
            tagStr = "!" + tagStr;
          } else if (tagStr.slice(0, 18) === "tag:yaml.org,2002:") {
            tagStr = "!!" + tagStr.slice(18);
          } else {
            tagStr = "!<" + tagStr + ">";
          }
          state.dump = tagStr + " " + state.dump;
        }
      }
      return true;
    }
    function getDuplicateReferences(object, state) {
      var objects = [], duplicatesIndexes = [], index, length;
      inspectNode(object, objects, duplicatesIndexes);
      for (index = 0, length = duplicatesIndexes.length; index < length; index += 1) {
        state.duplicates.push(objects[duplicatesIndexes[index]]);
      }
      state.usedDuplicates = new Array(length);
    }
    function inspectNode(object, objects, duplicatesIndexes) {
      var objectKeyList, index, length;
      if (object !== null && typeof object === "object") {
        index = objects.indexOf(object);
        if (index !== -1) {
          if (duplicatesIndexes.indexOf(index) === -1) {
            duplicatesIndexes.push(index);
          }
        } else {
          objects.push(object);
          if (Array.isArray(object)) {
            for (index = 0, length = object.length; index < length; index += 1) {
              inspectNode(object[index], objects, duplicatesIndexes);
            }
          } else {
            objectKeyList = Object.keys(object);
            for (index = 0, length = objectKeyList.length; index < length; index += 1) {
              inspectNode(object[objectKeyList[index]], objects, duplicatesIndexes);
            }
          }
        }
      }
    }
    function dump(input, options) {
      options = options || {};
      var state = new State(options);
      if (!state.noRefs)
        getDuplicateReferences(input, state);
      var value = input;
      if (state.replacer) {
        value = state.replacer.call({ "": value }, "", value);
      }
      if (writeNode(state, 0, value, true, true))
        return state.dump + "\n";
      return "";
    }
    module2.exports.dump = dump;
  }
});

// node_modules/js-yaml/index.js
var require_js_yaml = __commonJS({
  "node_modules/js-yaml/index.js"(exports, module2) {
    "use strict";
    var loader = require_loader();
    var dumper = require_dumper();
    function renamed(from, to) {
      return function() {
        throw new Error("Function yaml." + from + " is removed in js-yaml 4. Use yaml." + to + " instead, which is now safe by default.");
      };
    }
    module2.exports.Type = require_type();
    module2.exports.Schema = require_schema();
    module2.exports.FAILSAFE_SCHEMA = require_failsafe();
    module2.exports.JSON_SCHEMA = require_json();
    module2.exports.CORE_SCHEMA = require_core();
    module2.exports.DEFAULT_SCHEMA = require_default();
    module2.exports.load = loader.load;
    module2.exports.loadAll = loader.loadAll;
    module2.exports.dump = dumper.dump;
    module2.exports.YAMLException = require_exception();
    module2.exports.types = {
      binary: require_binary(),
      float: require_float(),
      map: require_map(),
      null: require_null(),
      pairs: require_pairs(),
      set: require_set(),
      timestamp: require_timestamp(),
      bool: require_bool(),
      int: require_int(),
      merge: require_merge(),
      omap: require_omap(),
      seq: require_seq(),
      str: require_str()
    };
    module2.exports.safeLoad = renamed("safeLoad", "load");
    module2.exports.safeLoadAll = renamed("safeLoadAll", "loadAll");
    module2.exports.safeDump = renamed("safeDump", "dump");
  }
});

// src/index.ts
var src_exports = {};
__export(src_exports, {
  ConfigLoader: () => ConfigLoader,
  RedisProvider: () => RedisProvider,
  SmartSearch: () => SmartSearch,
  SmartSearchFactory: () => SmartSearchFactory,
  SupabaseProvider: () => SupabaseProvider,
  default: () => src_default
});
module.exports = __toCommonJS(src_exports);

// src/security/DataGovernance.ts
var _DataGovernanceService = class _DataGovernanceService {
  constructor(config) {
    this.auditLogs = [];
    this.config = config;
  }
  /**
   * Apply field-level masking to search results based on user role and context
   */
  async maskSensitiveFields(results, userRole, context) {
    return results.map((result) => {
      const maskedResult = { ...result };
      for (const [fieldPath, maskingFunction] of Object.entries(this.config.fieldMasking)) {
        const fieldValue = this.getNestedValue(maskedResult, fieldPath);
        if (fieldValue !== void 0) {
          const maskedValue = maskingFunction(fieldValue, userRole, context);
          this.setNestedValue(maskedResult, fieldPath, maskedValue);
        }
      }
      return maskedResult;
    });
  }
  /**
   * Apply row-level security filters to search options
   */
  async applyRowLevelSecurity(options, tableName, context) {
    const rlsFunction = this.config.rowLevelSecurity[tableName];
    if (rlsFunction) {
      const securityFilter = rlsFunction(context.userId, context.userRole, context);
      return {
        ...options,
        filters: {
          ...options.filters,
          custom: {
            ...options.filters?.custom,
            rowLevelSecurity: securityFilter
          }
        }
      };
    }
    return options;
  }
  /**
   * Audit search access with comprehensive logging
   */
  async auditSearchAccess(query, user, results, searchTime, success = true, errorMessage) {
    if (!this.config.auditLogging.enabled) {
      return "";
    }
    const auditId = this.generateAuditId();
    const sensitiveDataAccessed = this.detectSensitiveDataAccess(results);
    const complianceFlags = this.generateComplianceFlags(results, user);
    const auditEntry = {
      id: auditId,
      timestamp: /* @__PURE__ */ new Date(),
      userId: user.userId,
      userRole: user.userRole,
      action: "search",
      resource: "search_results",
      query: this.config.auditLogging.sensitiveDataRedaction ? this.redactSensitiveQuery(query) : query,
      resultCount: results.length,
      searchTime,
      success,
      ...errorMessage && { errorMessage },
      ...user.ipAddress && { ipAddress: user.ipAddress },
      ...user.userAgent && { userAgent: user.userAgent },
      ...user.sessionId && { sessionId: user.sessionId },
      ...user.institutionId && { institutionId: user.institutionId },
      sensitiveDataAccessed,
      complianceFlags
    };
    await this.writeAuditLog(auditEntry);
    return auditId;
  }
  /**
   * Validate user access to specific data fields
   */
  async validateDataAccess(user, requestedFields) {
    const allowed = [];
    const denied = [];
    const reasons = {};
    for (const field of requestedFields) {
      const classification = this.config.dataClassification[field];
      const hasAccess = this.checkFieldAccess(user, field, classification);
      if (hasAccess) {
        allowed.push(field);
      } else {
        denied.push(field);
        reasons[field] = `Insufficient clearance for ${classification} data`;
      }
    }
    return { allowed, denied, reasons };
  }
  /**
   * Generate compliance report for audit purposes
   */
  async generateComplianceReport(startDate, endDate) {
    const relevantLogs = this.auditLogs.filter(
      (log) => log.timestamp >= startDate && log.timestamp <= endDate
    );
    const totalSearches = relevantLogs.length;
    const sensitiveDataAccesses = relevantLogs.filter((log) => log.sensitiveDataAccessed).length;
    const complianceViolations = relevantLogs.filter((log) => log.complianceFlags.length > 0).length;
    const userActivity = {};
    relevantLogs.forEach((log) => {
      userActivity[log.userId] = (userActivity[log.userId] || 0) + 1;
    });
    const riskScore = this.calculateRiskScore(relevantLogs);
    return {
      totalSearches,
      sensitiveDataAccesses,
      complianceViolations,
      userActivity,
      riskScore
    };
  }
  // Private helper methods
  getNestedValue(obj, path) {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }
  setNestedValue(obj, path, value) {
    const keys = path.split(".");
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!(key in current)) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  }
  generateAuditId() {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  detectSensitiveDataAccess(results) {
    return results.some((result) => {
      return Object.keys(this.config.dataClassification).some((fieldPath) => {
        const classification = this.config.dataClassification[fieldPath];
        const hasValue = this.getNestedValue(result, fieldPath) !== void 0;
        return hasValue && ["confidential", "restricted", "pii", "phi"].includes(classification);
      });
    });
  }
  generateComplianceFlags(results, user) {
    const flags = [];
    const hour = user.timestamp.getHours();
    if ((hour < 8 || hour > 18) && this.detectSensitiveDataAccess(results)) {
      flags.push("AFTER_HOURS_SENSITIVE_ACCESS");
    }
    if (results.length > 1e3) {
      flags.push("BULK_DATA_ACCESS");
    }
    const institutionIds = new Set(results.map((r) => r.metadata?.institutionId).filter(Boolean));
    if (institutionIds.size > 1) {
      flags.push("CROSS_INSTITUTIONAL_ACCESS");
    }
    return flags;
  }
  redactSensitiveQuery(query) {
    return query.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN]").replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[EMAIL]").replace(/\b\d{3}-\d{3}-\d{4}\b/g, "[PHONE]");
  }
  checkFieldAccess(user, field, classification) {
    if (!classification) {
      return true;
    }
    const rolePermissions = {
      "admin": ["public", "internal", "confidential", "restricted", "pii", "phi"],
      "doctor": ["public", "internal", "confidential", "pii", "phi"],
      "nurse": ["public", "internal", "pii"],
      "researcher": ["public", "internal"],
      "patient": ["public"]
    };
    const allowedClassifications = rolePermissions[user.userRole] || ["public"];
    return allowedClassifications.includes(classification);
  }
  calculateRiskScore(logs) {
    if (logs.length === 0) {
      return 0;
    }
    let riskScore = 0;
    logs.forEach((log) => {
      if (log.sensitiveDataAccessed) {
        riskScore += 2;
      }
      if (log.complianceFlags.length > 0) {
        riskScore += log.complianceFlags.length * 3;
      }
      if (!log.success) {
        riskScore += 1;
      }
    });
    return Math.min(100, riskScore / logs.length * 10);
  }
  static simpleHash(input) {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
  async writeAuditLog(entry) {
    this.auditLogs.push(entry);
    if (this.auditLogs.length > 1e4) {
      this.auditLogs = this.auditLogs.slice(-5e3);
    }
    switch (this.config.auditLogging.destination) {
      case "console":
        console.log(`[AUDIT] ${JSON.stringify(entry)}`);
        break;
      case "file":
        console.log(`[AUDIT FILE] Would write to audit.log:`, entry);
        break;
      case "database":
        console.log(`[AUDIT DB] Would write to audit table:`, entry);
        break;
      case "external":
        console.log(`[AUDIT EXTERNAL] Would send to external service:`, entry);
        break;
    }
  }
};
/**
 * Built-in field masking functions for common use cases
 */
_DataGovernanceService.MaskingFunctions = {
  // Social Security Number masking
  ssn: (value, userRole) => {
    if (userRole === "admin" || userRole === "doctor") {
      return value;
    }
    return value ? `***-**-${value.slice(-4)}` : "";
  },
  // Email masking
  email: (value, userRole) => {
    if (userRole === "admin") {
      return value;
    }
    if (!value) {
      return "";
    }
    const [localPart, domain] = value.split("@");
    return `${localPart.slice(0, 2)}***@${domain}`;
  },
  // Phone number masking
  phone: (value, userRole) => {
    if (userRole === "admin" || userRole === "doctor") {
      return value;
    }
    return value ? `***-***-${value.slice(-4)}` : "";
  },
  // Medical Record Number masking
  medicalRecordNumber: (value, userRole) => {
    if (userRole === "doctor" || userRole === "nurse") {
      return value;
    }
    return value ? `***${value.slice(-3)}` : "";
  },
  // Full redaction for highly sensitive data
  redact: (value, userRole) => {
    return userRole === "admin" ? value : "[REDACTED]";
  },
  // Hash-based masking for consistent pseudonymization
  hash: (value) => {
    return value ? `#${_DataGovernanceService.simpleHash(value)}` : "";
  }
};
/**
 * Built-in row-level security functions
 */
_DataGovernanceService.RLSFunctions = {
  // Patient data access by assigned doctor
  patientsByDoctor: (userId, userRole) => {
    if (userRole === "admin") {
      return "true";
    }
    if (userRole === "doctor") {
      return `assigned_doctor_id = '${userId}'`;
    }
    return "false";
  },
  // Institutional data access
  byInstitution: (userId, userRole, context) => {
    if (userRole === "admin") {
      return "true";
    }
    if (context.institutionId) {
      return `institution_id = '${context.institutionId}'`;
    }
    return "false";
  },
  // Time-based access (office hours only)
  officeHours: (userId, userRole, context) => {
    const hour = context.timestamp.getHours();
    if (userRole === "admin") {
      return "true";
    }
    if (hour >= 8 && hour <= 18) {
      return "true";
    }
    return "access_after_hours = true";
  }
};
var DataGovernanceService = _DataGovernanceService;
var ComplianceConfigs = {
  HIPAA: {
    fieldMasking: {
      "ssn": DataGovernanceService.MaskingFunctions.ssn,
      "medical_record_number": DataGovernanceService.MaskingFunctions.medicalRecordNumber,
      "phone": DataGovernanceService.MaskingFunctions.phone,
      "email": DataGovernanceService.MaskingFunctions.email
    },
    rowLevelSecurity: {
      "patients": DataGovernanceService.RLSFunctions.patientsByDoctor,
      "medical_records": DataGovernanceService.RLSFunctions.patientsByDoctor
    },
    auditLogging: {
      enabled: true,
      logLevel: "comprehensive",
      fields: ["userId", "query", "resultCount", "timestamp", "ipAddress"],
      retention: 2555,
      // 7 years as required by HIPAA
      destination: "database",
      sensitiveDataRedaction: true
    },
    dataClassification: {
      "ssn": "phi",
      "medical_record_number": "phi",
      "diagnosis": "phi",
      "prescription": "phi",
      "phone": "pii",
      "email": "pii"
    }
  }
};

// src/errors/SearchErrors.ts
var SearchError = class extends Error {
  constructor(message, code, context) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = /* @__PURE__ */ new Date();
    this.context = context || {};
    Error.captureStackTrace(this, this.constructor);
  }
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack
    };
  }
};
var DatabaseConnectionError = class extends SearchError {
  constructor(message, context) {
    super(message, "DATABASE_CONNECTION_ERROR", context);
  }
};
var CacheConnectionError = class extends SearchError {
  constructor(message, context) {
    super(message, "CACHE_CONNECTION_ERROR", context);
  }
};
var SearchTimeoutError = class extends SearchError {
  constructor(message, timeoutMs, context) {
    super(message, "SEARCH_TIMEOUT_ERROR", { ...context, timeoutMs });
    this.timeoutMs = timeoutMs;
  }
};
var CircuitBreakerError = class extends SearchError {
  constructor(message, failureCount, nextRetryTime, context) {
    super(message, "CIRCUIT_BREAKER_OPEN", {
      ...context,
      failureCount,
      nextRetryTime: nextRetryTime.toISOString()
    });
    this.failureCount = failureCount;
    this.nextRetryTime = nextRetryTime;
  }
};
var SecurityAccessDeniedError = class extends SearchError {
  constructor(message, userId, requiredRole, actualRole, context) {
    super(message, "SECURITY_ACCESS_DENIED", {
      ...context,
      userId,
      requiredRole,
      actualRole
    });
    this.userId = userId;
    this.requiredRole = requiredRole;
    this.actualRole = actualRole;
  }
};
var InvalidQueryError = class extends SearchError {
  constructor(message, query, reason, context) {
    super(message, "INVALID_QUERY_ERROR", { ...context, query, reason });
    this.query = query;
    this.reason = reason;
  }
};
var ProviderError = class extends SearchError {
  constructor(message, providerName, providerType, context) {
    super(message, "PROVIDER_ERROR", { ...context, providerName, providerType });
    this.providerName = providerName;
    this.providerType = providerType;
  }
};
var ResourceExhaustedError = class extends SearchError {
  constructor(message, resourceType, currentUsage, limit, context) {
    super(message, "RESOURCE_EXHAUSTED_ERROR", {
      ...context,
      resourceType,
      currentUsage,
      limit
    });
    this.resourceType = resourceType;
    this.currentUsage = currentUsage;
    this.limit = limit;
  }
};
var RateLimitExceededError = class extends SearchError {
  constructor(message, userId, rateLimit, windowMs, resetTime, context) {
    super(message, "RATE_LIMIT_EXCEEDED_ERROR", {
      ...context,
      userId,
      rateLimit,
      windowMs,
      resetTime: resetTime.toISOString()
    });
    this.userId = userId;
    this.rateLimit = rateLimit;
    this.windowMs = windowMs;
    this.resetTime = resetTime;
  }
};
var ComplianceViolationError = class extends SearchError {
  constructor(message, complianceType, violationDetails, context) {
    super(message, "COMPLIANCE_VIOLATION_ERROR", {
      ...context,
      complianceType,
      violationDetails
    });
    this.complianceType = complianceType;
    this.violationDetails = violationDetails;
  }
};
var ErrorHandler = class {
  /**
   * Handle search errors with intelligent retry and fallback logic
   */
  static async handleSearchError(error, context) {
    const { query, provider, retryCount = 0, maxRetries = 3 } = context;
    this.trackErrorFrequency(error, provider);
    this.logError(error, context);
    if (this.isRetryableError(error) && retryCount < maxRetries) {
      const delay = this.calculateRetryDelay(retryCount);
      console.warn(`Retrying search after ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
      await this.delay(delay);
      const retryError = new Error(`Retryable error occurred: ${error.message}`);
      retryError.code = "RETRY_NEEDED";
      retryError.context = { originalError: error, retryCount: retryCount + 1 };
      throw retryError;
    }
    if (!(error instanceof SearchError)) {
      if (error.message.includes("timeout")) {
        throw new SearchTimeoutError(
          `Search operation timed out: ${error.message}`,
          3e4,
          { originalError: error, query, provider }
        );
      }
      if (error.message.includes("connection")) {
        throw new DatabaseConnectionError(
          `Database connection failed: ${error.message}`,
          { originalError: error, provider }
        );
      }
      throw new ProviderError(
        `Provider operation failed: ${error.message}`,
        provider,
        "database",
        { originalError: error, query }
      );
    }
    throw error;
  }
  /**
   * Check if an error should trigger circuit breaker opening
   */
  static shouldOpenCircuitBreaker(provider, threshold = 5) {
    const errorCount = this.errorCounts.get(provider) || 0;
    return errorCount >= threshold;
  }
  /**
   * Reset error tracking for a provider (when circuit breaker recovers)
   */
  static resetErrorTracking(provider) {
    this.errorCounts.delete(provider);
    this.lastErrorTimes.delete(provider);
  }
  /**
   * Get error statistics for monitoring and alerting
   */
  static getErrorStatistics() {
    const stats = {};
    for (const [provider, count] of this.errorCounts.entries()) {
      const lastError = this.lastErrorTimes.get(provider);
      stats[provider] = {
        count,
        ...lastError && { lastError }
      };
    }
    return stats;
  }
  // Private helper methods
  static trackErrorFrequency(error, provider) {
    const currentCount = this.errorCounts.get(provider) || 0;
    this.errorCounts.set(provider, currentCount + 1);
    this.lastErrorTimes.set(provider, /* @__PURE__ */ new Date());
    const lastErrorTime = this.lastErrorTimes.get(provider);
    if (lastErrorTime && Date.now() - lastErrorTime.getTime() > 36e5) {
      this.errorCounts.set(provider, 1);
    }
  }
  static logError(error, context) {
    const severity = this.getErrorSeverity(error);
    const logMethod = severity === "critical" ? "error" : severity === "high" ? "error" : severity === "medium" ? "warn" : "log";
    console[logMethod](`[${severity.toUpperCase()}] Search Error:`, {
      error: error.message,
      type: error.constructor.name,
      code: error.code,
      context,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      stack: error.stack
    });
  }
  static getErrorSeverity(error) {
    if (error instanceof SecurityAccessDeniedError || error instanceof ComplianceViolationError) {
      return "critical";
    }
    if (error instanceof CircuitBreakerError || error instanceof ResourceExhaustedError) {
      return "high";
    }
    if (error instanceof SearchTimeoutError || error instanceof RateLimitExceededError) {
      return "medium";
    }
    return "low";
  }
  static isRetryableError(error) {
    if (error instanceof DatabaseConnectionError || error instanceof CacheConnectionError) {
      return true;
    }
    if (error instanceof SearchTimeoutError) {
      return true;
    }
    if (error instanceof ResourceExhaustedError) {
      return true;
    }
    if (error instanceof SecurityAccessDeniedError || error instanceof InvalidQueryError || error instanceof ComplianceViolationError) {
      return false;
    }
    return false;
  }
  static calculateRetryDelay(retryCount) {
    const baseDelay = 1e3;
    const exponentialDelay = baseDelay * Math.pow(2, retryCount);
    const jitter = Math.random() * 1e3;
    return Math.min(exponentialDelay + jitter, 3e4);
  }
  static delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
};
ErrorHandler.errorCounts = /* @__PURE__ */ new Map();
ErrorHandler.lastErrorTimes = /* @__PURE__ */ new Map();

// src/strategies/CircuitBreaker.ts
var CircuitBreaker = class {
  constructor(config = {}) {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.successCount = 0;
    this.totalRequests = 0;
    this.recentFailures = [];
    this.config = {
      failureThreshold: 5,
      recoveryTimeout: 6e4,
      // 1 minute
      healthCheckTimeout: 5e3,
      // 5 seconds
      successThreshold: 3,
      monitoringWindow: 3e5,
      // 5 minutes
      degradationStrategy: "graceful",
      ...config
    };
  }
  /**
   * Execute operation with circuit breaker protection
   */
  async execute(operation, operationName = "operation") {
    this.totalRequests++;
    this.cleanupOldFailures();
    if (this.state === "OPEN") {
      if (this.shouldAttemptRecovery()) {
        this.state = "HALF_OPEN";
        console.log(`Circuit breaker entering HALF_OPEN state for ${operationName}`);
      } else {
        throw new CircuitBreakerError(
          `Circuit breaker is OPEN for ${operationName}. Next retry at ${this.nextRetryTime?.toISOString()}`,
          this.failureCount,
          this.nextRetryTime || /* @__PURE__ */ new Date(),
          { operationName, state: this.state }
        );
      }
    }
    try {
      const result = await this.executeWithTimeout(operation, this.config.healthCheckTimeout);
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
  /**
   * Get current circuit breaker statistics
   */
  getStats() {
    const stats = {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      failureRate: this.calculateFailureRate()
    };
    if (this.lastFailureTime) {
      stats.lastFailureTime = this.lastFailureTime;
    }
    if (this.lastSuccessTime) {
      stats.lastSuccessTime = this.lastSuccessTime;
    }
    if (this.nextRetryTime) {
      stats.nextRetryTime = this.nextRetryTime;
    }
    return stats;
  }
  /**
   * Manually reset the circuit breaker
   */
  reset() {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.successCount = 0;
    delete this.lastFailureTime;
    delete this.lastSuccessTime;
    delete this.nextRetryTime;
    this.recentFailures = [];
    console.log("Circuit breaker manually reset to CLOSED state");
  }
  /**
   * Force circuit breaker to open (for testing or manual intervention)
   */
  forceOpen(reason) {
    this.state = "OPEN";
    this.nextRetryTime = new Date(Date.now() + this.config.recoveryTimeout);
    console.log(`Circuit breaker forced to OPEN state: ${reason}`);
  }
  /**
   * Check if circuit breaker is healthy
   */
  isHealthy() {
    return this.state === "CLOSED" || this.state === "HALF_OPEN" && this.successCount > 0;
  }
  /**
   * Get failure rate over the monitoring window
   */
  getFailureRate() {
    return this.calculateFailureRate();
  }
  // Private methods
  async executeWithTimeout(operation, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      operation().then((result) => {
        clearTimeout(timer);
        resolve(result);
      }).catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }
  recordSuccess() {
    this.successCount++;
    this.lastSuccessTime = /* @__PURE__ */ new Date();
    if (this.state === "HALF_OPEN") {
      if (this.successCount >= this.config.successThreshold) {
        this.state = "CLOSED";
        this.failureCount = 0;
        this.recentFailures = [];
        console.log("Circuit breaker recovered to CLOSED state");
      }
    }
  }
  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = /* @__PURE__ */ new Date();
    this.recentFailures.push(/* @__PURE__ */ new Date());
    if (this.state === "HALF_OPEN") {
      this.state = "OPEN";
      this.nextRetryTime = new Date(Date.now() + this.config.recoveryTimeout);
      console.log("Circuit breaker returned to OPEN state after failure during recovery");
    } else if (this.state === "CLOSED" && this.failureCount >= this.config.failureThreshold) {
      this.state = "OPEN";
      this.nextRetryTime = new Date(Date.now() + this.config.recoveryTimeout);
      console.log(`Circuit breaker opened after ${this.failureCount} failures`);
    }
  }
  shouldAttemptRecovery() {
    return this.nextRetryTime !== void 0 && Date.now() >= this.nextRetryTime.getTime();
  }
  calculateFailureRate() {
    if (this.totalRequests === 0) {
      return 0;
    }
    const recentFailureCount = this.recentFailures.length;
    const recentRequests = Math.max(1, this.totalRequests);
    return recentFailureCount / recentRequests;
  }
  cleanupOldFailures() {
    const cutoff = Date.now() - this.config.monitoringWindow;
    this.recentFailures = this.recentFailures.filter(
      (failureTime) => failureTime.getTime() > cutoff
    );
  }
};
var CircuitBreakerManager = class {
  constructor(defaultConfig = {}) {
    this.circuits = /* @__PURE__ */ new Map();
    this.defaultConfig = {
      failureThreshold: 5,
      recoveryTimeout: 6e4,
      healthCheckTimeout: 5e3,
      successThreshold: 3,
      monitoringWindow: 3e5,
      degradationStrategy: "graceful",
      ...defaultConfig
    };
  }
  /**
   * Get or create circuit breaker for a service
   */
  getCircuit(serviceName, config) {
    if (!this.circuits.has(serviceName)) {
      const circuitConfig = { ...this.defaultConfig, ...config };
      this.circuits.set(serviceName, new CircuitBreaker(circuitConfig));
    }
    return this.circuits.get(serviceName);
  }
  /**
   * Execute operation with circuit breaker for specific service
   */
  async execute(serviceName, operation, config) {
    const circuit = this.getCircuit(serviceName, config);
    return circuit.execute(operation, serviceName);
  }
  /**
   * Get statistics for all circuits
   */
  getAllStats() {
    const stats = {};
    for (const [serviceName, circuit] of this.circuits.entries()) {
      stats[serviceName] = circuit.getStats();
    }
    return stats;
  }
  /**
   * Get health status for all circuits
   */
  getHealthStatus() {
    const health = {};
    for (const [serviceName, circuit] of this.circuits.entries()) {
      health[serviceName] = circuit.isHealthy();
    }
    return health;
  }
  /**
   * Reset all circuits
   */
  resetAll() {
    for (const circuit of this.circuits.values()) {
      circuit.reset();
    }
    console.log("All circuit breakers reset");
  }
  /**
   * Remove circuit for a service
   */
  removeCircuit(serviceName) {
    return this.circuits.delete(serviceName);
  }
  /**
   * Get list of services with open circuits
   */
  getOpenCircuits() {
    const openCircuits = [];
    for (const [serviceName, circuit] of this.circuits.entries()) {
      if (circuit.getStats().state === "OPEN") {
        openCircuits.push(serviceName);
      }
    }
    return openCircuits;
  }
  /**
   * Monitor circuit breaker health and log warnings
   */
  startHealthMonitoring(intervalMs = 3e4) {
    return setInterval(() => {
      const stats = this.getAllStats();
      for (const [serviceName, circuitStats] of Object.entries(stats)) {
        if (circuitStats.state === "OPEN") {
          console.warn(`\u26A0\uFE0F Circuit breaker for ${serviceName} is OPEN`, {
            failureCount: circuitStats.failureCount,
            nextRetryTime: circuitStats.nextRetryTime?.toISOString(),
            failureRate: circuitStats.failureRate
          });
        } else if (circuitStats.failureRate > 0.1) {
          console.warn(`\u26A0\uFE0F High failure rate for ${serviceName}: ${(circuitStats.failureRate * 100).toFixed(1)}%`);
        }
      }
    }, intervalMs);
  }
};

// src/SmartSearch.ts
var SmartSearch = class {
  constructor(config) {
    this.healthCheckInterval = 3e4;
    // 30 seconds
    this.lastHealthCheck = 0;
    this.cachedHealthStatus = null;
    this.circuitBreaker = {
      isOpen: false,
      failureCount: 0,
      lastFailure: 0,
      nextRetryTime: 0
    };
    this.database = config.database;
    if (config.cache) {
      this.cache = config.cache;
      this.initializeCacheConnection();
    }
    if (config.dataGovernance) {
      this.dataGovernance = new DataGovernanceService(config.dataGovernance);
    }
    this.circuitBreakerManager = new CircuitBreakerManager({
      failureThreshold: config.circuitBreaker?.failureThreshold ?? 5,
      recoveryTimeout: config.circuitBreaker?.recoveryTimeout ?? 6e4,
      healthCheckTimeout: config.circuitBreaker?.healthCacheTTL ?? 5e3
    });
    this.FAILURE_THRESHOLD = config.circuitBreaker?.failureThreshold ?? 3;
    this.RECOVERY_TIMEOUT = config.circuitBreaker?.recoveryTimeout ?? 6e4;
    this.HEALTH_CACHE_TTL = config.circuitBreaker?.healthCacheTTL ?? 3e4;
    this.enableMetrics = config.performance?.enableMetrics ?? true;
    this.logQueries = config.performance?.logQueries ?? false;
    this.slowQueryThreshold = config.performance?.slowQueryThreshold ?? 1e3;
    this.cacheEnabled = config.cacheConfig?.enabled ?? true;
    this.defaultCacheTTL = config.cacheConfig?.defaultTTL ?? 3e5;
    this.hybridSearchEnabled = config.hybridSearch?.enabled ?? false;
    this.hybridSearchConfig = {
      cacheWeight: config.hybridSearch?.cacheWeight ?? 0.7,
      databaseWeight: config.hybridSearch?.databaseWeight ?? 0.3,
      mergingAlgorithm: config.hybridSearch?.mergingAlgorithm ?? "weighted"
    };
    this.initializeHealthMonitoring();
  }
  /**
   * Enterprise search with data governance and security
   */
  async secureSearch(query, userContext, options = {}) {
    const startTime = Date.now();
    try {
      if (this.dataGovernance) {
        const tableName = "default";
        options = await this.dataGovernance.applyRowLevelSecurity(options, tableName, userContext);
      }
      const searchResult = await this.search(query, options);
      let maskedResults = searchResult.results;
      if (this.dataGovernance) {
        maskedResults = await this.dataGovernance.maskSensitiveFields(
          searchResult.results,
          userContext.userRole,
          userContext
        );
      }
      let auditId = "";
      if (this.dataGovernance) {
        auditId = await this.dataGovernance.auditSearchAccess(
          query,
          userContext,
          maskedResults,
          searchResult.performance.searchTime,
          true
        );
      }
      return {
        results: maskedResults,
        performance: searchResult.performance,
        strategy: searchResult.strategy,
        auditId
      };
    } catch (error) {
      let auditId = "";
      if (this.dataGovernance) {
        auditId = await this.dataGovernance.auditSearchAccess(
          query,
          userContext,
          [],
          Math.max(1, Date.now() - startTime),
          false,
          error instanceof Error ? error.message : "Unknown error"
        );
      }
      throw new Error(
        `Secure search failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  /**
   * Hybrid search combining cache and database results
   */
  async hybridSearch(query, options = {}) {
    if (!this.hybridSearchEnabled || !this.cache) {
      return this.search(query, options);
    }
    const startTime = Date.now();
    try {
      const [cacheResults, dbResults] = await Promise.allSettled([
        this.searchWithCache(query, options),
        this.searchWithDatabase(query, options)
      ]);
      const cacheSuccess = cacheResults.status === "fulfilled";
      const dbSuccess = dbResults.status === "fulfilled";
      let mergedResults = [];
      let strategy;
      if (cacheSuccess && dbSuccess) {
        mergedResults = this.mergeSearchResults(
          cacheResults.value,
          dbResults.value,
          this.hybridSearchConfig
        );
        strategy = {
          primary: "hybrid",
          fallback: "database",
          reason: `Hybrid search: merged ${cacheResults.value.length} cache + ${dbResults.value.length} database results`
        };
      } else if (cacheSuccess && !dbSuccess) {
        mergedResults = cacheResults.value;
        strategy = {
          primary: "cache",
          fallback: "database",
          reason: "Database failed, using cache results only"
        };
      } else if (!cacheSuccess && dbSuccess) {
        mergedResults = dbResults.value;
        strategy = {
          primary: "database",
          fallback: "cache",
          reason: "Cache failed, using database results only"
        };
      } else {
        throw new Error(
          "Both cache and database searches failed"
        );
      }
      const performance = {
        searchTime: Math.max(1, Date.now() - startTime),
        resultCount: mergedResults.length,
        strategy: strategy.primary,
        cacheHit: cacheSuccess,
        errors: [
          ...cacheSuccess ? [] : [`Cache error: ${cacheResults.reason.message}`],
          ...dbSuccess ? [] : [`Database error: ${dbResults.reason.message}`]
        ].filter(Boolean)
      };
      return {
        results: mergedResults,
        performance,
        strategy
      };
    } catch (error) {
      throw new Error(
        `Hybrid search failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  /**
   * Intelligent search with automatic cache/database switching
   */
  async search(query, options = {}) {
    const startTime = Date.now();
    try {
      const strategy = await this.determineSearchStrategy();
      if (this.logQueries) {
        console.log(`\u{1F50D} Using ${strategy.primary} search strategy: ${strategy.reason}`);
      }
      let results = [];
      let performance;
      try {
        if (strategy.primary === "cache" && this.cache) {
          results = await this.searchWithCache(query, options);
          performance = {
            searchTime: Math.max(1, Date.now() - startTime),
            resultCount: results.length,
            strategy: "cache",
            cacheHit: true
          };
        } else {
          results = await this.searchWithDatabase(query, options);
          performance = {
            searchTime: Math.max(1, Date.now() - startTime),
            resultCount: results.length,
            strategy: "database",
            cacheHit: false
          };
        }
        if (strategy.primary === "cache" && this.circuitBreaker.failureCount > 0) {
          this.resetCircuitBreaker();
        }
      } catch (primaryError) {
        console.warn(`\u26A0\uFE0F ${strategy.primary} search failed, falling back to ${strategy.fallback}:`, primaryError);
        if (strategy.primary === "cache") {
          this.recordCacheFailure();
        }
        if (strategy.fallback === "cache" && this.cache) {
          results = await this.searchWithCache(query, options);
          performance = {
            searchTime: Math.max(1, Date.now() - startTime),
            resultCount: results.length,
            strategy: "cache",
            cacheHit: true,
            errors: [primaryError instanceof Error ? primaryError.message : "Unknown primary error"]
          };
        } else {
          results = await this.searchWithDatabase(query, options);
          performance = {
            searchTime: Math.max(1, Date.now() - startTime),
            resultCount: results.length,
            strategy: "database",
            cacheHit: false,
            errors: [primaryError instanceof Error ? primaryError.message : "Unknown primary error"]
          };
        }
      }
      if (this.cache && this.cacheEnabled && strategy.primary === "database") {
        try {
          const cacheKey = this.generateCacheKey(query, options);
          const ttl = results.length > 0 ? options.cacheTTL ?? this.defaultCacheTTL : Math.min(options.cacheTTL ?? this.defaultCacheTTL, 6e4);
          await this.cache.set(cacheKey, results, ttl);
          if (this.logQueries && results.length === 0) {
            console.log(`\u{1F504} Cached empty results for "${query}" (TTL: ${ttl}ms)`);
          }
        } catch (cacheError) {
          if (this.logQueries) {
            console.warn("\u26A0\uFE0F Failed to cache search results:", cacheError);
          }
        }
      }
      if (this.enableMetrics) {
        this.logSearchPerformance(query, performance, strategy);
      }
      return {
        results,
        performance,
        strategy
      };
    } catch (error) {
      console.error("\u274C All search strategies failed:", error);
      return {
        results: [],
        performance: {
          searchTime: Math.max(1, Date.now() - startTime),
          resultCount: 0,
          strategy: "database",
          cacheHit: false,
          errors: [error instanceof Error ? error.message : "Complete search failure"]
        },
        strategy: {
          primary: "database",
          fallback: "database",
          reason: "All search methods failed"
        }
      };
    }
  }
  /**
   * Get current cache health status with caching
   */
  async getCacheHealth() {
    if (!this.cache)
      return null;
    const now = Date.now();
    if (this.cachedHealthStatus && now - this.lastHealthCheck < this.HEALTH_CACHE_TTL) {
      return this.cachedHealthStatus;
    }
    try {
      this.cachedHealthStatus = await this.cache.checkHealth();
      this.lastHealthCheck = now;
      return this.cachedHealthStatus;
    } catch (error) {
      console.error("\u274C Cache health check failed:", error);
      return this.cachedHealthStatus || {
        isConnected: false,
        isSearchAvailable: false,
        latency: -1,
        memoryUsage: "0",
        keyCount: 0,
        lastSync: null,
        errors: ["Health check failed"]
      };
    }
  }
  /**
   * Force a cache health check and update cache
   */
  async forceHealthCheck() {
    this.lastHealthCheck = 0;
    return this.getCacheHealth();
  }
  /**
   * Get search service statistics
   */
  async getSearchStats() {
    const cacheHealth = await this.getCacheHealth();
    const databaseHealth = await this.database.checkHealth();
    const recommendedStrategy = await this.determineSearchStrategy();
    return {
      cacheHealth,
      databaseHealth,
      circuitBreaker: { ...this.circuitBreaker },
      recommendedStrategy
    };
  }
  /**
   * Clear cache data
   */
  async clearCache(pattern) {
    if (!this.cache)
      return;
    try {
      await this.cache.clear(pattern);
      if (this.logQueries) {
        console.log("\u2705 Cache cleared");
      }
    } catch (error) {
      console.error("\u274C Failed to clear cache:", error);
    }
  }
  // Private methods
  async determineSearchStrategy() {
    if (!this.cache) {
      return {
        primary: "database",
        fallback: "database",
        reason: "No cache provider configured"
      };
    }
    if (this.isCircuitBreakerOpen()) {
      return {
        primary: "database",
        fallback: "database",
        reason: "Cache circuit breaker is open due to repeated failures"
      };
    }
    const health = await this.getCacheHealth();
    if (health && health.isConnected && health.isSearchAvailable && health.latency !== void 0 && health.latency < 1e3) {
      return {
        primary: "cache",
        fallback: "database",
        reason: `Cache healthy (${health.latency}ms latency, ${health.keyCount} keys)`
      };
    }
    if (health && health.isConnected && !health.isSearchAvailable) {
      return {
        primary: "database",
        fallback: "cache",
        reason: "Cache connected but search unavailable"
      };
    }
    if (health && health.isConnected && health.latency !== void 0 && health.latency > 1e3) {
      return {
        primary: "database",
        fallback: "cache",
        reason: `Cache high latency (${health.latency}ms)`
      };
    }
    return {
      primary: "database",
      fallback: "database",
      reason: "Cache unavailable or unhealthy"
    };
  }
  async searchWithCache(query, options) {
    if (!this.cache) {
      throw new Error("Cache provider not configured");
    }
    const cacheKey = this.generateCacheKey(query, options);
    try {
      const cachedResults = await this.cache.get(cacheKey);
      if (cachedResults && Array.isArray(cachedResults)) {
        if (this.logQueries) {
          console.log(`\u2705 Cache hit for query: "${query}"`);
        }
        return cachedResults;
      }
      if (this.logQueries) {
        console.log(`\u26A0\uFE0F Cache miss for query: "${query}", searching database`);
      }
      const databaseResults = await this.database.search(query, options);
      const ttl = this.defaultCacheTTL;
      await this.cache.set(cacheKey, databaseResults, ttl);
      if (this.logQueries) {
        console.log(`\u2705 Cached ${databaseResults.length} results for query: "${query}"`);
      }
      return databaseResults;
    } catch (error) {
      console.error("\u274C Cache search failed:", error);
      throw error;
    }
  }
  async searchWithDatabase(query, options) {
    try {
      return await this.database.search(query, options);
    } catch (error) {
      console.error("\u274C Database search failed:", error);
      throw error;
    }
  }
  generateCacheKey(query, options) {
    const normalizedQuery = query.toLowerCase().trim();
    const keyData = {
      q: normalizedQuery,
      filters: options.filters || {},
      sortBy: options.sortBy || "relevance",
      sortOrder: options.sortOrder || "desc",
      limit: options.limit || 20,
      offset: options.offset || 0
    };
    const keyString = JSON.stringify(keyData);
    const keyPrefix = "search:";
    return keyPrefix + Buffer.from(keyString).toString("base64");
  }
  isCircuitBreakerOpen() {
    if (!this.circuitBreaker.isOpen) {
      return false;
    }
    if (Date.now() >= this.circuitBreaker.nextRetryTime) {
      if (this.logQueries) {
        console.log("\u{1F504} Circuit breaker recovery timeout reached, allowing retry...");
      }
      this.circuitBreaker.isOpen = false;
      return false;
    }
    return true;
  }
  recordCacheFailure() {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailure = Date.now();
    if (this.circuitBreaker.failureCount >= this.FAILURE_THRESHOLD) {
      this.circuitBreaker.isOpen = true;
      this.circuitBreaker.nextRetryTime = Date.now() + this.RECOVERY_TIMEOUT;
      console.warn(
        `\u26A1 Cache circuit breaker opened after ${this.circuitBreaker.failureCount} failures. Will retry in ${this.RECOVERY_TIMEOUT / 1e3}s`
      );
    }
  }
  resetCircuitBreaker() {
    if (this.circuitBreaker.failureCount > 0) {
      if (this.logQueries) {
        console.log("\u2705 Cache circuit breaker reset - service recovered");
      }
      this.circuitBreaker.failureCount = 0;
      this.circuitBreaker.isOpen = false;
      this.circuitBreaker.lastFailure = 0;
      this.circuitBreaker.nextRetryTime = 0;
    }
  }
  logSearchPerformance(query, performance, strategy) {
    const logLevel = performance.errors ? "warn" : "log";
    if (this.logQueries || performance.searchTime > this.slowQueryThreshold) {
      console[logLevel](
        `\u{1F50D} Search "${query}": ${performance.resultCount} results in ${performance.searchTime}ms via ${performance.strategy} (${strategy.reason})`
      );
    }
    if (performance.searchTime > this.slowQueryThreshold) {
      console.warn(`\u{1F40C} Slow query detected: ${performance.searchTime}ms for "${query}"`);
    }
  }
  initializeHealthMonitoring() {
    if (this.cache) {
      this.getCacheHealth().catch((error) => {
        console.warn("\u26A0\uFE0F Initial cache health check failed:", error);
      });
    }
    if (typeof globalThis !== "undefined" && "window" in globalThis && globalThis.window) {
      setInterval(() => {
        this.forceHealthCheck().catch((error) => {
          console.warn("\u26A0\uFE0F Periodic health check failed:", error);
        });
      }, this.healthCheckInterval);
    }
  }
  /**
   * Merge search results from cache and database using specified algorithm
   */
  mergeSearchResults(cacheResults, dbResults, config) {
    switch (config.mergingAlgorithm) {
      case "union":
        return this.unionMerge(cacheResults, dbResults);
      case "intersection":
        return this.intersectionMerge(cacheResults, dbResults);
      case "weighted":
        return this.weightedMerge(cacheResults, dbResults, config.cacheWeight, config.databaseWeight);
      default:
        return this.unionMerge(cacheResults, dbResults);
    }
  }
  unionMerge(cacheResults, dbResults) {
    const seen = /* @__PURE__ */ new Set();
    const merged = [];
    for (const result of cacheResults) {
      if (!seen.has(result.id)) {
        seen.add(result.id);
        merged.push(result);
      }
    }
    for (const result of dbResults) {
      if (!seen.has(result.id)) {
        seen.add(result.id);
        merged.push(result);
      }
    }
    return merged.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
  intersectionMerge(cacheResults, dbResults) {
    const dbResultsMap = new Map(dbResults.map((r) => [r.id, r]));
    const intersection = [];
    for (const cacheResult of cacheResults) {
      const dbResult = dbResultsMap.get(cacheResult.id);
      if (dbResult) {
        const bestResult = cacheResult.relevanceScore >= dbResult.relevanceScore ? cacheResult : dbResult;
        intersection.push(bestResult);
      }
    }
    return intersection.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
  weightedMerge(cacheResults, dbResults, cacheWeight, dbWeight) {
    const resultMap = /* @__PURE__ */ new Map();
    for (const result of cacheResults) {
      const weightedScore = result.relevanceScore * cacheWeight;
      resultMap.set(result.id, {
        ...result,
        relevanceScore: Math.round(weightedScore),
        metadata: {
          ...result.metadata,
          source: "cache",
          originalScore: result.relevanceScore,
          weightedScore
        }
      });
    }
    for (const result of dbResults) {
      const existing = resultMap.get(result.id);
      const weightedScore = result.relevanceScore * dbWeight;
      if (existing) {
        const combinedScore = (existing.metadata?.weightedScore || 0) + weightedScore;
        resultMap.set(result.id, {
          ...existing,
          relevanceScore: Math.round(combinedScore),
          metadata: {
            ...existing.metadata,
            source: "hybrid",
            cacheScore: existing.metadata?.originalScore,
            databaseScore: result.relevanceScore,
            combinedScore
          }
        });
      } else {
        resultMap.set(result.id, {
          ...result,
          relevanceScore: Math.round(weightedScore),
          metadata: {
            ...result.metadata,
            source: "database",
            originalScore: result.relevanceScore,
            weightedScore
          }
        });
      }
    }
    return Array.from(resultMap.values()).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
  /**
   * Enhanced search with circuit breaker protection
   */
  async searchWithCircuitBreaker(operation, operationName) {
    return this.circuitBreakerManager.execute(operationName, operation);
  }
  /**
   * Initialize cache connection and create search indexes
   */
  initializeCacheConnection() {
    if (!this.cache)
      return;
    this.cache.connect?.().then(() => {
      if (this.logQueries) {
        console.log("\u2705 Cache connection and search indexes initialized");
      }
    }).catch((error) => {
      console.warn("\u26A0\uFE0F Cache connection failed, continuing without cache:", error?.message || error);
    });
  }
};

// src/providers/SupabaseProvider.ts
var import_supabase_js = require("@supabase/supabase-js");
var SupabaseProvider = class {
  constructor(config, searchConfig) {
    this.name = "Supabase";
    this.isConnectedFlag = false;
    this.client = (0, import_supabase_js.createClient)(config.url, config.key, config.options);
    this.searchConfig = searchConfig;
  }
  async connect() {
    try {
      const tableNames = Object.keys(this.searchConfig?.tables || {});
      const testTable = tableNames.length > 0 ? tableNames[0] : "information_schema.tables";
      const { error } = await this.client.from(testTable).select("*").limit(1);
      if (error && !["PGRST116", "PGRST106"].includes(error.code)) {
        throw error;
      }
      this.isConnectedFlag = true;
    } catch (error) {
      console.error("\u274C Failed to connect to Supabase:", error);
      throw error;
    }
  }
  async disconnect() {
    this.isConnectedFlag = false;
  }
  async isConnected() {
    return this.isConnectedFlag;
  }
  async search(query, options = {}) {
    if (!this.isConnectedFlag) {
      await this.connect();
    }
    const results = [];
    const { filters, limit = 20 } = options;
    let tablesToSearch;
    if (!this.searchConfig?.tables) {
      return results;
    }
    if (filters?.type && filters.type.length > 0) {
      tablesToSearch = Object.keys(this.searchConfig.tables).filter((tableName) => {
        const tableConfig = this.searchConfig.tables[tableName];
        return filters.type.includes(tableConfig.type);
      });
    } else {
      tablesToSearch = Object.keys(this.searchConfig.tables);
    }
    for (const tableType of tablesToSearch) {
      const tableConfig = this.searchConfig.tables[tableType];
      if (!tableConfig) {
        continue;
      }
      try {
        const tableResults = await this.searchTable(query, tableType, tableConfig, options);
        results.push(...tableResults);
      } catch (error) {
        console.error(`\u274C Error searching ${tableType}:`, error);
      }
    }
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return results.slice(0, limit);
  }
  async searchTable(query, tableType, tableConfig, options) {
    const { columns, searchColumns, type } = tableConfig;
    const { filters } = options;
    const selectColumns = Object.values(columns).filter(Boolean).join(", ");
    let queryBuilder = this.client.from(tableType).select(selectColumns);
    const orConditions = searchColumns.map((col) => `${col}.ilike.%${query}%`);
    if (orConditions.length > 0) {
      queryBuilder = queryBuilder.or(orConditions.join(","));
    }
    if (filters?.category && filters.category.length > 0 && columns.category) {
      queryBuilder = queryBuilder.in(columns.category, filters.category);
    }
    if (filters?.language && filters.language.length > 0 && columns.language) {
      queryBuilder = queryBuilder.in(columns.language, filters.language);
    }
    if (filters?.visibility && filters.visibility.length > 0 && columns.visibility) {
      queryBuilder = queryBuilder.in(columns.visibility, filters.visibility);
    }
    if (filters?.dateRange && columns.createdAt) {
      if (filters.dateRange.start) {
        queryBuilder = queryBuilder.gte(columns.createdAt, filters.dateRange.start);
      }
      if (filters.dateRange.end) {
        queryBuilder = queryBuilder.lte(columns.createdAt, filters.dateRange.end);
      }
    }
    const { data, error } = await queryBuilder.limit(20);
    if (error) {
      throw error;
    }
    return (data || []).map((item) => ({
      id: item[columns.id],
      type,
      title: item[columns.title] || "Unknown Title",
      subtitle: columns.subtitle ? item[columns.subtitle] : void 0,
      description: columns.description ? item[columns.description] : void 0,
      category: columns.category ? item[columns.category] : void 0,
      language: columns.language ? item[columns.language] : void 0,
      visibility: columns.visibility ? item[columns.visibility] : void 0,
      createdAt: columns.createdAt ? item[columns.createdAt] : void 0,
      matchType: this.determineMatchType(query, item, searchColumns),
      relevanceScore: this.calculateRelevanceScore(query, item, columns),
      metadata: item
      // Store full object for custom use
    }));
  }
  determineMatchType(query, item, searchColumns) {
    const queryLower = query.toLowerCase();
    for (const column of searchColumns) {
      const value = item[column];
      if (value && typeof value === "string" && value.toLowerCase().includes(queryLower)) {
        switch (column) {
          case "title":
          case "name":
            return "title";
          case "author":
            return "author";
          case "description":
          case "bio":
            return "description";
          case "username":
            return "username";
          case "category":
            return "category";
          case "language":
            return "language";
          case "question":
            return "question";
          case "answer":
            return "answer";
          default:
            return "custom";
        }
      }
    }
    return "title";
  }
  calculateRelevanceScore(query, item, columns) {
    const queryLower = query.toLowerCase();
    let score = 0;
    const titleField = item[columns.title];
    if (titleField && typeof titleField === "string") {
      const titleLower = titleField.toLowerCase();
      if (titleLower === queryLower) {
        score += 100;
      } else if (titleLower.startsWith(queryLower)) {
        score += 80;
      } else if (titleLower.includes(queryLower)) {
        score += 60;
      }
    }
    if (columns.subtitle) {
      const subtitleField = item[columns.subtitle];
      if (subtitleField && typeof subtitleField === "string") {
        const subtitleLower = subtitleField.toLowerCase();
        if (subtitleLower === queryLower) {
          score += 80;
        } else if (subtitleLower.startsWith(queryLower)) {
          score += 60;
        } else if (subtitleLower.includes(queryLower)) {
          score += 40;
        }
      }
    }
    if (columns.description) {
      const descField = item[columns.description];
      if (descField && typeof descField === "string") {
        const descLower = descField.toLowerCase();
        if (descLower.includes(queryLower)) {
          score += 20;
        }
      }
    }
    if (columns.category) {
      const categoryField = item[columns.category];
      if (categoryField && typeof categoryField === "string" && categoryField.toLowerCase() === queryLower) {
        score += 50;
      }
    }
    return score;
  }
  async checkHealth() {
    const startTime = Date.now();
    try {
      const tableNames = Object.keys(this.searchConfig?.tables || {});
      const testTable = tableNames.length > 0 ? tableNames[0] : "information_schema.tables";
      const { error } = await this.client.from(testTable).select("*").limit(1);
      const latency = Math.max(1, Date.now() - startTime);
      if (error && !["PGRST116", "PGRST106"].includes(error.code)) {
        return {
          isConnected: false,
          isSearchAvailable: false,
          latency,
          memoryUsage: "N/A",
          keyCount: 0,
          lastSync: null,
          errors: [error.message || "Connection failed"]
        };
      }
      return {
        isConnected: true,
        isSearchAvailable: true,
        latency,
        memoryUsage: "N/A",
        keyCount: Object.keys(this.searchConfig?.tables || {}).length,
        lastSync: (/* @__PURE__ */ new Date()).toISOString(),
        errors: []
      };
    } catch (error) {
      return {
        isConnected: false,
        isSearchAvailable: false,
        latency: Math.max(1, Date.now() - startTime),
        // Ensure minimum 1ms latency
        memoryUsage: "N/A",
        keyCount: 0,
        lastSync: null,
        errors: [error instanceof Error ? error.message : "Unknown error"]
      };
    }
  }
};

// src/providers/PostgreSQLProvider.ts
var import_pg = require("pg");
var PostgreSQLProvider = class {
  constructor(config, searchConfig) {
    this.name = "PostgreSQL";
    this.isConnectedFlag = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.indexesCreated = /* @__PURE__ */ new Set();
    this.config = config;
    this.searchConfig = searchConfig;
    this.client = new import_pg.Pool({
      host: config.connection.host,
      port: config.connection.port,
      database: config.connection.database,
      user: config.connection.user,
      password: config.connection.password,
      ssl: config.connection.ssl,
      connectionTimeoutMillis: config.connection.connectionTimeoutMillis || 5e3,
      query_timeout: config.connection.query_timeout || 3e4,
      statement_timeout: config.connection.statement_timeout || 3e4,
      // Pool configuration with enterprise defaults
      max: config.pool?.max || 20,
      min: config.pool?.min || 2,
      // Pool timeout configuration (only valid options)
      idleTimeoutMillis: config.pool?.idleTimeoutMillis || 3e4
    });
    this.client.on("connect", () => {
      console.log("\u2705 PostgreSQL client connected to database");
      this.reconnectAttempts = 0;
    });
    this.client.on("error", (err) => {
      console.error("\u274C PostgreSQL pool error:", err.message);
      this.isConnectedFlag = false;
      this.handleConnectionError(err);
    });
    this.client.on("remove", () => {
      console.log("\u{1F4E4} PostgreSQL client removed from pool");
    });
  }
  /**
   * Establishes connection and initializes search infrastructure
   * Creates necessary indexes and configurations for optimal performance
   */
  async connect() {
    try {
      console.log(`\u{1F517} Connecting to PostgreSQL at ${this.config.connection.host}:${this.config.connection.port}`);
      const testResult = await this.client.query("SELECT version() as version, now() as connected_at, current_database() as database");
      const dbInfo = testResult.rows[0];
      console.log(`\u{1F4CB} Connected to PostgreSQL ${dbInfo.version.split(" ")[1]} (database: ${dbInfo.database})`);
      await this.setupSearchInfrastructure();
      this.isConnectedFlag = true;
      console.log("\u2705 PostgreSQL connection established and search infrastructure ready");
    } catch (error) {
      this.isConnectedFlag = false;
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("\u274C Failed to connect to PostgreSQL:", message);
      throw new Error(`PostgreSQL connection failed: ${message}`);
    }
  }
  /**
   * Sets up full-text search infrastructure including indexes and functions
   */
  async setupSearchInfrastructure() {
    const client = await this.client.connect();
    try {
      await client.query("SELECT to_tsvector('english', 'test') as test_fts");
      console.log("\u2705 PostgreSQL full-text search extensions confirmed");
      for (const [tableName, tableConfig] of Object.entries(this.searchConfig.tables)) {
        if (tableConfig.autoCreateIndexes !== false) {
          await this.createSearchIndexes(client, tableName, tableConfig);
        }
      }
    } catch (error) {
      console.warn("\u26A0\uFE0F Could not fully initialize search infrastructure:", error);
    } finally {
      client.release();
    }
  }
  /**
   * Creates optimized GIN indexes for full-text search on table columns
   */
  async createSearchIndexes(client, tableName, tableConfig) {
    try {
      const indexName = `idx_${tableName}_fts_search`;
      if (this.indexesCreated.has(indexName)) {
        return;
      }
      const tableExists = await client.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
        [tableName]
      );
      if (!tableExists.rows[0].exists) {
        console.log(`\u26A0\uFE0F Table ${tableName} does not exist, skipping index creation`);
        return;
      }
      const searchConfig = tableConfig.searchConfig || "english";
      const searchColumns = tableConfig.searchColumns;
      const tsvectorExpression = searchColumns.map((col) => {
        const weight = tableConfig.weightConfig?.[col] || "D";
        return `setweight(to_tsvector('${searchConfig}', coalesce("${col}", '')), '${weight}')`;
      }).join(" || ");
      const indexExists = await client.query(
        "SELECT EXISTS (SELECT FROM pg_indexes WHERE indexname = $1)",
        [indexName]
      );
      if (!indexExists.rows[0].exists) {
        const createIndexSQL = `
          CREATE INDEX CONCURRENTLY ${indexName} 
          ON "${tableName}" 
          USING GIN((${tsvectorExpression}))
        `;
        console.log(`\u{1F527} Creating search index: ${indexName}`);
        await client.query(createIndexSQL);
        console.log(`\u2705 Search index created: ${indexName}`);
      } else {
        console.log(`\u2139\uFE0F Search index already exists: ${indexName}`);
      }
      this.indexesCreated.add(indexName);
    } catch (error) {
      console.warn(`\u26A0\uFE0F Could not create search index for ${tableName}:`, error);
    }
  }
  /**
   * Gracefully closes all connections in the pool
   */
  async disconnect() {
    try {
      console.log("\u{1F504} Gracefully closing PostgreSQL connection pool...");
      await this.client.end();
      this.isConnectedFlag = false;
      console.log("\u2705 PostgreSQL connection pool closed");
    } catch (error) {
      console.error("\u274C Error closing PostgreSQL connection pool:", error);
      throw error;
    }
  }
  /**
   * Performs comprehensive health check with connection verification
   */
  async isConnected() {
    try {
      const result = await this.client.query("SELECT 1 as health_check, pg_backend_pid() as pid");
      const connected = result.rows.length === 1 && result.rows[0].health_check === 1;
      this.isConnectedFlag = connected;
      return connected;
    } catch (error) {
      console.warn("PostgreSQL health check failed:", error instanceof Error ? error.message : error);
      this.isConnectedFlag = false;
      return false;
    }
  }
  /**
   * Performs intelligent full-text search across all configured tables
   * Uses PostgreSQL's native tsvector/tsquery with relevance ranking
   */
  async search(query, options = {}) {
    if (!this.isConnectedFlag) {
      throw new Error("PostgreSQL connection not established");
    }
    if (!query || query.trim().length === 0) {
      return [];
    }
    const { limit = 20, offset = 0, filters } = options;
    const results = [];
    const client = await this.client.connect();
    try {
      const searchPromises = Object.entries(this.searchConfig.tables).map(async ([tableName, tableConfig]) => {
        if (filters?.type && filters.type.length > 0 && !filters.type.includes(tableConfig.type)) {
          return [];
        }
        return this.searchTable(client, tableName, tableConfig, query, options);
      });
      const tableResults = await Promise.all(searchPromises);
      for (const tableResult of tableResults) {
        results.push(...tableResult);
      }
      const sortedResults = results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(offset, offset + limit);
      return sortedResults;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("\u274C PostgreSQL search failed:", message);
      throw new Error(`Search failed: ${message}`);
    } finally {
      client.release();
    }
  }
  /**
   * Searches a specific table using optimized PostgreSQL full-text search
   */
  async searchTable(client, tableName, tableConfig, query, options) {
    const { filters } = options;
    const results = [];
    try {
      const searchConfig = tableConfig.searchConfig || "english";
      const tsQuery = this.buildTsQuery(query);
      const tsvectorExpression = tableConfig.searchColumns.map((col) => {
        const weight = tableConfig.weightConfig?.[col] || "D";
        return `setweight(to_tsvector('${searchConfig}', coalesce("${col}", '')), '${weight}')`;
      }).join(" || ");
      let sql = `
        SELECT *,
               ts_rank_cd((${tsvectorExpression}), to_tsquery('${searchConfig}', $1)) as rank_score
        FROM "${tableName}"
        WHERE (${tsvectorExpression}) @@ to_tsquery('${searchConfig}', $1)
      `;
      const params = [tsQuery];
      const paramIndex = 2;
      if (tableConfig.customFilter) {
        sql += ` AND (${tableConfig.customFilter})`;
      }
      const filterInfo = this.buildFilterClauses(filters, tableConfig, paramIndex);
      if (filterInfo.clauses.length > 0) {
        sql += " AND " + filterInfo.clauses.join(" AND ");
        params.push(...filterInfo.params);
      }
      sql += ` ORDER BY rank_score DESC`;
      if (tableConfig.columns.createdAt) {
        sql += `, "${tableConfig.columns.createdAt}" DESC`;
      }
      sql += ` LIMIT 50`;
      console.log(`\u{1F50D} PostgreSQL search query for ${tableName}:`, sql);
      const result = await client.query(sql, params);
      for (const row of result.rows) {
        const searchResult = this.transformRowToSearchResult(row, tableConfig, query);
        if (searchResult) {
          results.push(searchResult);
        }
      }
      console.log(`\u2705 Found ${results.length} results in table ${tableName}`);
    } catch (error) {
      console.error(`\u274C Failed to search table ${tableName}:`, error);
    }
    return results;
  }
  /**
   * Builds PostgreSQL tsquery from user search input
   * Handles phrases, boolean operators, and wildcard searches
   */
  buildTsQuery(query) {
    const cleanQuery = query.replace(/[^\w\s"]/g, " ").trim();
    if (!cleanQuery) {
      return "empty:*";
    }
    const terms = [];
    const phraseRegex = /"([^"]+)"/g;
    let match;
    let lastIndex = 0;
    while ((match = phraseRegex.exec(cleanQuery)) !== null) {
      const beforePhrase = cleanQuery.slice(lastIndex, match.index).trim();
      if (beforePhrase) {
        terms.push(...beforePhrase.split(/\s+/).filter((word) => word.length > 0));
      }
      terms.push(`"${match[1]}"`);
      lastIndex = phraseRegex.lastIndex;
    }
    const afterLastPhrase = cleanQuery.slice(lastIndex).trim();
    if (afterLastPhrase) {
      terms.push(...afterLastPhrase.split(/\s+/).filter((word) => word.length > 0));
    }
    if (terms.length === 0) {
      terms.push(...cleanQuery.split(/\s+/).filter((word) => word.length > 0));
    }
    const tsqueryTerms = terms.map((term) => {
      if (term.startsWith('"') && term.endsWith('"')) {
        return term.slice(1, -1).replace(/\s+/g, " <-> ");
      } else {
        return `${term}:*`;
      }
    });
    return tsqueryTerms.join(" & ") || "empty:*";
  }
  /**
   * Builds dynamic WHERE clauses based on search filters
   */
  buildFilterClauses(filters, tableConfig, startParamIndex) {
    const clauses = [];
    const params = [];
    let paramIndex = startParamIndex;
    if (!filters) {
      return { clauses, params };
    }
    if (filters.category && filters.category.length > 0 && tableConfig.columns.category) {
      clauses.push(`"${tableConfig.columns.category}" = ANY($${paramIndex})`);
      params.push(filters.category);
      paramIndex++;
    }
    if (filters.language && filters.language.length > 0 && tableConfig.columns.language) {
      clauses.push(`"${tableConfig.columns.language}" = ANY($${paramIndex})`);
      params.push(filters.language);
      paramIndex++;
    }
    if (filters.visibility && filters.visibility.length > 0 && tableConfig.columns.visibility) {
      clauses.push(`"${tableConfig.columns.visibility}" = ANY($${paramIndex})`);
      params.push(filters.visibility);
      paramIndex++;
    }
    if (filters.dateRange && tableConfig.columns.createdAt) {
      if (filters.dateRange.start) {
        clauses.push(`"${tableConfig.columns.createdAt}" >= $${paramIndex}`);
        params.push(filters.dateRange.start);
        paramIndex++;
      }
      if (filters.dateRange.end) {
        clauses.push(`"${tableConfig.columns.createdAt}" <= $${paramIndex}`);
        params.push(filters.dateRange.end);
        paramIndex++;
      }
    }
    return { clauses, params };
  }
  /**
   * Transforms database row to standardized SearchResult format
   */
  transformRowToSearchResult(row, tableConfig, query) {
    const columns = tableConfig.columns;
    return {
      id: row[columns.id]?.toString() || "unknown",
      type: tableConfig.type,
      title: row[columns.title] || "Untitled",
      subtitle: row[columns.subtitle],
      description: row[columns.description],
      category: row[columns.category],
      language: row[columns.language] || "en",
      visibility: row[columns.visibility] || "public",
      createdAt: row[columns.createdAt],
      matchType: this.determineMatchType(row, query, tableConfig),
      relevanceScore: Math.round((row.rank_score || 0) * 100),
      metadata: {
        tableName: tableConfig.type,
        rankScore: row.rank_score,
        searchConfig: tableConfig.searchConfig || "english",
        hasIndex: this.indexesCreated.has(`idx_${tableConfig.type}_fts_search`)
      }
    };
  }
  /**
   * Determines the type of match for result highlighting
   */
  determineMatchType(row, query, tableConfig) {
    const queryLower = query.toLowerCase();
    if (row[tableConfig.columns.title]?.toLowerCase().includes(queryLower)) {
      return "title";
    }
    if (row[tableConfig.columns.subtitle]?.toLowerCase().includes(queryLower)) {
      return "author";
    }
    if (row[tableConfig.columns.description]?.toLowerCase().includes(queryLower)) {
      return "description";
    }
    if (row[tableConfig.columns.category]?.toLowerCase().includes(queryLower)) {
      return "category";
    }
    return "custom";
  }
  /**
   * Handles connection errors with retry logic
   */
  handleConnectionError(_error) {
    this.reconnectAttempts++;
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      console.log(`\u{1F504} Attempting to reconnect to PostgreSQL (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    } else {
      console.error("\u{1F480} Maximum reconnection attempts reached for PostgreSQL");
    }
  }
  /**
   * Comprehensive health monitoring with database statistics
   */
  async checkHealth() {
    const startTime = Date.now();
    try {
      const isConnected = await this.isConnected();
      if (!isConnected) {
        return {
          isConnected: false,
          isSearchAvailable: false,
          latency: -1,
          memoryUsage: "0",
          keyCount: 0,
          lastSync: null,
          errors: ["PostgreSQL not connected"]
        };
      }
      const client = await this.client.connect();
      let isSearchAvailable = false;
      let memoryUsage = "Unknown";
      try {
        await client.query("SELECT to_tsvector('english', 'health check test')");
        isSearchAvailable = true;
        const statsResult = await client.query(`
          SELECT 
            pg_size_pretty(pg_database_size(current_database())) as db_size,
            (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
            (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle') as idle_connections
        `);
        if (statsResult.rows.length > 0) {
          memoryUsage = statsResult.rows[0].db_size;
        }
      } catch (error) {
        console.warn("Could not retrieve full PostgreSQL statistics:", error);
      } finally {
        client.release();
      }
      const latency = Date.now() - startTime;
      return {
        isConnected: true,
        isSearchAvailable,
        latency,
        memoryUsage,
        keyCount: Object.keys(this.searchConfig.tables).length,
        lastSync: (/* @__PURE__ */ new Date()).toISOString(),
        errors: []
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        isConnected: false,
        isSearchAvailable: false,
        latency: Date.now() - startTime,
        memoryUsage: "0",
        keyCount: 0,
        lastSync: null,
        errors: [message]
      };
    }
  }
  /**
   * Gets detailed PostgreSQL performance statistics
   */
  async getDetailedStats() {
    if (!this.isConnectedFlag) {
      throw new Error("PostgreSQL connection not established");
    }
    const client = await this.client.connect();
    try {
      const stats = await client.query(`
        SELECT 
          pg_database.datname as database_name,
          pg_size_pretty(pg_database_size(pg_database.datname)) as database_size,
          (SELECT count(*) FROM pg_stat_activity WHERE datname = pg_database.datname) as connections,
          (SELECT sum(numbackends) FROM pg_stat_database WHERE datname = pg_database.datname) as backends,
          (SELECT sum(xact_commit) FROM pg_stat_database WHERE datname = pg_database.datname) as commits,
          (SELECT sum(xact_rollback) FROM pg_stat_database WHERE datname = pg_database.datname) as rollbacks
        FROM pg_database
        WHERE datname = current_database()
      `);
      return stats.rows[0] || {};
    } finally {
      client.release();
    }
  }
  /**
   * Create advanced indexes for optimal search performance
   */
  async createOptimizedIndexes() {
    if (!this.isConnectedFlag) {
      throw new Error("PostgreSQL connection not established");
    }
    const client = await this.client.connect();
    try {
      for (const [tableName, tableConfig] of Object.entries(this.searchConfig.tables)) {
        if (tableConfig.autoCreateIndexes !== false) {
          await this.createAdvancedIndexes(client, tableName, tableConfig);
        }
      }
      console.log("\u2705 Advanced PostgreSQL indexes created successfully");
    } catch (error) {
      console.error("\u274C Failed to create advanced indexes:", error);
      throw error;
    } finally {
      client.release();
    }
  }
  /**
   * Analyze search performance and provide optimization suggestions
   */
  async analyzeSearchPerformance(query) {
    if (!this.isConnectedFlag) {
      throw new Error("PostgreSQL connection not established");
    }
    const client = await this.client.connect();
    try {
      const explainResult = await client.query(`
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
        SELECT * FROM (${this.buildSampleQuery(query)}) AS sample_query
      `);
      const queryPlan = explainResult.rows[0]["QUERY PLAN"][0];
      const executionTime = queryPlan["Execution Time"];
      const suggestions = this.generateOptimizationSuggestions(queryPlan);
      return {
        queryPlan,
        executionTime,
        suggestions
      };
    } finally {
      client.release();
    }
  }
  /**
   * Enable advanced PostgreSQL features for search
   */
  async enableAdvancedFeatures() {
    if (!this.isConnectedFlag) {
      throw new Error("PostgreSQL connection not established");
    }
    const client = await this.client.connect();
    try {
      await client.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
      await client.query(`CREATE EXTENSION IF NOT EXISTS unaccent`);
      await client.query(`CREATE EXTENSION IF NOT EXISTS fuzzystrmatch`);
      console.log("\u2705 PostgreSQL advanced features enabled");
    } catch (error) {
      console.warn("\u26A0\uFE0F Could not enable all advanced features:", error);
    } finally {
      client.release();
    }
  }
  // Enhanced private helper methods
  async createAdvancedIndexes(client, tableName, tableConfig) {
    try {
      const searchConfig = tableConfig.searchConfig || "english";
      const searchColumns = tableConfig.searchColumns;
      await this.createSearchIndexes(client, tableName, tableConfig);
      for (const column of searchColumns) {
        const trigramIndexName = `idx_${tableName}_${column}_trgm`;
        try {
          const indexExists = await client.query(
            "SELECT EXISTS (SELECT FROM pg_indexes WHERE indexname = $1)",
            [trigramIndexName]
          );
          if (!indexExists.rows[0].exists) {
            await client.query(`
              CREATE INDEX CONCURRENTLY ${trigramIndexName} 
              ON "${tableName}" 
              USING GIN ("${column}" gin_trgm_ops)
            `);
            console.log(`\u2705 Trigram index created: ${trigramIndexName}`);
          }
        } catch (error) {
          console.warn(`\u26A0\uFE0F Could not create trigram index for ${column}:`, error);
        }
      }
      if (tableConfig.columns.visibility) {
        const partialIndexName = `idx_${tableName}_public_visible`;
        try {
          await client.query(`
            CREATE INDEX CONCURRENTLY ${partialIndexName}
            ON "${tableName}" ("${tableConfig.columns.visibility}")
            WHERE "${tableConfig.columns.visibility}" = 'public'
          `);
          console.log(`\u2705 Partial index created: ${partialIndexName}`);
        } catch (error) {
          console.warn(`\u26A0\uFE0F Could not create partial index:`, error);
        }
      }
      if (tableConfig.columns.category && tableConfig.columns.createdAt) {
        const compositeIndexName = `idx_${tableName}_category_created`;
        try {
          await client.query(`
            CREATE INDEX CONCURRENTLY ${compositeIndexName}
            ON "${tableName}" ("${tableConfig.columns.category}", "${tableConfig.columns.createdAt}" DESC)
          `);
          console.log(`\u2705 Composite index created: ${compositeIndexName}`);
        } catch (error) {
          console.warn(`\u26A0\uFE0F Could not create composite index:`, error);
        }
      }
    } catch (error) {
      console.error(`\u274C Failed to create advanced indexes for ${tableName}:`, error);
    }
  }
  buildSampleQuery(query) {
    const tableName = Object.keys(this.searchConfig.tables)[0];
    const tableConfig = this.searchConfig.tables[tableName];
    const searchConfig = tableConfig.searchConfig || "english";
    const tsQuery = this.buildTsQuery(query);
    const tsvectorExpression = tableConfig.searchColumns.map((col) => {
      const weight = tableConfig.weightConfig?.[col] || "D";
      return `setweight(to_tsvector('${searchConfig}', coalesce("${col}", '')), '${weight}')`;
    }).join(" || ");
    return `
      SELECT *,
             ts_rank_cd((${tsvectorExpression}), to_tsquery('${searchConfig}', '${tsQuery}')) as rank_score
      FROM "${tableName}"
      WHERE (${tsvectorExpression}) @@ to_tsquery('${searchConfig}', '${tsQuery}')
      ORDER BY rank_score DESC
      LIMIT 10
    `;
  }
  generateOptimizationSuggestions(queryPlan) {
    const suggestions = [];
    if (queryPlan["Execution Time"] > 1e3) {
      suggestions.push("Query execution time is high (>1s). Consider adding more specific filters.");
    }
    if (JSON.stringify(queryPlan).includes("Seq Scan")) {
      suggestions.push("Sequential scan detected. Consider adding appropriate indexes.");
    }
    const bufferHits = this.extractBufferHits(queryPlan);
    if (bufferHits && bufferHits.shared_read > bufferHits.shared_hit) {
      suggestions.push("Low buffer hit ratio. Consider increasing shared_buffers or optimizing query.");
    }
    if (JSON.stringify(queryPlan).includes("Sort")) {
      suggestions.push("Sort operation detected. Consider adding an index on the ORDER BY columns.");
    }
    return suggestions;
  }
  extractBufferHits(plan) {
    try {
      const buffers = plan["Buffers"];
      return buffers ? {
        shared_hit: buffers["Shared Hit Blocks"] || 0,
        shared_read: buffers["Shared Read Blocks"] || 0
      } : null;
    } catch {
      return null;
    }
  }
};

// src/providers/RedisProvider.ts
var import_ioredis = __toESM(require("ioredis"));
var RedisProvider = class {
  constructor(config) {
    this.name = "Redis";
    this.isConnectedFlag = false;
    this.searchIndexes = /* @__PURE__ */ new Map();
    this.config = config;
    const redisConfig = this.buildRedisConfig(config);
    try {
      this.redis = new import_ioredis.default(redisConfig);
      this.redis.on("error", (error) => {
        console.error("\u274C Redis client error:", error.message);
        this.isConnectedFlag = false;
      });
      this.redis.on("ready", () => {
        console.log("\u{1F517} Redis client ready");
        this.isConnectedFlag = true;
      });
      this.redis.on("connect", () => {
        console.log("\u{1F50C} Redis client connected");
      });
      this.redis.on("close", () => {
        console.log("\u{1F4F4} Redis client disconnected");
        this.isConnectedFlag = false;
      });
    } catch (error) {
      console.error("\u274C Failed to create Redis client:", error);
      this.redis = null;
      this.isConnectedFlag = false;
    }
  }
  /**
   * Build Redis configuration with support for different authentication methods
   */
  buildRedisConfig(config) {
    const redisConfig = {
      connectTimeout: config.connectTimeout || 1e4,
      lazyConnect: config.lazyConnect !== void 0 ? config.lazyConnect : true,
      // Default to true for better error handling
      retryDelayOnFailover: config.retryDelayOnFailover || 100,
      maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
      retryOnFailover: true,
      // Enable retries
      maxRetriesOnFailover: 5,
      keepAlive: 3e4,
      // Keep connection alive
      autoResubscribe: true,
      // Auto resubscribe on disconnect
      autoResendUnfulfilledCommands: true
      // Resend unfulfilled commands
    };
    if (config.url) {
      if (config.apiKey) {
        const url = new URL(config.url);
        url.password = config.apiKey;
        redisConfig.url = url.toString();
      } else {
        redisConfig.url = config.url;
      }
    } else {
      redisConfig.host = config.host || "localhost";
      redisConfig.port = config.port || 6379;
      if (config.db !== void 0) {
        redisConfig.db = config.db;
      }
      if (config.apiKey) {
        redisConfig.password = config.apiKey;
      } else if (config.password) {
        redisConfig.password = config.password;
      }
      if (config.username) {
        redisConfig.username = config.username;
      }
      if (config.tls) {
        redisConfig.tls = config.tls === true ? {} : config.tls;
      }
    }
    return redisConfig;
  }
  async connect() {
    if (!this.redis) {
      throw new Error("Redis client not initialized. Check Redis configuration.");
    }
    try {
      this.logConnectionMethod();
      await this.redis.ping();
      this.isConnectedFlag = true;
      console.log("\u2705 Connected to Redis successfully");
      await this.createDefaultSearchIndexes();
    } catch (error) {
      console.error("\u274C Failed to connect to Redis:", error);
      this.isConnectedFlag = false;
      throw error;
    }
  }
  /**
   * Auto-create search indexes for common data structures
   */
  async createDefaultSearchIndexes() {
    try {
      await this.createHealthcareSearchIndex();
      await this.createGenericSearchIndex();
      console.log("\u2705 Search indexes created successfully");
    } catch (error) {
      console.warn("\u26A0\uFE0F Failed to create search indexes (continuing without search):", error);
    }
  }
  /**
   * Create healthcare-specific search index
   */
  async createHealthcareSearchIndex() {
    const indexName = "healthcare_idx";
    const keyPrefix = "healthcare:";
    try {
      await this.redis.call("FT.INFO", indexName);
      console.log("\u{1F4CB} Healthcare search index already exists");
      return;
    } catch (error) {
    }
    await this.redis.call(
      "FT.CREATE",
      indexName,
      "ON",
      "HASH",
      "PREFIX",
      "1",
      keyPrefix,
      "SCHEMA",
      // Text fields for full-text search
      "title",
      "TEXT",
      "WEIGHT",
      "3.0",
      "description",
      "TEXT",
      "WEIGHT",
      "2.0",
      "condition_name",
      "TEXT",
      "WEIGHT",
      "3.0",
      "treatment",
      "TEXT",
      "WEIGHT",
      "2.5",
      "specialty",
      "TEXT",
      "WEIGHT",
      "1.5",
      // Tag fields for filtering
      "category",
      "TAG",
      "SEPARATOR",
      "|",
      "language",
      "TAG",
      "SEPARATOR",
      "|",
      "visibility",
      "TAG",
      "SEPARATOR",
      "|",
      "type",
      "TAG",
      "SEPARATOR",
      "|",
      // Numeric fields
      "relevanceScore",
      "NUMERIC",
      "createdAt",
      "NUMERIC"
    );
    this.searchIndexes.set(indexName, {
      indexName,
      prefix: keyPrefix,
      schema: {
        title: "TEXT",
        description: "TEXT",
        condition_name: "TEXT",
        treatment: "TEXT",
        specialty: "TEXT",
        category: "TAG",
        language: "TAG",
        visibility: "TAG",
        type: "TAG",
        relevanceScore: "NUMERIC",
        createdAt: "NUMERIC"
      }
    });
    console.log("\u{1F3E5} Healthcare search index created");
  }
  /**
   * Create generic search index for other data types
   */
  async createGenericSearchIndex() {
    const indexName = "generic_idx";
    const keyPrefix = "search:";
    try {
      await this.redis.call("FT.INFO", indexName);
      console.log("\u{1F4CB} Generic search index already exists");
      return;
    } catch (error) {
    }
    await this.redis.call(
      "FT.CREATE",
      indexName,
      "ON",
      "HASH",
      "PREFIX",
      "1",
      keyPrefix,
      "SCHEMA",
      // Basic text fields
      "title",
      "TEXT",
      "WEIGHT",
      "3.0",
      "description",
      "TEXT",
      "WEIGHT",
      "2.0",
      "content",
      "TEXT",
      "WEIGHT",
      "2.0",
      // Tag fields
      "category",
      "TAG",
      "SEPARATOR",
      "|",
      "type",
      "TAG",
      "SEPARATOR",
      "|",
      // Numeric fields
      "score",
      "NUMERIC",
      "timestamp",
      "NUMERIC"
    );
    this.searchIndexes.set(indexName, {
      indexName,
      prefix: keyPrefix,
      schema: {
        title: "TEXT",
        description: "TEXT",
        content: "TEXT",
        category: "TAG",
        type: "TAG",
        score: "NUMERIC",
        timestamp: "NUMERIC"
      }
    });
    console.log("\u{1F50D} Generic search index created");
  }
  /**
   * Log connection method for debugging (without exposing sensitive data)
   */
  logConnectionMethod() {
    const { config } = this;
    if (config.apiKey) {
      console.log("\u{1F511} Connecting to Redis with API key authentication");
    } else if (config.username && config.password) {
      console.log("\u{1F464} Connecting to Redis with username/password (ACL)");
    } else if (config.password) {
      console.log("\u{1F512} Connecting to Redis with password authentication");
    } else {
      console.log("\u{1F4E1} Connecting to Redis without authentication");
    }
    if (config.tls) {
      console.log("\u{1F510} Using TLS/SSL connection");
    }
    if (config.url) {
      const url = new URL(config.url);
      console.log(`\u{1F310} Redis URL: ${url.protocol}//${url.hostname}:${url.port || "6379"}`);
    } else {
      console.log(`\u{1F310} Redis: ${config.host || "localhost"}:${config.port || 6379}`);
    }
  }
  async disconnect() {
    if (this.redis) {
      await this.redis.quit();
    }
    this.isConnectedFlag = false;
  }
  async isConnected() {
    try {
      if (!this.redis) {
        this.isConnectedFlag = false;
        return false;
      }
      await this.redis.ping();
      this.isConnectedFlag = true;
      return true;
    } catch {
      this.isConnectedFlag = false;
      return false;
    }
  }
  /**
   * Create search index for Redis Search
   */
  async createSearchIndex(config) {
    try {
      const schemaArgs = [];
      for (const [field, type] of Object.entries(config.schema)) {
        schemaArgs.push(field, type);
      }
      await this.redis.call(
        "FT.CREATE",
        config.indexName,
        "ON",
        "HASH",
        "PREFIX",
        "1",
        config.prefix,
        "SCHEMA",
        ...schemaArgs
      );
      this.searchIndexes.set(config.indexName, config);
      console.log(`\u2705 Created Redis search index: ${config.indexName}`);
    } catch (error) {
      if (error.message && error.message.includes("Index already exists")) {
        this.searchIndexes.set(config.indexName, config);
        return;
      }
      console.error(`\u274C Failed to create search index ${config.indexName}:`, error);
      throw error;
    }
  }
  /**
   * Add document to search index
   */
  async addToIndex(indexName, key, document) {
    try {
      const indexConfig = this.searchIndexes.get(indexName);
      if (!indexConfig) {
        throw new Error(`Search index ${indexName} not configured`);
      }
      const hashArgs = [];
      for (const [field, value] of Object.entries(document)) {
        if (value !== null && value !== void 0) {
          hashArgs.push(field, String(value));
        }
      }
      if (hashArgs.length > 0) {
        await this.redis.hset(key, ...hashArgs);
      }
    } catch (error) {
      console.error(`\u274C Failed to add document to index ${indexName}:`, error);
      throw error;
    }
  }
  async search(query, options = {}) {
    if (!this.redis) {
      console.warn("\u26A0\uFE0F Redis client not available, search unavailable");
      return [];
    }
    if (!this.isConnectedFlag) {
      try {
        await this.connect();
      } catch (error) {
        console.error("\u274C Redis connection failed, search unavailable:", error);
        return [];
      }
    }
    try {
      const results = [];
      const { filters, limit = 20 } = options;
      for (const [indexName] of this.searchIndexes) {
        if (filters?.type && filters.type.length > 0) {
          const indexType = this.getIndexType(indexName);
          if (indexType && !filters.type.includes(indexType)) {
            continue;
          }
        }
        const indexResults = await this.searchIndex(indexName, query, options);
        results.push(...indexResults);
      }
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);
      return results.slice(0, limit);
    } catch (error) {
      console.error("\u274C Redis search failed:", error);
      return [];
    }
  }
  async searchIndex(indexName, query, options) {
    try {
      const {
        limit = 20,
        sortBy = "relevance",
        sortOrder = "desc"
      } = options || {};
      const searchQuery = `*${query}*`;
      const searchArgs = [indexName, searchQuery];
      searchArgs.push("LIMIT", "0", String(limit));
      if (sortBy !== "relevance") {
        const redisSortBy = this.mapSortBy(sortBy);
        if (redisSortBy && sortOrder) {
          searchArgs.push("SORTBY", redisSortBy, sortOrder.toUpperCase());
        }
      }
      const result = await this.redis.call("FT.SEARCH", ...searchArgs);
      if (!Array.isArray(result) || result.length < 2) {
        return [];
      }
      const documents = [];
      for (let i = 1; i < result.length; i += 2) {
        const key = result[i];
        const fields = result[i + 1];
        if (Array.isArray(fields)) {
          const doc = this.parseRedisDocument(key, fields);
          if (doc) {
            documents.push(doc);
          }
        }
      }
      return documents.map((doc) => this.transformToSearchResult(doc, query, indexName));
    } catch (error) {
      console.error(`\u274C Failed to search index ${indexName}:`, error);
      return [];
    }
  }
  parseRedisDocument(key, fields) {
    try {
      const document = { _key: key };
      for (let i = 0; i < fields.length; i += 2) {
        const fieldName = fields[i];
        const fieldValue = fields[i + 1];
        if (fieldName && fieldValue !== void 0) {
          document[fieldName] = fieldValue;
        }
      }
      return document;
    } catch (error) {
      console.error("\u274C Failed to parse Redis document:", error);
      return null;
    }
  }
  transformToSearchResult(doc, query, indexName) {
    const type = this.getIndexType(indexName) || "custom";
    return {
      id: doc._key.split(":").pop() || doc._key,
      type,
      title: doc.title || doc.name || "Unknown Title",
      subtitle: doc.subtitle || doc.author || doc.username,
      description: doc.description || doc.bio,
      author: doc.author,
      category: doc.category,
      language: doc.language,
      visibility: doc.visibility,
      thumbnail: doc.thumbnail_path,
      profilePicture: doc.avatar_url,
      coverImage: doc.cover_image_url,
      ...doc.member_count ? { memberCount: parseInt(doc.member_count) } : {},
      ...doc.book_count ? { bookCount: parseInt(doc.book_count) } : {},
      ...doc.view_count ? { viewCount: parseInt(doc.view_count) } : {},
      createdAt: doc.created_at || doc.uploaded_at,
      tags: doc.tags ? typeof doc.tags === "string" ? JSON.parse(doc.tags) : doc.tags : void 0,
      isbn: doc.isbn,
      uploaderName: doc.uploader_name,
      uploaderEmail: doc.uploader_email,
      bookTitle: doc.book_title,
      matchType: this.determineMatchType(query, doc),
      relevanceScore: this.calculateRelevanceScore(query, doc),
      metadata: doc
    };
  }
  getIndexType(indexName) {
    const typeMap = {
      "idx:books": "book",
      "idx:users": "user",
      "idx:book_clubs": "book_club",
      "idx:authors": "author",
      "idx:qa": "qa"
    };
    return typeMap[indexName] || null;
  }
  mapSortBy(sortBy) {
    const sortMap = {
      "date": "created_at",
      "views": "view_count",
      "name": "title",
      "uploaded_at": "uploaded_at",
      "view_count": "view_count"
    };
    return sortMap[sortBy] || null;
  }
  determineMatchType(query, doc) {
    const queryLower = query.toLowerCase();
    if (doc.title && doc.title.toLowerCase().includes(queryLower)) {
      return "title";
    }
    if (doc.author && doc.author.toLowerCase().includes(queryLower)) {
      return "author";
    }
    if (doc.username && doc.username.toLowerCase().includes(queryLower)) {
      return "username";
    }
    if (doc.name && doc.name.toLowerCase().includes(queryLower)) {
      return "name";
    }
    if (doc.description && doc.description.toLowerCase().includes(queryLower)) {
      return "description";
    }
    if (doc.category && doc.category.toLowerCase().includes(queryLower)) {
      return "category";
    }
    if (doc.question && doc.question.toLowerCase().includes(queryLower)) {
      return "question";
    }
    if (doc.answer && doc.answer.toLowerCase().includes(queryLower)) {
      return "answer";
    }
    return "custom";
  }
  calculateRelevanceScore(query, doc) {
    const queryLower = query.toLowerCase();
    let score = 0;
    const titleField = doc.title || doc.name;
    if (titleField) {
      const titleLower = titleField.toLowerCase();
      if (titleLower === queryLower) {
        score += 100;
      } else if (titleLower.startsWith(queryLower)) {
        score += 80;
      } else if (titleLower.includes(queryLower)) {
        score += 60;
      }
    }
    const authorField = doc.author || doc.username;
    if (authorField) {
      const authorLower = authorField.toLowerCase();
      if (authorLower === queryLower) {
        score += 80;
      } else if (authorLower.startsWith(queryLower)) {
        score += 60;
      } else if (authorLower.includes(queryLower)) {
        score += 40;
      }
    }
    const descField = doc.description || doc.bio;
    if (descField) {
      const descLower = descField.toLowerCase();
      if (descLower.includes(queryLower)) {
        score += 20;
      }
    }
    return score;
  }
  async set(key, value, ttl) {
    if (!this.redis || !this.isConnectedFlag) {
      console.warn("\u26A0\uFE0F Redis client not available, skipping cache set operation");
      return;
    }
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.redis.setex(key, Math.floor(ttl / 1e3), serialized);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (error) {
      console.error("\u274C Failed to set cache value:", error);
      this.isConnectedFlag = false;
      throw error;
    }
  }
  async get(key) {
    if (!this.redis || !this.isConnectedFlag) {
      console.warn("\u26A0\uFE0F Redis client not available, skipping cache get operation");
      return null;
    }
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error("\u274C Failed to get cache value:", error);
      this.isConnectedFlag = false;
      return null;
    }
  }
  async delete(key) {
    if (!this.redis || !this.isConnectedFlag) {
      console.warn("\u26A0\uFE0F Redis client not available, skipping cache delete operation");
      return;
    }
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error("\u274C Failed to delete cache value:", error);
      this.isConnectedFlag = false;
      throw error;
    }
  }
  async clear(pattern) {
    if (!this.redis || !this.isConnectedFlag) {
      console.warn("\u26A0\uFE0F Redis client not available, skipping cache clear operation");
      return;
    }
    try {
      if (pattern) {
        const keys = await this.redis.keys(pattern + "*");
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } else {
        await this.redis.flushdb();
      }
    } catch (error) {
      console.error("\u274C Failed to clear cache:", error);
      this.isConnectedFlag = false;
      throw error;
    }
  }
  async checkHealth() {
    const startTime = Date.now();
    try {
      const isConnected = await this.isConnected();
      if (!isConnected) {
        return {
          isConnected: false,
          isSearchAvailable: false,
          latency: -1,
          memoryUsage: "0",
          keyCount: 0,
          lastSync: null,
          errors: ["Redis not connected"]
        };
      }
      let isSearchAvailable = false;
      try {
        const indexList = await this.redis.call("FT._LIST");
        isSearchAvailable = Array.isArray(indexList) && indexList.length > 0;
        if (!isSearchAvailable && this.searchIndexes.size > 0) {
          isSearchAvailable = true;
        }
      } catch (error) {
        console.warn("Search functionality unavailable:", error);
      }
      const latency = Date.now() - startTime;
      const info = await this.redis.info("memory");
      const keyCount = await this.redis.dbsize();
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : "0";
      return {
        isConnected: true,
        isSearchAvailable,
        latency,
        memoryUsage,
        keyCount,
        lastSync: (/* @__PURE__ */ new Date()).toISOString(),
        errors: []
      };
    } catch (error) {
      return {
        isConnected: false,
        isSearchAvailable: false,
        latency: Date.now() - startTime,
        memoryUsage: "0",
        keyCount: 0,
        lastSync: null,
        errors: [error instanceof Error ? error.message : "Unknown error"]
      };
    }
  }
};

// src/config/ConfigLoader.ts
var import_fs = require("fs");
var import_path = require("path");
var ConfigLoader = class _ConfigLoader {
  constructor() {
    this.config = null;
    this.configPath = null;
  }
  static getInstance() {
    if (!_ConfigLoader.instance) {
      _ConfigLoader.instance = new _ConfigLoader();
    }
    return _ConfigLoader.instance;
  }
  /**
   * Load configuration from file or environment
   */
  loadConfig(configPath) {
    if (this.config && !configPath && this.configPath) {
      return this.config;
    }
    const paths = configPath ? [configPath] : this.getDefaultConfigPaths();
    for (const path of paths) {
      if ((0, import_fs.existsSync)(path)) {
        try {
          this.config = this.loadFromFile(path);
          this.configPath = path;
          console.log(`\u2705 Loaded configuration from: ${path}`);
          break;
        } catch (error) {
          console.warn(`\u26A0\uFE0F Failed to load config from ${path}:`, error);
          continue;
        }
      }
    }
    if (!this.config) {
      console.log("\u{1F4C4} No config file found, loading from environment variables");
      this.config = this.loadFromEnvironment();
    }
    this.config = this.validateAndMergeDefaults(this.config);
    return this.config;
  }
  /**
   * Get current configuration
   */
  getConfig() {
    return this.config;
  }
  /**
   * Reload configuration
   */
  reloadConfig() {
    this.config = null;
    return this.loadConfig(this.configPath || void 0);
  }
  getDefaultConfigPaths() {
    const cwd = process.cwd();
    return [
      (0, import_path.join)(cwd, "smart-search.config.yaml"),
      (0, import_path.join)(cwd, "smart-search.config.yml"),
      (0, import_path.join)(cwd, "smart-search.config.json"),
      (0, import_path.join)(cwd, "config", "smart-search.yaml"),
      (0, import_path.join)(cwd, "config", "smart-search.yml"),
      (0, import_path.join)(cwd, "config", "smart-search.json"),
      (0, import_path.join)(cwd, ".smart-search.yaml"),
      (0, import_path.join)(cwd, ".smart-search.yml"),
      (0, import_path.join)(cwd, ".smart-search.json")
    ];
  }
  loadFromFile(filePath) {
    const content = (0, import_fs.readFileSync)(filePath, "utf8");
    const ext = filePath.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "json":
        return JSON.parse(content);
      case "yaml":
      case "yml":
        const yaml = require_js_yaml();
        return yaml.load(content);
      default:
        throw new Error(`Unsupported config file format: ${ext}`);
    }
  }
  loadFromEnvironment() {
    const config = {
      database: {
        type: process.env.SMART_SEARCH_DB_TYPE || "supabase",
        connection: {}
      },
      search: {
        fallback: process.env.SMART_SEARCH_FALLBACK || "database",
        tables: {}
      }
    };
    switch (config.database.type) {
      case "supabase":
        const supabaseUrl = process.env.SUPABASE_URL || process.env.SMART_SEARCH_DB_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SMART_SEARCH_DB_KEY;
        if (supabaseUrl && supabaseKey) {
          config.database.connection = { url: supabaseUrl, key: supabaseKey };
        }
        break;
      case "mysql":
      case "postgresql":
        const dbUser = process.env.SMART_SEARCH_DB_USER || process.env.SMART_SEARCH_DB_USERNAME;
        const dbPassword = process.env.SMART_SEARCH_DB_PASSWORD;
        const dbName = process.env.SMART_SEARCH_DB_DATABASE || process.env.SMART_SEARCH_DB_NAME;
        config.database.connection = {
          host: process.env.SMART_SEARCH_DB_HOST || "localhost",
          port: parseInt(process.env.SMART_SEARCH_DB_PORT || "5432")
        };
        if (dbUser) {
          config.database.connection.user = dbUser;
        }
        if (dbPassword) {
          config.database.connection.password = dbPassword;
        }
        if (dbName) {
          config.database.connection.database = dbName;
        }
        break;
      case "mongodb":
        const mongoUri = process.env.MONGODB_URI || process.env.SMART_SEARCH_DB_URI;
        if (mongoUri) {
          config.database.connection = { uri: mongoUri };
        }
        break;
    }
    if (process.env.SMART_SEARCH_CACHE_TYPE || process.env.REDIS_URL || process.env.REDIS_HOST) {
      config.cache = {
        type: process.env.SMART_SEARCH_CACHE_TYPE || "redis",
        connection: {}
      };
      switch (config.cache.type) {
        case "redis":
        case "dragonfly":
          config.cache.connection = {};
          const redisUrl = process.env.REDIS_URL || process.env.SMART_SEARCH_CACHE_URL;
          const redisHost = process.env.REDIS_HOST || process.env.SMART_SEARCH_CACHE_HOST;
          const redisPassword = process.env.REDIS_PASSWORD || process.env.SMART_SEARCH_CACHE_PASSWORD;
          const redisUsername = process.env.REDIS_USERNAME || process.env.SMART_SEARCH_CACHE_USERNAME;
          const redisApiKey = process.env.REDIS_API_KEY || process.env.REDIS_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.SMART_SEARCH_CACHE_API_KEY;
          if (redisUrl) {
            config.cache.connection.url = redisUrl;
          }
          if (redisHost) {
            config.cache.connection.host = redisHost;
          }
          config.cache.connection.port = parseInt(process.env.REDIS_PORT || process.env.SMART_SEARCH_CACHE_PORT || "6379");
          if (redisPassword) {
            config.cache.connection.password = redisPassword;
          }
          if (redisUsername) {
            config.cache.connection.username = redisUsername;
          }
          if (redisApiKey) {
            config.cache.connection.apiKey = redisApiKey;
          }
          config.cache.connection.db = parseInt(process.env.REDIS_DB || process.env.SMART_SEARCH_CACHE_DB || "0");
          config.cache.connection.tls = process.env.REDIS_TLS === "true" || process.env.SMART_SEARCH_CACHE_TLS === "true";
          break;
        case "memcached":
          const servers = process.env.MEMCACHED_SERVERS || process.env.SMART_SEARCH_CACHE_SERVERS;
          config.cache.connection = {
            servers: servers ? servers.split(",") : ["localhost:11211"]
          };
          break;
      }
    }
    if (process.env.SMART_SEARCH_ENABLE_METRICS !== void 0) {
      config.performance = {
        enableMetrics: process.env.SMART_SEARCH_ENABLE_METRICS === "true",
        logQueries: process.env.SMART_SEARCH_LOG_QUERIES === "true",
        slowQueryThreshold: parseInt(process.env.SMART_SEARCH_SLOW_QUERY_THRESHOLD || "1000")
      };
    }
    if (process.env.SMART_SEARCH_CIRCUIT_BREAKER_THRESHOLD) {
      config.circuitBreaker = {
        failureThreshold: parseInt(process.env.SMART_SEARCH_CIRCUIT_BREAKER_THRESHOLD || "3"),
        recoveryTimeout: parseInt(process.env.SMART_SEARCH_CIRCUIT_BREAKER_RECOVERY || "60000"),
        healthCacheTTL: parseInt(process.env.SMART_SEARCH_HEALTH_CACHE_TTL || "30000")
      };
    }
    return config;
  }
  validateAndMergeDefaults(config) {
    if (!config.database?.type || !config.database?.connection) {
      throw new Error("Database configuration is required");
    }
    if (!config.search?.fallback) {
      throw new Error("Search fallback strategy is required");
    }
    const defaults = {
      circuitBreaker: {
        failureThreshold: 3,
        recoveryTimeout: 6e4,
        healthCacheTTL: 3e4
      },
      cacheConfig: {
        enabled: true,
        defaultTTL: 3e5,
        maxSize: 1e4
      },
      performance: {
        enableMetrics: true,
        logQueries: false,
        slowQueryThreshold: 1e3
      }
    };
    return {
      ...defaults,
      ...config,
      circuitBreaker: { ...defaults.circuitBreaker, ...config.circuitBreaker },
      cacheConfig: { ...defaults.cacheConfig, ...config.cacheConfig },
      performance: { ...defaults.performance, ...config.performance }
    };
  }
  /**
   * Create a config template
   */
  static createTemplate(format = "json") {
    const template = {
      database: {
        type: "supabase",
        connection: {
          url: "${SUPABASE_URL}",
          key: "${SUPABASE_ANON_KEY}"
        }
      },
      cache: {
        type: "redis",
        connection: {
          url: "${REDIS_URL}"
        }
      },
      search: {
        fallback: "database",
        tables: {
          books: {
            columns: {
              id: "id",
              title: "title",
              subtitle: "author",
              description: "description",
              category: "category",
              language: "language",
              visibility: "visibility",
              createdAt: "uploaded_at"
            },
            searchColumns: ["title", "author", "description"],
            type: "book"
          },
          users: {
            columns: {
              id: "id",
              title: "full_name",
              subtitle: "username",
              description: "bio",
              createdAt: "created_at"
            },
            searchColumns: ["full_name", "username", "bio"],
            type: "user"
          }
        }
      },
      circuitBreaker: {
        failureThreshold: 3,
        recoveryTimeout: 6e4,
        healthCacheTTL: 3e4
      },
      cacheConfig: {
        enabled: true,
        defaultTTL: 3e5,
        maxSize: 1e4
      },
      performance: {
        enableMetrics: true,
        logQueries: false,
        slowQueryThreshold: 1e3
      }
    };
    if (format === "json") {
      return JSON.stringify(template, null, 2);
    } else {
      return `# @samas/smart-search Configuration
database:
  type: supabase
  connection:
    url: \${SUPABASE_URL}
    key: \${SUPABASE_ANON_KEY}

cache:
  type: redis
  connection:
    url: \${REDIS_URL}

search:
  fallback: database
  tables:
    books:
      columns:
        id: id
        title: title
        subtitle: author
        description: description
        category: category
        language: language
        visibility: visibility
        createdAt: uploaded_at
      searchColumns:
        - title
        - author
        - description
      type: book
    users:
      columns:
        id: id
        title: full_name
        subtitle: username
        description: bio
        createdAt: created_at
      searchColumns:
        - full_name
        - username
        - bio
      type: user

circuitBreaker:
  failureThreshold: 3
  recoveryTimeout: 60000
  healthCacheTTL: 30000

cache:
  enabled: true
  defaultTTL: 300000
  maxSize: 10000

performance:
  enableMetrics: true
  logQueries: false
  slowQueryThreshold: 1000`;
    }
  }
};

// src/SmartSearchFactory.ts
var _SmartSearchFactory = class _SmartSearchFactory {
  /**
   * Create SmartSearch instance from configuration file
   */
  static fromConfig(configPath) {
    const config = _SmartSearchFactory.configLoader.loadConfig(configPath);
    return _SmartSearchFactory.createFromConfigObject(config);
  }
  /**
   * Create SmartSearch instance from environment variables
   */
  static fromEnvironment() {
    const config = _SmartSearchFactory.configLoader.loadFromEnvironment();
    return _SmartSearchFactory.createFromConfigObject(config);
  }
  /**
   * Create SmartSearch instance from configuration object
   */
  static fromConfigObject(config) {
    return _SmartSearchFactory.createFromConfigObject(config);
  }
  static createFromConfigObject(config) {
    const database = _SmartSearchFactory.createDatabaseProvider(config);
    const cache = config.cache ? _SmartSearchFactory.createCacheProvider(config) : void 0;
    const smartSearchConfig = {
      database,
      fallback: config.search.fallback
    };
    if (cache) {
      smartSearchConfig.cache = cache;
    }
    if (config.circuitBreaker) {
      smartSearchConfig.circuitBreaker = config.circuitBreaker;
    }
    if (config.cacheConfig) {
      smartSearchConfig.cacheConfig = config.cacheConfig;
    }
    if (config.performance) {
      smartSearchConfig.performance = config.performance;
    }
    return new SmartSearch(smartSearchConfig);
  }
  static createDatabaseProvider(config) {
    const { type, connection, options } = config.database;
    switch (type) {
      case "supabase":
        if (!connection.url || !connection.key) {
          throw new Error("Supabase configuration requires url and key");
        }
        return new SupabaseProvider(
          {
            url: connection.url,
            key: connection.key,
            options: options || {}
          },
          {
            tables: Object.fromEntries(
              Object.entries(config.search.tables).map(([key, table]) => [
                key,
                {
                  columns: {
                    ...table.columns,
                    id: table.columns.id || "id",
                    title: table.columns.title || "title"
                  },
                  searchColumns: table.searchColumns,
                  type: table.type
                }
              ])
            )
          }
        );
      case "mysql":
        throw new Error("MySQLProvider not yet implemented. Use SupabaseProvider or implement MySQLProvider.");
      case "postgresql":
        if (!connection.host || !connection.user || !connection.password || !connection.database) {
          throw new Error("PostgreSQL configuration requires host, user, password, and database");
        }
        return new PostgreSQLProvider(
          {
            connection: {
              host: connection.host,
              port: connection.port || 5432,
              user: connection.user,
              password: connection.password,
              database: connection.database,
              ssl: false,
              ...connection
            },
            ...options
          },
          config.search || {
            tables: {
              healthcare_data: {
                columns: {
                  id: "id",
                  title: "title",
                  description: "description",
                  category: "type"
                },
                searchColumns: ["title", "description", "condition_name", "treatment", "specialty"],
                type: "healthcare"
              }
            }
          }
        );
      case "mongodb":
        throw new Error("MongoDBProvider not yet implemented. Use SupabaseProvider or implement MongoDBProvider.");
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }
  static createCacheProvider(config) {
    if (!config.cache) {
      throw new Error("Cache configuration is required");
    }
    const { type, connection, options } = config.cache;
    switch (type) {
      case "redis":
        const redisConfig = {};
        if (connection.url)
          redisConfig.url = connection.url;
        if (connection.host)
          redisConfig.host = connection.host;
        if (connection.port)
          redisConfig.port = connection.port;
        if (connection.password)
          redisConfig.password = connection.password;
        if (connection.username)
          redisConfig.username = connection.username;
        if (connection.apiKey)
          redisConfig.apiKey = connection.apiKey;
        if (connection.db !== void 0)
          redisConfig.db = connection.db;
        if (connection.tls !== void 0)
          redisConfig.tls = connection.tls;
        return new RedisProvider({ ...redisConfig, ...options });
      case "dragonfly":
        const dragonflyConfig = {};
        if (connection.url)
          dragonflyConfig.url = connection.url;
        if (connection.host)
          dragonflyConfig.host = connection.host;
        dragonflyConfig.port = connection.port || 6380;
        if (connection.password)
          dragonflyConfig.password = connection.password;
        if (connection.username)
          dragonflyConfig.username = connection.username;
        if (connection.apiKey)
          dragonflyConfig.apiKey = connection.apiKey;
        if (connection.db !== void 0)
          dragonflyConfig.db = connection.db;
        if (connection.tls !== void 0)
          dragonflyConfig.tls = connection.tls;
        return new RedisProvider({ ...dragonflyConfig, ...options });
      case "memcached":
        throw new Error("MemcachedProvider not yet implemented. Use RedisProvider or implement MemcachedProvider.");
      default:
        throw new Error(`Unsupported cache type: ${type}`);
    }
  }
  /**
   * Generate configuration template files
   */
  static generateConfigTemplate(format = "json", outputPath) {
    const template = ConfigLoader.createTemplate(format);
    if (outputPath) {
      const fs = require("fs");
      fs.writeFileSync(outputPath, template, "utf8");
      console.log(`\u2705 Configuration template created: ${outputPath}`);
    }
    return template;
  }
  /**
   * Validate configuration
   */
  static validateConfig(config) {
    const errors = [];
    if (!config.database) {
      errors.push("Database configuration is required");
    } else {
      if (!config.database.type) {
        errors.push("Database type is required");
      }
      if (!config.database.connection) {
        errors.push("Database connection configuration is required");
      } else {
        switch (config.database.type) {
          case "supabase":
            if (!config.database.connection.url)
              errors.push("Supabase URL is required");
            if (!config.database.connection.key)
              errors.push("Supabase key is required");
            break;
          case "mysql":
          case "postgresql":
            if (!config.database.connection.host)
              errors.push(`${config.database.type} host is required`);
            if (!config.database.connection.user && !config.database.connection.username) {
              errors.push(`${config.database.type} user/username is required`);
            }
            if (!config.database.connection.password)
              errors.push(`${config.database.type} password is required`);
            if (!config.database.connection.database)
              errors.push(`${config.database.type} database name is required`);
            break;
          case "mongodb":
            if (!config.database.connection.uri)
              errors.push("MongoDB URI is required");
            break;
        }
      }
    }
    if (!config.search) {
      errors.push("Search configuration is required");
    } else {
      if (!config.search.fallback) {
        errors.push("Search fallback strategy is required");
      } else if (!["database", "cache"].includes(config.search.fallback)) {
        errors.push('Search fallback must be either "database" or "cache"');
      }
      if (!config.search.tables || Object.keys(config.search.tables).length === 0) {
        errors.push("At least one table configuration is required");
      } else {
        for (const [tableName, tableConfig] of Object.entries(config.search.tables)) {
          if (!tableConfig.columns || Object.keys(tableConfig.columns).length === 0) {
            errors.push(`Table "${tableName}" must have column mappings`);
          }
          if (!tableConfig.searchColumns || tableConfig.searchColumns.length === 0) {
            errors.push(`Table "${tableName}" must have searchColumns defined`);
          }
          if (!tableConfig.type) {
            errors.push(`Table "${tableName}" must have a type defined`);
          }
        }
      }
    }
    if (config.cache && config.cache.type) {
      if (!config.cache.connection) {
        errors.push("Cache connection configuration is required when cache type is specified");
      } else {
        switch (config.cache.type) {
          case "redis":
          case "dragonfly":
            if (!config.cache.connection.url && !config.cache.connection.host) {
              errors.push(`${config.cache.type} requires either url or host`);
            }
            break;
          case "memcached":
            if (!config.cache.connection.servers || config.cache.connection.servers.length === 0) {
              errors.push("Memcached requires servers configuration");
            }
            break;
        }
      }
    }
    return {
      valid: errors.length === 0,
      errors
    };
  }
};
_SmartSearchFactory.configLoader = ConfigLoader.getInstance();
var SmartSearchFactory = _SmartSearchFactory;

// src/providers/MySQLProvider.ts
var import_promise = __toESM(require("mysql2/promise"));

// src/providers/MongoDBProvider.ts
var import_mongodb = require("mongodb");

// src/index.ts
var src_default = SmartSearch;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ConfigLoader,
  RedisProvider,
  SmartSearch,
  SmartSearchFactory,
  SupabaseProvider
});
