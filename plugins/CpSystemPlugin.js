function CpSystemPlugin() {
  "use strict";

  return {
    getModuleName: function() { return "CpSystemPlugin"; },
    interpreterProxy: null,
    primHandler: null,

    setInterpreter: function(anInterpreter) {
      this.interpreterProxy = anInterpreter;
      this.vm = anInterpreter.vm;
      this.primHandler = this.vm.primHandler;
      this.characterClass = this.vm.globalNamed("Character");
      this.symbolClass = this.vm.globalNamed("Symbol");
      this.symbolTable = Object.create(null);
      this.stringClass = this.vm.globalNamed("String");
      this.byteStringClass = this.vm.globalNamed("ByteString");
      this.wideStringClass = this.vm.globalNamed("WideString");
      this.arrayClass = this.vm.globalNamed("Array");
      this.byteArrayClass = this.vm.globalNamed("ByteArray");
      this.wordArrayClass = this.vm.globalNamed("WordArray");
      this.associationClass = this.vm.globalNamed("Association");
      this.dictionaryClass = this.vm.globalNamed("Dictionary");
      this.orderedDictionaryClass = this.vm.globalNamed("OrderedDictionary");
      this.largePositiveIntegerClass = this.vm.globalNamed("LargePositiveInteger");
      this.largeNegativeIntegerClass = this.vm.globalNamed("LargeNegativeInteger");
      this.contextClass = this.vm.globalNamed("Context");
      this.processClass = this.vm.globalNamed("Process");
      this.scheduler = this.primHandler.getScheduler();
      this.syncProcessPriority = this.scheduler.pointers[Squeak.ProcSched_processLists].pointersSize();
      this.globalProxyClasses = {};
      this.lastException = null;
      this.updateStringSupport();
      this.updateMakeStObject();
      this.updateMakeStArray();
      return true;
    },

    // Helper methods for running a process synchronous (i.e. uninterrupted)
    makeProcessSynchronous: function(process) {
      var thisHandle = this;
      process.isSync = true;
      process.run = function() {

        // Make the Process active and start interpreting its code
        var activeProcess = thisHandle.scheduler.pointers[Squeak.ProcSched_activeProcess];
        var primHandler = thisHandle.primHandler;
        if(activeProcess !== process) {
          // If activeProcess is a synchronous Process, make sure it gets resumed
          // immediately after the new Process has terminated/is suspended.
          if(activeProcess.isSync) {

            // Put this synchronous Process at the front of the relevant Process list,
            // so it will be made active during wakeHighestPriority() on suspension
            // or termination of the new synchronous Process.
            var processList = thisHandle.scheduler.pointers[Squeak.ProcSched_processLists].pointers[thisHandle.syncProcessPriority - 1];
            if(primHandler.isEmptyList(processList)) {
              processList.pointers[Squeak.LinkedList_lastLink] = activeProcess;
            } else {
              var firstLink = processList.pointers[Squeak.LinkedList_firstLink];
              activeProcess.pointers[Squeak.Link_nextLink] = firstLink;
            }
            processList.pointers[Squeak.LinkedList_firstLink] = activeProcess;
            processList.dirty = true;
            activeProcess.pointers[Squeak.Proc_myList] = processList;
            activeProcess.dirty = true;
          } else {

            // Put the (regular) Process to sleep, it will be woken up again later
            primHandler.putToSleep(activeProcess);
          }
          primHandler.transferTo(process);
        }

        // Start the interpreter to execute the Process
        thisHandle.vm.runInterpreter(true);
      };
    },
    newProcessForContext: function(context) {
      // Create a new synchronous Process for the specified Context.
      // Normally this Context is created from a Smalltalk Block
      // through CpJavaScriptFunction class >> #wrap:
      // This mechanism of wrapping Blocks in JavaScript functions
      // allows Smalltalk Blocks to be used in callbacks or Promises.
      // It therefore allows Smalltalk to be used inside JavaScript,
      // next to already allowing JavaScript to be used inside Smalltalk.
      var process = this.vm.instantiateClass(this.processClass, 0);
      process.pointers[Squeak.Proc_priority] = this.syncProcessPriority;
      process.pointers[Squeak.Proc_suspendedContext] = context;
      process.dirty = true;

      // Make the Process synchronous to prevent it being put to sleep
      this.makeProcessSynchronous(process);

      return process;
    },

    // Add helper method to restart process loop on semaphore update
    signalSemaphoreWithIndex: function(index) {
      this.primHandler.signalSemaphoreWithIndex(index);
      this.vm.runInterpreter(true);
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
        var newString = thisHandle.vm.instantiateClass(isWideString ? thisHandle.wideStringClass : thisHandle.byteStringClass, src.length);
        var dst = newString.bytes || newString.words || [];
        for(var i = 0; i < src.length; i++) {
          dst[i] = src[i];
        }
        return newString;
      };
    },

    updateMakeStObject: function() {
      var thisHandle = this;

      // Keep track of SmallInteger min and max value.
      // 64-bit images have 61-bit SmallIntegers, 32-bit images have 31-bit SmallIntegers.
      // Since JavaScript only supports 53-bits integers, use that max in 64-bit images.
      var is64Bit = this.vm.image.version >= 68000;
      this.minSmallInteger = is64Bit ? Number.MIN_SAFE_INTEGER : -0x40000000;
      this.maxSmallInteger = is64Bit ? Number.MAX_SAFE_INTEGER :  0x3FFFFFFF;
      this.primHandler.makeStObject = function(obj, proxyClass, seen) {
        // Check for special 'primitive' objects (no need to use 'seen' here)
        if(obj === undefined || obj === null) return this.vm.nilObj;
        if(obj === true) return this.vm.trueObj;
        if(obj === false) return this.vm.falseObj;
        if(obj.sqClass) return obj;
        if(obj.constructor === Number) {
          if(Number.isInteger(obj)) {
            // Using bitwise-operators only works on 32-bits integers, therefore use regular division
            // instead of bit-shifts below during conversion to LargeIntegers.
            // The code below only works for 32-bit images. On 64-bit images, this code will not get
            // executed because obj will have "BigInt" as constructor and not "Number" if it becomes
            // bigger than maxSmallInteger.
            if(obj > thisHandle.maxSmallInteger || obj < thisHandle.minSmallInteger) {
              var isNegative = obj < 0;
              if(isNegative) {
                // Assume (see above) we're on 32-bit image, so the statement below will not overflow
                // the max (primitive) integer value.
                obj = -obj;
              }
              var bytes = [];
              var i = 0;
              while(obj > 0) {
                var byte = obj & 0xff;
                bytes[i++] = byte;
                obj = (obj - byte) / 256;
              }
              var largeInteger = this.vm.instantiateClass(this.vm.specialObjects[isNegative ? Squeak.splOb_ClassLargeNegativeInteger : Squeak.splOb_ClassLargePositiveInteger], bytes.length);
              largeInteger.bytes = bytes;
              return largeInteger;
            } else {
              return obj;
            }
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
            // TypedArray (distinguish Floats and Integers)
            if(obj.constructor === Float32Array || obj.constructor === Float64Array) {
              return thisHandle.addSeenObj(seen, obj, this.makeStArray(obj, null, seen));
            }
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

        // Dictionary like objects (make exception for the global object)
        if((obj.constructor === Object && !thisHandle.hasFunctions(obj)) || (obj.constructor === undefined && typeof obj === "object")) {
          return thisHandle.makeStOrderedDictionary(obj, seen);
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
        array.dirty = obj.length > 0;

        return array;
      };
    },
    makeStWordArray: function(obj) {
        var array = this.vm.instantiateClass(this.wordArrayClass, obj.length);
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

      var association = this.vm.instantiateClass(this.associationClass, 0);
      // Assume instVars are #key and #value (in that order)
      association.pointers[0] = this.primHandler.makeStObject(key, undefined, seen);
      association.pointers[1] = this.primHandler.makeStObject(value, undefined, seen);
      association.dirty = true;

      return association;
    },
    makeStOrderedDictionary: function(obj, seen) {
      // Check if obj is already known
      seen = seen || [];
      var stObj = this.findSeenObj(seen, obj);
      if(stObj !== undefined) {
        return stObj;
      }

      // Create OrderedDictionary and add it to seen collection directly, to allow internal references to be mapped correctly
      var orderedDictionary = this.vm.instantiateClass(this.orderedDictionaryClass, 0);
      seen.push({ jsObj: obj, stObj: orderedDictionary });

      // Create dictionary with the content
      var dictionary = this.makeStDictionary(obj, []);  // Do not provide seen values, because a unique needs to be created
      orderedDictionary.pointers[0] = dictionary;

      // Create array with ordered keys
      var orderedKeys = this.primHandler.makeStArray(Object.keys(obj), undefined, seen);
      orderedDictionary.pointers[1] = orderedKeys;
      orderedDictionary.dirty = Object.keys(obj).length > 0;

      return orderedDictionary;
    },
    makeStDictionary: function(obj, seen) {
      // Check if obj is already known
      seen = seen || [];
      var stObj = this.findSeenObj(seen, obj);
      if(stObj !== undefined) {
        return stObj;
      }

      // Create Dictionary and add it to seen collection directly, to allow internal references to be mapped correctly
      var dictionary = this.vm.instantiateClass(this.dictionaryClass, 0);
      seen.push({ jsObj: obj, stObj: dictionary });

      // Create Array big enough to hold all associations (1/4 empty) and fill with nil values
      var keys = Object.keys(obj);
      var arraySize = Math.floor((keys.length + 1) * 4 / 3);
      var associations = Array(arraySize).fill(null);

      // Add Associations to Array
      var thisHandle = this;
      keys.forEach(function(key) {
        var association = thisHandle.makeStAssociation(key, obj[key], seen);

        // Perform the Dictionary >> #scanFor: but knowing we will not find our element, just look for empty slot
        var position = thisHandle.stringHash(Array.from(key).map(function(c) { return c.codePointAt(0); })) % arraySize;
        var index = position;
        var found = false;
        while(!found && index < arraySize) {
          if(associations[index] === null) {
            found = true;
          } else {
            index++;
          }
        }
        if(!found) {
          index = 0;
          while(!found && index < position) {
            if(associations[index] === null) {
              found = true;
            } else {
              index++;
            }
          }
        }

        // Should always have found an empty slot
        associations[index] = association;
      });

      // Assume instVars are #tally and #array (in that order)
      dictionary.pointers[0] = keys.length;
      dictionary.pointers[1] = this.primHandler.makeStArray(associations, undefined, seen);
      dictionary.dirty = keys.length > 0;

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
      } else if(obj.jsObj) {
        return obj.jsObj;
      } else if(this.isKindOf(obj.sqClass, this.stringClass)) {
        return obj.asString();
      } else if(obj.sqClass === this.arrayClass) {
        return this.arrayAsJavaScriptObject(obj);
      } else if(this.isKindOf(obj.sqClass, this.orderedDictionaryClass)) {
        return this.orderedDictionaryAsJavaScriptObject(obj);
      } else if(this.isKindOf(obj.sqClass, this.dictionaryClass)) {
        return this.dictionaryAsJavaScriptObject(obj);
      } else if(obj.domElement) {
        return obj.domElement;
      } else if(this.isKindOf(obj.sqClass, this.contextClass)) {
        return this.contextAsJavaScriptFunction(obj);
      } else if(obj.sqClass === this.largePositiveIntegerClass) {
        return this.largeInteger(obj);
      } else if(obj.sqClass === this.largeNegativeIntegerClass) {
        return -this.largeInteger(obj);
      } else if(obj.bytes) {
        return obj.bytes;
      } else if(obj.words) {
        return obj.words;
      }

      return obj.asString();
    },
    arrayAsJavaScriptObject: function(obj) {
      var thisHandle = this;
      return (obj.pointers || []).map(function(each) { return thisHandle.asJavaScriptObject(each); });
    },
    orderedDictionaryAsJavaScriptObject: function(obj) {
      var unordered = this.dictionaryAsJavaScriptObject(obj.pointers[0]);
      var orderedKeys = this.arrayAsJavaScriptObject(obj.pointers[1]);
      return orderedKeys.reduce(function(result, key) {
        result[key] = unordered[key];
        return result;
      }, {});
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
    contextAsJavaScriptFunction: function(obj) {

      // Create the JavaScript function which executes the Context
      var thisHandle = this;
      var func = function() {

        // Create a copy of the Context to allow executing it multiple times.
        var context = thisHandle.vm.image.clone(obj);

        // Register the function arguments with the function.
        // This is used by JavaScriptFunction >> #arguments.
        var funcArgs = Array.from(arguments);
        var blockArgs = funcArgs.map(function(each) {
          return thisHandle.primHandler.makeStObject(each);
        });
        func.__cp_func_arguments = blockArgs;

        // Create a synchronous Process for the context
        var process = thisHandle.newProcessForContext(context);

        // Run the process
        process.run();

        // Make sure the interpreter is restarted (after this synchronous function has returned)
        thisHandle.vm.deferRunInterpreter();

        // The result should have been stored by CpJavaScriptFunction >> #setResult:
        // If no result is supplied yet, we're probably handling a Promise >> #await.
        // Check if result is an error (recognized by cause, to allow functions to
        // answer Error instances as well as throw Errors). If an error, throw it.
        var result = func.__cp_func_result;
        if(result === undefined) {
          // Add a Promise to be fulfilled later as the 'temporary' result (see "primitiveJavaScriptFunctionSetResult:")
          var resolve, reject;
          result = func.__cp_func_result = new Promise(function(localResolve, localReject) {
            resolve = localResolve;
            reject = localReject;
          });
          func.__cp_func_result.__cp_resolve = resolve;
          func.__cp_func_result.__cp_reject = reject;
        }
        var isError = result instanceof Error && result.cause && result.cause.sqClass;

        // Throw in case of error
        if(isError) {
          throw result;
        }

        return result;
      };

      return func;
    },
    isKindOf: function(sqClass, searchClass) {
      while(sqClass && !sqClass.isNil) {
        if(sqClass === searchClass) {
          return true;
        }
        sqClass = sqClass.superclass();
      }
      return false;
    },
    largeInteger: function(obj) {
      var value = 0;
      var bytes = obj.bytes || [];
      var n = bytes.length;
      for(var i = 0, f = 1; i < n; i++, f *= 256) {
        value += bytes[i] * f;
      }
      return value;
    },

    // Object instance methods
    "primitiveObjectTraceCr:": function(argCount) {
      if(argCount !== 1) return false;
      var message = this.interpreterProxy.stackValue(0).asString();
      console.log((new Date()).toISOString() + " " + message);
      return this.answerSelf(argCount);
    },
    "primitiveObjectWarnCr:": function(argCount) {
      if(argCount !== 1) return false;
      var message = this.interpreterProxy.stackValue(0).asString();
      console.warn((new Date()).toISOString() + " " + message);
      return this.answerSelf(argCount);
    },
    "primitiveObjectErrorCr:": function(argCount) {
      if(argCount !== 1) return false;
      var message = this.interpreterProxy.stackValue(0).asString();
      console.error((new Date()).toISOString() + " " + message);
      return this.answerSelf(argCount);
    },

    // Process instance methods
    "primitiveProcessBeIdleProcess": function(argCount) {
      if(argCount !== 0) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      this.vm.setIdleProcess(receiver);
      return this.answerSelf(argCount);
    },
    "primitiveProcessIsSyncProcess": function(argCount) {
      if(argCount !== 0) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      return this.answer(argCount, !!receiver.isSync);
    },
    "primitiveProcessAllowAwaitPromise": function(argCount) {
      if(argCount !== 0) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      return this.answer(argCount, !receiver.failOnAwait);
    },

    // Symbol class methods
    symbolFromString: function(string) {
      var registeredSymbol = this.symbolTable[string];
      if(registeredSymbol !== undefined) {
        return registeredSymbol;
      }

      // Create new Symbol
      var newSymbol = this.vm.instantiateClass(this.symbolClass, string.length);
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
      var newString = this.vm.instantiateClass(receiver, src.length);
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
      var newString = this.vm.instantiateClass(isWideString ? this.wideStringClass : this.byteStringClass, substring.length);
      var dst = newString.bytes || newString.words || [];
      for(var i = 0; i < substring.length; i++) {
        dst[i] = substring[i];
      }
      return newString;
    },
    stringHash: function(src) {
      var hash = 0x3400; // Initial value ByteString hash
      for(var i = 0; i < src.length; i++) {
        hash = hash + src[i];
        var low = hash & 0x3fff;
        hash = (0x260d * low + ((0x260d * Math.floor(hash / 0x4000) + (0x0065 * low) & 0x3fff) * 0x4000)) & 0xfffffff;
      }
      return hash;
    },
    "primitiveStringConcatenate:": function(argCount) {
      if(argCount !== 1) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var otherString = this.interpreterProxy.stackValue(0);
      var first = receiver.bytes || receiver.words || [];
      var second = otherString.bytes || otherString.words || [];
      var isWideString = receiver.words || otherString.words || false;
      var newString = this.vm.instantiateClass(isWideString ? this.wideStringClass : this.byteStringClass, first.length + second.length);
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
      var uppercaseString = this.vm.instantiateClass(receiver.sqClass, src.length);
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
      var lowercaseString = this.vm.instantiateClass(receiver.sqClass, src.length);
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
      var hash = this.stringHash(src);
      return this.answer(argCount, hash);
    },
    "primitiveStringTrim": function(argCount) {
      if(argCount !== 0) return false;
      var src = this.interpreterProxy.stackValue(argCount).asString();
      return this.answer(argCount, src.trim());
    },
    "primitiveStringTrimLeft": function(argCount) {
      if(argCount !== 0) return false;
      var src = this.interpreterProxy.stackValue(argCount).asString();
      return this.answer(argCount, src.trimStart());
    },
    "primitiveStringTrimRight": function(argCount) {
      if(argCount !== 0) return false;
      var src = this.interpreterProxy.stackValue(argCount).asString();
      return this.answer(argCount, src.trimEnd());
    },

    // WideString class methods
    "primitiveWideStringFrom:": function(argCount) {
      if(argCount !== 1) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var srcString = this.interpreterProxy.stackValue(0);
      var src = srcString.bytes || srcString.words || [];
      var newString = this.vm.instantiateClass(receiver, src.length);
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
          // Either the actual class has received explicit class name or it is found in the global object
          return jsClass.__cp_className === name || globalThis[name] === jsClass;
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
        this.lastException = null;
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
        this.lastException = e;
        return false;
      }

      // Proxy the result, if so requested
      if(result !== undefined && result !== null && !proxyClass.isNil) {
        var proxyInstance = this.vm.instantiateClass(proxyClass, 0);
        proxyInstance.jsObj = result;
        result = proxyInstance;
      }
      return this.answer(argCount, result);
    },
    "primitiveJavaScriptObjectLastExceptionAs:": function(argCount) {
      if(argCount !== 1) return false;
      var exception = this.lastException;
      if(exception !== null) {
        var proxyClass = this.getProxyClassFor(exception);
        if(!proxyClass || proxyClass === this.globalProxyClasses["Object"]) {
          // Use specified Proxy Class if no explicit class can be found
          proxyClass = this.interpreterProxy.stackValue(0);
        }
        var proxyInstance = this.vm.instantiateClass(proxyClass, 0);
        proxyInstance.jsObj = exception;
        exception = proxyInstance;
        this.lastException = null;
      }
      return this.answer(argCount, exception);
    },
    "primitiveJavaScriptObjectPropertyAt:resultAs:": function(argCount) {
      if(argCount !== 2) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var obj = receiver.jsObj;
      if(obj === undefined) return false;
      var propertyName = this.interpreterProxy.stackValue(1).asString();
      var proxyClass = this.interpreterProxy.stackValue(0);
      var result = obj[propertyName];
      if(result !== undefined && result !== null && !proxyClass.isNil) {
        var proxyInstance = this.vm.instantiateClass(proxyClass, 0);
        proxyInstance.jsObj = result;
        result = proxyInstance;
      }
      return this.answer(argCount, result);
    },
    "primitiveJavaScriptObjectPropertyAt:put:": function(argCount) {
      if(argCount !== 2) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var obj = receiver.jsObj;
      if(obj === undefined) return false;
      var propertyName = this.interpreterProxy.stackValue(1).asString();
      var propertyValue = this.asJavaScriptObject(this.interpreterProxy.stackValue(0));
      obj[propertyName] = propertyValue;
      return this.answerSelf(argCount);
    },
    "primitiveJavaScriptObjectRawPropertyAt:": function(argCount) {
      if(argCount !== 1) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var obj = receiver.jsObj;
      if(obj === undefined) return false;
      var propertyName = this.interpreterProxy.stackValue(0).asString();
      var result = obj[propertyName];
      if(result === undefined || result === null || result.isNil) {
        this.interpreterProxy.popthenPush(argCount + 1, this.vm.nilObj);
        return true;
      } else if(result.sqClass || (typeof result === "number" && result >= this.minSmallInteger && result <= this.maxSmallInteger)) {
        this.interpreterProxy.popthenPush(argCount + 1, result);
        return true;
      }
      return false;
    },
    "primitiveJavaScriptObjectRawPropertyAt:put:": function(argCount) {
      if(argCount !== 2) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var obj = receiver.jsObj;
      if(obj === undefined) return false;
      var propertyName = this.interpreterProxy.stackValue(1).asString();
      var propertyValue = this.interpreterProxy.stackValue(0);
      obj[propertyName] = propertyValue;
      return this.answerSelf(argCount);
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
      var proxyInstance = this.vm.instantiateClass(proxyClass, 0);
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
      var jsClass = this.interpreterProxy.stackValue(argCount).jsObj;
      var args = this.asJavaScriptObject(this.interpreterProxy.stackValue(1)) || [];
      var proxyClass = this.interpreterProxy.stackValue(0);

      var instance = undefined;
      try {
        var jsInstance = Reflect.construct(jsClass, args);
        instance = this.vm.instantiateClass(proxyClass.isNil ? this.getProxyClassFor(jsInstance) : proxyClass, 0);
        instance.jsObj = jsInstance;
      } catch(e) {
        console.error("Failed to instantiate class " + jsClass, e);
      }
      return this.answer(argCount, instance);
    },

    // JavaScriptFunction instance methods
    "primitiveJavaScriptFunctionArguments:": function(argCount) {
      if(argCount !== 1) return false;
      var count = this.interpreterProxy.stackValue(0);
      var receiver = this.interpreterProxy.stackValue(argCount);
      var jsFunc = receiver.jsObj;
      if(!jsFunc) return false;

      // Retrieve arguments from the Function instance.
      // Add 'nils' to make the appropriate size.
      var args = jsFunc.__cp_func_arguments.slice(0, count);
      while(args.length < count) {
        args.push(null);
      }
      return this.answer(argCount, args);
    },
    "primitiveJavaScriptFunctionSetBlock:": function(argCount) {
      if(argCount !== 1) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var block = this.asJavaScriptObject(this.interpreterProxy.stackValue(0));
      receiver.__cp_block = block;
      return this.answerSelf(argCount);
    },
    "primitiveJavaScriptFunctionBlock": function(argCount) {
      if(argCount !== 0) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      return this.answer(argCount, receiver.__cp_block);
    },
    "primitiveJavaScriptFunctionSetResult:": function(argCount) {
      if(argCount !== 1) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var jsFunc = receiver.jsObj;
      if(!jsFunc) return false;
      var result = this.asJavaScriptObject(this.interpreterProxy.stackValue(0));

      // Store the result in the Context instance or fulfill the waiting result
      if(jsFunc.__cp_func_result && jsFunc.__cp_func_result.__cp_resolve) {
        if(result instanceof Error && result.cause && result.cause.sqClass) {
          jsFunc.__cp_func_result.__cp_reject(result);
        } else {
          jsFunc.__cp_func_result.__cp_resolve(result);
        }
      } else {
        jsFunc.__cp_func_result = result;
      }
      return this.answerSelf(argCount);
    },

    // JavaScriptPromise instance methods
    "primitiveJavaScriptPromiseThen:onRejected:": function(argCount) {
      if(argCount !== 2) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var fullfilledBlock = this.interpreterProxy.stackValue(1);
      var rejectBlock = this.interpreterProxy.stackValue(0);
      var promise = receiver.jsObj;
      var result = promise.then(this.asJavaScriptObject(fullfilledBlock), this.asJavaScriptObject(rejectBlock));
      this.promiseAttachSenderMethod(result, receiver);
      return this.answer(argCount, result);
    },
    "primitiveJavaScriptPromiseCatch:": function(argCount) {
      if(argCount !== 1) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var catchBlock = this.interpreterProxy.stackValue(0);
      var promise = receiver.jsObj;
      var result = promise.catch(this.asJavaScriptObject(catchBlock));
      this.promiseAttachSenderMethod(result, receiver);
      return this.answer(argCount, result);
    },
    "primitiveJavaScriptPromiseFinally:": function(argCount) {
      if(argCount !== 1) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var finallyBlock = this.interpreterProxy.stackValue(0);
      var promise = receiver.jsObj;
      var result = promise.finally(this.asJavaScriptObject(finallyBlock));
      this.promiseAttachSenderMethod(result, receiver);
      return this.answer(argCount, result);
    },
    promiseAttachSenderMethod: function(promise, smalltalkPromise) {
      var promiseClass = smalltalkPromise.sqClass;
      var origPromise = smalltalkPromise.jsObj;
      var sender = this.vm.activeContext;
      var method;
      do {
        // Try next sender
        sender = sender.pointers[Squeak.Context_sender];
        if(!sender || sender.isNil) {
          if(origPromise.__cp_compiled_code) {
            // Use the originating Promise's sender
            promise.__cp_compiled_code = origPromise.__cp_compiled_code;
          }
          return;
        }

        // Extract method
        method = sender.pointers[Squeak.Context_method];
        if(!method || method.isNil || !method.methodClassForSuper) {
          if(origPromise.__cp_compiled_code) {
            // Use the originating Promise's sender
            promise.__cp_compiled_code = origPromise.__cp_compiled_code;
          }
          return;
        }
      } while(method.methodClassForSuper() === promiseClass);

      // Since method can also be a CompiledBlock, store it as 'compiled_code'
      promise.__cp_compiled_code = method;
    },

    // JavaScriptError class methods
    "primitiveJavaScriptErrorUncaughtObject": function(argCount) {
      if(argCount !== 0) return false;
      var uncaught = globalThis.__cp_uncaught;
      delete globalThis.__cp_uncaught;
      return this.answer(argCount, uncaught);
    },
    "primitiveJavaScriptErrorRegisterUncaughtInstanceContext:": function(argCount) {
      if(argCount !== 1) return false;
      // Store the uncaught instance context in the VM
      this.vm.uncaughtInstanceContext = this.interpreterProxy.stackValue(0);
      return this.answerSelf(argCount);
    },

    // ClientEnvironment instance methods
    "primitiveEnvironmentVariableAt:": function(argCount) {
      if(argCount !== 1) return false;
      var variableName = this.interpreterProxy.stackValue(0).asString();
      if(!variableName) return false;
      var variableValue = globalThis.sessionStorage.getItem(variableName);
      return this.answer(argCount, variableValue);
    },
    "primitiveEnvironmentVariableAt:put:": function(argCount) {
      if(argCount !== 2) return false;
      var variableName = this.interpreterProxy.stackValue(1).asString();
      if(!variableName) return false;
      var variableValue = this.interpreterProxy.stackValue(0).asString();
      if(!variableValue) return false;
      globalThis.sessionStorage.setItem(variableName, variableValue);
      return this.answerSelf(argCount);
    },
    "primitiveEnvironmentVariableNames": function(argCount) {
      if(argCount !== 0) return false;
      var variableNames = new Array(globalThis.sessionStorage.length);
      for(var i = 0; i < globalThis.sessionStorage.length; i++) {
        variableNames[i] = globalThis.sessionStorage.key(i);
      }
      return this.answer(argCount, variableNames);
    },
    "primitiveEnvironmentRemoveVariableAt:": function(argCount) {
      if(argCount !== 1) return false;
      var variableName = this.interpreterProxy.stackValue(0).asString();
      if(!variableName) return false;
      globalThis.sessionStorage.removeItem(variableName);
      return this.answerSelf(argCount);
    },
    "primitiveEnvironmentPersistentVariableAt:": function(argCount) {
      if(argCount !== 1) return false;
      var variableName = this.interpreterProxy.stackValue(0).asString();
      if(!variableName) return false;
      var variableValue = globalThis.localStorage.getItem(variableName);
      return this.answer(argCount, variableValue);
    },
    "primitiveEnvironmentPersistentVariableAt:put:": function(argCount) {
      if(argCount !== 2) return false;
      var variableName = this.interpreterProxy.stackValue(1).asString();
      if(!variableName) return false;
      var variableValue = this.interpreterProxy.stackValue(0).asString();
      if(!variableValue) return false;
      globalThis.localStorage.setItem(variableName, variableValue);
      return this.answerSelf(argCount);
    },
    "primitiveEnvironmentRemovePersistentVariableAt:": function(argCount) {
      if(argCount !== 1) return false;
      var variableName = this.interpreterProxy.stackValue(0).asString();
      if(!variableName) return false;
      globalThis.localStorage.removeItem(variableName);
      return this.answerSelf(argCount);
    },
    "primitiveEnvironmentAlert:": function(argCount) {
      if(argCount !== 1) return false;
      var message = this.interpreterProxy.stackValue(0).asString();
      if(globalThis.alert) {
        globalThis.alert(message);
      } else {
        console.warn(message);
      }
      return this.answerSelf(argCount);
    },
    "primitiveEnvironmentConfirm:": function(argCount) {
      if(argCount !== 1) return false;
      var message = this.interpreterProxy.stackValue(0).asString();
      if(!globalThis.confirm) return false;
      return this.answer(argCount, globalThis.confirm(message) === true);
    },
    "primitiveEnvironmentGlobalApply:withArguments:": function(argCount) {
      if(argCount !== 2) return false;
      var functionName = this.interpreterProxy.stackValue(1).asString();
      if(!functionName) return false;
      var functionArguments = this.asJavaScriptObject(this.interpreterProxy.stackValue(0)) || [];
      var func = globalThis[functionName];
      if(!func || !func.apply) return false;
      var result = undefined;
      try {
        result = func.apply(globalThis, functionArguments);
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
        thisHandle.signalSemaphoreWithIndex(webSocketHandle.semaIndex);
      };
      webSocket.onclose = function(/* event */) {
        thisHandle.signalSemaphoreWithIndex(webSocketHandle.semaIndex);
      };
      webSocket.onerror = function(event) {
        console.error("Failure on WebSocket for url [" + webSocketHandle.url + "]: ", event);
        thisHandle.signalSemaphoreWithIndex(webSocketHandle.semaIndex);
      };
      webSocket.onmessage = function(event) {
        new Response(event.data)
          .arrayBuffer()
          .then(function(data) {
            webSocketHandle.buffers.push(new Uint8Array(data));
            thisHandle.signalSemaphoreWithIndex(webSocketHandle.semaIndex);

            // Handle message as soon as possible
            thisHandle.vm.forceInterruptCheck();
          })
          .catch(function(error) {
            console.error("Failed to read websocket message", error);
            thisHandle.signalSemaphoreWithIndex(webSocketHandle.semaIndex);
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
      var result = receiveBuffer ? this.primHandler.makeStByteArray(receiveBuffer) : this.vm.nilObj;

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
          this.signalSemaphoreWithIndex(webSocketHandle.semaIndex);
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
        this.signalSemaphoreWithIndex(webSocketHandle.semaIndex);
      }

      return this.answer(argCount, success);
    }
  };
}

// Extend the Interpreter
Object.extend(Squeak.Interpreter.prototype,
  'syncProcess', {
    activeProcess: function() {
      if(!this.schedulerPointers) {
        this.schedulerPointers = this.specialObjects[Squeak.splOb_SchedulerAssociation].pointers[Squeak.Assn_value].pointers;
      }
      return this.schedulerPointers[Squeak.ProcSched_activeProcess];
    },
    setIdleProcess: function(process) {
      this.idleProcess = process;
    },
    inIdleProcess: function() {
      // Answer whether a Process is active which is marked THE 'idle' Process.
      // Be aware, this is not the same as using Process >> #idle in the tiny
      // CodeParadise image. Marking a Process as the 'idle' Process will replace
      // a previously marked Process. Use Process >> #beIdleProcess to mark it.
      return this.idleProcess === this.activeProcess();
    },
    handleUncaught: function() {
      if(!this.uncaughtInstanceContext) {
        return;
      }

      // Create a copy of the uncaught instance context and set its sender to
      // the activeContext, hereby making it behave as if send from that context.
      // This means handleUncaught() should be called as soon as an uncaught
      // Exception or unhandled Rejection is detected (see cp_interpreter.js).
      // Otherwise the activeContext might have changed.
      var context = this.image.clone(this.uncaughtInstanceContext);
      context.pointers[Squeak.Context_sender] = this.activeContext;

      // Create a new synchronous Process for the copied context and run it.
      var process = Squeak.externalModules.CpSystemPlugin.newProcessForContext(context);
      process.run();

      // Restart regular interpreter loop
      this.runInterpreter(true);
    }
  }
);

// Extend the Image
Object.extend(Squeak.Image.prototype,
  'fixes', {
    fixFloat: function() {
      // Hack for the tiny image in CodeParadise to keep floats alive.
      // The tiny image does not have BoxedFloat64 and only a Float
      // class. When saving/snapshotting an image Float will be deleted
      // from the class table. To fix this, the class hash is set explicitly.
      // Apart from that, snapshotting seems to work correctly, even if
      // multiple classes are freed during snapshot (which feels awkward).
      // Tried adding a BoxedFloat64 class, but similar issues remained.
      // The code is added in the method initImmediateClasses() which occurs
      // just before the mapSomeObjects() where the updated value is required.
      this.origInitImmediateClasses = this.initImmediateClasses;
      this.initImmediateClasses = function(oopMap, rawBits, splObs) {
        var floatClass = oopMap.get(rawBits.get(splObs.oop)[Squeak.splOb_ClassFloat]);
        floatClass.hash = 34;
        floatClass.classInstProto("Float");
        this.origInitImmediateClasses(oopMap, rawBits, splObs);
      };
    }
  }
);

function registerCpSystemPlugin() {
  if(typeof Squeak === "object" && Squeak.registerExternalModule) {
    Squeak.registerExternalModule("CpSystemPlugin", CpSystemPlugin());
  } else globalThis.setTimeout(registerCpSystemPlugin, 100);
};

registerCpSystemPlugin();
