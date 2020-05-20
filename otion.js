/*
// export * from 'https://raw.githubusercontent.com/lufrai/deno-otion/v0.1.3/otionDev.js'
// @deno-types="./otion.d.ts"
import * as Otion from 'https://unpkg.com/otion@0.3.1/dist-deno/bundle.dev.mjs'
// @deno-types="./otion.d.ts"
export * as Otion from 'https://unpkg.com/otion@0.3.1/dist-deno/bundle.dev.mjs'
// @deno-types="./otion.d.ts"
export * from 'https://unpkg.com/otion@0.3.1/dist-deno/bundle.dev.mjs'
// export * from 'https://cdn.pika.dev/otion@^0.3.1/runtime-deno'
*/

/*! For license information please see https://github.com/kripod/otion */

/* eslint-disable */
// Inspired by https://github.com/garycourt/murmurhash-js
// Ported from https://github.com/aappleby/smhasher/blob/61a0530f28277f2e850bfc39600ce61d02b518de/src/MurmurHash2.cpp#L37-L86
function murmur2(str) {
  // 'm' and 'r' are mixing constants generated offline.
  // They're not really 'magic', they just happen to work well.
  // const m = 0x5bd1e995;
  // const r = 24;
  // Initialize the hash
  var h = 0; // Mix 4 bytes at a time into the hash

  var k,
    i = 0,
    len = str.length;

  for (; len >= 4; ++i, len -= 4) {
    k = str.charCodeAt(i) & 0xff | (str.charCodeAt(++i) & 0xff) << 8 |
      (str.charCodeAt(++i) & 0xff) << 16 | (str.charCodeAt(++i) & 0xff) << 24;
    k = /* Math.imul(k, m): */
      (k & 0xffff) * 0x5bd1e995 + ((k >>> 16) * 0xe995 << 16);
    k ^= /* k >>> r: */
      k >>> 24;
    h = /* Math.imul(k, m): */
      (k & 0xffff) * 0x5bd1e995 + ((k >>> 16) * 0xe995 << 16) ^
      /* Math.imul(h, m): */
      (h & 0xffff) * 0x5bd1e995 + ((h >>> 16) * 0xe995 << 16);
  } // Handle the last few bytes of the input array

  switch (len) {
    case 3:
      h ^= (str.charCodeAt(i + 2) & 0xff) << 16;

    case 2:
      h ^= (str.charCodeAt(i + 1) & 0xff) << 8;

    case 1:
      h ^= str.charCodeAt(i) & 0xff;
      h = /* Math.imul(h, m): */
        (h & 0xffff) * 0x5bd1e995 + ((h >>> 16) * 0xe995 << 16);
  } // Do a few final mixes of the hash to ensure the last few
  // bytes are well-incorporated.

  h ^= h >>> 13;
  h = /* Math.imul(h, m): */
    (h & 0xffff) * 0x5bd1e995 + ((h >>> 16) * 0xe995 << 16);
  return ((h ^ h >>> 15) >>> 0).toString(36);
}

var t = /^(br|hy|us|wr|text-si|scroll-snap-t)/,
  e = /^(ap|us|tab-|border-e|margin-e|margin-s|padding-e|padding-s|border-sta)/,
  r =
    /^(ap|br|hy|us|wr|mas|colu|clip-|box-de|font-k|text-e|font-fe|shape-i|text-or|text-si|border-e|margin-e|margin-s|padding-e|padding-s|border-sta|background-cl|scroll-snap-t|text-decoration-)/,
  s = /^(pos|background-cl)/,
  a = {},
  n = function n(s) {
    return a[s] ? a[s] : a[s] = 1 * t.test(s) | 2 * e.test(s) | 4 * r.test(s);
  },
  o = function o(t, e) {
    return s.test(t) ? e.replace(/(sticky|text)/, "-webkit-$1, $1") : e;
  };

var isBrowser = typeof document !== "undefined";

