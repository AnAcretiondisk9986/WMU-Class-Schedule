/**
 * 小程序运行时兼容层（在 app.js 中最先加载）。
 * 补齐 PDF.js 与业务代码可能依赖、但部分真机 JS 引擎缺失的 Web API / ES 内建方法。
 */

/* eslint-disable no-new-func */

// 1) globalThis
(function ensureGlobalThis() {
  if (typeof globalThis !== "undefined") return;
  try {
    var g = Function("return this")();
    if (g) {
      Object.defineProperty(g, "globalThis", { value: g, writable: true, configurable: true });
    }
  } catch (e) {}
})();

// 2) structuredClone（deep clone，忽略 transfer 语义）
if (typeof globalThis.structuredClone !== "function") {
  var structuredCloneImpl = function (value) {
    var seen = new WeakMap();
    function clone(v) {
      if (v === null || typeof v !== "object") return v;
      if (v instanceof Date) return new Date(v.getTime());
      if (v instanceof RegExp) return new RegExp(v.source, v.flags);
      if (v instanceof ArrayBuffer) return v.slice(0);
      if (ArrayBuffer.isView(v)) {
        if (typeof v.slice === "function") return v.slice();
        var viewCopy = new v.constructor(v.length);
        viewCopy.set(v);
        return viewCopy;
      }
      if (seen.has(v)) return seen.get(v);
      if (Array.isArray(v)) {
        var arr = [];
        seen.set(v, arr);
        for (var i = 0; i < v.length; i += 1) arr[i] = clone(v[i]);
        return arr;
      }
      if (v instanceof Map) {
        var m = new Map();
        seen.set(v, m);
        v.forEach(function (val, key) { m.set(clone(key), clone(val)); });
        return m;
      }
      if (v instanceof Set) {
        var s = new Set();
        seen.set(v, s);
        v.forEach(function (val) { s.add(clone(val)); });
        return s;
      }
      var obj = Object.create(Object.getPrototypeOf(v));
      seen.set(v, obj);
      Object.keys(v).forEach(function (key) { obj[key] = clone(v[key]); });
      return obj;
    }
    return clone(value);
  };
  Object.defineProperty(globalThis, "structuredClone", {
    value: structuredCloneImpl,
    writable: true,
    configurable: true
  });
}

