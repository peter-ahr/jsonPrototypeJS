#! /bin/sh
grep '"version": ' package.json
IFS='" ,' set -- `grep '"version": ' package.json` && echo "version: ${4:+-${4}}.js"
IFS='" ,' set -- `grep '"version": ' package.json` && target="jsonPrototype-min${4:+-${4}}.js"
echo "Closure compile jsonPrototype.js - $target"
java -jar "${CLOSURE_JAR:-c:\ProgrxxamData\Google\Closure\compiler.jar}" \
    -W VERBOSE -O ADVANCED --language_in ECMASCRIPT5_STRICT \
    --externs commonJS.externs.js \
    jsonPrototype.js \
    --js_output_file "$target" \
    --create_source_map "$target".map
# EOF