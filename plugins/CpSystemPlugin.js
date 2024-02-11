function CpSystemPlugin() {
  "use strict";

  return {
    getModuleName: function() { return "CpSystemPlugin"; },
    interpreterProxy: null,
    primHandler: null,

    setInterpreter: function(anInterpreter) {
      this.setupGlobalObject();
      this.interpreterProxy = anInterpreter;
      this.primHandler = this.interpreterProxy.vm.primHandler;
      this.characterClass = this.interpreterProxy.vm.globalNamed("Character");
      this.symbolClass = this.interpreterProxy.vm.globalNamed("Symbol");
      this.symbolTable = Object.create(null);
      this.stringClass = this.interpreterProxy.vm.globalNamed("String");
      this.byteStringClass = this.interpreterProxy.vm.globalNamed("ByteString");
      this.wideStringClass = this.interpreterProxy.vm.globalNamed("WideString");
      this.arrayClass = this.interpreterProxy.vm.globalNamed("Array");
      this.byteArrayClass = this.interpreterProxy.vm.globalNamed("ByteArray");
      this.wordArrayClass = this.interpreterProxy.vm.globalNamed("WordArray");
      this.associationClass = this.interpreterProxy.vm.globalNamed("Association");
      this.dictionaryClass = this.interpreterProxy.vm.globalNamed("Dictionary");
      this.blockClosureClass = this.interpreterProxy.vm.globalNamed("BlockClosure");
      this.globalProxyClasses = {};
      this.updateStringSupport();
      this.updateMakeStObject();
      this.updateMakeStArray();
      return true;
    },

    // Helper method to create a global scope (working similarly in Browser and in NodeJS)
    setupGlobalObject: function() {
      // For Browser environment create a global object named 'global'
      if(typeof window !== 'undefined' && !window.global) {
        window.global = window;
      }

      // Create global function to let objects 'identify' themselves (used for Proxy-ing JavaScript objects).
      // For undefined or null, answer the global object itself.
      global.identity = function(x) { return x === undefined || x === null ? global : x; };
    },

    // Helper method for running a process uninterrupted
    runUninterrupted: function(process, endTime) {
      if(!process || process.isNil) {
        return;
      }

      // Make specified process the active process (disregard process priorities)
      var primHandler = this.primHandler;
      var scheduler = primHandler.getScheduler();
      primHandler.putToSleep(scheduler.pointers[Squeak.ProcSched_activeProcess]);
      primHandler.transferTo(process);

      // Run the specified process until the process goes
      // to sleep again or the end time is reached.
      // This 'runner' assumes the process runs 'quickly'.
      var vm = primHandler.vm;
      do {
        if(vm.method.compiled) {
          vm.method.compiled(vm);
        } else {
          vm.interpretOne();
        }
      } while(process === scheduler.pointers[Squeak.ProcSched_activeProcess] && (endTime === undefined || performance.now() < endTime));

      // If process did not finish in time, put it to sleep
      if(process === scheduler.pointers[Squeak.ProcSched_activeProcess]) {
//console.warn("Process put to sleep because it did not finish in time: " + (process === this.transitionProcess ? "transition" : process === this.eventHandlerProcess ? "process" : process === this.callbackEvaluatorProcess ? "callback evaluator" : "unknown"));
        primHandler.putToSleep(process);
      }
    },

    // Helper methods for creating or converting Smalltalk and JavaScript objects
    updateStringSupport: function() {
      // Add #asString behavior to String classes (converting from Smalltalk to JavaScript Strings)
      this.stringClass.classInstProto().prototype.asString = function() {
        var charChunks = [];
        var src = this.bytes || this.words || [];
        for(var i = 0; i < src.length;) {
          charChunks.push(String.fromCodePoint.apply(null, src.subarray(i, i += 16348)));
        }
        return charChunks.join('');
      };

      // Replace makeStString behavior to support WideStrings
      var thisHandle = this;
      Squeak.Primitives.prototype.makeStString = function(string) {
        var isWideString = false;
        // Will make surrogates pairs into single elements (which then get converted into codepoints)
        var src = Array.from(string).map(function(char) {
          var charValue = char.codePointAt(0);
          if(charValue >= 256) {
            isWideString = true;
          }
          return charValue;
        });
        var newString = thisHandle.interpreterProxy.vm.instantiateClass(isWideString ? thisHandle.wideStringClass : thisHandle.byteStringClass, src.length);
        var dst = newString.bytes || newString.words || [];
        for(var i = 0; i < src.length; i++) {
          dst[i] = src[i];
        }
        return newString;
      };
    },

    updateMakeStObject: function() {
      var thisHandle = this;
      this.primHandler.makeStObject = function(obj, proxyClass, seen) {
        // Check for special 'primitive' objects (no need to use 'seen' here)
        if(obj === undefined || obj === null) return this.vm.nilObj;
        if(obj === true) return this.vm.trueObj;
        if(obj === false) return this.vm.falseObj;
        if(obj.sqClass) return obj;
        if(obj.constructor === Number) {
          if(obj === (obj|0)) {
            return this.makeLargeIfNeeded(obj);
          } else {
            return this.makeFloat(obj);
          }
        }

        // Check if object is already known
        seen = seen || [];
        var stObj = thisHandle.findSeenObj(seen, obj);
        if(stObj !== undefined) {
          return stObj;
        }

        // String like objects
        if(obj.substring) {
          return thisHandle.addSeenObj(seen, obj, this.makeStString(obj));
        }

        // Array like objects
        if(obj.slice && obj.length !== undefined) {
          if(obj.BYTES_PER_ELEMENT) {
            // TypedArray
            switch(obj.BYTES_PER_ELEMENT) {
              case 1:
                return thisHandle.addSeenObj(seen, obj, this.makeStByteArray(obj));
              case 2:
              case 4:
                return thisHandle.addSeenObj(seen, obj, thisHandle.makeStWordArray(obj));
              default:
                console.error("No support for TypedArrays with bytes per element: " + obj.BYTES_PER_ELEMENT, obj);
                return this.vm.nilObj;
            }
          } else {
            // Regular Array
            return thisHandle.addSeenObj(seen, obj, this.makeStArray(obj, proxyClass, seen));
          }
        }

        // Dictionary like objects
        if((obj.constructor === Object && !thisHandle.hasFunctions(obj)) || (obj.constructor === undefined && typeof obj === "object")) {
          return thisHandle.makeStDictionary(obj, seen);
        }

        // Wrap in JS proxy instance if so requested or when global proxy class is registered
        if(!proxyClass) {
          proxyClass = thisHandle.getProxyClassFor(obj);
        }
        if(proxyClass) {
          var stObj = this.vm.instantiateClass(proxyClass, 0);
          stObj.jsObj = obj;
          return thisHandle.addSeenObj(seen, obj, stObj);
        }

        // Not possible to create a similar Smalltalk object
        console.error("Can't create Smalltalk object for the following object (answering nil)", obj);
        return this.vm.nilObj;
      };
    },
    updateMakeStArray: function() {
      var thisHandle = this;
        this.primHandler.makeStArray = function(obj, proxyClass, seen) {
        // Check if obj is already known
        seen = seen || [];
        var stObj = thisHandle.findSeenObj(seen, obj);
        if(stObj !== undefined) {
          return stObj;
        }

        // Create Array and add it to seen collection directly, to allow internal references to be mapped correctly
        var array = this.vm.instantiateClass(thisHandle.arrayClass, obj.length);
        seen.push({ jsObj: obj, stObj: array });
        for(var i = 0; i < obj.length; i++) {
          array.pointers[i] = this.makeStObject(obj[i], proxyClass, seen);
        }
        return array;
      };
    },
    makeStWordArray: function(obj) {
        var array = this.interpreterProxy.vm.instantiateClass(this.wordArrayClass, obj.length);
        for(var i = 0; i < obj.length; i++) {
            // Words are 32-bit values
            array.words[i] = obj[i] & 0xffffffff;
        }
        return array;
    },
    makeStAssociation: function(key, value, seen) {
      // Check if key and/or value is already known (as JavaScript object)
      seen = seen || [];
      if(key && !key.sqClass) {
        var stObj = this.findSeenObj(seen, key);
        if(stObj !== undefined) {
          key = stObj;
        }
      }
      if(value && !value.sqClass) {
        var stObj = this.findSeenObj(seen, value);
        if(stObj !== undefined) {
          value = stObj;
        }
      }

      var association = this.interpreterProxy.vm.instantiateClass(this.associationClass, 0);
      // Assume instVars are #key and #value (in that order)
      association.pointers[0] = this.primHandler.makeStObject(key, undefined, seen);
      association.pointers[1] = this.primHandler.makeStObject(value, undefined, seen);
      return association;
    },
    makeStDictionary: function(obj, seen) {
      // Check if obj is already known
      seen = seen || [];
      var stObj = this.findSeenObj(seen, obj);
      if(stObj !== undefined) {
        return stObj;
      }

      // Create Dictionary and add it to seen collection directly, to allow internal references to be mapped correctly
      var dictionary = this.interpreterProxy.vm.instantiateClass(this.dictionaryClass, 0);
      seen.push({ jsObj: obj, stObj: dictionary });

      // Add key value pairs to Dictionary
      var keys = Object.keys(obj);
      var thisHandle = this;
      var associations = keys.map(function(key) {
        return thisHandle.makeStAssociation(key, obj[key], seen);
      });

      // Assume instVars are #tally and #array (in that order)
      dictionary.pointers[0] = associations.length;
      dictionary.pointers[1] = this.primHandler.makeStArray(associations, undefined, seen);
      return dictionary;
    },
    findSeenObj: function(seen, jsObj) {
      var reference = seen.find(function(ref) {
        return ref.jsObj === jsObj;
      });
      if(reference === undefined) {
          return undefined;
      }
      return reference.stObj;
    },
    addSeenObj: function(seen, jsObj, stObj) {
      seen.push({ jsObj: jsObj, stObj: stObj });
      return stObj;
    },
    hasFunctions: function(obj) {
      // Answer whether the specified JavaScript object has properties which are a function
      return Object.keys(obj).some(function(each) {
        return each && each.apply;
      });
    },

    // Helper methods for answering (and setting the stack correctly)
    answer: function(argCount, value) {
      // Pop arguments and receiver and push result
      this.interpreterProxy.popthenPush(argCount + 1, this.primHandler.makeStObject(value));
      return true;
    },
    answerSelf: function(argCount) {
      // Leave self on stack and only pop arguments
      this.interpreterProxy.pop(argCount);
      return true;
    },

    // Helper methods for converting from Smalltalk object to JavaScript object and vice versa
    asJavaScriptObject: function(obj) {
      if(obj.isNil) {
        return null;
      } else if(obj.isTrue) {
        return true;
      } else if(obj.isFalse) {
        return false;
      } else if(typeof obj === "number") {
        return obj;
      } else if(obj.isFloat) {
        return obj.float;
      } else if(obj.sqClass === this.arrayClass) {
        return this.arrayAsJavaScriptObject(obj);
      } else if(obj.sqClass === this.dictionaryClass) {
        return this.dictionaryAsJavaScriptObject(obj);
      } else if(obj.domElement) {
        return obj.domElement;
      } else if(this.isBlockClosureClass(obj.sqClass)) {
        return this.blockAsJavaScriptObject(obj);
      } else if(obj.jsObj) {
        return obj.jsObj;
      }

      // Assume a String is used otherwise
      return obj.asString();
    },
    arrayAsJavaScriptObject: function(obj) {
      var thisHandle = this;
      return (obj.pointers || []).map(function(each) { return thisHandle.asJavaScriptObject(each); });
    },
    dictionaryAsJavaScriptObject: function(obj) {
      var thisHandle = this;
      var associations = obj.pointers.find(function(pointer) {
        return pointer && pointer.sqClass === thisHandle.arrayClass;
      });
      if(!associations || !associations.pointers || !associations.pointers.forEach) throw Error("Dictionary has unexpected structure");
      var result = {};
      associations.pointers.forEach(function(assoc) {
        if(!assoc.isNil) {
          // Assume instVars are #key and #value (in that order)
          result[thisHandle.asJavaScriptObject(assoc.pointers[0])] = thisHandle.asJavaScriptObject(assoc.pointers[1]);
        }
      });
      return result;
    },
    blockAsJavaScriptObject: function(obj) {
      var thisHandle = this;
      var callback = { block: obj };
      return function() {
        var funcArgs = Array.from(arguments);
        var blockArgs = funcArgs.map(function(each) {
          return thisHandle.primHandler.makeStObject(each);
        });
        callback.arguments = blockArgs;
        thisHandle.callbackEvaluatorCurrentCallback = callback;
        var callbackEvaluatorProcess = thisHandle.callbackEvaluatorProcess;
        if(callbackEvaluatorProcess !== undefined) {
          thisHandle.runUninterrupted(callbackEvaluatorProcess);
        } else {
          thisHandle.interpreterProxy.vm.warnOnce("No callback evaluator process installed. Blocks cannot be used for callbacks without it. See CpCallbackEvaluator");
        }
        thisHandle.callbackEvaluatorCurrentCallback = undefined;
        return callback.result;
      };
    },
    isBlockClosureClass: function(sqClass) {
      while(sqClass && !sqClass.isNil) {
        if(sqClass === this.blockClosureClass) {
          return true;
        }
        sqClass = sqClass.superclass();
      }
      return false;
    },

    // Object instance methods
    "primitiveObjectCrTrace:": function(argCount) {
      if(argCount !== 1) return false;
      var message = this.interpreterProxy.stackValue(0).asString();
      console.log((new Date()).toISOString() + " " + message);
      return this.answerSelf(argCount);
    },
    "primitiveObjectCrWarn:": function(argCount) {
      if(argCount !== 1) return false;
      var message = this.interpreterProxy.stackValue(0).asString();
      console.warn((new Date()).toISOString() + " " + message);
      return this.answerSelf(argCount);
    },
    "primitiveObjectCrError:": function(argCount) {
      if(argCount !== 1) return false;
      var message = this.interpreterProxy.stackValue(0).asString();
      console.error((new Date()).toISOString() + " " + message);
      return this.answerSelf(argCount);
    },

    // Symbol class methods
    symbolFromString: function(string) {
      var registeredSymbol = this.symbolTable[string];
      if(registeredSymbol !== undefined) {
        return registeredSymbol;
      }

      // Create new Symbol
      var newSymbol = this.interpreterProxy.vm.instantiateClass(this.symbolClass, string.length);
      // Assume ByteSymbols only
      for(var i = 0; i < string.length; i++) {
        newSymbol.bytes[i] = string.charCodeAt(i) & 0xFF;
      }
      this.symbolTable[string] = newSymbol;
      return newSymbol;
    },
    "primitiveSymbolRegister:": function(argCount) {
      if(argCount !== 1) return false;
      var symbol = this.interpreterProxy.stackValue(0);
      var symbolString = symbol.asString();
      if(this.symbolTable[symbolString]) { throw Error("Registered non-unique Symbol: " + symbolString); }
      this.symbolTable[symbolString] = symbol;
      return this.answerSelf(argCount);
    },
    "primitiveSymbolFromString:": function(argCount) {
      if(argCount !== 1) return false;
      var string = this.interpreterProxy.stackValue(0).asString();
      return this.answer(argCount, this.symbolFromString(string));
    },

    // Symbol instance methods
    "primitiveSymbolEquals:": function(argCount) {
      if(argCount !== 1) return false;
      var otherObject = this.interpreterProxy.stackValue(0);
      var receiver = this.interpreterProxy.stackValue(argCount);
      var result = otherObject === receiver;
      if(!result) {
        var src = receiver.bytes || receiver.words || [];
        var dst = otherObject.bytes || otherObject.words || [];
        if(src.length === dst.length) {
          var i = 0;
          result = true;	// Assume receiver and argument are equal for now
          while(i < src.length && result) {
            if(src[i] !== dst[i]) {
              result = false;	// A Character is different, so not equal (stop)
            } else {
              i++;
            }
          }
        }
      }
      return this.answer(argCount, result);
    },
    "primitiveSymbolIsLiteralSymbol": function(argCount) {
      if(argCount !== 0) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var src = receiver.bytes || receiver.words || [];
      var i = 1;
      var result = src.length > 0;
      if(result) {
        var isLetter = function(c) { return (c >= 65 && c <= 90) || (c >= 97 && c <= 122); };
        var isDigit = function(c) { return c >= 48 && c <= 57; };
        var isBinary = function(c) { return [ 33, 37, 38, 42, 43, 44, 45, 47, 60, 61, 62, 63, 64, 92, 96, 124, 215, 247 ].indexOf(c) >= 0 || (c >= 126 && c <= 191 && [ 170, 181, 186 ].indexOf(c) < 0); };
        var isColon = function(c) { return c === 58; };
        var check = isLetter(src[0]) ? function(c) { return isLetter(c) || isDigit(c) || isColon(c); } :
                    isBinary(src[0]) ? function(c) { return isBinary(c); } :
                    null;
        result = check !== null;
        while(i < src.length && result) {
          var asciiValue = src[i];
          result = check(asciiValue);
          i++;
        }
      }
      return this.answer(argCount, result);
    },

    // ByteArray instance methods
    "primitiveByteArrayAsString": function(argCount) {
      if(argCount !== 0) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      return this.answer(argCount, receiver.asString());
    },

    // Number instance methods
    "primitiveNumberRaisedTo:": function(argCount) {
      if(argCount !== 1) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var exp = this.interpreterProxy.stackValue(0);
      var base = null;
      if(receiver.isFloat) {
        base = receiver.float;
      } else if(typeof receiver === "number") {
        base = receiver;
      }
      if(base === null) return false;
      return this.answer(argCount, Math.pow(base, exp));
    },
    "primitiveNumberPrintString": function(argCount) {
      if(argCount !== 0) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var value = null;
      if(receiver.isFloat) {
        value = receiver.float;
      } else if(typeof receiver === "number") {
        value = receiver;
      }
      if(value === null) return false;
      return this.answer(argCount, value.toString());
    },
    "primitiveNumberPrintStringBase:": function(argCount) {
      if(argCount !== 1) return false;
      var base = this.interpreterProxy.stackValue(0);
      if(typeof base !== "number" || base < 2 || base > 36) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var value = null;
      if(receiver.isFloat) {
        // Only support for floats with base 10
        if(base === 10) {
          // JavaScript already has same String representation for NaN, Infinity and -Infinity
          // No need to distinguish these here
          value = receiver.float.toString();
        }
      } else if(typeof receiver === "number") {
        value = receiver.toString(base);
      }
      if(value === null) return false;
      return this.answer(argCount, (base !== 10 ? base + "r" + value : value));
    },

    // Integer instance methods
    "primitiveIntegerAtRandom": function(argCount) {
      if(argCount !== 0) return false;
      var upperBound = this.interpreterProxy.stackValue(argCount);
      if(typeof upperBound !== "number") return false;
      return this.answer(argCount, Math.floor(Math.random() * (upperBound - 1) + 1));
    },

    // String class methods
    "primitiveStringFromWordArray:": function(argCount) {
      if(argCount !== 1) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var wordArray = this.interpreterProxy.stackValue(0);
      var src = wordArray.words || [];
      var newString = this.interpreterProxy.vm.instantiateClass(receiver, src.length);
      var dst = newString.bytes || newString.words;
      for(var i = 0; i < src.length; i++) {
        dst[i] = src[i];
      }
      return this.answer(argCount, newString);
    },

    // String instance methods
    skipDelimiters: function(src, delimiters, from) {
      for(;from < src.length; from++) {
        if(delimiters.indexOf(src[from]) < 0) {
          return from;
        }
      }
      return src.length + 1;
    },
    findDelimiters: function(src, delimiters, from) {
      for(;from < src.length; from++) {
        if(delimiters.indexOf(src[from]) >= 0) {
          return from;
        }
      }
      return src.length + 1;
    },
    createSubstring: function(src, start, end) {
      var substring = src.slice(start, end);
      var isWideString = substring.some(function(charValue) { return charValue >= 256; });
      var newString = this.interpreterProxy.vm.instantiateClass(isWideString ? this.wideStringClass : this.byteStringClass, substring.length);
      var dst = newString.bytes || newString.words || [];
      for(var i = 0; i < substring.length; i++) {
        dst[i] = substring[i];
      }
      return newString;
    },
    "primitiveStringConcatenate:": function(argCount) {
      if(argCount !== 1) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var otherString = this.interpreterProxy.stackValue(0);
      var first = receiver.bytes || receiver.words || [];
      var second = otherString.bytes || otherString.words || [];
      var isWideString = receiver.words || otherString.words || false;
      var newString = this.interpreterProxy.vm.instantiateClass(isWideString ? this.wideStringClass : this.byteStringClass, first.length + second.length);
      var dst = newString.bytes || newString.words;
      var i = 0;
      for(; i < first.length; i++) {
        dst[i] = first[i];
      }
      for(var j = 0; j < second.length; j++, i++) {
        dst[i] = second[j];
      }
      return this.answer(argCount, newString);
    },
    "primitiveStringAsciiCompare:": function(argCount) {
      if(argCount !== 1) return false;
      var otherString = this.interpreterProxy.stackValue(0);
      var receiver = this.interpreterProxy.stackValue(argCount);
      var src = receiver.bytes || receiver.words || [];
      var dst = otherString.bytes || otherString.words || [];
      var minLength = Math.min(src.length, dst.length);
      for(var i = 0; i < minLength; i++) {
        var cmp = src[i] - dst[i];
        if(cmp > 0) {
          return this.answer(argCount, 3);	// src comes after dst
        } else if(cmp < 0) {
          return this.answer(argCount, 1);	// src comes before dst
        }
      }
      if(src.length > minLength) {
        return this.answer(argCount, 3);	// src comes after dst (src is longer)
      } else if(dst.length > minLength) {
        return this.answer(argCount, 1);	// src comes before dst (src is shorter)
      }
      return this.answer(argCount, 2);		// src equals dst
    },
    "primitiveStringAsUppercase": function(argCount) {
      if(argCount !== 0) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var src = receiver.bytes || receiver.words || [];
      var uppercaseString = this.interpreterProxy.vm.instantiateClass(receiver.sqClass, src.length);
      var dst = receiver.bytes ? uppercaseString.bytes : uppercaseString.words;
      for(var i = 0; i < src.length; i++) {
        dst[i] = String.fromCodePoint(src[i]).toUpperCase().codePointAt(0);
      }
      return this.answer(argCount, uppercaseString);
    },
    "primitiveStringAsLowercase": function(argCount) {
      if(argCount !== 0) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var src = receiver.bytes || receiver.words || [];
      var lowercaseString = this.interpreterProxy.vm.instantiateClass(receiver.sqClass, src.length);
      var dst = receiver.bytes ? lowercaseString.bytes : lowercaseString.words;
      for(var i = 0; i < src.length; i++) {
        dst[i] = String.fromCodePoint(src[i]).toLowerCase().codePointAt(0);
      }
      return this.answer(argCount, lowercaseString);
    },
    "primitiveStringAsNumber": function(argCount) {
      if(argCount !== 0) return false;
      var numberString = this.interpreterProxy.stackValue(argCount).asString();
      var result = null;
      if(numberString === "NaN") {
        result = Number.NaN;
      } else if(numberString === "Infinity") {
        result = Number.POSITIVE_INFINITY;
      } else if(numberString === "-Infinity") {
        result = Number.NEGATIVE_INFINITY;
      } else {
        var numberMatch = numberString.match(/^(\d+r)?(-?\d+(?:\.\d+)?(?:e-?\d)?)$/);
        if(numberMatch) {
          if(numberMatch[1]) {
            // Currently only support for base/radix when using integers (not floats)
            var base = Number.parseInt(numberMatch[1]);
            if(base >= 2 && base <= 36 && numberMatch[2].indexOf(".") < 0 && numberMatch[2].indexOf("e") < 0) {
              result = Number.parseInt(numberMatch[2], base);
            }
          } else {
            result = +numberMatch[2];
          }
        }
      }
      if(result === null) return false;
      return this.answer(argCount, result);
    },
    "primitiveStringFindTokens:": function(argCount) {
      if(argCount !== 1) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var src = receiver.bytes || receiver.words || [];
      var delimitersString = this.interpreterProxy.stackValue(0);
      var delimiters = delimitersString.bytes || delimitersString.words || [];
      var result = [];
      var keyStop = 0;
      while(keyStop < src.length) {
        var keyStart = this.skipDelimiters(src, delimiters, keyStop);
        keyStop = this.findDelimiters(src, delimiters, keyStart);
        if(keyStart < keyStop) {
          result.push(this.createSubstring(src, keyStart, keyStop));
        }
      }
      return this.answer(argCount, result);
    },
    "primitiveStringIndexOf:": function(argCount) {
      if(argCount !== 1) return false;
      var character = this.interpreterProxy.stackValue(0);
      var string = this.interpreterProxy.stackValue(argCount).asString();
      return this.answer(argCount, character.sqClass === this.characterClass ? string.indexOf(String.fromCodePoint(character.hash)) + 1 : 0);
    },
    "primitiveStringIncludesSubstring:": function(argCount) {
      if(argCount !== 1) return false;
      var src = this.interpreterProxy.stackValue(argCount).asString();
      var substring = this.interpreterProxy.stackValue(0).asString();
      return this.answer(argCount, src.indexOf(substring) >= 0);
    },
    "primitiveStringHash": function(argCount) {
      if(argCount !== 0) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var src = receiver.bytes || receiver.words || [];
      var hash = 0x3400; // Initial value ByteString hash
      for(var i = 0; i < src.length; i++) {
        hash = hash + src[i];
        var low = hash & 0x3fff;
        hash = (0x260d * low + ((0x260d * Math.floor(hash / 0x4000) + (0x0065 * low) & 0x3fff) * 0x4000)) & 0xfffffff;
      }
      return this.answer(argCount, hash);
    },

    // WideString class methods
    "primitiveWideStringFrom:": function(argCount) {
      if(argCount !== 1) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var srcString = this.interpreterProxy.stackValue(0);
      var src = srcString.bytes || srcString.words || [];
      var newString = this.interpreterProxy.vm.instantiateClass(receiver, src.length);
      var dst = newString.words;
      for(var i = 0; i < src.length; i++) {
        dst[i] = src[i];
      }
      return this.answer(argCount, newString);
    },

    // JavaScriptObject class methods
    "primitiveJavaScriptObjectRegisterProxyClass:forClassName:": function(argCount) {
      if(argCount !== 2) return false;
      var proxyClass = this.interpreterProxy.stackValue(1);
      if(proxyClass.isNil) return false;
      var proxyClassName = this.interpreterProxy.stackValue(0).asString();
      if(!proxyClassName) return false;

      // Register Proxy Class
      this.globalProxyClasses[proxyClassName] = proxyClass;

      // Install special pass-through method on functions (needed by JavaScriptPromises)
      if(!Function.prototype.applyPassThrough) {
        Function.prototype.applyPassThrough = function(thisArg, args) {
          return this.apply(thisArg, args);
        };
      }
      return this.answerSelf(argCount);
    },
    getProxyClassFor: function(jsObj) {
      var jsClass = jsObj && jsObj.constructor;
      if(!jsClass) {
        return null;
      }

      var proxyClassNames = Object.keys(this.globalProxyClasses);
      if(proxyClassNames.length === 0) {
        return null;
      }
      var proxyClassName = undefined;
      while(jsClass) {

        // Find Proxy Class for the specified JavaScript object (only exact match)
        proxyClassName = proxyClassNames.find(function(name) {
          return global[name] === jsClass;
        });

        // Try the superclass
        if(proxyClassName) {
          jsClass = null;       // Stop iterating (we found Proxy Class)
        } else {
          jsClass = Object.getPrototypeOf(jsClass);
        }
      }

      // Fall back to the default Proxy Class (for "Object") if none is found
      // (this is for Objects which where created using Object.create(null)
      // or some native Objects which do not inherit from Object)
      if(!proxyClassName) {
        proxyClassName = "Object";
      }

      return this.globalProxyClasses[proxyClassName];
    },

    // JavaScriptObject instance methods
    "primitiveJavaScriptObjectApply:withArguments:resultAs:": function(argCount) {
      if(argCount !== 3) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var obj = receiver.jsObj;
      if(obj === undefined) return false;
      var selectorName = this.interpreterProxy.stackValue(2).asString();
      if(!selectorName) return false;

      // Handle special case for pass through, needed to support Promises
      // (which should not perform Smalltalk to JavaScript conversions
      // automatically, since it would 'undo' the work done in the
      // Smalltalk code if explicit conversions are applied).
      var args = obj.constructor === Function && selectorName === "applyPassThrough" ?
        [ null, this.interpreterProxy.stackValue(1).pointers[1].pointers.map(function(each) { return each; }) ]
        : this.asJavaScriptObject(this.interpreterProxy.stackValue(1)) || [];
      var proxyClass = this.interpreterProxy.stackValue(0);

      var result = undefined;
      try {

        // Fast path for function calls first, then use reflection mechanism
        var func = obj[selectorName];
        if(func && func.apply) {
          result = func.apply(obj, args);
        } else {

          // Try selector first, if not present check if a colon is present
          // and remove it and every character after it.
          // (E.g. setTimeout:duration: is translated into setTimeout)
          var selectorDescription = this.getSelectorNamed(obj, selectorName);
          if(!selectorDescription) {
            var colonIndex = selectorName.indexOf(":");
            if(colonIndex > 0) {
              selectorDescription = this.getSelectorNamed(obj, selectorName.slice(0, colonIndex));
            }
          }
          if(!selectorDescription) return false;

          // Get/set property, call function, or read/write (data) property (in that order)
          // A data property can have value 'undefined' so check for presence of 'writable' field
          // instead of checking for value to decide if this is a data property.
          if(selectorDescription.get && args.length === 0) {
            result = selectorDescription.get.apply(obj);
          } else if(selectorDescription.set && args.length === 1) {
            result = selectorDescription.set.apply(obj, args);
          } else if(selectorDescription.value && selectorDescription.value.constructor === Function) {
            result = selectorDescription.value.apply(obj, args);
          } else if(selectorDescription.writable !== undefined) {
            if(args.length === 0) {
              result = selectorDescription.value;
            } else if(args.length === 1 && selectorDescription.writable) {
              result = obj[selectorName] = args[0];
            }
          } else {
            // Do not understand
            return false;
          }
        }
      } catch(e) {
        console.error("Failed to perform apply:withArguments on proxied JavaScript object:", e, "Selector:", selectorName, "Arguments:", args, "Object:", obj);
      }

      // Proxy the result, if so requested
      if(result !== undefined && result !== null && !proxyClass.isNil) {
        var proxyInstance = this.interpreterProxy.vm.instantiateClass(proxyClass, 0);
        proxyInstance.jsObj = result;
        result = proxyInstance;
      }
      return this.answer(argCount, result);
    },
    "primitiveJavaScriptObjectGetSelectorNames": function(argCount) {
      if(argCount !== 0) return false;
      var obj = this.interpreterProxy.stackValue(argCount).jsObj;
      if(obj === undefined) return false;

      // Add only unique names
      var names = Object.create(null);
      while(obj) {
        var ownNames = Object.getOwnPropertyNames(obj);
        ownNames.forEach(function(name) {
          names[name] = true;
        });
        obj = Object.getPrototypeOf(obj);
      }
      return this.answer(argCount, Object.keys(names));
    },
    "primitiveJavaScriptObjectGetSelectorType:": function(argCount) {
      if(argCount !== 1) return false;
      var obj = this.interpreterProxy.stackValue(argCount).jsObj;
      if(obj === undefined) return false;
      var selectorName = this.interpreterProxy.stackValue(0).asString();
      if(!selectorName) return false;
      var selectorDescription = this.getSelectorNamed(obj, selectorName);
      if(!selectorDescription) {
        return this.answer(argCount, null);
      }

      // Check for selector using getter/setter or data property (that order).
      // A data property can have value 'undefined' so check for presence of
      // 'writable' field instead of checking for value to decide if this is
      // a data property.
      var type = undefined;
      if(selectorDescription.get) {
        if(selectorDescription.set) {
          type = "read-write-prop";
        } else {
          type = "read-prop";
        }
      } else if(selectorDescription.set) {
        type = "write-prop";
      } else if(selectorDescription.writable !== undefined) {
        if(selectorDescription.value && selectorDescription.value.constructor === Function) {
          type = "function";
        } else if(selectorDescription.writable) {
          type = "read-write-attr";
        } else {
          type = "read-attr";
        }
      } else {
        type = "unknown";
      }
      return this.answer(argCount, this.symbolFromString(type));
    },
    "primitiveJavaScriptObjectGetClassRefFrom:resultAs:": function(argCount) {
      if(argCount !== 2) return false;
      var obj = this.interpreterProxy.stackValue(argCount).jsObj;
      if(obj === undefined) return false;
      var selectorName = this.interpreterProxy.stackValue(1).asString();
      if(!selectorName) return false;
      var proxyClass = this.interpreterProxy.stackValue(0);
      if(proxyClass.isNil) return false;

      // Retrieve and validate a (constructor) function, representing a class reference
      var objClass = obj[selectorName];
      if(!objClass) return false;
      var proxyInstance = this.interpreterProxy.vm.instantiateClass(proxyClass, 0);
      proxyInstance.jsObj = objClass;
      return this.answer(argCount, proxyInstance);
    },
    getSelectorNamed: function(obj, selectorName) {
      var selectorDescription = undefined;
      while(obj && !selectorDescription) {
        selectorDescription = Object.getOwnPropertyDescriptor(obj, selectorName);
        if(!selectorDescription) {
          obj = Object.getPrototypeOf(obj);
        }
      }
      return selectorDescription;
    },

    // JavaScriptClass instance methods
    "primitiveJavaScriptClassNewInstanceWithArguments:resultAs:": function(argCount) {
      if(argCount !== 2) return false;
      var receiver = this.interpreterProxy.stackValue(argCount).jsObj;
      var jsClass = this.interpreterProxy.stackValue(argCount).jsObj;
      var args = this.asJavaScriptObject(this.interpreterProxy.stackValue(1)) || [];
      var proxyClass = this.interpreterProxy.stackValue(0);

      var instance = undefined;
      try {
        var jsInstance = Reflect.construct(jsClass, args);
        instance = this.interpreterProxy.vm.instantiateClass(proxyClass.isNil ? this.getProxyClassFor(jsInstance) : proxyClass, 0);
        instance.jsObj = jsInstance;
      } catch(e) {
        console.error("Failed to instantiate class " + jsClass);
      }
      return this.answer(argCount, instance);
    },

    // ClientEnvironment instance methods
    "primitiveEnvironmentVariableAt:": function(argCount) {
      if(argCount !== 1) return false;
      var variableName = this.interpreterProxy.stackValue(0).asString();
      if(!variableName) return false;
      var variableValue = global.sessionStorage.getItem(variableName);
      return this.answer(argCount, variableValue);
    },
    "primitiveEnvironmentVariableAt:put:": function(argCount) {
      if(argCount !== 2) return false;
      var variableName = this.interpreterProxy.stackValue(1).asString();
      if(!variableName) return false;
      var variableValue = this.interpreterProxy.stackValue(0).asString();
      if(!variableValue) return false;
      global.sessionStorage.setItem(variableName, variableValue);
      return this.answerSelf(argCount);
    },
    "primitiveEnvironmentVariableNames": function(argCount) {
      if(argCount !== 0) return false;
      var variableNames = new Array(global.sessionStorage.length);
      for(var i = 0; i < global.sessionStorage.length; i++) {
        variableNames[i] = global.sessionStorage.key(i);
      }
      return this.answer(argCount, variableNames);
    },
    "primitiveEnvironmentRemoveVariableAt:": function(argCount) {
      if(argCount !== 1) return false;
      var variableName = this.interpreterProxy.stackValue(0).asString();
      if(!variableName) return false;
      global.sessionStorage.removeItem(variableName);
      return this.answerSelf(argCount);
    },
    "primitiveEnvironmentPersistentVariableAt:": function(argCount) {
      if(argCount !== 1) return false;
      var variableName = this.interpreterProxy.stackValue(0).asString();
      if(!variableName) return false;
      var variableValue = global.localStorage.getItem(variableName);
      return this.answer(argCount, variableValue);
    },
    "primitiveEnvironmentPersistentVariableAt:put:": function(argCount) {
      if(argCount !== 2) return false;
      var variableName = this.interpreterProxy.stackValue(1).asString();
      if(!variableName) return false;
      var variableValue = this.interpreterProxy.stackValue(0).asString();
      if(!variableValue) return false;
      global.localStorage.setItem(variableName, variableValue);
      return this.answerSelf(argCount);
    },
    "primitiveEnvironmentRemovePersistentVariableAt:": function(argCount) {
      if(argCount !== 1) return false;
      var variableName = this.interpreterProxy.stackValue(0).asString();
      if(!variableName) return false;
      global.localStorage.removeItem(variableName);
      return this.answerSelf(argCount);
    },
    "primitiveEnvironmentAlert:": function(argCount) {
      if(argCount !== 1) return false;
      var message = this.interpreterProxy.stackValue(0).asString();
      if(global.alert) {
        global.alert(message);
      } else {
        console.warn(message);
      }
      return this.answerSelf(argCount);
    },
    "primitiveEnvironmentConfirm:": function(argCount) {
      if(argCount !== 1) return false;
      var message = this.interpreterProxy.stackValue(0).asString();
      if(!global.confirm) return false;
      return this.answer(argCount, global.confirm(message) === true);
    },
    "primitiveEnvironmentGlobalApply:withArguments:": function(argCount) {
      if(argCount !== 2) return false;
      var functionName = this.interpreterProxy.stackValue(1).asString();
      if(!functionName) return false;
      var functionArguments = this.asJavaScriptObject(this.interpreterProxy.stackValue(0)) || [];
      var func = global[functionName];
      if(!func || !func.apply) return false;
      var result = undefined;
      try {
        result = func.apply(global, functionArguments);
      } catch(e) {
        console.error("Failed to perform apply:withArguments on global object:", e, "Selector:", functionName, "Arguments:", functionArguments);
      }
      return this.answer(argCount, result);
    },
    "primitiveEnvironmentReload": function(argCount) {
      if(argCount !== 0) return false;
      if(typeof window === 'undefined') return false;
      window.document.location.reload(true);
      return this.answerSelf(argCount);
    },

    // WebSocket instance methods
    "primitiveWebSocketConnectToUrl:withEventSemaphore:": function(argCount) {
      if(argCount !== 2) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var url = this.interpreterProxy.stackValue(1).asString();
      var semaIndex = this.interpreterProxy.stackIntegerValue(0);

      // Setup WebSocket
      receiver.webSocketHandle = {
        webSocket: new WebSocket(url),
        url: url,
        semaIndex: semaIndex,
        buffers: []
      };
      this.setupWebSocket(receiver.webSocketHandle);

      return this.answerSelf(argCount);
    },
    setupWebSocket: function(webSocketHandle) {
      var thisHandle = this;
      var webSocket = webSocketHandle.webSocket;
      webSocket.onopen = function(/* event */) {
        thisHandle.primHandler.signalSemaphoreWithIndex(webSocketHandle.semaIndex);
      };
      webSocket.onclose = function(/* event */) {
        thisHandle.primHandler.signalSemaphoreWithIndex(webSocketHandle.semaIndex);
      };
      webSocket.onerror = function(event) {
        console.error("Failure on WebSocket for url [" + webSocketHandle.url + "]: ", JSON.stringify(event));
        thisHandle.primHandler.signalSemaphoreWithIndex(webSocketHandle.semaIndex);
      };
      webSocket.onmessage = function(event) {
        new Response(event.data)
          .arrayBuffer()
          .then(function(data) {
            webSocketHandle.buffers.push(new Uint8Array(data));
            thisHandle.primHandler.signalSemaphoreWithIndex(webSocketHandle.semaIndex);

            // Handle message as soon as possible
            thisHandle.interpreterProxy.vm.forceInterruptCheck();
          })
          .catch(function(error) {
            console.error("Failed to read websocket message", error);
            thisHandle.primHandler.signalSemaphoreWithIndex(webSocketHandle.semaIndex);
          })
        ;
      };
    },
    "primitiveWebSocketReceivedMessage": function(argCount) {
      if(argCount !== 0) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var webSocketHandle = receiver.webSocketHandle;
      if(!webSocketHandle) return false;

      // Get next receive buffer
      var receiveBuffer = webSocketHandle.buffers.splice(0, 1)[0];  // Remove first element and keep it
      var result = receiveBuffer ? this.primHandler.makeStByteArray(receiveBuffer) : this.interpreterProxy.nilObject();

      // Answer ByteArray or nil
      return this.answer(argCount, result);
    },
    "primitiveWebSocketSend:": function(argCount) {
      if(argCount !== 1) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var sendBuffer = this.interpreterProxy.stackObjectValue(0);
      var webSocketHandle = receiver.webSocketHandle;
      if(!webSocketHandle) return false;

      // Send buffer
      var success = false;
      if(webSocketHandle.webSocket.readyState === 1) {
        try {
          webSocketHandle.webSocket.send(sendBuffer.bytes);
          success = true;
        } catch(e) {
          console.error("Failed to write websocket message", e);
          this.primHandler.signalSemaphoreWithIndex(webSocketHandle.semaIndex);
        }
      }
      return this.answer(argCount, success);
    },
    "primitiveWebSocketReadyState": function(argCount) {
      if(argCount !== 0) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var webSocketHandle = receiver.webSocketHandle;
      if(!webSocketHandle) return false;

      // Get ready state
      var readyState = webSocketHandle.webSocket.readyState;

      return this.answer(argCount, readyState);
    },
    "primitiveWebSocketClose": function(argCount) {
      if(argCount !== 0) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var webSocketHandle = receiver.webSocketHandle;
      if(!webSocketHandle) return false;

      // Close connection (if one still exists, ignore silently otherwise)
      var success = false;
      try {
        if(webSocketHandle.webSocket) {
          webSocketHandle.webSocket.close();
          success = true;
        }
      } catch(e) {
        console.error("Failed to close websocket", e);
        this.primHandler.signalSemaphoreWithIndex(webSocketHandle.semaIndex);
      }

      return this.answer(argCount, success);
    },

    // CallbackEvaluator class methods
    "primitiveCallbackEvaluatorRegisterProcess:": function(argCount) {
      if(argCount !== 1) return false;
      this.callbackEvaluatorProcess = this.interpreterProxy.stackValue(0);
      this.callbackEvaluatorCallbacks = [];
      return this.answerSelf(argCount);
    },
    "primitiveCallbackEvaluatorCurrentCallbackBlockAndArguments": function(argCount) {
      if(argCount !== 0) return false;
      var callback = this.callbackEvaluatorCurrentCallback;
      if(callback === undefined) {
        // No callback present, answer nil
        return this.answer(argCount, null);
      }
      return this.answer(argCount, [ callback.block, callback.arguments ]);
    },
    "primitiveCallbackEvaluatorCurrentCallbackResult:": function(argCount) {
      if(argCount !== 1) return false;
      var result = this.asJavaScriptObject(this.interpreterProxy.stackValue(0));
      var callback = this.callbackEvaluatorCurrentCallback;
      if(callback === undefined) {
        return false;
      }
      callback.result = result;
      return this.answerSelf(argCount);
    }
  };
}

function registerCpSystemPlugin() {
    if(typeof Squeak === "object" && Squeak.registerExternalModule) {
        Squeak.registerExternalModule("CpSystemPlugin", CpSystemPlugin());
    } else self.setTimeout(registerCpSystemPlugin, 100);
};

registerCpSystemPlugin();