// 3) TextDecoder / TextEncoder（最小实现）
if (typeof globalThis.TextDecoder !== "function") {
  function utf8Decode(bytes) {
    var out = "";
    var i = 0;
    var len = bytes.length;
    while (i < len) {
      var b0 = bytes[i++];
      if (b0 < 0x80) {
        out += String.fromCharCode(b0);
      } else if (b0 >= 0xc2 && b0 < 0xe0) {
        out += String.fromCharCode(((b0 & 0x1f) << 6) | (bytes[i++] & 0x3f));
      } else if (b0 >= 0xe0 && b0 < 0xf0) {
        out += String.fromCharCode(((b0 & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f));
      } else {
        var code = 0xfffd;
        if (b0 >= 0xf0 && b0 < 0xf8) {
          code = ((b0 & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
        }
        if (code > 0xffff) {
          code -= 0x10000;
          out += String.fromCharCode(0xd800 + (code >> 10), 0xdc00 + (code & 0x3ff));
        } else {
          out += String.fromCharCode(code);
        }
      }
    }
    return out;
  }
  function TextDecoderPolyfill(encoding) {
    this.encoding = String(encoding || "utf-8").toLowerCase();
  }
  TextDecoderPolyfill.prototype.decode = function (bytes) {
    var enc = this.encoding;
    if (enc === "utf-8" || enc === "utf8") return utf8Decode(bytes);
    if (enc === "utf-16le" || enc === "utf-16" || enc === "utf-16be") {
      var out = "";
      var le = enc !== "utf-16be";
      for (var i = 0; i + 1 < bytes.length; i += 2) {
        out += String.fromCharCode(le ? bytes[i] | (bytes[i + 1] << 8) : (bytes[i] << 8) | bytes[i + 1]);
      }
      return out;
    }
    var latin = "";
    for (var j = 0; j < bytes.length; j += 1) latin += String.fromCharCode(bytes[j]);
    return latin;
  };
  Object.defineProperty(globalThis, "TextDecoder", { value: TextDecoderPolyfill, writable: true, configurable: true });
}
if (typeof globalThis.TextEncoder !== "function") {
  function TextEncoderPolyfill() {}
  TextEncoderPolyfill.prototype.encode = function (str) {
    var bytes = [];
    for (var i = 0; i < str.length; i += 1) {
      var code = str.charCodeAt(i);
      if (code < 0x80) bytes.push(code);
      else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
      else bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
    return new Uint8Array(bytes);
  };
  Object.defineProperty(globalThis, "TextEncoder", { value: TextEncoderPolyfill, writable: true, configurable: true });
}

// 3.5) URLSearchParams
// pdfjs-dist legacy 构建内嵌的 core-js 在加载时会“裸引用” URLSearchParams（var o = URLSearchParams），
// 小程序缺失该全局会直接抛 ReferenceError。这里提供一个完整实现。
if (typeof globalThis.URLSearchParams !== "function") {
  function safeDecode(value) {
    try {
      return decodeURIComponent(value.replace(/\+/g, " "));
    } catch (e) {
      return value;
    }
  }
  function encodeComponent(value) {
    return encodeURIComponent(String(value)).replace(/%20/g, "+");
  }
  function URLSearchParamsPolyfill(init) {
    this._entries = [];
    if (init == null) return;
    if (typeof init === "string") {
      var q = init.charAt(0) === "?" ? init.slice(1) : init;
      if (!q) return;
      var parts = q.split("&");
      for (var i = 0; i < parts.length; i += 1) {
        if (!parts[i]) continue;
        var eq = parts[i].indexOf("=");
        var key = eq < 0 ? parts[i] : parts[i].slice(0, eq);
        var val = eq < 0 ? "" : parts[i].slice(eq + 1);
        this.append(safeDecode(key), safeDecode(val));
      }
    } else if (Array.isArray(init)) {
      for (var j = 0; j < init.length; j += 1) {
        var pair = init[j];
        this.append(pair[0], pair[1]);
      }
    } else if (typeof init === "object") {
      var self = this;
      Object.keys(init).forEach(function (k) { self.append(k, init[k]); });
    }
  }
  URLSearchParamsPolyfill.prototype.append = function (key, value) {
    this._entries.push([String(key), String(value)]);
  };
  URLSearchParamsPolyfill.prototype.delete = function (key, value) {
    key = String(key);
    for (var i = this._entries.length - 1; i >= 0; i -= 1) {
      if (this._entries[i][0] === key && (arguments.length < 2 || this._entries[i][1] === String(value))) {
        this._entries.splice(i, 1);
      }
    }
  };
  URLSearchParamsPolyfill.prototype.get = function (key) {
    key = String(key);
    for (var i = 0; i < this._entries.length; i += 1) {
      if (this._entries[i][0] === key) return this._entries[i][1];
    }
    return null;
  };
  URLSearchParamsPolyfill.prototype.getAll = function (key) {
    key = String(key);
    var out = [];
    for (var i = 0; i < this._entries.length; i += 1) {
      if (this._entries[i][0] === key) out.push(this._entries[i][1]);
    }
    return out;
  };
  URLSearchParamsPolyfill.prototype.has = function (key, value) {
    key = String(key);
    for (var i = 0; i < this._entries.length; i += 1) {
      if (this._entries[i][0] === key && (arguments.length < 2 || this._entries[i][1] === String(value))) return true;
    }
    return false;
  };
  URLSearchParamsPolyfill.prototype.set = function (key, value) {
    key = String(key);
    var done = false;
    for (var i = this._entries.length - 1; i >= 0; i -= 1) {
      if (this._entries[i][0] !== key) continue;
      if (!done) { this._entries[i][1] = String(value); done = true; }
      else this._entries.splice(i, 1);
    }
    if (!done) this._entries.push([key, String(value)]);
  };
  URLSearchParamsPolyfill.prototype.sort = function () {
    this._entries.sort(function (a, b) {
      if (a[0] < b[0]) return -1;
      if (a[0] > b[0]) return 1;
      if (a[1] < b[1]) return -1;
      if (a[1] > b[1]) return 1;
      return 0;
    });
  };
  URLSearchParamsPolyfill.prototype.forEach = function (fn, thisArg) {
    for (var i = 0; i < this._entries.length; i += 1) {
      fn.call(thisArg, this._entries[i][1], this._entries[i][0], this);
    }
  };
  URLSearchParamsPolyfill.prototype.toString = function () {
    var out = [];
    for (var i = 0; i < this._entries.length; i += 1) {
      out.push(encodeComponent(this._entries[i][0]) + "=" + encodeComponent(this._entries[i][1]));
    }
    return out.join("&");
  };
  URLSearchParamsPolyfill.prototype.entries = function () {
    var list = this._entries.slice();
    var i = 0;
    return {
      next: function () {
        return i >= list.length ? { done: true, value: undefined } : { done: false, value: list[i++] };
      }
    };
  };
  URLSearchParamsPolyfill.prototype.keys = function () {
    var list = this._entries.slice();
    var i = 0;
    return {
      next: function () {
        return i >= list.length ? { done: true, value: undefined } : { done: false, value: list[i++][0] };
      }
    };
  };
  URLSearchParamsPolyfill.prototype.values = function () {
    var list = this._entries.slice();
    var i = 0;
    return {
      next: function () {
        return i >= list.length ? { done: true, value: undefined } : { done: false, value: list[i++][1] };
      }
    };
  };
  if (typeof Symbol !== "undefined" && Symbol.iterator) {
    URLSearchParamsPolyfill.prototype[Symbol.iterator] = URLSearchParamsPolyfill.prototype.entries;
  }
  Object.defineProperty(globalThis, "URLSearchParams", {
    value: URLSearchParamsPolyfill,
    writable: true,
    configurable: true
  });
}

// 4) ES2016+ 内建方法（老 iOS JSCore 兜底）
if (!Array.prototype.includes) {
  Array.prototype.includes = function (v, fromIndex) {
    return this.indexOf(v, fromIndex) !== -1;
  };
}
if (!Array.prototype.find) {
  Array.prototype.find = function (fn) {
    for (var i = 0; i < this.length; i += 1) if (fn(this[i], i, this)) return this[i];
    return undefined;
  };
}
if (!Array.prototype.findIndex) {
  Array.prototype.findIndex = function (fn) {
    for (var i = 0; i < this.length; i += 1) if (fn(this[i], i, this)) return i;
    return -1;
  };
}
if (!Array.prototype.flatMap) {
  Array.prototype.flatMap = function (fn) {
    return Array.prototype.concat.apply([], this.map(fn));
  };
}
if (!String.prototype.includes) {
  String.prototype.includes = function (v, fromIndex) {
    return this.indexOf(v, fromIndex) !== -1;
  };
}
if (!String.prototype.startsWith) {
  String.prototype.startsWith = function (v) { return this.indexOf(v) === 0; };
}
if (!String.prototype.endsWith) {
  String.prototype.endsWith = function (v) {
    return this.length >= v.length && this.lastIndexOf(v) === this.length - v.length;
  };
}
if (!String.prototype.padStart) {
  String.prototype.padStart = function (len, pad) {
    var s = String(this);
    var c = pad == null ? " " : String(pad);
    while (s.length < len) s = c + s;
    return s;
  };
}
if (!Object.entries) {
  Object.entries = function (obj) {
    return Object.keys(obj).map(function (k) { return [k, obj[k]]; });
  };
}
if (!Object.values) {
  Object.values = function (obj) {
    return Object.keys(obj).map(function (k) { return obj[k]; });
  };
}
if (!Object.assign) {
  Object.assign = function (target) {
    for (var i = 1; i < arguments.length; i += 1) {
      var src = arguments[i];
      if (src) Object.keys(src).forEach(function (k) { target[k] = src[k]; });
    }
    return target;
  };
}
