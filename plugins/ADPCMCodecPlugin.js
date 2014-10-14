/* Smalltalk from Squeak4.5 with VMMaker 4.13.6 translated as JS source on 14 October 2014 3:51:01 pm */
/* Automatically generated by
	JSPluginCodeGenerator VMMakerJS-bf.12 uuid: a24182f0-6780-4782-a772-87ccf9030a78
   from
	ADPCMCodecPlugin VMMaker-bf.353 uuid: 8ae25e7e-8d2c-451e-8277-598b30e9c002
 */

module("users.bert.SqueakJS.plugins.ADPCMCodecPlugin").requires("users.bert.SqueakJS.vm").toRun(function() {

var VM_PROXY_MAJOR = 1;
var VM_PROXY_MINOR = 11;

/*** Functions ***/
function CLASSOF(obj) { return typeof obj === "number" ? interpreterProxy.classSmallInteger() : obj.sqClass }
function SIZEOF(obj) { return obj.pointers ? obj.pointers.length : obj.words ? obj.words.length : obj.bytes ? obj.bytes.length : 0 }
function BYTESIZEOF(obj) { return obj.bytes ? obj.bytes.length : obj.words ? obj.words.length * 4 : 0 }
function DIV(a, b) { return Math.floor(a / b) | 0; }   // integer division
function MOD(a, b) { return a - DIV(a, b) * b | 0; }   // signed modulus
function SHL(a, b) { return b > 31 ? 0 : a << b; }     // fix JS shift
function SHR(a, b) { return b > 31 ? 0 : a >>> b; }    // fix JS shift
function SHIFT(a, b) { return b < 0 ? (b < -31 ? 0 : a >>> (0-b) ) : (b > 31 ? 0 : a << b); }

/*** Variables ***/
var bitPosition = 0;
var byteIndex = 0;
var currentByte = 0;
var encodedBytes = null;
var interpreterProxy = null;
var moduleName = "ADPCMCodecPlugin 14 October 2014 (e)";
var stepSizeTable = null;



/*	Note: This is coded so that plugins can be run from Squeak. */

function getInterpreter() {
	return interpreterProxy;
}


/*	Note: This is hardcoded so it can be run from Squeak.
	The module name is used for validating a module *after*
	it is loaded to check if it does really contain the module
	we're thinking it contains. This is important! */

function getModuleName() {
	return moduleName;
}

function halt() {
	;
}


/*	Answer the best index to use for the difference between the given samples. */
/*	Details: Scan stepSizeTable for the first entry >= the absolute value of the difference between sample values. Since indexes are zero-based, the index used during decoding will be the one in the following stepSizeTable entry. Since the index field of a Flash frame header is only six bits, the maximum index value is 63. */
/*	Note: Since there does not appear to be any documentation of how Flash actually computes the indices used in its frame headers, this algorithm was guessed by reverse-engineering the Flash ADPCM decoder. */

function indexForDeltaFromto(thisSample, nextSample) {
	var bestIndex;
	var diff;
	var j;

	diff = nextSample - thisSample;
	if (diff < 0) {
		diff = 0 - diff;
	}
	bestIndex = 63;
	for (j = 1; j <= 62; j++) {
		if (bestIndex === 63) {
			if ((stepSizeTable[j - 1]) >= diff) {
				bestIndex = j;
			}
		}
	}
	return bestIndex;
}

function msg(s) {
	console.log(moduleName + ": " + s);
}


/*	Answer the next n bits of my bit stream as an unsigned integer. */

function nextBits(n) {
	var remaining;
	var result;
	var shift;

	result = 0;
	remaining = n;
	while(true) {
		shift = remaining - bitPosition;
		if (shift > 0) {

			/* consumed currentByte buffer; fetch next byte */

			result += SHL(currentByte, shift);
			remaining -= bitPosition;
			currentByte = encodedBytes[((++byteIndex)) - 1];
			bitPosition = 8;
		} else {

			/* still some bits left in currentByte buffer */

			result += SHR(currentByte, (0 - shift));

			/* mask out the consumed bits: */

			bitPosition -= remaining;
			currentByte = currentByte & (SHR(255, (8 - bitPosition)));
			return result;
		}
	}
}


/*	Write the next n bits to my bit stream. */

function nextBitsput(n, anInteger) {
	var bitsAvailable;
	var buf;
	var bufBits;
	var shift;

	buf = anInteger;
	bufBits = n;
	while(true) {
		bitsAvailable = 8 - bitPosition;

		/* either left or right shift */
		/* append high bits of buf to end of currentByte: */

		shift = bitsAvailable - bufBits;
		if (shift < 0) {

			/* currentByte buffer filled; output it */

			currentByte += SHR(buf, (0 - shift));
			encodedBytes[((++byteIndex)) - 1] = currentByte;
			bitPosition = 0;

			/* clear saved high bits of buf: */

			currentByte = 0;
			buf = buf & ((SHL(1, (0 - shift))) - 1);
			bufBits -= bitsAvailable;
		} else {

			/* still some bits available in currentByte buffer */

			currentByte += SHL(buf, shift);
			bitPosition += bufBits;
			return self;
		}
	}
}

function primitiveDecodeMono() {
	var rcvr;
	var count;
	var bit;
	var delta;
	var i;
	var predictedDelta;
	var step;
	var bitsPerSample;
	var deltaSignMask;
	var deltaValueHighBit;
	var deltaValueMask;
	var frameSizeMask;
	var index;
	var indexTable;
	var predicted;
	var sampleIndex;
	var samples;

	rcvr = interpreterProxy.stackValue(1);
	count = interpreterProxy.stackIntegerValue(0);
	predicted = interpreterProxy.fetchIntegerofObject(0, rcvr);
	index = interpreterProxy.fetchIntegerofObject(1, rcvr);
	deltaSignMask = interpreterProxy.fetchIntegerofObject(2, rcvr);
	deltaValueMask = interpreterProxy.fetchIntegerofObject(3, rcvr);
	deltaValueHighBit = interpreterProxy.fetchIntegerofObject(4, rcvr);
	frameSizeMask = interpreterProxy.fetchIntegerofObject(5, rcvr);
	currentByte = interpreterProxy.fetchIntegerofObject(6, rcvr);
	bitPosition = interpreterProxy.fetchIntegerofObject(7, rcvr);
	byteIndex = interpreterProxy.fetchIntegerofObject(8, rcvr);
	encodedBytes = interpreterProxy.fetchBytesofObject(9, rcvr);
	samples = interpreterProxy.fetchInt16ArrayofObject(10, rcvr);
	sampleIndex = interpreterProxy.fetchIntegerofObject(12, rcvr);
	bitsPerSample = interpreterProxy.fetchIntegerofObject(13, rcvr);
	stepSizeTable = interpreterProxy.fetchInt16ArrayofObject(14, rcvr);
	indexTable = interpreterProxy.fetchInt16ArrayofObject(15, rcvr);
	if (interpreterProxy.failed()) {
		return null;
	}
	for (i = 1; i <= count; i++) {
		if ((i & frameSizeMask) === 1) {

			/* start of frame; read frame header */

			predicted = nextBits(16);
			if (predicted > 32767) {
				predicted -= 65536;
			}
			index = nextBits(6);
			samples[((++sampleIndex)) - 1] = predicted;
		} else {
			delta = nextBits(bitsPerSample);
			step = stepSizeTable[index];
			predictedDelta = 0;
			bit = deltaValueHighBit;
			while (bit > 0) {
				if ((delta & bit) > 0) {
					predictedDelta += step;
				}
				step = step >>> 1;
				bit = bit >>> 1;
			}
			predictedDelta += step;
			if ((delta & deltaSignMask) > 0) {
				predicted -= predictedDelta;
			} else {
				predicted += predictedDelta;
			}
			if (predicted > 32767) {
				predicted = 32767;
			} else {
				if (predicted < -32768) {
					predicted = -32768;
				}
			}
			index += indexTable[delta & deltaValueMask];
			if (index < 0) {
				index = 0;
			} else {
				if (index > 88) {
					index = 88;
				}
			}
			samples[((++sampleIndex)) - 1] = predicted;
		}
	}
	if (interpreterProxy.failed()) {
		return null;
	}
	interpreterProxy.storeIntegerofObjectwithValue(0, rcvr, predicted);
	interpreterProxy.storeIntegerofObjectwithValue(1, rcvr, index);
	interpreterProxy.storeIntegerofObjectwithValue(6, rcvr, currentByte);
	interpreterProxy.storeIntegerofObjectwithValue(7, rcvr, bitPosition);
	interpreterProxy.storeIntegerofObjectwithValue(8, rcvr, byteIndex);
	interpreterProxy.storeIntegerofObjectwithValue(12, rcvr, sampleIndex);
	interpreterProxy.pop(1);
}

function primitiveDecodeStereo() {
	var rcvr;
	var count;
	var bit;
	var deltaLeft;
	var deltaRight;
	var i;
	var indexLeft;
	var indexRight;
	var predictedDeltaLeft;
	var predictedDeltaRight;
	var predictedLeft;
	var predictedRight;
	var stepLeft;
	var stepRight;
	var bitsPerSample;
	var deltaSignMask;
	var deltaValueHighBit;
	var deltaValueMask;
	var frameSizeMask;
	var index;
	var indexTable;
	var predicted;
	var rightSamples;
	var sampleIndex;
	var samples;


	/* make local copies of decoder state variables */

	rcvr = interpreterProxy.stackValue(1);
	count = interpreterProxy.stackIntegerValue(0);
	predicted = interpreterProxy.fetchInt16ArrayofObject(0, rcvr);
	index = interpreterProxy.fetchInt16ArrayofObject(1, rcvr);
	deltaSignMask = interpreterProxy.fetchIntegerofObject(2, rcvr);
	deltaValueMask = interpreterProxy.fetchIntegerofObject(3, rcvr);
	deltaValueHighBit = interpreterProxy.fetchIntegerofObject(4, rcvr);
	frameSizeMask = interpreterProxy.fetchIntegerofObject(5, rcvr);
	currentByte = interpreterProxy.fetchIntegerofObject(6, rcvr);
	bitPosition = interpreterProxy.fetchIntegerofObject(7, rcvr);
	byteIndex = interpreterProxy.fetchIntegerofObject(8, rcvr);
	encodedBytes = interpreterProxy.fetchBytesofObject(9, rcvr);
	samples = interpreterProxy.fetchInt16ArrayofObject(10, rcvr);
	rightSamples = interpreterProxy.fetchInt16ArrayofObject(11, rcvr);
	sampleIndex = interpreterProxy.fetchIntegerofObject(12, rcvr);
	bitsPerSample = interpreterProxy.fetchIntegerofObject(13, rcvr);
	stepSizeTable = interpreterProxy.fetchInt16ArrayofObject(14, rcvr);
	indexTable = interpreterProxy.fetchInt16ArrayofObject(15, rcvr);
	if (interpreterProxy.failed()) {
		return null;
	}
	predictedLeft = predicted[1 - 1];
	predictedRight = predicted[2 - 1];
	indexLeft = index[1 - 1];
	indexRight = index[2 - 1];
	for (i = 1; i <= count; i++) {
		if ((i & frameSizeMask) === 1) {

			/* start of frame; read frame header */

			predictedLeft = nextBits(16);
			indexLeft = nextBits(6);
			predictedRight = nextBits(16);
			indexRight = nextBits(6);
			if (predictedLeft > 32767) {
				predictedLeft -= 65536;
			}
			if (predictedRight > 32767) {
				predictedRight -= 65536;
			}
			samples[((++sampleIndex)) - 1] = predictedLeft;
			rightSamples[sampleIndex - 1] = predictedRight;
		} else {
			deltaLeft = nextBits(bitsPerSample);
			deltaRight = nextBits(bitsPerSample);
			stepLeft = stepSizeTable[indexLeft];
			stepRight = stepSizeTable[indexRight];
			predictedDeltaLeft = (predictedDeltaRight = 0);
			bit = deltaValueHighBit;
			while (bit > 0) {
				if ((deltaLeft & bit) > 0) {
					predictedDeltaLeft += stepLeft;
				}
				if ((deltaRight & bit) > 0) {
					predictedDeltaRight += stepRight;
				}
				stepLeft = stepLeft >>> 1;
				stepRight = stepRight >>> 1;
				bit = bit >>> 1;
			}
			predictedDeltaLeft += stepLeft;
			predictedDeltaRight += stepRight;
			if ((deltaLeft & deltaSignMask) > 0) {
				predictedLeft -= predictedDeltaLeft;
			} else {
				predictedLeft += predictedDeltaLeft;
			}
			if ((deltaRight & deltaSignMask) > 0) {
				predictedRight -= predictedDeltaRight;
			} else {
				predictedRight += predictedDeltaRight;
			}
			if (predictedLeft > 32767) {
				predictedLeft = 32767;
			} else {
				if (predictedLeft < -32768) {
					predictedLeft = -32768;
				}
			}
			if (predictedRight > 32767) {
				predictedRight = 32767;
			} else {
				if (predictedRight < -32768) {
					predictedRight = -32768;
				}
			}
			indexLeft += indexTable[deltaLeft & deltaValueMask];
			if (indexLeft < 0) {
				indexLeft = 0;
			} else {
				if (indexLeft > 88) {
					indexLeft = 88;
				}
			}
			indexRight += indexTable[deltaRight & deltaValueMask];
			if (indexRight < 0) {
				indexRight = 0;
			} else {
				if (indexRight > 88) {
					indexRight = 88;
				}
			}
			samples[((++sampleIndex)) - 1] = predictedLeft;
			rightSamples[sampleIndex - 1] = predictedRight;
		}
	}
	predicted[1 - 1] = predictedLeft;
	predicted[2 - 1] = predictedRight;
	index[1 - 1] = indexLeft;
	index[2 - 1] = indexRight;
	if (interpreterProxy.failed()) {
		return null;
	}
	interpreterProxy.storeIntegerofObjectwithValue(6, rcvr, currentByte);
	interpreterProxy.storeIntegerofObjectwithValue(7, rcvr, bitPosition);
	interpreterProxy.storeIntegerofObjectwithValue(8, rcvr, byteIndex);
	interpreterProxy.storeIntegerofObjectwithValue(12, rcvr, sampleIndex);
	interpreterProxy.pop(1);
}

function primitiveEncodeMono() {
	var rcvr;
	var count;
	var bit;
	var delta;
	var diff;
	var i;
	var p;
	var predictedDelta;
	var sign;
	var step;
	var bitsPerSample;
	var deltaSignMask;
	var deltaValueHighBit;
	var frameSizeMask;
	var index;
	var indexTable;
	var predicted;
	var sampleIndex;
	var samples;

	rcvr = interpreterProxy.stackValue(1);
	count = interpreterProxy.stackIntegerValue(0);
	predicted = interpreterProxy.fetchIntegerofObject(0, rcvr);
	index = interpreterProxy.fetchIntegerofObject(1, rcvr);
	deltaSignMask = interpreterProxy.fetchIntegerofObject(2, rcvr);
	deltaValueHighBit = interpreterProxy.fetchIntegerofObject(4, rcvr);
	frameSizeMask = interpreterProxy.fetchIntegerofObject(5, rcvr);
	currentByte = interpreterProxy.fetchIntegerofObject(6, rcvr);
	bitPosition = interpreterProxy.fetchIntegerofObject(7, rcvr);
	byteIndex = interpreterProxy.fetchIntegerofObject(8, rcvr);
	encodedBytes = interpreterProxy.fetchBytesofObject(9, rcvr);
	samples = interpreterProxy.fetchInt16ArrayofObject(10, rcvr);
	sampleIndex = interpreterProxy.fetchIntegerofObject(12, rcvr);
	bitsPerSample = interpreterProxy.fetchIntegerofObject(13, rcvr);
	stepSizeTable = interpreterProxy.fetchInt16ArrayofObject(14, rcvr);
	indexTable = interpreterProxy.fetchInt16ArrayofObject(15, rcvr);
	if (interpreterProxy.failed()) {
		return null;
	}
	step = stepSizeTable[1 - 1];
	for (i = 1; i <= count; i++) {
		if ((i & frameSizeMask) === 1) {
			predicted = samples[((++sampleIndex)) - 1];
			if (((p = predicted)) < 0) {
				p += 65536;
			}
			nextBitsput(16, p);
			if (i < count) {
				index = indexForDeltaFromto(predicted, samples[sampleIndex]);
			}
			nextBitsput(6, index);
		} else {

			/* compute sign and magnitude of difference from the predicted sample */

			sign = 0;
			diff = (samples[((++sampleIndex)) - 1]) - predicted;
			if (diff < 0) {
				sign = deltaSignMask;
				diff = 0 - diff;
			}
			delta = 0;
			predictedDelta = 0;
			bit = deltaValueHighBit;
			while (bit > 0) {
				if (diff >= step) {
					delta += bit;
					predictedDelta += step;
					diff -= step;
				}
				step = step >>> 1;
				bit = bit >>> 1;
			}

			/* compute and clamp new prediction */

			predictedDelta += step;
			if (sign > 0) {
				predicted -= predictedDelta;
			} else {
				predicted += predictedDelta;
			}
			if (predicted > 32767) {
				predicted = 32767;
			} else {
				if (predicted < -32768) {
					predicted = -32768;
				}
			}
			index += indexTable[delta];
			if (index < 0) {
				index = 0;
			} else {
				if (index > 88) {
					index = 88;
				}
			}

			/* output encoded, signed delta */

			step = stepSizeTable[index];
			nextBitsput(bitsPerSample, sign | delta);
		}
	}
	if (bitPosition > 0) {

		/* flush the last output byte, if necessary */

		encodedBytes[((++byteIndex)) - 1] = currentByte;
	}
	if (interpreterProxy.failed()) {
		return null;
	}
	interpreterProxy.storeIntegerofObjectwithValue(0, rcvr, predicted);
	interpreterProxy.storeIntegerofObjectwithValue(1, rcvr, index);
	interpreterProxy.storeIntegerofObjectwithValue(6, rcvr, currentByte);
	interpreterProxy.storeIntegerofObjectwithValue(7, rcvr, bitPosition);
	interpreterProxy.storeIntegerofObjectwithValue(8, rcvr, byteIndex);
	interpreterProxy.storeIntegerofObjectwithValue(12, rcvr, sampleIndex);
	interpreterProxy.pop(1);
}


/*	not yet implemented */

function primitiveEncodeStereo() {
	var rcvr;
	var count;

	rcvr = interpreterProxy.stackValue(1);
	count = interpreterProxy.stackIntegerValue(0);
	currentByte = interpreterProxy.fetchIntegerofObject(6, rcvr);
	bitPosition = interpreterProxy.fetchIntegerofObject(7, rcvr);
	byteIndex = interpreterProxy.fetchIntegerofObject(8, rcvr);
	encodedBytes = interpreterProxy.fetchIntegerofObject(9, rcvr);
	stepSizeTable = interpreterProxy.fetchIntegerofObject(14, rcvr);
	if (interpreterProxy.failed()) {
		return null;
	}
	success(false);
	if (interpreterProxy.failed()) {
		return null;
	}
	interpreterProxy.storeIntegerofObjectwithValue(6, rcvr, currentByte);
	interpreterProxy.storeIntegerofObjectwithValue(7, rcvr, bitPosition);
	interpreterProxy.storeIntegerofObjectwithValue(8, rcvr, byteIndex);
	interpreterProxy.pop(1);
}


/*	Note: This is coded so that is can be run from Squeak. */

function setInterpreter(anInterpreter) {
	var ok;

	interpreterProxy = anInterpreter;
	ok = interpreterProxy.majorVersion() == VM_PROXY_MAJOR;
	if (ok === false) {
		return false;
	}
	ok = interpreterProxy.minorVersion() >= VM_PROXY_MINOR;
	return ok;
}


Squeak.registerExternalModule("ADPCMCodecPlugin", {
	primitiveDecodeStereo: primitiveDecodeStereo,
	primitiveEncodeStereo: primitiveEncodeStereo,
	setInterpreter: setInterpreter,
	primitiveEncodeMono: primitiveEncodeMono,
	primitiveDecodeMono: primitiveDecodeMono,
	getModuleName: getModuleName,
});

}); // end of module
