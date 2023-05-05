function CpSystemPlugin() {
  "use strict";

  return {
    getModuleName: function() { return "CpSystemPlugin"; },
    interpreterProxy: null,
    primHandler: null,

    setInterpreter: function(anInterpreter) {
      this.interpreterProxy = anInterpreter;
      this.primHandler = this.interpreterProxy.vm.primHandler;
      this.characterClass = this.interpreterProxy.vm.globalNamed("Character");
      this.symbolClass = this.interpreterProxy.vm.globalNamed("Symbol");
      this.stringClass = this.interpreterProxy.vm.globalNamed("String");
      this.byteStringClass = this.interpreterProxy.vm.globalNamed("ByteString");
      this.wideStringClass = this.interpreterProxy.vm.globalNamed("WideString");
      this.arrayClass = this.interpreterProxy.vm.globalNamed("Array");
      this.dictionaryClass = this.interpreterProxy.vm.globalNamed("Dictionary");

      // Add #asString behavior to String classes (converting from Smalltalk to Javascript Strings)
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

      return true;
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

    // Helper methods for converting from Smalltalk object to Javascript object and vice versa
    asJavascriptObject: function(obj) {
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
        return this.arrayAsJavascriptObject(obj);
      } else if(obj.sqClass === this.dictionaryClass) {
        return this.dictionaryAsJavascriptObject(obj);
      } else if(obj.domElement) {
        return obj.domElement;
      }
      // Assume a String is used otherwise
      return obj.asString();
    },
    arrayAsJavascriptObject: function(obj) {
      var thisHandle = this;
      return (obj.pointers || []).map(function(each) { return thisHandle.asJavascriptObject(each); });
    },
    dictionaryAsJavascriptObject: function(obj) {
      var thisHandle = this;
      var associations = obj.pointers.find(function(pointer) {
        return pointer && pointer.sqClass === thisHandle.arrayClass;
      });
      if(!associations || !associations.pointers || !associations.pointers.forEach) throw Error("Dictionary has unexpected structure");
      var result = {};
      associations.pointers.forEach(function(assoc) {
        if(!assoc.isNil) {
          // Assume instVars are #key and #value (in that order)
          result[thisHandle.asJavascriptObject(assoc.pointers[0])] = thisHandle.asJavascriptObject(assoc.pointers[1]);
        }
      });
      return result;
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
    newSymbol: function(string) {
      var newSymbol = this.interpreterProxy.vm.instantiateClass(this.symbolClass, string.length);
      // Assume ByteSymbols only
      for(var i = 0; i < string.length; i++) {
          newSymbol.bytes[i] = string.charCodeAt(i) & 0xFF;
      }
      return newSymbol;
    },
    "primitiveSymbolRegister:": function(argCount) {
      if(argCount !== 1) return false;
      var symbol = this.interpreterProxy.stackValue(0);
      var symbolString = symbol.asString();
      if(!this.symbolClass.symbolTable) {
        this.symbolClass.symbolTable = {};
      }
      if(this.symbolClass.symbolTable[symbolString]) { throw Error("Registered non-unique Symbol: " + symbolString); }
      this.symbolClass.symbolTable[symbolString] = symbol;
      return this.answerSelf(argCount);
    },
    "primitiveSymbolFromString:": function(argCount) {
      if(argCount !== 1) return false;
      var string = this.interpreterProxy.stackValue(0).asString();
      if(!this.symbolClass.symbolTable) {
        this.symbolClass.symbolTable = {};
      }
      var registeredSymbol = this.symbolClass.symbolTable[string];
      if(registeredSymbol === undefined) {
        registeredSymbol = this.symbolClass.symbolTable[string] = this.newSymbol(string);
      }
      return this.answer(argCount, registeredSymbol);
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
          // Javascript already has same String representation for NaN, Infinity and -Infinity
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

    // ClientEnvironment instance methods
    "primitiveEnvironmentVariableAt:": function(argCount) {
      if(argCount !== 1) return false;
      var variableName = this.interpreterProxy.stackValue(0).asString();
      if(!variableName) return false;
      var variableValue = window.sessionStorage.getItem(variableName);
      return this.answer(argCount, variableValue);
    },
    "primitiveEnvironmentVariableAt:put:": function(argCount) {
      if(argCount !== 2) return false;
      var variableName = this.interpreterProxy.stackValue(1).asString();
      if(!variableName) return false;
      var variableValue = this.interpreterProxy.stackValue(0).asString();
      if(!variableValue) return false;
      window.sessionStorage.setItem(variableName, variableValue);
      return this.answerSelf(argCount);
    },
    "primitiveEnvironmentVariableNames": function(argCount) {
      if(argCount !== 0) return false;
      var variableNames = new Array(window.sessionStorage.length);
      for(var i = 0; i < window.sessionStorage.length; i++) {
        variableNames[i] = window.sessionStorage.key(i);
      }
      return this.answer(argCount, variableNames);
    },
    "primitiveEnvironmentRemoveVariableAt:": function(argCount) {
      if(argCount !== 1) return false;
      var variableName = this.interpreterProxy.stackValue(0).asString();
      if(!variableName) return false;
      window.sessionStorage.removeItem(variableName);
      return this.answerSelf(argCount);
    },
    "primitiveEnvironmentPersistentVariableAt:": function(argCount) {
      if(argCount !== 1) return false;
      var variableName = this.interpreterProxy.stackValue(0).asString();
      if(!variableName) return false;
      var variableValue = window.localStorage.getItem(variableName);
      return this.answer(argCount, variableValue);
    },
    "primitiveEnvironmentPersistentVariableAt:put:": function(argCount) {
      if(argCount !== 2) return false;
      var variableName = this.interpreterProxy.stackValue(1).asString();
      if(!variableName) return false;
      var variableValue = this.interpreterProxy.stackValue(0).asString();
      if(!variableValue) return false;
      window.localStorage.setItem(variableName, variableValue);
      return this.answerSelf(argCount);
    },
    "primitiveEnvironmentRemovePersistentVariableAt:": function(argCount) {
      if(argCount !== 1) return false;
      var variableName = this.interpreterProxy.stackValue(0).asString();
      if(!variableName) return false;
      window.localStorage.removeItem(variableName);
      return this.answerSelf(argCount);
    },
    "primitiveEnvironmentAlert:": function(argCount) {
      if(argCount !== 1) return false;
      var message = this.interpreterProxy.stackValue(0).asString();
      window.alert(message);
      return this.answerSelf(argCount);
    },
    "primitiveEnvironmentConfirm:": function(argCount) {
      if(argCount !== 1) return false;
      var message = this.interpreterProxy.stackValue(0).asString();
      return this.answer(argCount, window.confirm(message) === true);
    },
    "primitiveEnvironmentGlobalApply:withArguments:": function(argCount) {
      if(argCount !== 2) return false;
      var functionName = this.interpreterProxy.stackValue(1).asString();
      if(!functionName) return false;
      var functionArguments = this.asJavascriptObject(this.interpreterProxy.stackValue(0));
      return this.answer(argCount, window[functionName].apply(window, functionArguments));
    },
    "primitiveEnvironmentReload": function(argCount) {
      if(argCount !== 0) return false;
      document.location.reload(true);
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
        console.error("Failure on WebSocket for url [" + webSocketHandle.url + "]: ", event);
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
          console.error("Failed to write websocket message", error);
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
        console.error("Failed to close websocket", error);
        this.primHandler.signalSemaphoreWithIndex(webSocketHandle.semaIndex);
      }

      return this.answer(argCount, success);
    }
  };
}

function registerCpSystemPlugin() {
    if(typeof Squeak === "object" && Squeak.registerExternalModule) {
        Squeak.registerExternalModule("CpSystemPlugin", CpSystemPlugin());
    } else self.setTimeout(registerCpSystemPlugin, 100);
};

registerCpSystemPlugin();
