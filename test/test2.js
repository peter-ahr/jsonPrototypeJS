//==============================================================================
// Test Prototype-in-Json Serialize / Deserialize Utility
// Sorry, this test has become somewhat chaotic ...
//==============================================================================
function test_(jsonPrototype) { 'use strict';

var dump_ = function() {}

if ((typeof window === 'object' || typeof window === 'function') &&
    typeof window.dump === 'function'                             )
{
    dump_ = function(msg) {
        var doc = window.document
          , aPre = window.document.getElementsByTagName('pre')
          , oPre = aPre.length ? aPre[aPre.length - 1] : null
          ;
        
        window.dump(msg);
        oPre && oPre.appendChild(doc.createTextNode(msg));

        for (var i = i, L = arguments.length; i < L; ++i) {
            window.dump(", " + arguments[i]);
            oPre && oPre.appendChild(doc.createTextNode(", " + arguments[i]));
        }
        
        window.dump("\n");
        oPre && oPre.appendChild(doc.createTextNode("\n"));
    }
}

var log = function(msg) {
    var Arguments = Array.prototype.slice.call(arguments);
    console.log.apply(console, Arguments);
    dump_.apply(null, Arguments);
}

// -----------------------------------------------------------------------------
// Baseclass

var BaseFlag = false;

function Base(v) { this.initBase(v); }

Base.prototype = {
      __PROTO__: "Base"
    , initBase: function(v) {
          this.baseValue = v;
          this.baseFlag = (BaseFlag = !BaseFlag);
      }
    , getBase: function() { return this.baseValue; }
    , baseValue: -1
    , baseFlag: false
    , _X: null
    , get X() { return this._X; }
    , set X(X_) { this._X = X_; }
}

// -----------------------------------------------------------------------------
// Derived class

function D(s, v) {
    this.dString = s;
    this.dReg = new RegExp(s);
    this.TS = new Date;
    this.initBase(v);
}

D.prototype = new Base;
D.prototype.getD = function() { return this.dString; }
D.prototype.dString = "";
D.prototype.dReg = null;
D.prototype.TS = -1;
D.prototype.__PROTO__ = "D";

var d = {
      d1: new D("d1", 111.222)
    , d2: new D("d2", 222.111)
    , b3: new Base(3)
    , sub: { b4: new Base(4) }
    , a: [
          new D("a", 1000)
        , new D("b", 2000)
        , new Base(9999)
    ]
}

d.d1.inf = Infinity;
d.d1.n0 = null;
d.d1.ndef = undefined;
d.d1.nan = NaN;
d.d1.X = "d.d1.X";

d.d2.inf_minus = -Infinity;
d.d2.obj = { s: "plain" };

d.a[2].X = "iks";

var Hash = { Base: Base, D: D };

//==============================================================================
// Do Test

Object.getPrototypeOf(/x/).__PROTO__ = "RegExp";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Direct JSON Pack

log("Direct JSON Pack");
var dJson = JSON.stringify(d, jsonPrototype.pack, 2);

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Indirect JSON Pack

log("Indirect JSON Pack");
jsonPrototype.packObject(d);
var dJson2 = JSON.stringify(d, null, 2);

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Ensure equal result

if (dJson !== dJson2) {
    log("JSON difference:");
    log("DIRECT: " + dJson);
    log("INDIRECT: " + dJson2);
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// 2nd attempt with Data being handled - implies unequal results.

log("Indirect JSON Unpack (to restore original)");
jsonPrototype.unpackObject(d, Hash);

log("Indirect JSON Pack (with Date handled)");
Date.prototype.__PROTO__ = "Date";
jsonPrototype.packObject(d);
dJson2 = JSON.stringify(d, null, 2);

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Unpack

function testUnpack_(flagDirect_, json_) {
    var O = { };

    try {
        if (flagDirect_) {
            O = JSON.parse(
                json_,
                jsonPrototype.unpack.bind(Hash));
        }
        else {
            O = jsonPrototype.unpackObject(JSON.parse(json_), Hash);
        }
    }
    catch (exc) {
        log("Exception: " + exc);
        throw exc;
    }

    log((flagDirect_ ? "\n" : "\nIN") + "DIRECT: O = " + O, O);

    log("typeof a[1].dReg/TS = " + (typeof O.a[1].dReg) +
          " / " + (typeof O.a[1].TS));

    log("Check a[1].dReg: Is " +
          ((O.a[1].dReg instanceof RegExp) ? "" : "NO ") + "RegExp");

    log("Check a[1].TS: Is " +
          ((O.a[1].TS instanceof Date) ? "" : "NO ") + "Date");

    log("d1//2 .getBase() .getD() .X = " +
          O.d1.getBase() + "/" + O.d1.getD() + "/" + O.d1.X +
          "//" + O.d2.getBase() + "/" + O.d2.getD() + "/" + O.d2.X);

    O.a[2].X = "ypsilon";

    log("b3.getBase()=" + O.b3.getBase() +
          ", sub.b4.getBase()=" + O.sub.b4.getBase() +
          ", a[2]: .getBase()=" + O.a[2].getBase() +
          ", .X[getter]=" + O.a[2].X);

    return O;
}

testUnpack_(true, dJson);
testUnpack_(false, dJson);

testUnpack_(true, dJson2);
testUnpack_(false, dJson2);

// -----------------------------------------------------------------------------
}
//==============================================================================

if (typeof define === 'function' && define['amd']) {
    require( [ "../jsonPrototype"], test_);
}
else if (typeof require === 'function') {
    test_(require("../jsonPrototype"));
}
else {
    test_(jsonPrototype);
}

//==============================================================================
// EOF
