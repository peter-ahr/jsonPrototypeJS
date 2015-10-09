//==============================================================================
/* Prototype-in-Json Serialize / Deserialize Utility
 *
 * Preparations:
 * 1.) Add a property '__PROTO__' to the prototype of all
 *     objects which shall retain their prototype after deserialization!
 *     Special numeric values NaN, Infinite and -Infinite will also sustain.
 * 2.) On the deserialization site, provide a hash with references to the
 *     needed constructors and prototypes.
 * 3.) Direct (de)serialization provides a replace function for JSON.stringify()
 *     and a reviver function for JSON.parse().
 * 4.) Indirect (de)serialization modifies the object using packObject()
 *     such that the name of the constructor will be kept in the '#' property.
 *     (Idea: https://github.com/skeeto/resurrect-js).
 *     Special number values and (if you wish) RegExp and Date values
 *     will be transformed into objects for later restoration using
 *     unpackObject().
 * 5.) If you want Regexp to be handled, add this beforehand:
 *     Object.getPrototypeOf(/x/).__PROTO__ = "RegExp";
 * 6.) In indirect Pack/Unpack, even Dates may work correctly. Add beforehand:
 *     Date.prototype.__PROTO__ = "Date";
 * 7.) Supports use of AMD, CommonJS, Firefox JSM or plain old <script>s.
 *
 * Serialization on the broadcasting site:
 * DIRECT
   var transfer = { a: new A(a), b: new B(b) };
   JSON.stringify(transfer, jsonPrototype.pack);
 *
 * INDIRECT
   jsonPrototype.packObject(transfer);
 * NOTE: Special numbers, RegExp and Date values have been converted to objects.
   var json = JSON.stringify(transfer);
 *
 * Deserialization on the receiving site:
 * DIRECT
   var hash = { A: A, B: B };
   var transfer = JSON.parse(json, jsonPrototype.unpack.bind(hash));
 *
 * INDIRECT
   var transfer = JSON.parse(json);
   jsonPrototype.unpackObject(transfer, hash);
 * NOTE: Prototypes, special numbers, RegExp and Date values restored.
 */