var STYLE_ELEMENT_ID = "__otion";
function getStyleElement() {
  // Hydrate existing style element if available
  var el = document.getElementById(STYLE_ELEMENT_ID);
  if (el) return el; // Create a new one otherwise

  el = document.createElement("style");
  el.id = STYLE_ELEMENT_ID; // Avoid Edge bug where empty style elements don't create sheets

  el.appendChild(document.createTextNode(""));
  return document.head.appendChild(el);
}

/**
 * Creates an injector which inserts style rules through the CSS Object Model.
 */

function CSSOMInjector(_ref2) {
  var nonce = _ref2.nonce,
    _ref2$target = _ref2.target,
    target = _ref2$target === void 0 ? getStyleElement().sheet : _ref2$target;
  // eslint-disable-next-line no-param-reassign
  target.ownerNode.nonce = nonce;
  return {
    sheet: target,
    insert: function insert(rule, index) {
      return target.insertRule(rule, index);
    },
  };
}
/**
 * Creates an injector which inserts style rules through the Document Object Model.
 */

function DOMInjector(_ref3) {
  var nonce = _ref3.nonce,
    _ref3$target = _ref3.target,
    target = _ref3$target === void 0 ? getStyleElement() : _ref3$target;
  // eslint-disable-next-line no-param-reassign
  target.nonce = nonce;
  return {
    sheet: target.sheet,
    insert: function insert(rule, index) {
      target.insertBefore(
        document.createTextNode(rule),
        target.childNodes[index],
      );
      return index;
    },
  };
}
/**
 * An injector placeholder which performs no operations. Useful for avoiding errors in a non-browser environment.
 */

var NoOpInjector = {
  insert: function insert() {
    return 0;
  },
};

function minifyValue(value) {
  // Remove excess white space characters
  return value.trim().replace(/\s+/g, " ");
}
function minifyCondition(condition) {
  return minifyValue(condition).replace(/([([]) | ([)\]])| ?(:) ?/g, "$1$2$3");
}

/*
    The order of rules is influenced by CSS usage metrics:

    - https://www.cssstats.com/stats/?url=css-tricks.com
    - https://www.cssstats.com/stats/?url=joshwcomeau.com
    - https://www.cssstats.com/stats/?url=mastery.games
    - https://www.cssstats.com/stats/?url=nytimes.com
    - https://www.chromestatus.com/metrics/css/popularity
*/
// Includes support for CSS custom properties
var PROPERTY_ACCEPTS_UNITLESS_VALUES =
  /^(-|f[lo].*[^se]$|g.{6,}[^ps]$|z|o[pr]|li.*(t|mp)$|an|(bo|s).{5}im|sca|m.{7}[ds]|ta|c.*[st]$|wido|ini)/; // TODO: Add tests to match everything below, without false positives
var PROPERTY_PRECEDENCE_FIX_GROUPS =
  /^(?:(border-(?!w|c|sty)|[tlbr].{2,4}m?$|c.{7}$)|([fl].{5}l|g.{8}$|pl))/; // TODO: Add tests to match everything below, with no conflicting longhands

/*
    Sources:

    - https://bitsofco.de/when-do-the-hover-focus-and-active-pseudo-classes-apply/#orderofstyleshoverthenfocusthenactive
    - https://developer.mozilla.org/docs/Web/CSS/:active#Active_links
*/
var PRECEDENCES_BY_PSEUDO_CLASS = new Map([[
  /* li */
  "nk",
  2,
], [
  /* vi */
  "sited",
  2,
], [
  /* em */
  "pty",
  3,
], [
  /* fo */
  "cus-w",
  4,
], [
  /* ho */
  "ver",
  5,
], [
  /* fo */
  "cus",
  6,
], [
  /* fo */
  "cus-v",
  7,
], [
  /* ac */
  "tive",
  8,
], [
  /* di */
  "sable",
  9,
]]);

var MAX_CLASS_NAME_LENGTH = 9;

