# jsonPrototypeJS
Use JSON from Javascript while retaining selected prototypes of your objects.

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
    
Your objects may contain arbitrary objects or arrays with or without the \_\_PROTO\_\_ property. jsonPrototypeJS will not look into objects which have a prototype other than Object.prototype. We might otherwise recurse into the DOM or into other 3rd party structures. Recursion happens only as long plain objects, plain arrays or objects with prototype.\_\_PROTO\_\_ are involved.

If you'll (de)serialize Date and RegExp objects, you'll have to add the **\_\_PROTO\_\_** property to their prototype, too.

    Date.prototype.__PROTO__ = 'Date';
    RegExp.prototype.__PROTO__ = 'RegExp';
    
Finally, you'll have to provide the constructors in a hash object indexed by name  on the deserialization side and pass this to the unpack function:

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

Each object with a prototype to retain receives a '#' property containing the constructor name (as in resurrectJS). During deserialization, the received plain object will be replaced by an object with prototype which will be created using Object.create(constructorsHash[value_of_#_property]). This empty object with the now correct prototype is than populated with the properties from the received object. This is done using Object.assign().

*Note:  On browsers which do not have Object.assign() (i.e. IE), a polyfill is provided.*

The original values of special number values, Date objects and RegExp objects are transferred and recreated using special objects carrying their properties.

*Note: On Rhino there is an issue with the recreation of RegExp objects.*

## Examples

 * [selftest sample](test/sample.html) / [JS Code](test/sample.js)
 * [anarchic sample](test/test2.html) / [JS Code](test/test2.js)
 