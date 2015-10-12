//==============================================================================
// Simple nodejs usage description.
//==============================================================================

// Define the prototypes to retain ---------------------------------------------

function Base(ts_) { this.ts = ts_; };

Base.prototype = {
      __PROTO__: 'Base' /* indicator */
    , ts: null
    , f: function() {
          return "ts=" + this.ts.toLocaleString();
      }
}

function Derived(s) {
    Base.call(this, 0);
    this.s = s;
    this.i = Infinity;
    this.j = -Infinity;
    this.x = NaN;
    this.re = new RegExp(s, 'gim');
};

Derived.prototype = new Base;
Derived.prototype.__PROTO__ = 'Derived'; /* indicator */
Derived.prototype.g = function() { return "s=" + this.s; };
Derived.prototype.h = function() { return this.f() + "," + this.g(); };

function Transfer(id_) {
    this.id = id_;
    this.b = new Base(new Date);
    this.sub = {
          d1: new Derived("d1")
        , d2: new Derived("d2")
    };
    this.a = [ new Derived("da[0]")
             , new Base(123456789)
             , new Derived("da[2]")
             , new Base(987654321)
    ];
}

Transfer.prototype = {
      __PROTO__: 'Transfer'
    , id: -1
    , getId: function() { return this.id; }
};

Transfer.prototype.__PROTO__ = 'Transfer';

var sent = new Transfer(123);

// Indicators for Date+RegExp encoding.
Date.prototype.__PROTO__ = 'Date';
RegExp.prototype.__PROTO__ = 'RegExp';

//==============================================================================
// nodejs load

if (typeof jsonPrototype !== 'object') {
    var jsonPrototype = require('../jsonPrototype');
}

//==============================================================================
// Output to console and/or browser.

var log, show_ = function() { }

if (typeof window === 'object' && typeof window.document === 'object') {
    show_ = function(msg) {
        var doc = window.document
          , aPre = doc.getElementsByTagName('pre')
          , oPre = aPre.length ? aPre[aPre.length - 1] : null
          ;
        oPre && oPre.appendChild(doc.createTextNode(msg + "\n"));
    }
}

if (typeof console === 'object') {
    log = function(msg, good) {
        if (typeof good !== 'boolean') {
            console.log(msg);
            show_(msg);
            return;
        }
        
        if (good) {
            msg += ": OK";
            console.log(msg);
            show_(msg);
            return true;
        }

        msg += ": FAIL";
        show_(msg);
        console.error(msg);
        return false;
    }
}
else {  // Rhino
    log = function(msg, good) {
        msg += (typeof good === 'boolean'
                    ? ": " + (good ? "OK" : "FAIL") : "");
        print(msg);
        show_(msg);
        return good;
    }
}

// -----------------------------------------------------------------------------
// Checks

function check(sent, flagDate_, received, flagOuter_) {
    var r, good = true;

    if (flagOuter_) {
        r = (received.getId() === sent.getId());
        log("CHECK getId(): " + received.getId(), r);
    }
    else {
        r = (received.id === sent.getId());
        log("CHECK sent.getId():" + sent.getId() +
            " == received.id" + received.id, r);
    }

    if (flagDate_) {
        r = (received.b.ts.toLocaleString() === sent.b.ts.toLocaleString());
        log("CHECK Date: R/S " +
            (typeof received.b.ts) + " " + received.b.ts +
            " / " + (typeof sent.b.ts) + "" + sent.b.ts, r);
        good = good && r;
    }
    else {
        r = ((new Date(received.b.ts)).valueOf() === sent.b.ts.valueOf());
        log("CHECK Date string: " + received.b.ts, r);
        good = good && r;
    }

    r = (received.sub.d1.re.source     === sent.sub.d1.re.source   &&
         received.sub.d1.re.toString() === sent.sub.d1.re.toString());
    log("CHECK RegExp: " + received.sub.d1.re, r);

    if (flagDate_) {
        r = (received.b.f() === sent.b.f());
        log("CHECK b.f(): " + received.b.f(), r);
    }

    r = (received.sub.d2.h() === sent.sub.d2.h());
    log("CHECK sub.d2.h(): " + received.sub.d2.h(), r);

    // Note: === will not do until sent has been unpacked.
    r = (received.sub.d1.i == sent.sub.d1.i);
    log("CHECK sub.d1 Infinity: " + received.sub.d1.i, r);

    // Note: === will not do until sent has been unpacked.
    r = (received.sub.d1.j == sent.sub.d1.j);
    log("CHECK sub.d1 -Infinity: " + received.sub.d1.j, r);

    r = (isNaN(received.sub.d1.x) === isNaN(sent.sub.d1.x));
    log("CHECK sub.d1 NaN: " + received.sub.d1.x, r);
    
    r = (received.a[2].h() === sent.a[2].h());
    log("CHECK sub.a[2].h(): " + received.a[2].h(), r);

    return good;
}

//==============================================================================
// Samples and Tests

var constructorsHash = { Base: Base, Derived: Derived, Transfer: Transfer };

// -----------------------------------------------------------------------------
// Direct Serialization

var jsonDirect = JSON.stringify(sent, jsonPrototype.pack);
log("jsonDirect = " + jsonDirect);

log("sent");
log(sent);

// Deserialization

var received = JSON.parse(
    jsonDirect,
    jsonPrototype.unpack.bind(constructorsHash)
);

log("direct receive");
log(received);

var r, good = true;
r = check(sent,     false /*direct serialization cannot handle Date*/,
          received, false /*direct deserialization cannot handle outer*/);
good = good && r;

// -----------------------------------------------------------------------------
// Indirect Serialization

jsonPrototype.packObject(sent);
// Caution! Object 'sent' has been altered!
var jsonIndirect = JSON.stringify(sent);
log("jsonIndirect = " + jsonIndirect);

// Restore sent object back to original state.
// jsonPrototype.unpackObject(sent, constructorsHash);

// Deserialization

received = JSON.parse(jsonIndirect);
received = jsonPrototype.unpackObject(received, constructorsHash);

log("indirect receive");
log(received);

r = check(sent,     true /*indirect serialization handles Date*/,
          received, true /*indirect deserialization handles outer*/);
good = good && r;

// -----------------------------------------------------------------------------
// Indirect Deserialization from Direct Serialization

received = JSON.parse(jsonDirect);
received = jsonPrototype.unpackObject(received, constructorsHash);

r = check(sent,     false /*direct serialization cannot handle Date*/,
          received, true  /*indirect deserialization handles outer*/);
good = good && r;

// -----------------------------------------------------------------------------
// Direct Deserialization from Indirect Serialization

var received = JSON.parse(
    jsonIndirect, jsonPrototype.unpack.bind(constructorsHash));

r = check(sent,     true  /*indirect serialization handles Date*/,
          received, false /*direct deserialization cannot handle outer*/);
good = good && r;

log("Test Result", good);

//==============================================================================
// EOF