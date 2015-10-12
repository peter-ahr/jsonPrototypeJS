# jsonPrototypeJS
Use JSON.stringify(), .parse() and retain selected JS prototypes of your objects.

This is achieved by either providing special replacer/reviver functions to JSON.stringify() and JSON.parse() or by packing the object _before_ the JSON serialization and unpacking the result _after_ deserialization. 

While inspired by [resurrectJS](https://github.com/skeeto/resurrect-js), this approach is fully compatible with JSON.serialize() and JSON.parse() and thus does not impose a proprietary JSON (de)serializer. It however uses some of resurrectJS' ideas.

Furthermore, you may even use **jsonPrototypeJS** to prepare your objects before sending them via API functions which *internally* use whatever JSON (de)serializer. This is especially useful in Firefox Addons and that is where the need for this little tool arised.

*Note: As in resurrectJS, the special number values Infinity, -Infinity and NaN are handled, too.*


## Synopsis

We assume 'myobject = new MyObject'. 'myobject' may contain some properties of 'class' MySubClass somewhere in the object tree.

**Direct Serialization**  

    json = JSON.stringify(myobject, jsonPrototype.pack);  

**Direct Deserialization**

    constructorsHash = { MyObject: MyObject, MySubClass: MySubClass };
    myobject = JSON.parse(json, jsonPrototype.unpack.bind(constructorsHash));

**Indirect Serialization**

    jsonPrototype.packObject(myobject);
    json = JSON.stringify(myobject) /*could be any other JSON serializer*/;

**Indirect Deserialization**

    constructorsHash = { MyObject: MyObject, MySubClass: MySubClass };  
    myobject = JSON.parse(json) /*could be any other JSON deserializer*/;
    jsonPrototype.unpackObject(myobject, constructorsHash);

## Prepare Your Code

Simply add a property named **\_\_PROTO\_\_** to the prototype of every object you have to (de)serialize.

    MyClass.prototype.__PROTO__ = 'MyClass';
    
Your objects may contain arbitrary objects or arrays with or without the \_\_PROTO\_\_ property. jsonPrototypeJS will not look into objects which have a prototype other than Object.prototype. We might otherwise recurse into the DOM or into other 3rd party structures. Recursion happens only for plain objects, plain arrays or objects with prototype.\_\_PROTO\_\_.

If you'll (de)serialize Date and RegExp objects, you'll also have to add the **\_\_PROTO\_\_** property to their prototype(s).

    Date.prototype.__PROTO__ = 'Date';
    RegExp.prototype.__PROTO__ = 'RegExp';
    
Finally, you'll have to provide the constructors in a hash object indexed by name  on the deserialization side and pass this to the unpack function(s):

    constructorsHash = { MyObject: MyObject, MySubClass: MySubClass };  
    
    // Direct deserialization
    myobject = JSON.parse(json, jsonPrototype.unpack.bind(constructorsHash));
    
    // Indirect deserialization
    myobject = JSON.parse(json);
    jsonPrototype.unpackObject(myobject, constructorsHash);


*Note 1: Direct Deserialization cannot modify the outermost object, because the reviver function is not called for it. Either wrap your object into a plain object or use Indirect Deserialization!*

*Note 2: Direct Serialization cannot handle Date objects, because the reviver function gets called with the Date yet converted to a string using Date.toJSON(). You'll have to use Indirect Serialization!*

*Note 3: The property RegExp.lastIndex will get lost!*

## How it works

Each object with a prototype to retain receives a '#' property containing the constructor name (as in resurrectJS). During deserialization, the received plain object will be replaced by an object with the appropriate prototype which will be created using Object.create(constructorsHash[value_of_#_property]). This empty object with the now correct prototype is than populated with the properties from the received object. This is done using Object.assign().

*Note:  On browsers which do not have Object.assign() (i.e. IE), a polyfill is provided.*

The original values of special number values, Date objects and RegExp objects (which are normally ignored by JSON.stringify()/.parse()) are transferred and recreated using special objects carrying their properties.

## Platforms

* Major current Browsers
* node.js V0.4ff
* Rhino (tested with 1.7.6)
* IE 10ff
* IE9 may work, but I have none at hand
* IE8 does __not__ work (misses Object.create() and related static functions)

*Note: The code withstands the 'advanced' compression of the Google Closure compiler.*

## Sources

* GitHub (https://github.com/peter-ahr/jsonPrototypeJS)
* NPM: 'npm install json_prototype' (https://www.npmjs.com/package/json_prototype)
* bower: 'bower install json_prototype'

## Examples

 * [selftest sample](test/sample.html) / [JS Code](test/sample.js)
 * [anarchic sample](test/test2.html) / [JS Code](test/test2.js)