function upperToHyphenLower(match) {
  return "-" + match.toLowerCase();
}
/**
 * Creates a new otion instance. Usable for managing styles of multiple browsing contexts (e.g. an `<iframe>` besides the main document).
 */

function createInstance() {
  var injector;
  var prefix;
  var insertedIdentNames;

  function checkSetup() {
    if (!injector || !prefix || !insertedIdentNames) {
      throw new Error(
        "On a custom otion instance, `setup()` must be called before usage.",
      );
    }
  }

  function hydrateScopedSubtree(cssRule) {
    if (
      cssRule.type === 1
      /* CSSRule.STYLE_RULE */
    ) {
      var selectorText = cssRule.selectorText;
      var index = selectorText.indexOf(".", 2);
      insertedIdentNames.add( // Remove leading `.` from class selector
        selectorText.slice(1, index < 0 ? MAX_CLASS_NAME_LENGTH : index),
      );
    } else {
      hydrateScopedSubtree(cssRule.cssRules[0]);
    }
  }

  function normalizeDeclaration(property, value) {
    var formattedValue = typeof value === "number" &&
      !PROPERTY_ACCEPTS_UNITLESS_VALUES.test(property)
      ? value + "px" // Append missing unit
      : minifyValue("" + value);
    return prefix(property, formattedValue);
  }

  function serializeDeclarationList(property, value) {
    if (typeof value !== "object") {
      return normalizeDeclaration(property, value);
    }

    var cssText = "";
    value.forEach(function (fallbackValue) {
      cssText += ";" + normalizeDeclaration(property, fallbackValue);
    }); // The leading declaration separator character gets removed

    return cssText.slice(1);
  }

  function decomposeToClassNames(
    rules,
    cssTextHead,
    cssTextTail,
    classSelectorStartIndex,
  ) {
    var classNames = ""; // TODO: Replace `var` with `const` once it minifies equivalently
    // eslint-disable-next-line guard-for-in, no-restricted-syntax, no-var, vars-on-top

    var _loop = function _loop() {
      var value = rules[key];

      if (value != null) {
        if (typeof value !== "object" || Array.isArray(value)) {
          // Class specificities are controlled with repetition, see:
          // https://csswizardry.com/2014/07/hacks-for-dealing-with-specificity/
          var property = key.replace(/[A-Z]/g, upperToHyphenLower);
          var declarations = serializeDeclarationList(property, value);
          var className = "_" + murmur2(cssTextHead + declarations); // The property's baseline precedence is based on dash (`-`) counting

          var precedence = 1;
          var position = 3; // eslint-disable-next-line no-cond-assign

          while ((position = property.indexOf("-", position) + 1) > 0) {
            ++precedence;
          } // Handle properties which don't conform to the rule above

          var matches = PROPERTY_PRECEDENCE_FIX_GROUPS.exec(property);
          var scopeSelector = ("." + className).repeat(
            precedence + (matches ? +!!matches[1] || -!!matches[2] : 0),
          );

          if (!insertedIdentNames.has(className)) {
            injector.insert(
              "" +
                (cssTextHead.slice(0, classSelectorStartIndex) + scopeSelector +
                  (classSelectorStartIndex != null
                    ? scopeSelector.repeat(
                      PRECEDENCES_BY_PSEUDO_CLASS.get(cssTextHead.slice( // This part uniquely identifies a pseudo selector
                        classSelectorStartIndex + 3,
                        classSelectorStartIndex + 8,
                      )) || 1,
                    ) + cssTextHead.slice(classSelectorStartIndex) + "{"
                    : "{")) +
                declarations + "}" + cssTextTail,
              insertedIdentNames.size,
            );
            insertedIdentNames.add(className);
          }

          classNames += " " + className;
        } else {
          var parentRuleHeads;
          var firstParentRuleHead = key[0] === ":" || key[0] === "@"
            ? key
            : minifyCondition(key);
          var parentRuleTail = "";

          if (!classSelectorStartIndex) {
            if (
              firstParentRuleHead[0] === ":" || firstParentRuleHead[0] === "&"
            ) {
              // eslint-disable-next-line no-param-reassign
              classSelectorStartIndex = cssTextHead.length;
              parentRuleHeads = firstParentRuleHead.split(",").map(
                function (singleSelector) {
                  return minifyCondition(singleSelector).replace("&", "");
                },
              );
            } else if (firstParentRuleHead === "selectors") {
              firstParentRuleHead = "";
            } else if (firstParentRuleHead[0] !== "@") {
              firstParentRuleHead += "{";
              parentRuleTail = "}";
            }
          }

          (parentRuleHeads || [firstParentRuleHead]).forEach( // eslint-disable-next-line no-loop-func
            function (parentRuleHead) {
              classNames += decomposeToClassNames(
                value,
                cssTextHead + parentRuleHead,
                parentRuleTail + cssTextTail,
                classSelectorStartIndex,
              );
            },
          );
        }
      }
    };

    for (var key in rules) {
      _loop();
    }

    return classNames;
  }

  return {
    setup: function setup(options) {
      injector = options.injector || ( // eslint-disable-next-line no-nested-ternary
        isBrowser ? DOMInjector({}) : NoOpInjector
      );

      prefix = options.prefix || function (property, value) {
        var declaration = property + ":" + o(property, value);
        var cssText = declaration;
        var flag = n(property);
        if (flag & 1) cssText += ";-ms-" + declaration;
        if (flag & 2) cssText += ";-moz-" + declaration;
        if (flag & 4) cssText += ";-webkit-" + declaration;
        return cssText;
      };

      insertedIdentNames = new Set();
    },
    hydrate: function hydrate() {
      checkSetup(); // eslint-disable-next-line @typescript-eslint/no-non-null-assertion

      var cssRules = injector.sheet.cssRules;

      for (var i = 0, length = cssRules.length; i < length; ++i) {
        var cssRule = cssRules[i];

        if (
          cssRule.type === 7
          /* CSSRule.KEYFRAMES_RULE */
        ) {
          // Keyframes needn't be checked recursively, as they are never nested
          insertedIdentNames.add(cssRule.name);
        } else {
          hydrateScopedSubtree(cssRule);
        }
      }
    },
    css: function css(rules) {
      checkSetup(); // The leading white space character gets removed

      return decomposeToClassNames(rules, "", "").slice(1);
    },
    keyframes: function keyframes(rules) {
      checkSetup();
      var identName;
      return {
        toString: function toString() {
          if (!identName) {
            var cssText = ""; // TODO: Replace var with const once it minifies equivalently
            // eslint-disable-next-line guard-for-in, no-restricted-syntax, no-var, vars-on-top

            for (var time in rules) {
              cssText += time + "{";
              var declarations = rules[time]; // TODO: Replace var with const once it minifies equivalently
              // eslint-disable-next-line guard-for-in, no-restricted-syntax, no-var, vars-on-top

              for (var property in declarations) {
                var value = declarations[property];

                if (value != null) {
                  cssText += serializeDeclarationList(property, value);
                }
              }

              cssText += "}";
            }

            identName = "_" + murmur2(cssText);

            if (!insertedIdentNames.has(identName)) {
              injector.insert(
                "@keyframes " + identName + "{" + cssText + "}",
                insertedIdentNames.size,
              );
              insertedIdentNames.add(identName);
            }
          } // eslint-disable-next-line @typescript-eslint/no-non-null-assertion

          return identName;
        },
      };
    },
  };
}

var defaultInstance = createInstance();
defaultInstance.setup({}); // Make sure to keep documentation comments for aliases

/* eslint-disable prefer-destructuring */

var setup = defaultInstance.setup;
var hydrate = defaultInstance.hydrate;
var css = defaultInstance.css;
var keyframes = defaultInstance.keyframes;

export {
  CSSOMInjector,
  DOMInjector,
  NoOpInjector,
  createInstance,
  css,
  hydrate,
  keyframes,
  setup,
};
//# sourceMappingURL=bundle.dev.mjs.map
