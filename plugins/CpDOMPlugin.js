function CpDOMPlugin() {
  "use strict";

  return {
    getModuleName: function() { return "CpDOMPlugin"; },
    interpreterProxy: null,
    primHandler: null,
    customTagMap: {},
    nestedTags: {},
    customElementClassMappers: [],
    eventClassMap: {},
    eventsReceived: [],
    throttleEventTypes: [ "pointermove", "touchmove", "wheel", "gesturechange" ],
    transitionStartTick: performance.now(),
    namespaces: [
      // Default namespaces (for attributes, therefore without elementClass)
      { prefix: "xlink", uri: "http://www.w3.org/1999/xlink", elementClass: null },
      { prefix: "xmlns", uri: "http://www.w3.org/2000/xmlns/", elementClass: null }
    ],
    domElementMap: new WeakMap(),

    setInterpreter: function(anInterpreter) {
      this.interpreterProxy = anInterpreter;
      this.vm = anInterpreter.vm;
      this.primHandler = this.vm.primHandler;
      this.pointClass = this.vm.globalNamed("Point");
      this.domElementClass = null; // Only known after installation
      this.domRectangleClass = null; // Only known after installation
      this.systemPlugin = Squeak.externalModules.CpSystemPlugin;
      this.updateMakeStObject();
      this.runUpdateProcess();
      return true;
    },

    // Helper methods for answering (and setting the stack correctly)
    answer: function(argCount, value) {
      this.interpreterProxy.popthenPush(argCount + 1, this.primHandler.makeStObject(value));
      return true;
    },
    answerSelf: function(argCount) {
      // Leave self on stack and only pop arguments
      this.interpreterProxy.pop(argCount);
      return true;
    },

    // Helper methods for creating or converting Smalltalk and JavaScript objects
    updateMakeStObject: function() {
      // Replace existing makeStObject function with more elaborate variant
      if(this.originalMakeStObject) {
        return; // Already installed
      }
      var self = this;
      self.originalMakeStObject = this.primHandler.makeStObject;
      this.primHandler.makeStObject = function(obj, proxyClass, seen) {
        if(obj !== undefined && obj !== null) {
          // Check for DOM element (it will use own internal wrapping, do not use 'seen' here)
          if(obj.querySelectorAll) {
            return self.instanceForElement(obj);
          }
        }
        return self.originalMakeStObject.call(this, obj, proxyClass, seen);
      };
      // Make sure document has a localName
      window.document.localName = "document";
    },

    // Helper methods for namespaces
    namespaceForURI: function(uri) {
      return this.namespaces.find(function(namespace) {
        return namespace.uri === uri;
      });
    },
    namespaceForPrefix: function(prefix) {
      return this.namespaces.find(function(namespace) {
        return namespace.prefix === prefix;
      });
    },
    namespaceURIFromName: function(name) {
      var separatorIndex = name.indexOf(":");
      if(separatorIndex < 0) {
        return null;
      }
      var prefix = name.slice(0, separatorIndex);
      return this.namespaceForPrefix(prefix);
    },

    // Helper method to create a tag name from a class name
    tagNameFromClass: function(aClass) {

      // Special case
      var className = aClass.className();
      if(className === "CpView") {
        return "cp-view";
      }

      // Remove camelCase and use dashes, all lowercase
      return className
        .replace(/View$/, "")                 // Remove View as postfix for nicer readability
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
        .replace(/^([A-Za-z0-9]*)$/, "x-$1")  // Failsafe since custom tag name requires at least one hyphen
        .toLowerCase()
      ;
    },

    // Point helper methods
    getPointX: function(stPoint) {
      return stPoint.pointers[0];
    },
    getPointY: function(stPoint) {
      return stPoint.pointers[1];
    },

    // DOM element helper methods
    getDomElementClass: function() {
      if(!this.domElementClass) {
        this.domElementClass = this.vm.globalNamed("CpDomElement");
      }
      return this.domElementClass;
    },
    getDomRectangleClass: function() {
      if(!this.domRectangleClass) {
        this.domRectangleClass = this.vm.globalNamed("CpDomRectangle");
      }
      return this.domRectangleClass;
    },
    addElementClassMapper: function(mapper) {
      this.customElementClassMappers.push(mapper);
    },
    instanceForElement: function(element) {
      if(!element) return null;

      // Retrieve instance from DOM element itself
      if(element.__cp_element) {
        return element.__cp_element;
      }

      // Retrieve instance from DOM element map (if available and not GC'ed)
      var instance = this.domElementMap.get(element);
      if(instance === undefined) {

        // Create new instance and store in DOM element map
        var elementClass = this.customTagMap[element.localName];
        if(!elementClass) {
          this.customElementClassMappers.some(function(customElementClassMapper) {
            elementClass = customElementClassMapper(element);
            return elementClass !== null;
          });
        }
        if(!elementClass) {
          var namespace = this.namespaceForURI(element.namespaceURI);
          elementClass = namespace ? namespace.elementClass : this.getDomElementClass();
        }
        instance = this.vm.instantiateClass(elementClass, 0);
        instance.domElement = element;
        this.domElementMap.set(element, instance);
      }
      return instance;
    },
    makeDomRectangle: function(rectangle) {
      let domRectangleClass = this.getDomRectangleClass();
      let domRectangle = this.vm.instantiateClass(domRectangleClass, 0);
      let primHandler = this.primHandler;
      domRectangleClass.allInstVarNames().forEach(function(name, index) {
        if(rectangle[name] !== undefined) {
          domRectangle.pointers[index] = primHandler.makeStObject(rectangle[name]);
        }
      });
      return domRectangle;
    },

    // DOM element class methods
    "primitiveDomElementRegisterNamespace:forPrefix:": function(argCount) {
      if(argCount !== 2) return false;
      var namespaceURI = this.interpreterProxy.stackValue(1).asString();
      if(!namespaceURI) return false;
      var prefix = this.interpreterProxy.stackValue(0).asString();
      if(!prefix) return false;
      if(this.namespaceForPrefix(prefix)) {
        console.error("The prefix " + prefix + " is already installed in the browser");
        return false;
      }
      var receiver = this.interpreterProxy.stackValue(argCount);
      this.namespaces.push({ prefix: prefix, uri: namespaceURI, elementClass: receiver });
      return this.answerSelf(argCount);
    },
    "primitiveDomElementNewWithTag:": function(argCount) {
      if(argCount !== 1) return false;
      var tagName = this.interpreterProxy.stackValue(0).asString();
      if(!tagName) return false;
      var separatorIndex = tagName.indexOf(":");
      var prefix = separatorIndex >= 0 ? tagName.slice(0, separatorIndex) : tagName;
      if(separatorIndex >= 0 && prefix !== "xmlns") {
        tagName = tagName.slice(separatorIndex + 1);
      }
      var namespace = this.namespaceForPrefix(prefix);
      var element = !namespace || prefix === "xhtml" ?
        window.document.createElement(tagName) :
        window.document.createElementNS(namespace.uri, tagName)
      ;
      var receiver = this.interpreterProxy.stackValue(argCount);
      if(tagName === receiver.customTag) {
        // Register if WebComponent is created from code (vs being created from markup content).
        // This information is used in the WebComponent constructor to allow correct initialization
        // of all WebComponents.
        element.__cp_created_from_code = true;
      }
      return this.answer(argCount, this.instanceForElement(element));
    },
    "primitiveDomElementDocument": function(argCount) {
      if(argCount !== 0) return false;
      return this.answer(argCount, this.instanceForElement(window.document));
    },
    "primitiveDomElementElementsFromPoint:": function(argCount) {
      if(argCount !== 1) return false;
      var point = this.interpreterProxy.stackValue(0);
      if(point.sqClass !== this.pointClass) return false;
      var thisHandle = this;
      var elements = window.document.elementsFromPoint(this.getPointX(point), this.getPointY(point)).map(function(element) {
        return thisHandle.instanceForElement(element);
      });
      return this.answer(argCount, elements);
    },

    // DOM element instance methods
    "primitiveDomElementElementWithId:": function(argCount) {
      if(argCount !== 1) return false;
      var id = this.interpreterProxy.stackValue(0).asString();
      if(!id) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      // Check the receiver is a root element (this means it has an activeElement)
      if(!domElement || domElement.activeElement === undefined) return false;
      var element = domElement.getElementById(id);
      return this.answer(argCount, this.instanceForElement(element));
    },
    "primitiveDomElementAllDescendantsMatching:": function(argCount) {
      if(argCount !== 1) return false;
      var querySelector = this.interpreterProxy.stackValue(0).asString();
      if(!querySelector) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      var thisHandle = this;
      var matchingElements = Array.from(domElement.querySelectorAll(querySelector))
        .map(function(matchingElement) {
          return thisHandle.instanceForElement(matchingElement);
        })
      ;
      return this.answer(argCount, matchingElements);
    },
    "primitiveDomElementFirstDescendantMatching:": function(argCount) {
      if(argCount !== 1) return false;
      var querySelector = this.interpreterProxy.stackValue(0).asString();
      if(!querySelector) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      var firstMatchingElement = domElement.querySelector(querySelector);
      return this.answer(argCount, this.instanceForElement(firstMatchingElement));
    },
    "primitiveDomElementMatches:": function(argCount) {
      if(argCount !== 1) return false;
      var selector = this.interpreterProxy.stackValue(0).asString();
      if(!selector) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      return this.answer(argCount, domElement.matches(selector));
    },
    "primitiveDomElementParent": function(argCount) {
      if(argCount !== 0) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      var parentElement = domElement.parentElement;
      return this.answer(argCount, this.instanceForElement(parentElement));
    },
    "primitiveDomElementChildren": function(argCount) {
      if(argCount !== 0) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      var thisHandle = this;
      var childElements = Array.from(domElement.children)
        .map(function(childElement) {
          return thisHandle.instanceForElement(childElement);
        })
      ;
      return this.answer(argCount, childElements);
    },
    "primitiveDomElementPreviousSibling": function(argCount) {
      if(argCount !== 0) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      var siblingElement = domElement.previousElementSibling;
      return this.answer(argCount, this.instanceForElement(siblingElement));
    },
    "primitiveDomElementNextSibling": function(argCount) {
      if(argCount !== 0) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      var siblingElement = domElement.nextElementSibling;
      return this.answer(argCount, this.instanceForElement(siblingElement));
    },
    "primitiveDomElementIsDescendantOf:": function(argCount) {
      if(argCount !== 1) return false;
      var parentElement = this.interpreterProxy.stackValue(0).domElement;
      if(!parentElement) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      return this.answer(argCount, parentElement !== domElement && parentElement.contains(domElement));
    },
    "primitiveDomElementTagName": function(argCount) {
      if(argCount !== 0) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      return this.answer(argCount, domElement.localName || domElement.tagName || "--shadow--");
    },
    "primitiveDomElementId": function(argCount) {
      if(argCount !== 0) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      return this.answer(argCount, domElement.id);
    },
    "primitiveDomElementId:": function(argCount) {
      if(argCount !== 1) return false;
      var id = this.interpreterProxy.stackValue(0).asString();
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      domElement.id = id;
      return this.answerSelf(argCount);
    },
    "primitiveDomElementTextContent": function(argCount) {
      if(argCount !== 0) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      return this.answer(argCount, domElement.textContent);
    },
    "primitiveDomElementTextContent:": function(argCount) {
      if(argCount !== 1) return false;
      var textContent = this.interpreterProxy.stackValue(0).asString();
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      domElement.textContent = textContent;
      return this.answerSelf(argCount);
    },
    "primitiveDomElementLocalTextContent": function(argCount) {
      if(argCount !== 0) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      var textNodes = Array.prototype.filter.call(domElement.childNodes, function(childNode) { return childNode.nodeType === Node.TEXT_NODE; });
      var textContent = textNodes.map(function(textNode) { return textNode.textContent; }).join("");
      return this.answer(argCount, textContent);
    },
    "primitiveDomElementMarkupContent": function(argCount) {
      if(argCount !== 0) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      return this.answer(argCount, domElement.innerHTML);
    },
    "primitiveDomElementMarkupContent:": function(argCount) {
      if(argCount !== 1) return false;
      var content = this.interpreterProxy.stackValue(0);
      var markupContent = content.asString();
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      domElement.innerHTML = markupContent;
      return this.answerSelf(argCount);
    },
    "primitiveDomElementIsClassed:": function(argCount) {
      if(argCount !== 1) return false;
      var className = this.interpreterProxy.stackValue(0).asString();
      if(!className) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      return this.answer(argCount, domElement.classList.contains(className));
    },
    "primitiveDomElementAddClass:": function(argCount) {
      if(argCount !== 1) return false;
      var className = this.interpreterProxy.stackValue(0).asString();
      if(!className) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      domElement.classList.add(className);
      return this.answerSelf(argCount);
    },
    "primitiveDomElementRemoveClass:": function(argCount) {
      if(argCount !== 1) return false;
      var className = this.interpreterProxy.stackValue(0).asString();
      if(!className) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      domElement.classList.remove(className);
      return this.answerSelf(argCount);
    },
    "primitiveDomElementAttributeAt:": function(argCount) {
      if(argCount !== 1) return false;
      var attributeName = this.interpreterProxy.stackValue(0).asString();
      if(!attributeName) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      var namespaceURI = this.namespaceURIFromName(attributeName);
      var attributeValue;
      if(namespaceURI) {
        attributeValue = domElement.getAttributeNS(namespaceURI, attributeName);
      } else {
        attributeValue = domElement.getAttribute(attributeName);
      }
      return this.answer(argCount, attributeValue);
    },
    "primitiveDomElementAttributeAt:put:": function(argCount) {
      if(argCount !== 2) return false;
      var attributeName = this.interpreterProxy.stackValue(1).asString();
      if(!attributeName) return false;
      var value = this.interpreterProxy.stackValue(0);
      var attributeValue = value.isNil ? null: value.asString();
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      var namespaceURI = this.namespaceURIFromName(attributeName);
      if(attributeValue === null) {
        if(namespaceURI) {
          domElement.removeAttributeNS(namespaceURI, attributeName);
        } else {
          domElement.removeAttribute(attributeName);
        }
      } else {
        if(namespaceURI) {
          domElement.setAttributeNS(namespaceURI, attributeName, attributeValue);
        } else {
          domElement.setAttribute(attributeName, attributeValue);
        }
      }
      return this.answerSelf(argCount);
    },
    "primitiveDomElementRemoveAttributeAt:": function(argCount) {
      if(argCount !== 1) return false;
      var attributeName = this.interpreterProxy.stackValue(0).asString();
      if(!attributeName) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      var namespaceURI = this.namespaceURIFromName(attributeName);
      if(namespaceURI) {
        domElement.removeAttributeNS(namespaceURI, attributeName);
      } else {
        domElement.removeAttribute(attributeName);
      }
      return this.answerSelf(argCount);
    },
    "primitiveDomElementStyleAt:": function(argCount) {
      if(argCount !== 1) return false;
      var styleName = this.interpreterProxy.stackValue(0).asString();
      if(!styleName) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      return this.answer(argCount, domElement.style.getPropertyValue(styleName) ||
          window.getComputedStyle(domElement).getPropertyValue(styleName));
    },
    "primitiveDomElementStyleAt:put:": function(argCount) {
      if(argCount !== 2) return false;
      var styleName = this.interpreterProxy.stackValue(1).asString();
      if(!styleName) return false;
      var value = this.interpreterProxy.stackValue(0);
      var styleValue = value.isNil ? null : value.asString();
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      if(styleValue === null) {
        domElement.style.removeProperty(styleName);
      } else {
        domElement.style.setProperty(styleName, styleValue);
      }
      return this.answerSelf(argCount);
    },
    "primitiveDomElementRemoveStyleAt:": function(argCount) {
      if(argCount !== 1) return false;
      var styleName = this.interpreterProxy.stackValue(0).asString();
      if(!styleName) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      domElement.style.removeProperty(styleName);
      return this.answerSelf(argCount);
    },
    "primitiveDomElementPropertyAt:": function(argCount) {
      if(argCount !== 1) return false;
      var propertyName = this.interpreterProxy.stackValue(0).asString();
      if(!propertyName) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      return this.answer(argCount, domElement[propertyName]);
    },
    "primitiveDomElementPropertyAt:put:": function(argCount) {
      if(argCount !== 2) return false;
      var propertyName = this.interpreterProxy.stackValue(1).asString();
      if(!propertyName) return false;
      var propertyValue = this.systemPlugin.asJavaScriptObject(this.interpreterProxy.stackValue(0));
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      domElement[propertyName] = propertyValue;
      return this.answerSelf(argCount);
    },
    "primitiveDomElementBoundingClientRectangle": function(argCount) {
      if(argCount !== 0) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      return this.answer(argCount, this.makeDomRectangle(domElement.getBoundingClientRect()));
    },
    "primitiveDomElementClone": function(argCount) {
      if(argCount !== 0) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      var clone = domElement.cloneNode(false);
      // Remove id to prevent duplication
      clone.removeAttribute("id");
      // Find first text node and copy its content
      var textNode = domElement.firstChild;
      while(textNode && textNode.nodeType !== 3) {
        textNode = textNode.nextSibling;
      }
      if(textNode) {
        clone.textContent = textNode.textContent;
      }
      return this.answer(argCount, this.instanceForElement(clone));
    },
    "primitiveDomElementAppendChild:": function(argCount) {
      if(argCount !== 1) return false;
      var childInstance = this.interpreterProxy.stackValue(0);
      var childElement = childInstance.domElement;
      if(!childElement) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      if(domElement.children.length === 0 && domElement.childNodes.length > 0) {
        // Remove any existing text content when there are no children yet.
        // An element should either have text content or elements as 'content'.
        domElement.textContent = "";
      }
      domElement.appendChild(childElement);
      return this.answer(argCount, childInstance);
    },
    "primitiveDomElementInsertChild:before:": function(argCount) {
      if(argCount !== 2) return false;
      var childInstance = this.interpreterProxy.stackValue(1);
      var childElement = childInstance.domElement;
      if(!childElement) return false;
      var siblingElement = this.interpreterProxy.stackValue(0).domElement;
      if(!siblingElement) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement || siblingElement.parentElement !== domElement) return false;
      domElement.insertBefore(childElement, siblingElement);
      return this.answer(argCount, childInstance);
    },
    "primitiveDomElementReplaceChild:with:": function(argCount) {
      if(argCount !== 2) return false;
      var childElement = this.interpreterProxy.stackValue(1).domElement;
      if(!childElement) return false;
      var replacementInstance = this.interpreterProxy.stackValue(0);
      var replacementElement = replacementInstance.domElement;
      if(!replacementElement) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement || childElement.parentElement !== domElement) return false;
      domElement.replaceChild(replacementElement, childElement);
      return this.answer(argCount, replacementInstance);
    },
    "primitiveDomElementRemoveChild:": function(argCount) {
      if(argCount !== 1) return false;
      var childInstance = this.interpreterProxy.stackValue(0);
      var childElement = childInstance.domElement;
      if(!childElement) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      if(childElement.parentElement !== domElement) return false;
      domElement.removeChild(childElement);
      return this.answer(argCount, childInstance);
    },
    "primitiveDomElementUnregisterAllInterest": function(argCount) {
      if(argCount !== 0) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      if(domElement.__cp_event_listeners) {
        domElement.__cp_event_listeners.forEach(function(eventListeners, eventClass) {
          eventListeners.forEach(function(eventListener) {
            domElement.removeEventListener(eventClass.type, eventListener);
          });
        });
        delete domElement.__cp_event_listeners;
      }
      return this.answerSelf(argCount);
    },
    "primitiveDomElementApply:withArguments:": function(argCount) {
      if(argCount !== 2) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      var functionName = this.interpreterProxy.stackValue(1).asString();
      if(!functionName) return false;
      var functionArguments = this.systemPlugin.asJavaScriptObject(this.interpreterProxy.stackValue(0)) || [];
      var func = domElement[functionName];
      if(!func || !func.apply) return false;
      var result = undefined;
      try {
        result = func.apply(domElement, functionArguments);
      } catch(e) {
        console.error("Failed to perform apply:withArguments on global object:", e, "Selector:", functionName, "Arguments:", functionArguments);
      }
      return this.answer(argCount, result);
    },

    // HTMLElement class methods
    "primitiveHtmlElementDocumentHead": function(argCount) {
      if(argCount !== 0) return false;
      var documentHead = window.document.head;
      return this.answer(argCount, this.instanceForElement(documentHead));
    },
    "primitiveHtmlElementDocumentBody": function(argCount) {
      if(argCount !== 0) return false;
      var documentBody = window.document.body;
      return this.answer(argCount, this.instanceForElement(documentBody));
    },

    // WebComponent class methods
    "primitiveWebComponentRegister": function(argCount) {
      if(argCount !== 0) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      if(receiver.customTag !== undefined) {
        console.error("Registering a WebComponent which already has a custom tag: " + receiver.customTag);
        return false;
      }

      // Keep track of custom tag and Smalltalk class
      var customTag = this.tagNameFromClass(receiver);
      receiver.customTag = customTag;
      this.customTagMap[customTag] = receiver;

      return this.answerSelf(argCount);
    },
    "primitiveWebComponentIsRegistered:": function(argCount) {
      if(argCount !== 1) return false;
      var tagName = this.interpreterProxy.stackValue(0).asString();
      var customClass = window.customElements.get(tagName);
      return this.answer(argCount, !!customClass);
    },
    "primitiveWebComponentTagName": function(argCount) {
      if(argCount !== 0) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var tagName = this.tagNameFromClass(receiver);
      return this.answer(argCount, tagName);
    },
    "primitiveWebComponentShadowRoot": function(argCount) {
      if(argCount !== 0) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      return this.answer(argCount, this.instanceForElement(domElement.shadowRoot));
    },

    // WebComponent instance methods
    "primitiveWebComponentTextContent": function(argCount) {
      if(argCount !== 0) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;

      // Extract text nodes from myself and all children (not being slotted elements)
      var text = "";
      var child = domElement.firstChild;
      while(child) {
        if((child.nodeType === 1 && !child.slot) || child.nodeType === 3) {
          text += child.textContent;
        }
        child = child.nextSibling;
      }
      return this.answer(argCount, text);
    },
    "primitiveWebComponentTextContent:": function(argCount) {
      if(argCount !== 1) return false;
      var textContent = this.interpreterProxy.stackValue(0).asString();
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;

      // Remove any existing content (not being slotted elements)
      // and then add a new text node.
      var child = domElement.firstChild;
      while(child) {
        var nextChild = child.nextSibling;
        if(!(child.nodeType === 1 && child.slot)) {
          child.parentNode.removeChild(child);
        }
        child = nextChild;
      }
      domElement.appendChild(window.document.createTextNode(textContent));
      return this.answerSelf(argCount);
    },

    // TemplateComponent helper methods
    ensureShadowRoot: function(elementClass, domElement) {

      // Attach shadow DOM (if not already present) and copy template (if available)
      if(!domElement.shadowRoot) {
        var shadowRoot = domElement.attachShadow({ mode: "open" });
        if(elementClass.templateElement) {
          shadowRoot.appendChild(elementClass.templateElement.cloneNode(true));
        }
      }
    },

    // TemplateComponent class methods
    "primitiveTemplateComponentRegisterStyleAndTemplate": function(argCount) {
      if(argCount !== 0) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      if(receiver.customTag === undefined) {
        console.error("Registering a TemplateComponent without a custom tag");
        return false;
      }

      // Create custom class and register it
      var thisHandle = this;
      try {
        var customClass = class extends HTMLElement {
          constructor() {
            super();
            thisHandle.ensureShadowRoot(receiver, this);

            // Since a WebComponent can be created both from code as well as from
            // markup content, we need to inform the Smalltalk code of the later
            // situation. In this way the Smalltalk #initialize message can be send
            // to the new instance (in all situations).
            // Use the fact that setTimeout will run code after current execution
            // has finished. This means the regular instantiation code has finished
            // (in the situation it was called from code).
            var instance = this;
            window.setTimeout(function() {
              // If component is NOT created by code, dispatch event to allow Smalltalk
              // code to do the initialization after all.
              if(!instance.__cp_created_from_code) {
                var requestInitEvent = new CustomEvent("createdfrommarkup", { detail: thisHandle.instanceForElement(instance) });
                window.document.dispatchEvent(requestInitEvent);
              }
            }, 0);
          }
        };

        // Keep track of custom class
        window.customElements.define(receiver.customTag, customClass);
        customClass.sqClass = receiver;
      } catch(e) {
        console.error("Failed to create new custom element with tag " + receiver.customTag, e);
        return false;
      }

      return this.answerSelf(argCount);
    },
    "primitiveTemplateComponentInstallStyle:andTemplate:": function(argCount) {
      if(argCount !== 2) return false;
      var styleString = this.interpreterProxy.stackValue(1).asString();
      var templateString = this.interpreterProxy.stackValue(0).asString();
      var receiver = this.interpreterProxy.stackValue(argCount);

      // Set the style without installing it (this will happen when installing the template)
      receiver.style = styleString;

      // Install template and rerender al instances
      this.installTemplate(receiver, templateString);
      this.renderAllInstances(receiver);
      return this.answerSelf(argCount);
    },
    "primitiveTemplateComponentInstallStyle:": function(argCount) {
      if(argCount !== 1) return false;
      var styleString = this.interpreterProxy.stackValue(0).asString();
      var receiver = this.interpreterProxy.stackValue(argCount);
      receiver.style = styleString;
      this.installStyleInTemplate(receiver);
      this.styleAllInstances(receiver);
      return this.answerSelf(argCount);
    },
    installStyleInTemplate: function(webComponentClass) {

      // Retrieve templateElement
      var templateElement = webComponentClass.templateElement;
      if(!templateElement) {
        return;
      }

      // Create new style node from specified styleString
      var newStyleNode = window.document.createElement("style");
      newStyleNode.id = "cp-css--" + webComponentClass.customTag;
      newStyleNode.textContent = webComponentClass.style;

      // Replace existing styles or add new styles
      var oldStyleNode = templateElement.querySelector("#" + newStyleNode.id);
      if(oldStyleNode) {

        // Existing styles are replaced
        oldStyleNode.parentNode.replaceChild(newStyleNode, oldStyleNode);
      } else {

        // Insert the style to become the first element of the template
        templateElement.insertBefore(newStyleNode, templateElement.firstElementChild);
      }
    },
    "primitiveTemplateComponentInstallTemplate:": function(argCount) {
      if(argCount !== 1) return false;
      var templateString = this.interpreterProxy.stackValue(0).asString();
      var receiver = this.interpreterProxy.stackValue(argCount);
      this.installTemplate(receiver, templateString);
      this.renderAllInstances(receiver);
      return this.answerSelf(argCount);
    },
    installTemplate: function(webComponentClass, template) {

      // Create template node from specified template (String)
      // The DOM parser is very forgiving, so no need for try/catch here
      var domParser = new DOMParser();
      var templateElement = domParser.parseFromString("<template>" + (template || "") + "</template>", "text/html").querySelector("template").content;

      // Check for nested templates
      var customTags = Object.keys(this.customTagMap);
      var hasNestedTag = customTags.some(function(customTag) {
        return templateElement.querySelector(customTag) !== null;
      });

      // Add or remove receiver from collection of nested tags
      if(hasNestedTag) {
        this.nestedTags[webComponentClass.customTag] = true;
      } else {
        delete this.nestedTags[webComponentClass.customTag];
      }

      // Store the template node and update style (which is element within templateElement)
      webComponentClass.templateElement = templateElement;
      this.installStyleInTemplate(webComponentClass);
    },
    "primitiveTemplateComponentRenderAllInstances": function(argCount) {
      if(argCount !== 0) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      if(!receiver.templateElement) return false;
      this.renderAllInstances(receiver);
      return this.answerSelf(argCount);
    },
    allInstancesDo: function(webComponentClass, root, func) {

      // Render all direct instances
      var thisHandle = this;
      root.querySelectorAll(webComponentClass.customTag).forEach(func);

      // Render all nested instances
      Object.keys(this.nestedTags).forEach(function(nestedTag) {
        root.querySelectorAll(nestedTag).forEach(function(instance) {
          if(instance.shadowRoot) {
            thisHandle.allInstancesDo(webComponentClass, instance.shadowRoot, func);
          }
        });
      });
    },
    renderAllInstances: function(webComponentClass) {
      var templateElement = webComponentClass.templateElement;
      var thisHandle = this;
      this.allInstancesDo(webComponentClass, window.document, function(instance) {
        thisHandle.renderTemplateOnElement(templateElement, instance);
      });
    },
    renderTemplateOnElement: function(templateElement, element) {

      // Remove existing content
      var shadowRoot = element.shadowRoot;
      while(shadowRoot.firstChild) {
        shadowRoot.firstChild.remove();
      }

      // Set new content using a copy of the template to prevent changes (by others) to persist
      shadowRoot.appendChild(templateElement.cloneNode(true));
    },
    styleAllInstances: function(webComponentClass) {
      var templateElement = webComponentClass.templateElement;
      var styleSelector = "#cp-css--" + webComponentClass.customTag;
      var styleElement = templateElement.querySelector(styleSelector);
      if(!styleElement) {
        console.warn("Styling all instance of <" + webComponentClass.customTag + ">, but no style present");
        return;
      }
      var styleContent = styleElement.textContent;
      var thisHandle = this;
      this.allInstancesDo(webComponentClass, window.document, function(instance) {
        thisHandle.updateStyleOnElement(styleContent, styleSelector, instance);
      });
    },
    updateStyleOnElement: function(style, styleSelector, element) {
      var styleElement = element.shadowRoot.querySelector(styleSelector);
      if(styleElement) {

        // Update existing style
        styleElement.textContent = style;
      } else {

        // Insert new style to become the first element in the shadow DOM
        // (this should normally not happen, every element should have a style)
        var newStyleNode = window.document.createElement("style");
        newStyleNode.id = styleSelector.slice(1);	// Remove '#'
        newStyleNode.textContent = style;
        element.insertBefore(newStyleNode, element.firstElementChild);
      }
    },

    // TemplateComponent instance methods
    "primitiveTemplateComponentEnsureShadowRoot": function(argCount) {
      if(argCount !== 0) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var domElement = receiver.domElement;
      if(!domElement) return false;
      this.ensureShadowRoot(receiver.sqClass, domElement);
      return this.answerSelf(argCount);
    },

    // Update process
    runUpdateProcess: function() {
      let thisHandle = this;
      window.requestAnimationFrame(function() {
        thisHandle.handleEvents();
        thisHandle.handleTransitions();
        thisHandle.runUpdateProcess();
      });
    },
    handleEvents: function() {
      // The event handler process is non-reentrant, check if it is already running and needs running
      if(this.eventsReceived.length > 0 && this.eventHandlerProcess && !this.eventHandlerProcess.isRunning) {
        try {
          this.eventHandlerProcess.isRunning = true;
          this.eventHandlerProcess();
        } finally {
          this.eventHandlerProcess.isRunning = false;
        }
      }
    },

    // Event class methods
    "primitiveEventRegisterProcess:": function(argCount) {
      if(argCount !== 1) return false;
      this.eventHandlerProcess = this.systemPlugin.contextAsJavaScriptFunction(this.interpreterProxy.stackValue(0));
      return this.answerSelf(argCount);
    },
    "primitiveEventRegisterClass:forType:": function(argCount) {
      if(argCount !== 2) return false;
      let type = this.interpreterProxy.stackValue(0).asString();
      let eventClass = this.interpreterProxy.stackValue(1);
      eventClass.type = type;
      this.eventClassMap[type] = eventClass;
      return this.answerSelf(argCount);
    },
    "primitiveEventAddListenerTo:": function(argCount) {
      if(argCount !== 1) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var element = this.interpreterProxy.stackValue(0);
      var domElement = element.domElement;
      if(!domElement) return false;
      domElement.__cp_element = element; // Quick accessor for handling events faster

      // Create the actual event listener
      var thisHandle = this;
      var eventListener = function(event) {
        var type = event.type;
        var currentTarget = event.currentTarget;

        // Validate an event is not sent twice to same element
        // (otherwise will results in duplicates in Smalltalk code)
        if(event.__cp_current_target === currentTarget) {
          // Stop here. No need to announce multiple times on same target.
          // The Announcer in the Smalltalk code has registered multiple
          // listeners already. So it will already perform all announcements.
          return;
        }
        event.__cp_current_target = currentTarget;

        // Add or replace last event (if 'same' event, replace it as throttling mechanism)
        var shouldThrottle = thisHandle.throttleEventTypes.includes(type);
        var eventsReceived = thisHandle.eventsReceived;
        if(shouldThrottle) {
          // Check the current target using the 'backup' value,
          // because in a throttled event the actual value has become null.
          var eventIndex = eventsReceived.findIndex(function(each) { return each.type === type && each.__cp_current_target === currentTarget; });
          if(eventIndex >= 0) {
            eventsReceived[eventIndex] = event;
          } else {
            eventsReceived.push(event);
          }
        } else {
          eventsReceived.push(event);
        }

        // Directly handle the available events (if not throttling)
        if(!shouldThrottle) {
          thisHandle.handleEvents();
        }
      };

      // Add the new event listener to the DOM element (to allow later removal)
      if(!domElement.__cp_event_listeners) {
        domElement.__cp_event_listeners = new Map();
        domElement.__cp_event_listeners.set(receiver, [ eventListener ]);
      } else {
        var eventListeners = domElement.__cp_event_listeners.get(receiver);
        if(eventListeners) {
          eventListeners.push(eventListener);
        } else {
          domElement.__cp_event_listeners.set(receiver, [ eventListener ]);
        }
      }

      // Finally add event listener to DOM element
      domElement.addEventListener(receiver.type, eventListener);
      return this.answerSelf(argCount);
    },
    "primitiveEventRemoveListenerFrom:": function(argCount) {
      if(argCount !== 1) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var element = this.interpreterProxy.stackValue(0);
      var domElement = element.domElement;
      if(!domElement) return false;

      // Retrieve matching event listener
      if(domElement.__cp_event_listeners) {
        var eventListeners = domElement.__cp_event_listeners.get(receiver);
        if(eventListeners) {
          // Remove last element (they are all the 'same') and ignore if not present
          var eventListener = eventListeners.pop();
          domElement.removeEventListener(receiver.type, eventListener);
        }
      }
      return this.answerSelf(argCount);
    },
    "primitiveEventIsListenedToOn:": function(argCount) {
      if(argCount !== 1) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var element = this.interpreterProxy.stackValue(0);
      var domElement = element.domElement;
      if(!domElement) return false;
      return this.answer(argCount, !!(domElement.__cp_event_listeners && domElement.__cp_event_listeners.has(receiver)));
    },
    "primitiveEventLatestEvents": function(argCount) {
      if(argCount !== 0) return false;

      // Answer event list and create empty list for future events
      var thisHandle = this;
      var result = this.primHandler.makeStArray(this.eventsReceived
        .map(function(event) {

          // Answer pre-created event if present (when bubbling or for custom events)
          if(event.__cp_event) {
            return event.__cp_event;
          }

          // Create new instance and connect original event
          let eventClass = thisHandle.eventClassMap[event.type];
          let newEvent = thisHandle.vm.instantiateClass(eventClass, 0);
          newEvent.event = event;
          event.__cp_event = newEvent;
          return newEvent;
        })
      );
      this.eventsReceived = [];

      return this.answer(argCount, result);
    },

    // Event instance methods
    "primitiveEventPropertyAt:": function(argCount) {
      if(argCount !== 1) return false;
      var propertyName = this.interpreterProxy.stackValue(0).asString();
      if(!propertyName) return false;
      var event = this.interpreterProxy.stackValue(argCount).event;
      if(!event) return false;
      var propertyValue = event[propertyName];
      if(!propertyValue && propertyName === "currentTarget") {
        // Check the current target using the 'backup' value,
        // because in a throttled event the actual value has become null.
        propertyValue = event.__cp_current_target;
      }
      return this.answer(argCount, propertyValue);
    },
    "primitiveEventModifiers": function(argCount) {
      if(argCount !== 0) return false;
      var event = this.interpreterProxy.stackValue(argCount).event;
      if(!event) return false;
      var modifiers =
        (event.altKey ? 1 : 0) +
        (event.ctrlKey ? 2 : 0) +
        (event.metaKey ? 4 : 0) +
        (event.shiftKey ? 8 : 0)
      ;
      return this.answer(argCount, modifiers);
    },
    "primitiveEventPreventDefault": function(argCount) {
      if(argCount !== 0) return false;
      var event = this.interpreterProxy.stackValue(argCount).event;
      if(!event) return false;
      event.preventDefault();
      return this.answerSelf(argCount);
    },
    "primitiveEventStopPropagation": function(argCount) {
      if(argCount !== 0) return false;
      var event = this.interpreterProxy.stackValue(argCount).event;
      if(!event) return false;
      // Check the current target using the 'backup' value below,
      // because in a throttled event the actual value has become null.
      event.stopPropagation();
      event.__cp_stop_propagation = true;
      event.__cp_stop_after = event.__cp_current_target;
      return this.answerSelf(argCount);
    },
    "primitiveEventStopImmediatePropagation": function(argCount) {
      if(argCount !== 0) return false;
      var event = this.interpreterProxy.stackValue(argCount).event;
      if(!event) return false;
      event.stopImmediatePropagation();
      event.__cp_stop_propagation = true;
      event.__cp_stop_after = null;
      return this.answerSelf(argCount);
    },
    "primitiveEventIsStopped": function(argCount) {
      if(argCount !== 0) return false;
      var event = this.interpreterProxy.stackValue(argCount).event;
      if(!event) return false;
      // Check the current target using the 'backup' value below,
      // because in a throttled event the actual value has become null.
      var isStopped = false;
      if(event.__cp_stop_propagation) {
        if(event.__cp_stop_after === null) {
          isStopped = true;
        } else if(event.__cp_stop_after !== event.__cp_current_target) {
          // Event bubbled past the currentTarget, value no longer needed
          event.__cp_stop_after = null;
          delete event.__cp_current_target;
          isStopped = true;
        }
      }
      return this.answer(argCount, isStopped);
    },

    // CustomEvent instance methods
    "primitiveCustomEventCreateWithDetail:": function(argCount) {
      if(argCount !== 1) return false;
      var detail = this.systemPlugin.asJavaScriptObject(this.interpreterProxy.stackValue(0));
      var receiver = this.interpreterProxy.stackValue(argCount);
      if(receiver.event) return false; // Already created!
      var type = receiver.sqClass.type;
      receiver.event = new CustomEvent(type, { detail: detail, bubbles: true, cancelable: true, composed: true });
      receiver.event.__cp_event = receiver;
      return this.answerSelf(argCount);
    },
    "primitiveCustomEventDispatchFrom:": function(argCount) {
      if(argCount !== 1) return false;
      var domElement = this.interpreterProxy.stackValue(0).domElement;
      if(!domElement) return false;
      var event = this.interpreterProxy.stackValue(argCount).event;
      if(!event) return false;
      // Dispatch event 'outside' this event handling method (to prevent stack getting out of balance)
      window.setTimeout(function() { domElement.dispatchEvent(event) }, 0);
      return this.answerSelf(argCount);
    },

    // Transition class methods
    "primitiveTransitionRegisterProcess:": function(argCount) {
      if(argCount !== 1) return false;
      this.transitionProcess = this.systemPlugin.contextAsJavaScriptFunction(this.interpreterProxy.stackValue(0));
      return this.answerSelf(argCount);
    },
    "primitiveTransitionHasTransitions:": function(argCount) {
      if(argCount !== 1) return false;
      this.hasTransitions = this.systemPlugin.asJavaScriptObject(this.interpreterProxy.stackValue(0)) === true;
      return this.answerSelf(argCount);
    },
    "primitiveTransitionTickCount": function(argCount) {
      if(argCount !== 0) return false;
      return this.answer(argCount, Math.ceil(performance.now() - this.transitionStartTick));
    },
    handleTransitions: function(endTime) {
      if(this.transitionProcess && this.hasTransitions) {
        this.transitionProcess();
      }
    }
  };
}

function registerCpDOMPlugin() {
    if(typeof Squeak === "object" && Squeak.registerExternalModule) {
        Squeak.registerExternalModule("CpDOMPlugin", CpDOMPlugin());
    } else self.setTimeout(registerCpDOMPlugin, 100);
};

registerCpDOMPlugin();