//==============================================================================
( function(global) { "use strict";
//==============================================================================

// .jsm denotes JS Code Modules used in Firefox Internals and Addons.
var FlagJSM = global.toString() == "[object BackstagePass]";

// if (FlagJSM) {
//     if (typeof console !== "object") {
//         Components.utils.import("resource://gre/modules/devtools/Console.jsm");
//     }
// }

//==============================================================================
// Object.assign polyfill

if (typeof Object.assign !== 'function') {
    Object.assign = function (dest /*, src, ... */) {
        function assign_ (dest, src) {
            try {
                if (typeof src === 'object' && src) {
                    for (var n in src /*only enumerable*/) {
                        if (src.hasOwnProperty(n)) {
                            dest[n] = src[n];
                        }
                    }
                }
            }
            catch (exc) {}
        }

        for (var i = 1, L = arguments.length; i < L; ++i) {
            assign_(dest, arguments[i]);
        }
        
        return dest;
    };
}

//==============================================================================

function pack_regexp_flags_() {
    return (this.global     ? "g" : "")
         + (this.ignoreCase ? "i" : "")
         + (this.unicode    ? "u" : "")
         + (this.multiline  ? "m" : "")
         + (this.sticky     ? "y" : "");
}

function pack_object_(protoName_, v) {
    switch (protoName_) {
    case "Date":
        // console.log("PACK_OBJECT Date " + n);
        return { d: v.valueOf(), "#": protoName_};

    case "RegExp":
        // console.log("PACK_OBJECT RegExp " + n);
        return { r: v.source, f: pack_regexp_flags_.call(v), "#": protoName_};

    case undefined:
    case null:
    case "":
        break;

    default:
        // console.log("PACK_OBJECT " + protoName_ + " " + n);
        // Shallow copy plus '#' property.
        return Object.assign( { }, v, { "#": protoName_ } );
    }

    return false;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

/* jshint -W069 */
var PackNumberFakeNaN_ = {
          'valueOf': function() { return NaN; }
        , '#': '__NaN'
    }
  , PackNumberFakeInf_ = {
          'valueOf': function() { return Infinity; }
        , '#': '__Inf'
    }
  , PackNumberFakeMInf_ = {
          'valueOf': function() { return -Infinity; }
        , '#': '__-Inf'
    }
  ;
/* jshint +W069 */

function pack_number_(v) {
    if (isNaN(v)) {
        // console.log("PACK_NUMBER NaN");
        return PackNumberFakeNaN_;
    }

    if (v === Infinity) {
        // console.log("PACK_NUMBER Inf");
        return PackNumberFakeInf_;
    }

    if (v === -Infinity) {
        // console.log("PACK_NUMBER -Inf");
        return PackNumberFakeMInf_;
    }

    return false;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function pack_getProtoName_(obj_) {
    var proto = Object.getPrototypeOf(obj_);
    /* jshint -W069 */
    return proto && typeof proto['__PROTO__'] === 'string'
               ? proto['__PROTO__'] : null;
    /* jshint +W069 */
}

function pack(n, v) {
    var t = typeof v;
    // console.log("PACK " + t + " " + n + " = " + v, v);
    var v2 = t === 'object'
                 ? v ? pack_object_(pack_getProtoName_(v), v)
                     : false
                 : t === 'number'
                     ? pack_number_(v)
                     : false;
    return v2 === false ? v : v2;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function packObject_mod_(protoName_, v) {
    switch (protoName_) {
    case "Date":
        // console.log("PACK_OBJECT Date");
        v['#'] = protoName_;
        v.d = v.valueOf();
        v.toJSON = undefined;

    case "RegExp":
        // console.log("PACK_OBJECT RegExp");
        v['#'] = protoName_;
        v.r = v.source;
        v.f = pack_regexp_flags_.call(v);

    case undefined:
    case null:
    case "":
        break;

    default:
        // console.log("PACK_OBJECT " + protoName_);
        // Shallow copy plus '#' property.
        v['#'] = protoName_;
    }
}

function packObject_(obj) {
    function _(obj, dummy, n) {
        // console.log("PACK " + (typeof n === 'number' ? "[" + n + "]" : n));

        var t = typeof obj[n], v, proto, protoName, isPlain;

        if (t === 'object') {
            if ((v = obj[n])) {
                // We will follow plain objects, arrays and
                // objects which we provided with a .prototype.__PROTO__.
                // We will _NOT_ follow objects with an unknown prototype.
                // Detection of plain objects (created using {} or new Object)
                // is done (heuristically) using
                // Object.getPrototypeOf({o}).hasOwnProperty('hasOwnProperty')
                // Has someone a better idea?

                proto = Object.getPrototypeOf(v);
                isPlain = proto.hasOwnProperty('hasOwnProperty');
                /* jshint -W069 */
                protoName = proto && typeof proto['__PROTO__'] === 'string'
                                ? proto['__PROTO__'] : null;
                /* jshint +W069 */

                // console.log("PROTO " + protoName +
                //     (isPlain ? " plain" : " not_plain") +
                //     (Array.isArray(v) ? " arr" : " no_arr"));

                if ((isPlain                     ||
                     Array.isArray(v)            ||
                     typeof protoName === 'string') &&
                    !(v instanceof RegExp)          &&
                    !(v instanceof Date)             )
                {
                    packObject_(v);
                }

                packObject_mod_(protoName, v);
            }
        }
        else if (t === 'number') {
            // console.log("PACK_NUMBER " + n + " = " + obj[n]);
            if ((v = pack_number_(obj[n])) !== false) {
                obj[n] = v;
            }
        }
    }

    if (Array.isArray(obj)) {
        // console.log("ARRAY #" + obj.length);
        obj.forEach(_.bind(null, obj));
    }
    else {
        // console.log("NAMES " + Object.getOwnPropertyNames(obj));
        Object.getOwnPropertyNames(obj).forEach(_.bind(null, obj, null));
    }
}

function packObject(obj) {
    packObject_(obj);

    if (!Array.isArray(obj)) {
        packObject_mod_(pack_getProtoName_(obj), obj);
    }
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

var UnpackFactoryHash_ = {
      "__NaN":  function()  { return NaN; }
    , "__Inf":  function()  { return Infinity; }
    , "__-Inf": function()  { return -Infinity; }
    , "Date":   function(o) { return new Date(o.d); }
    , "RegExp": function(o) { return new RegExp(o.r, o.f); }
};

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function unpack_(v) {
    var P, F, T, O;

    if ((P = v["#"])) {
        // console.log("UNPACK # " + P);

        if ((F = UnpackFactoryHash_[P])) {
            // console.log("UNPACK special " + P);
            /* jshint -W064 */
            return F(v);  /* jshint +W064 */
        }

        /* jshint -W061 */
        T = eval("typeof this['" + P + "'];");

        if (T === 'function') {
            T = eval("typeof this['" + P + "'].prototype;");

            if (T === 'object') {
                O = Object.create(eval("this['" + P + "'].prototype;"));
                delete v["#"];
                // console.log("UNPACK proto " + P);
                return Object.assign(O, v);
            }
        }
        /* jshint +W061 */
    }

    return false;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function unpack(n, v) {
    var v2;
    /* jshint -W040 */
    return (typeof v === 'object' && v)
        ? ((v2 = unpack_.call(this, v)) === false) ? v : v2
        : v;
    /* jshint +W040 */
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function unpackObject_(obj, hash) {
    function _(dummy, n) {
        var v;

        if (typeof obj[n] === 'object') {
            if ((v = obj[n])) {
                unpackObject_(v, hash);

                if ((v = unpack_.call(hash, v)) !== false) {
                    obj[n] = v;
                }
            }
        }
    }
    
    if (Array.isArray(obj)) {
        // console.log("UNPACK ARRAY #" + obj.length);
        obj.forEach(_.bind(null));
    }
    else {
        // console.log("UNPACK NAMES " + Object.getOwnPropertyNames(obj));
        Object.getOwnPropertyNames(obj).forEach(_.bind(null, null));
    }
}

function unpackObject(obj, hash) {
    if (typeof hash !== 'object' || !hash) {
        throw "bad 'hash' argument. Has type " +
              (typeof hash) + ", but must be object!";
    }

    unpackObject_(obj, hash);
    
    return Array.isArray(obj)
        ? obj
        : unpack_.call(hash, obj) || obj;
}

//==============================================================================
// Do the export stuff 

var jsonPrototype = {
      'pack':         pack
    , 'packObject':   packObject
    , 'unpack':       unpack
    , 'unpackObject': unpackObject
};

/* jshint -W069 */

if (typeof define === 'function' && define.amd) {
    // require.js
    define( function() { return jsonPrototype; } );
}
else if (typeof module === 'object' && module.exports) {
    // CommonJS
    module.exports = jsonPrototype;
}
else if (FlagJSM) {
    global['jsonPrototype'] = jsonPrototype;
    global.EXPORTED_SYMBOLS = [ 'jsonPrototype' ];
}
else {
    global['jsonPrototype'] = jsonPrototype;
}

//==============================================================================
} (this) );
//==============================================================================
// EOF
