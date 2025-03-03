'use strict';

var require$$0$4 = require('os');
var require$$0$3 = require('fs');
var require$$2$1 = require('process');
var require$$1$1 = require('path');
var require$$0$2 = require('events');
var require$$1 = require('https');
var require$$2 = require('http');
var require$$3 = require('net');
var require$$4 = require('tls');
var require$$0$1 = require('crypto');
var require$$6 = require('url');
var require$$0 = require('stream');

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

var node_app = {};

var permessageDeflate;
var hasRequiredPermessageDeflate;

function requirePermessageDeflate () {
	if (hasRequiredPermessageDeflate) return permessageDeflate;
	hasRequiredPermessageDeflate = 1;
	// ErikOnBike
	// The original code is removed since its usage might degrade performance and memory usage.
	permessageDeflate = {
	  extensionName: "PerMessageDeflate"
	};
	return permessageDeflate;
}

var constants;
var hasRequiredConstants;

function requireConstants () {
	if (hasRequiredConstants) return constants;
	hasRequiredConstants = 1;

	constants = {
	  BINARY_TYPES: ['nodebuffer', 'arraybuffer', 'fragments'],
	  GUID: '258EAFA5-E914-47DA-95CA-C5AB0DC85B11',
	  kStatusCode: Symbol('status-code'),
	  kWebSocket: Symbol('websocket'),
	  EMPTY_BUFFER: Buffer.alloc(0),
	  NOOP: () => {}
	};
	return constants;
}

var bufferUtil = {exports: {}};

var hasRequiredBufferUtil;

function requireBufferUtil () {
	if (hasRequiredBufferUtil) return bufferUtil.exports;
	hasRequiredBufferUtil = 1;

	const { EMPTY_BUFFER } = requireConstants();

	/**
	 * Merges an array of buffers into a new buffer.
	 *
	 * @param {Buffer[]} list The array of buffers to concat
	 * @param {Number} totalLength The total length of buffers in the list
	 * @return {Buffer} The resulting buffer
	 * @public
	 */
	function concat(list, totalLength) {
	  if (list.length === 0) return EMPTY_BUFFER;
	  if (list.length === 1) return list[0];

	  const target = Buffer.allocUnsafe(totalLength);
	  let offset = 0;

	  for (let i = 0; i < list.length; i++) {
	    const buf = list[i];
	    target.set(buf, offset);
	    offset += buf.length;
	  }

	  return target;
	}

	/**
	 * Masks a buffer using the given mask.
	 *
	 * @param {Buffer} source The buffer to mask
	 * @param {Buffer} mask The mask to use
	 * @param {Buffer} output The buffer where to store the result
	 * @param {Number} offset The offset at which to start writing
	 * @param {Number} length The number of bytes to mask.
	 * @public
	 */
	function _mask(source, mask, output, offset, length) {
	  for (let i = 0; i < length; i++) {
	    output[offset + i] = source[i] ^ mask[i & 3];
	  }
	}

	/**
	 * Unmasks a buffer using the given mask.
	 *
	 * @param {Buffer} buffer The buffer to unmask
	 * @param {Buffer} mask The mask to use
	 * @public
	 */
	function _unmask(buffer, mask) {
	  // Required until https://github.com/nodejs/node/issues/9006 is resolved.
	  const length = buffer.length;
	  for (let i = 0; i < length; i++) {
	    buffer[i] ^= mask[i & 3];
	  }
	}

	/**
	 * Converts a buffer to an `ArrayBuffer`.
	 *
	 * @param {Buffer} buf The buffer to convert
	 * @return {ArrayBuffer} Converted buffer
	 * @public
	 */
	function toArrayBuffer(buf) {
	  if (buf.byteLength === buf.buffer.byteLength) {
	    return buf.buffer;
	  }

	  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
	}

	/**
	 * Converts `data` to a `Buffer`.
	 *
	 * @param {*} data The data to convert
	 * @return {Buffer} The buffer
	 * @throws {TypeError}
	 * @public
	 */
	function toBuffer(data) {
	  toBuffer.readOnly = true;

	  if (Buffer.isBuffer(data)) return data;

	  let buf;

	  if (data instanceof ArrayBuffer) {
	    buf = Buffer.from(data);
	  } else if (ArrayBuffer.isView(data)) {
	    buf = viewToBuffer(data);
	  } else {
	    buf = Buffer.from(data);
	    toBuffer.readOnly = false;
	  }

	  return buf;
	}

	/**
	 * Converts an `ArrayBuffer` view into a buffer.
	 *
	 * @param {(DataView|TypedArray)} view The view to convert
	 * @return {Buffer} Converted view
	 * @private
	 */
	function viewToBuffer(view) {
	  const buf = Buffer.from(view.buffer);

	  if (view.byteLength !== view.buffer.byteLength) {
	    return buf.slice(view.byteOffset, view.byteOffset + view.byteLength);
	  }

	  return buf;
	}

	try {
	  const bufferUtil$1 = require('bufferutil');
	  const bu = bufferUtil$1.BufferUtil || bufferUtil$1;

	  bufferUtil.exports = {
	    concat,
	    mask(source, mask, output, offset, length) {
	      if (length < 48) _mask(source, mask, output, offset, length);
	      else bu.mask(source, mask, output, offset, length);
	    },
	    toArrayBuffer,
	    toBuffer,
	    unmask(buffer, mask) {
	      if (buffer.length < 32) _unmask(buffer, mask);
	      else bu.unmask(buffer, mask);
	    }
	  };
	} catch (e) /* istanbul ignore next */ {
	  bufferUtil.exports = {
	    concat,
	    mask: _mask,
	    toArrayBuffer,
	    toBuffer,
	    unmask: _unmask
	  };
	}
	return bufferUtil.exports;
}

var validation = {};

var hasRequiredValidation;

function requireValidation () {
	if (hasRequiredValidation) return validation;
	hasRequiredValidation = 1;

	try {
	  const isValidUTF8 = require('utf-8-validate');

	  validation.isValidUTF8 =
	    typeof isValidUTF8 === 'object'
	      ? isValidUTF8.Validation.isValidUTF8 // utf-8-validate@<3.0.0
	      : isValidUTF8;
	} catch (e) /* istanbul ignore next */ {
	  validation.isValidUTF8 = () => true;
	}

	/**
	 * Checks if a status code is allowed in a close frame.
	 *
	 * @param {Number} code The status code
	 * @return {Boolean} `true` if the status code is valid, else `false`
	 * @public
	 */
	validation.isValidStatusCode = (code) => {
	  return (
	    (code >= 1000 &&
	      code <= 1013 &&
	      code !== 1004 &&
	      code !== 1005 &&
	      code !== 1006) ||
	    (code >= 3000 && code <= 4999)
	  );
	};
	return validation;
}

var receiver;
var hasRequiredReceiver;

function requireReceiver () {
	if (hasRequiredReceiver) return receiver;
	hasRequiredReceiver = 1;

	const { Writable } = require$$0;

	const PerMessageDeflate = requirePermessageDeflate();
	const {
	  BINARY_TYPES,
	  EMPTY_BUFFER,
	  kStatusCode,
	  kWebSocket
	} = requireConstants();
	const { concat, toArrayBuffer, unmask } = requireBufferUtil();
	const { isValidStatusCode, isValidUTF8 } = requireValidation();

	const GET_INFO = 0;
	const GET_PAYLOAD_LENGTH_16 = 1;
	const GET_PAYLOAD_LENGTH_64 = 2;
	const GET_MASK = 3;
	const GET_DATA = 4;
	const INFLATING = 5;

	/**
	 * HyBi Receiver implementation.
	 *
	 * @extends stream.Writable
	 */
	class Receiver extends Writable {
	  /**
	   * Creates a Receiver instance.
	   *
	   * @param {String} binaryType The type for binary data
	   * @param {Object} extensions An object containing the negotiated extensions
	   * @param {Number} maxPayload The maximum allowed message length
	   */
	  constructor(binaryType, extensions, maxPayload) {
	    super();

	    this._binaryType = binaryType || BINARY_TYPES[0];
	    this[kWebSocket] = undefined;
	    this._extensions = extensions || {};
	    this._maxPayload = maxPayload | 0;

	    this._bufferedBytes = 0;
	    this._buffers = [];

	    this._compressed = false;
	    this._payloadLength = 0;
	    this._mask = undefined;
	    this._fragmented = 0;
	    this._masked = false;
	    this._fin = false;
	    this._opcode = 0;

	    this._totalPayloadLength = 0;
	    this._messageLength = 0;
	    this._fragments = [];

	    this._state = GET_INFO;
	    this._loop = false;
	  }

	  /**
	   * Implements `Writable.prototype._write()`.
	   *
	   * @param {Buffer} chunk The chunk of data to write
	   * @param {String} encoding The character encoding of `chunk`
	   * @param {Function} cb Callback
	   */
	  _write(chunk, encoding, cb) {
	    if (this._opcode === 0x08 && this._state == GET_INFO) return cb();

	    this._bufferedBytes += chunk.length;
	    this._buffers.push(chunk);
	    this.startLoop(cb);
	  }

	  /**
	   * Consumes `n` bytes from the buffered data.
	   *
	   * @param {Number} n The number of bytes to consume
	   * @return {Buffer} The consumed bytes
	   * @private
	   */
	  consume(n) {
	    this._bufferedBytes -= n;

	    if (n === this._buffers[0].length) return this._buffers.shift();

	    if (n < this._buffers[0].length) {
	      const buf = this._buffers[0];
	      this._buffers[0] = buf.slice(n);
	      return buf.slice(0, n);
	    }

	    const dst = Buffer.allocUnsafe(n);

	    do {
	      const buf = this._buffers[0];
	      const offset = dst.length - n;

	      if (n >= buf.length) {
	        dst.set(this._buffers.shift(), offset);
	      } else {
	        dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
	        this._buffers[0] = buf.slice(n);
	      }

	      n -= buf.length;
	    } while (n > 0);

	    return dst;
	  }

	  /**
	   * Starts the parsing loop.
	   *
	   * @param {Function} cb Callback
	   * @private
	   */
	  startLoop(cb) {
	    let err;
	    this._loop = true;

	    do {
	      switch (this._state) {
	        case GET_INFO:
	          err = this.getInfo();
	          break;
	        case GET_PAYLOAD_LENGTH_16:
	          err = this.getPayloadLength16();
	          break;
	        case GET_PAYLOAD_LENGTH_64:
	          err = this.getPayloadLength64();
	          break;
	        case GET_MASK:
	          this.getMask();
	          break;
	        case GET_DATA:
	          err = this.getData(cb);
	          break;
	        default:
	          // `INFLATING`
	          this._loop = false;
	          return;
	      }
	    } while (this._loop);

	    cb(err);
	  }

	  /**
	   * Reads the first two bytes of a frame.
	   *
	   * @return {(RangeError|undefined)} A possible error
	   * @private
	   */
	  getInfo() {
	    if (this._bufferedBytes < 2) {
	      this._loop = false;
	      return;
	    }

	    const buf = this.consume(2);

	    if ((buf[0] & 0x30) !== 0x00) {
	      this._loop = false;
	      return error(RangeError, 'RSV2 and RSV3 must be clear', true, 1002);
	    }

	    const compressed = (buf[0] & 0x40) === 0x40;

	    if (compressed && !this._extensions[PerMessageDeflate.extensionName]) {
	      this._loop = false;
	      return error(RangeError, 'RSV1 must be clear', true, 1002);
	    }

	    this._fin = (buf[0] & 0x80) === 0x80;
	    this._opcode = buf[0] & 0x0f;
	    this._payloadLength = buf[1] & 0x7f;

	    if (this._opcode === 0x00) {
	      if (compressed) {
	        this._loop = false;
	        return error(RangeError, 'RSV1 must be clear', true, 1002);
	      }

	      if (!this._fragmented) {
	        this._loop = false;
	        return error(RangeError, 'invalid opcode 0', true, 1002);
	      }

	      this._opcode = this._fragmented;
	    } else if (this._opcode === 0x01 || this._opcode === 0x02) {
	      if (this._fragmented) {
	        this._loop = false;
	        return error(RangeError, `invalid opcode ${this._opcode}`, true, 1002);
	      }

	      this._compressed = compressed;
	    } else if (this._opcode > 0x07 && this._opcode < 0x0b) {
	      if (!this._fin) {
	        this._loop = false;
	        return error(RangeError, 'FIN must be set', true, 1002);
	      }

	      if (compressed) {
	        this._loop = false;
	        return error(RangeError, 'RSV1 must be clear', true, 1002);
	      }

	      if (this._payloadLength > 0x7d) {
	        this._loop = false;
	        return error(
	          RangeError,
	          `invalid payload length ${this._payloadLength}`,
	          true,
	          1002
	        );
	      }
	    } else {
	      this._loop = false;
	      return error(RangeError, `invalid opcode ${this._opcode}`, true, 1002);
	    }

	    if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
	    this._masked = (buf[1] & 0x80) === 0x80;

	    if (this._payloadLength === 126) this._state = GET_PAYLOAD_LENGTH_16;
	    else if (this._payloadLength === 127) this._state = GET_PAYLOAD_LENGTH_64;
	    else return this.haveLength();
	  }

	  /**
	   * Gets extended payload length (7+16).
	   *
	   * @return {(RangeError|undefined)} A possible error
	   * @private
	   */
	  getPayloadLength16() {
	    if (this._bufferedBytes < 2) {
	      this._loop = false;
	      return;
	    }

	    this._payloadLength = this.consume(2).readUInt16BE(0);
	    return this.haveLength();
	  }

	  /**
	   * Gets extended payload length (7+64).
	   *
	   * @return {(RangeError|undefined)} A possible error
	   * @private
	   */
	  getPayloadLength64() {
	    if (this._bufferedBytes < 8) {
	      this._loop = false;
	      return;
	    }

	    const buf = this.consume(8);
	    const num = buf.readUInt32BE(0);

	    //
	    // The maximum safe integer in JavaScript is 2^53 - 1. An error is returned
	    // if payload length is greater than this number.
	    //
	    if (num > Math.pow(2, 53 - 32) - 1) {
	      this._loop = false;
	      return error(
	        RangeError,
	        'Unsupported WebSocket frame: payload length > 2^53 - 1',
	        false,
	        1009
	      );
	    }

	    this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
	    return this.haveLength();
	  }

	  /**
	   * Payload length has been read.
	   *
	   * @return {(RangeError|undefined)} A possible error
	   * @private
	   */
	  haveLength() {
	    if (this._payloadLength && this._opcode < 0x08) {
	      this._totalPayloadLength += this._payloadLength;
	      if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
	        this._loop = false;
	        return error(RangeError, 'Max payload size exceeded', false, 1009);
	      }
	    }

	    if (this._masked) this._state = GET_MASK;
	    else this._state = GET_DATA;
	  }

	  /**
	   * Reads mask bytes.
	   *
	   * @private
	   */
	  getMask() {
	    if (this._bufferedBytes < 4) {
	      this._loop = false;
	      return;
	    }

	    this._mask = this.consume(4);
	    this._state = GET_DATA;
	  }

	  /**
	   * Reads data bytes.
	   *
	   * @param {Function} cb Callback
	   * @return {(Error|RangeError|undefined)} A possible error
	   * @private
	   */
	  getData(cb) {
	    let data = EMPTY_BUFFER;

	    if (this._payloadLength) {
	      if (this._bufferedBytes < this._payloadLength) {
	        this._loop = false;
	        return;
	      }

	      data = this.consume(this._payloadLength);
	      if (this._masked) unmask(data, this._mask);
	    }

	    if (this._opcode > 0x07) return this.controlMessage(data);

	    if (this._compressed) {
	      this._state = INFLATING;
	      this.decompress(data, cb);
	      return;
	    }

	    if (data.length) {
	      //
	      // This message is not compressed so its lenght is the sum of the payload
	      // length of all fragments.
	      //
	      this._messageLength = this._totalPayloadLength;
	      this._fragments.push(data);
	    }

	    return this.dataMessage();
	  }

	  /**
	   * Decompresses data.
	   *
	   * @param {Buffer} data Compressed data
	   * @param {Function} cb Callback
	   * @private
	   */
	  decompress(data, cb) {
	    const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];

	    perMessageDeflate.decompress(data, this._fin, (err, buf) => {
	      if (err) return cb(err);

	      if (buf.length) {
	        this._messageLength += buf.length;
	        if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
	          return cb(
	            error(RangeError, 'Max payload size exceeded', false, 1009)
	          );
	        }

	        this._fragments.push(buf);
	      }

	      const er = this.dataMessage();
	      if (er) return cb(er);

	      this.startLoop(cb);
	    });
	  }

	  /**
	   * Handles a data message.
	   *
	   * @return {(Error|undefined)} A possible error
	   * @private
	   */
	  dataMessage() {
	    if (this._fin) {
	      const messageLength = this._messageLength;
	      const fragments = this._fragments;

	      this._totalPayloadLength = 0;
	      this._messageLength = 0;
	      this._fragmented = 0;
	      this._fragments = [];

	      if (this._opcode === 2) {
	        let data;

	        if (this._binaryType === 'nodebuffer') {
	          data = concat(fragments, messageLength);
	        } else if (this._binaryType === 'arraybuffer') {
	          data = toArrayBuffer(concat(fragments, messageLength));
	        } else {
	          data = fragments;
	        }

	        this.emit('message', data);
	      } else {
	        const buf = concat(fragments, messageLength);

	        if (!isValidUTF8(buf)) {
	          this._loop = false;
	          return error(Error, 'invalid UTF-8 sequence', true, 1007);
	        }

	        this.emit('message', buf.toString());
	      }
	    }

	    this._state = GET_INFO;
	  }

	  /**
	   * Handles a control message.
	   *
	   * @param {Buffer} data Data to handle
	   * @return {(Error|RangeError|undefined)} A possible error
	   * @private
	   */
	  controlMessage(data) {
	    if (this._opcode === 0x08) {
	      this._loop = false;

	      if (data.length === 0) {
	        this.emit('conclude', 1005, '');
	        this.end();
	      } else if (data.length === 1) {
	        return error(RangeError, 'invalid payload length 1', true, 1002);
	      } else {
	        const code = data.readUInt16BE(0);

	        if (!isValidStatusCode(code)) {
	          return error(RangeError, `invalid status code ${code}`, true, 1002);
	        }

	        const buf = data.slice(2);

	        if (!isValidUTF8(buf)) {
	          return error(Error, 'invalid UTF-8 sequence', true, 1007);
	        }

	        this.emit('conclude', code, buf.toString());
	        this.end();
	      }
	    } else if (this._opcode === 0x09) {
	      this.emit('ping', data);
	    } else {
	      this.emit('pong', data);
	    }

	    this._state = GET_INFO;
	  }
	}

	receiver = Receiver;

	/**
	 * Builds an error object.
	 *
	 * @param {(Error|RangeError)} ErrorCtor The error constructor
	 * @param {String} message The error message
	 * @param {Boolean} prefix Specifies whether or not to add a default prefix to
	 *     `message`
	 * @param {Number} statusCode The status code
	 * @return {(Error|RangeError)} The error
	 * @private
	 */
	function error(ErrorCtor, message, prefix, statusCode) {
	  const err = new ErrorCtor(
	    prefix ? `Invalid WebSocket frame: ${message}` : message
	  );

	  Error.captureStackTrace(err, error);
	  err[kStatusCode] = statusCode;
	  return err;
	}
	return receiver;
}

var sender;
var hasRequiredSender;

function requireSender () {
	if (hasRequiredSender) return sender;
	hasRequiredSender = 1;

	const { randomFillSync } = require$$0$1;

	const PerMessageDeflate = requirePermessageDeflate();
	const { EMPTY_BUFFER } = requireConstants();
	const { isValidStatusCode } = requireValidation();
	const { mask: applyMask, toBuffer } = requireBufferUtil();

	const mask = Buffer.alloc(4);

	/**
	 * HyBi Sender implementation.
	 */
	class Sender {
	  /**
	   * Creates a Sender instance.
	   *
	   * @param {net.Socket} socket The connection socket
	   * @param {Object} extensions An object containing the negotiated extensions
	   */
	  constructor(socket, extensions) {
	    this._extensions = extensions || {};
	    this._socket = socket;

	    this._firstFragment = true;
	    this._compress = false;

	    this._bufferedBytes = 0;
	    this._deflating = false;
	    this._queue = [];
	  }

	  /**
	   * Frames a piece of data according to the HyBi WebSocket protocol.
	   *
	   * @param {Buffer} data The data to frame
	   * @param {Object} options Options object
	   * @param {Number} options.opcode The opcode
	   * @param {Boolean} options.readOnly Specifies whether `data` can be modified
	   * @param {Boolean} options.fin Specifies whether or not to set the FIN bit
	   * @param {Boolean} options.mask Specifies whether or not to mask `data`
	   * @param {Boolean} options.rsv1 Specifies whether or not to set the RSV1 bit
	   * @return {Buffer[]} The framed data as a list of `Buffer` instances
	   * @public
	   */
	  static frame(data, options) {
	    const merge = options.mask && options.readOnly;
	    let offset = options.mask ? 6 : 2;
	    let payloadLength = data.length;

	    if (data.length >= 65536) {
	      offset += 8;
	      payloadLength = 127;
	    } else if (data.length > 125) {
	      offset += 2;
	      payloadLength = 126;
	    }

	    const target = Buffer.allocUnsafe(merge ? data.length + offset : offset);

	    target[0] = options.fin ? options.opcode | 0x80 : options.opcode;
	    if (options.rsv1) target[0] |= 0x40;

	    target[1] = payloadLength;

	    if (payloadLength === 126) {
	      target.writeUInt16BE(data.length, 2);
	    } else if (payloadLength === 127) {
	      target.writeUInt32BE(0, 2);
	      target.writeUInt32BE(data.length, 6);
	    }

	    if (!options.mask) return [target, data];

	    randomFillSync(mask, 0, 4);

	    target[1] |= 0x80;
	    target[offset - 4] = mask[0];
	    target[offset - 3] = mask[1];
	    target[offset - 2] = mask[2];
	    target[offset - 1] = mask[3];

	    if (merge) {
	      applyMask(data, mask, target, offset, data.length);
	      return [target];
	    }

	    applyMask(data, mask, data, 0, data.length);
	    return [target, data];
	  }

	  /**
	   * Sends a close message to the other peer.
	   *
	   * @param {(Number|undefined)} code The status code component of the body
	   * @param {String} data The message component of the body
	   * @param {Boolean} mask Specifies whether or not to mask the message
	   * @param {Function} cb Callback
	   * @public
	   */
	  close(code, data, mask, cb) {
	    let buf;

	    if (code === undefined) {
	      buf = EMPTY_BUFFER;
	    } else if (typeof code !== 'number' || !isValidStatusCode(code)) {
	      throw new TypeError('First argument must be a valid error code number');
	    } else if (data === undefined || data === '') {
	      buf = Buffer.allocUnsafe(2);
	      buf.writeUInt16BE(code, 0);
	    } else {
	      buf = Buffer.allocUnsafe(2 + Buffer.byteLength(data));
	      buf.writeUInt16BE(code, 0);
	      buf.write(data, 2);
	    }

	    if (this._deflating) {
	      this.enqueue([this.doClose, buf, mask, cb]);
	    } else {
	      this.doClose(buf, mask, cb);
	    }
	  }

	  /**
	   * Frames and sends a close message.
	   *
	   * @param {Buffer} data The message to send
	   * @param {Boolean} mask Specifies whether or not to mask `data`
	   * @param {Function} cb Callback
	   * @private
	   */
	  doClose(data, mask, cb) {
	    this.sendFrame(
	      Sender.frame(data, {
	        fin: true,
	        rsv1: false,
	        opcode: 0x08,
	        mask,
	        readOnly: false
	      }),
	      cb
	    );
	  }

	  /**
	   * Sends a ping message to the other peer.
	   *
	   * @param {*} data The message to send
	   * @param {Boolean} mask Specifies whether or not to mask `data`
	   * @param {Function} cb Callback
	   * @public
	   */
	  ping(data, mask, cb) {
	    const buf = toBuffer(data);

	    if (this._deflating) {
	      this.enqueue([this.doPing, buf, mask, toBuffer.readOnly, cb]);
	    } else {
	      this.doPing(buf, mask, toBuffer.readOnly, cb);
	    }
	  }

	  /**
	   * Frames and sends a ping message.
	   *
	   * @param {*} data The message to send
	   * @param {Boolean} mask Specifies whether or not to mask `data`
	   * @param {Boolean} readOnly Specifies whether `data` can be modified
	   * @param {Function} cb Callback
	   * @private
	   */
	  doPing(data, mask, readOnly, cb) {
	    this.sendFrame(
	      Sender.frame(data, {
	        fin: true,
	        rsv1: false,
	        opcode: 0x09,
	        mask,
	        readOnly
	      }),
	      cb
	    );
	  }

	  /**
	   * Sends a pong message to the other peer.
	   *
	   * @param {*} data The message to send
	   * @param {Boolean} mask Specifies whether or not to mask `data`
	   * @param {Function} cb Callback
	   * @public
	   */
	  pong(data, mask, cb) {
	    const buf = toBuffer(data);

	    if (this._deflating) {
	      this.enqueue([this.doPong, buf, mask, toBuffer.readOnly, cb]);
	    } else {
	      this.doPong(buf, mask, toBuffer.readOnly, cb);
	    }
	  }

	  /**
	   * Frames and sends a pong message.
	   *
	   * @param {*} data The message to send
	   * @param {Boolean} mask Specifies whether or not to mask `data`
	   * @param {Boolean} readOnly Specifies whether `data` can be modified
	   * @param {Function} cb Callback
	   * @private
	   */
	  doPong(data, mask, readOnly, cb) {
	    this.sendFrame(
	      Sender.frame(data, {
	        fin: true,
	        rsv1: false,
	        opcode: 0x0a,
	        mask,
	        readOnly
	      }),
	      cb
	    );
	  }

	  /**
	   * Sends a data message to the other peer.
	   *
	   * @param {*} data The message to send
	   * @param {Object} options Options object
	   * @param {Boolean} options.compress Specifies whether or not to compress `data`
	   * @param {Boolean} options.binary Specifies whether `data` is binary or text
	   * @param {Boolean} options.fin Specifies whether the fragment is the last one
	   * @param {Boolean} options.mask Specifies whether or not to mask `data`
	   * @param {Function} cb Callback
	   * @public
	   */
	  send(data, options, cb) {
	    const buf = toBuffer(data);
	    const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
	    let opcode = options.binary ? 2 : 1;
	    let rsv1 = options.compress;

	    if (this._firstFragment) {
	      this._firstFragment = false;
	      if (rsv1 && perMessageDeflate) {
	        rsv1 = buf.length >= perMessageDeflate._threshold;
	      }
	      this._compress = rsv1;
	    } else {
	      rsv1 = false;
	      opcode = 0;
	    }

	    if (options.fin) this._firstFragment = true;

	    if (perMessageDeflate) {
	      const opts = {
	        fin: options.fin,
	        rsv1,
	        opcode,
	        mask: options.mask,
	        readOnly: toBuffer.readOnly
	      };

	      if (this._deflating) {
	        this.enqueue([this.dispatch, buf, this._compress, opts, cb]);
	      } else {
	        this.dispatch(buf, this._compress, opts, cb);
	      }
	    } else {
	      this.sendFrame(
	        Sender.frame(buf, {
	          fin: options.fin,
	          rsv1: false,
	          opcode,
	          mask: options.mask,
	          readOnly: toBuffer.readOnly
	        }),
	        cb
	      );
	    }
	  }

	  /**
	   * Dispatches a data message.
	   *
	   * @param {Buffer} data The message to send
	   * @param {Boolean} compress Specifies whether or not to compress `data`
	   * @param {Object} options Options object
	   * @param {Number} options.opcode The opcode
	   * @param {Boolean} options.readOnly Specifies whether `data` can be modified
	   * @param {Boolean} options.fin Specifies whether or not to set the FIN bit
	   * @param {Boolean} options.mask Specifies whether or not to mask `data`
	   * @param {Boolean} options.rsv1 Specifies whether or not to set the RSV1 bit
	   * @param {Function} cb Callback
	   * @private
	   */
	  dispatch(data, compress, options, cb) {
	    if (!compress) {
	      this.sendFrame(Sender.frame(data, options), cb);
	      return;
	    }

	    const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];

	    this._deflating = true;
	    perMessageDeflate.compress(data, options.fin, (_, buf) => {
	      this._deflating = false;
	      options.readOnly = false;
	      this.sendFrame(Sender.frame(buf, options), cb);
	      this.dequeue();
	    });
	  }

	  /**
	   * Executes queued send operations.
	   *
	   * @private
	   */
	  dequeue() {
	    while (!this._deflating && this._queue.length) {
	      const params = this._queue.shift();

	      this._bufferedBytes -= params[1].length;
	      Reflect.apply(params[0], this, params.slice(1));
	    }
	  }

	  /**
	   * Enqueues a send operation.
	   *
	   * @param {Array} params Send operation parameters.
	   * @private
	   */
	  enqueue(params) {
	    this._bufferedBytes += params[1].length;
	    this._queue.push(params);
	  }

	  /**
	   * Sends a frame.
	   *
	   * @param {Buffer[]} list The frame to send
	   * @param {Function} cb Callback
	   * @private
	   */
	  sendFrame(list, cb) {
	    if (list.length === 2) {
	      this._socket.cork();
	      this._socket.write(list[0]);
	      this._socket.write(list[1], cb);
	      this._socket.uncork();
	    } else {
	      this._socket.write(list[0], cb);
	    }
	  }
	}

	sender = Sender;
	return sender;
}

var eventTarget;
var hasRequiredEventTarget;

function requireEventTarget () {
	if (hasRequiredEventTarget) return eventTarget;
	hasRequiredEventTarget = 1;

	/**
	 * Class representing an event.
	 *
	 * @private
	 */
	class Event {
	  /**
	   * Create a new `Event`.
	   *
	   * @param {String} type The name of the event
	   * @param {Object} target A reference to the target to which the event was dispatched
	   */
	  constructor(type, target) {
	    this.target = target;
	    this.type = type;
	  }
	}

	/**
	 * Class representing a message event.
	 *
	 * @extends Event
	 * @private
	 */
	class MessageEvent extends Event {
	  /**
	   * Create a new `MessageEvent`.
	   *
	   * @param {(String|Buffer|ArrayBuffer|Buffer[])} data The received data
	   * @param {WebSocket} target A reference to the target to which the event was dispatched
	   */
	  constructor(data, target) {
	    super('message', target);

	    this.data = data;
	  }
	}

	/**
	 * Class representing a close event.
	 *
	 * @extends Event
	 * @private
	 */
	class CloseEvent extends Event {
	  /**
	   * Create a new `CloseEvent`.
	   *
	   * @param {Number} code The status code explaining why the connection is being closed
	   * @param {String} reason A human-readable string explaining why the connection is closing
	   * @param {WebSocket} target A reference to the target to which the event was dispatched
	   */
	  constructor(code, reason, target) {
	    super('close', target);

	    this.wasClean = target._closeFrameReceived && target._closeFrameSent;
	    this.reason = reason;
	    this.code = code;
	  }
	}

	/**
	 * Class representing an open event.
	 *
	 * @extends Event
	 * @private
	 */
	class OpenEvent extends Event {
	  /**
	   * Create a new `OpenEvent`.
	   *
	   * @param {WebSocket} target A reference to the target to which the event was dispatched
	   */
	  constructor(target) {
	    super('open', target);
	  }
	}

	/**
	 * Class representing an error event.
	 *
	 * @extends Event
	 * @private
	 */
	class ErrorEvent extends Event {
	  /**
	   * Create a new `ErrorEvent`.
	   *
	   * @param {Object} error The error that generated this event
	   * @param {WebSocket} target A reference to the target to which the event was dispatched
	   */
	  constructor(error, target) {
	    super('error', target);

	    this.message = error.message;
	    this.error = error;
	  }
	}

	/**
	 * This provides methods for emulating the `EventTarget` interface. It's not
	 * meant to be used directly.
	 *
	 * @mixin
	 */
	const EventTarget = {
	  /**
	   * Register an event listener.
	   *
	   * @param {String} method A string representing the event type to listen for
	   * @param {Function} listener The listener to add
	   * @public
	   */
	  addEventListener(method, listener) {
	    if (typeof listener !== 'function') return;

	    function onMessage(data) {
	      listener.call(this, new MessageEvent(data, this));
	    }

	    function onClose(code, message) {
	      listener.call(this, new CloseEvent(code, message, this));
	    }

	    function onError(error) {
	      listener.call(this, new ErrorEvent(error, this));
	    }

	    function onOpen() {
	      listener.call(this, new OpenEvent(this));
	    }

	    if (method === 'message') {
	      onMessage._listener = listener;
	      this.on(method, onMessage);
	    } else if (method === 'close') {
	      onClose._listener = listener;
	      this.on(method, onClose);
	    } else if (method === 'error') {
	      onError._listener = listener;
	      this.on(method, onError);
	    } else if (method === 'open') {
	      onOpen._listener = listener;
	      this.on(method, onOpen);
	    } else {
	      this.on(method, listener);
	    }
	  },

	  /**
	   * Remove an event listener.
	   *
	   * @param {String} method A string representing the event type to remove
	   * @param {Function} listener The listener to remove
	   * @public
	   */
	  removeEventListener(method, listener) {
	    const listeners = this.listeners(method);

	    for (let i = 0; i < listeners.length; i++) {
	      if (listeners[i] === listener || listeners[i]._listener === listener) {
	        this.removeListener(method, listeners[i]);
	      }
	    }
	  }
	};

	eventTarget = EventTarget;
	return eventTarget;
}

var extension;
var hasRequiredExtension;

function requireExtension () {
	if (hasRequiredExtension) return extension;
	hasRequiredExtension = 1;

	//
	// Allowed token characters:
	//
	// '!', '#', '$', '%', '&', ''', '*', '+', '-',
	// '.', 0-9, A-Z, '^', '_', '`', a-z, '|', '~'
	//
	// tokenChars[32] === 0 // ' '
	// tokenChars[33] === 1 // '!'
	// tokenChars[34] === 0 // '"'
	// ...
	//
	// prettier-ignore
	const tokenChars = [
	  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 0 - 15
	  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 16 - 31
	  0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0, // 32 - 47
	  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, // 48 - 63
	  0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 64 - 79
	  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, // 80 - 95
	  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 96 - 111
	  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0 // 112 - 127
	];

	/**
	 * Adds an offer to the map of extension offers or a parameter to the map of
	 * parameters.
	 *
	 * @param {Object} dest The map of extension offers or parameters
	 * @param {String} name The extension or parameter name
	 * @param {(Object|Boolean|String)} elem The extension parameters or the
	 *     parameter value
	 * @private
	 */
	function push(dest, name, elem) {
	  if (dest[name] === undefined) dest[name] = [elem];
	  else dest[name].push(elem);
	}

	/**
	 * Parses the `Sec-WebSocket-Extensions` header into an object.
	 *
	 * @param {String} header The field value of the header
	 * @return {Object} The parsed object
	 * @public
	 */
	function parse(header) {
	  const offers = Object.create(null);

	  if (header === undefined || header === '') return offers;

	  let params = Object.create(null);
	  let mustUnescape = false;
	  let isEscaping = false;
	  let inQuotes = false;
	  let extensionName;
	  let paramName;
	  let start = -1;
	  let end = -1;
	  let i = 0;

	  for (; i < header.length; i++) {
	    const code = header.charCodeAt(i);

	    if (extensionName === undefined) {
	      if (end === -1 && tokenChars[code] === 1) {
	        if (start === -1) start = i;
	      } else if (code === 0x20 /* ' ' */ || code === 0x09 /* '\t' */) {
	        if (end === -1 && start !== -1) end = i;
	      } else if (code === 0x3b /* ';' */ || code === 0x2c /* ',' */) {
	        if (start === -1) {
	          throw new SyntaxError(`Unexpected character at index ${i}`);
	        }

	        if (end === -1) end = i;
	        const name = header.slice(start, end);
	        if (code === 0x2c) {
	          push(offers, name, params);
	          params = Object.create(null);
	        } else {
	          extensionName = name;
	        }

	        start = end = -1;
	      } else {
	        throw new SyntaxError(`Unexpected character at index ${i}`);
	      }
	    } else if (paramName === undefined) {
	      if (end === -1 && tokenChars[code] === 1) {
	        if (start === -1) start = i;
	      } else if (code === 0x20 || code === 0x09) {
	        if (end === -1 && start !== -1) end = i;
	      } else if (code === 0x3b || code === 0x2c) {
	        if (start === -1) {
	          throw new SyntaxError(`Unexpected character at index ${i}`);
	        }

	        if (end === -1) end = i;
	        push(params, header.slice(start, end), true);
	        if (code === 0x2c) {
	          push(offers, extensionName, params);
	          params = Object.create(null);
	          extensionName = undefined;
	        }

	        start = end = -1;
	      } else if (code === 0x3d /* '=' */ && start !== -1 && end === -1) {
	        paramName = header.slice(start, i);
	        start = end = -1;
	      } else {
	        throw new SyntaxError(`Unexpected character at index ${i}`);
	      }
	    } else {
	      //
	      // The value of a quoted-string after unescaping must conform to the
	      // token ABNF, so only token characters are valid.
	      // Ref: https://tools.ietf.org/html/rfc6455#section-9.1
	      //
	      if (isEscaping) {
	        if (tokenChars[code] !== 1) {
	          throw new SyntaxError(`Unexpected character at index ${i}`);
	        }
	        if (start === -1) start = i;
	        else if (!mustUnescape) mustUnescape = true;
	        isEscaping = false;
	      } else if (inQuotes) {
	        if (tokenChars[code] === 1) {
	          if (start === -1) start = i;
	        } else if (code === 0x22 /* '"' */ && start !== -1) {
	          inQuotes = false;
	          end = i;
	        } else if (code === 0x5c /* '\' */) {
	          isEscaping = true;
	        } else {
	          throw new SyntaxError(`Unexpected character at index ${i}`);
	        }
	      } else if (code === 0x22 && header.charCodeAt(i - 1) === 0x3d) {
	        inQuotes = true;
	      } else if (end === -1 && tokenChars[code] === 1) {
	        if (start === -1) start = i;
	      } else if (start !== -1 && (code === 0x20 || code === 0x09)) {
	        if (end === -1) end = i;
	      } else if (code === 0x3b || code === 0x2c) {
	        if (start === -1) {
	          throw new SyntaxError(`Unexpected character at index ${i}`);
	        }

	        if (end === -1) end = i;
	        let value = header.slice(start, end);
	        if (mustUnescape) {
	          value = value.replace(/\\/g, '');
	          mustUnescape = false;
	        }
	        push(params, paramName, value);
	        if (code === 0x2c) {
	          push(offers, extensionName, params);
	          params = Object.create(null);
	          extensionName = undefined;
	        }

	        paramName = undefined;
	        start = end = -1;
	      } else {
	        throw new SyntaxError(`Unexpected character at index ${i}`);
	      }
	    }
	  }

	  if (start === -1 || inQuotes) {
	    throw new SyntaxError('Unexpected end of input');
	  }

	  if (end === -1) end = i;
	  const token = header.slice(start, end);
	  if (extensionName === undefined) {
	    push(offers, token, params);
	  } else {
	    if (paramName === undefined) {
	      push(params, token, true);
	    } else if (mustUnescape) {
	      push(params, paramName, token.replace(/\\/g, ''));
	    } else {
	      push(params, paramName, token);
	    }
	    push(offers, extensionName, params);
	  }

	  return offers;
	}

	/**
	 * Builds the `Sec-WebSocket-Extensions` header field value.
	 *
	 * @param {Object} extensions The map of extensions and parameters to format
	 * @return {String} A string representing the given object
	 * @public
	 */
	function format(extensions) {
	  return Object.keys(extensions)
	    .map((extension) => {
	      let configurations = extensions[extension];
	      if (!Array.isArray(configurations)) configurations = [configurations];
	      return configurations
	        .map((params) => {
	          return [extension]
	            .concat(
	              Object.keys(params).map((k) => {
	                let values = params[k];
	                if (!Array.isArray(values)) values = [values];
	                return values
	                  .map((v) => (v === true ? k : `${k}=${v}`))
	                  .join('; ');
	              })
	            )
	            .join('; ');
	        })
	        .join(', ');
	    })
	    .join(', ');
	}

	extension = { format, parse };
	return extension;
}

var websocket;
var hasRequiredWebsocket;

function requireWebsocket () {
	if (hasRequiredWebsocket) return websocket;
	hasRequiredWebsocket = 1;

	const EventEmitter = require$$0$2;
	const https = require$$1;
	const http = require$$2;
	const net = require$$3;
	const tls = require$$4;
	const { randomBytes, createHash } = require$$0$1;
	const { URL } = require$$6;

	const PerMessageDeflate = requirePermessageDeflate();
	const Receiver = requireReceiver();
	const Sender = requireSender();
	const {
	  BINARY_TYPES,
	  EMPTY_BUFFER,
	  GUID,
	  kStatusCode,
	  kWebSocket,
	  NOOP
	} = requireConstants();
	const { addEventListener, removeEventListener } = requireEventTarget();
	const { format, parse } = requireExtension();
	const { toBuffer } = requireBufferUtil();

	const readyStates = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
	const protocolVersions = [8, 13];
	const closeTimeout = 30 * 1000;

	/**
	 * Class representing a WebSocket.
	 *
	 * @extends EventEmitter
	 */
	class WebSocket extends EventEmitter {
	  /**
	   * Create a new `WebSocket`.
	   *
	   * @param {(String|url.URL)} address The URL to which to connect
	   * @param {(String|String[])} protocols The subprotocols
	   * @param {Object} options Connection options
	   */
	  constructor(address, protocols, options) {
	    super();

	    this.readyState = WebSocket.CONNECTING;
	    this.protocol = '';

	    this._binaryType = BINARY_TYPES[0];
	    this._closeFrameReceived = false;
	    this._closeFrameSent = false;
	    this._closeMessage = '';
	    this._closeTimer = null;
	    this._closeCode = 1006;
	    this._extensions = {};
	    this._receiver = null;
	    this._sender = null;
	    this._socket = null;

	    if (address !== null) {
	      this._bufferedAmount = 0;
	      this._isServer = false;
	      this._redirects = 0;

	      if (Array.isArray(protocols)) {
	        protocols = protocols.join(', ');
	      } else if (typeof protocols === 'object' && protocols !== null) {
	        options = protocols;
	        protocols = undefined;
	      }

	      initAsClient(this, address, protocols, options);
	    } else {
	      this._isServer = true;
	    }
	  }

	  get CONNECTING() {
	    return WebSocket.CONNECTING;
	  }
	  get CLOSING() {
	    return WebSocket.CLOSING;
	  }
	  get CLOSED() {
	    return WebSocket.CLOSED;
	  }
	  get OPEN() {
	    return WebSocket.OPEN;
	  }

	  /**
	   * This deviates from the WHATWG interface since ws doesn't support the
	   * required default "blob" type (instead we define a custom "nodebuffer"
	   * type).
	   *
	   * @type {String}
	   */
	  get binaryType() {
	    return this._binaryType;
	  }

	  set binaryType(type) {
	    if (!BINARY_TYPES.includes(type)) return;

	    this._binaryType = type;

	    //
	    // Allow to change `binaryType` on the fly.
	    //
	    if (this._receiver) this._receiver._binaryType = type;
	  }

	  /**
	   * @type {Number}
	   */
	  get bufferedAmount() {
	    if (!this._socket) return this._bufferedAmount;

	    //
	    // `socket.bufferSize` is `undefined` if the socket is closed.
	    //
	    return (this._socket.bufferSize || 0) + this._sender._bufferedBytes;
	  }

	  /**
	   * @type {String}
	   */
	  get extensions() {
	    return Object.keys(this._extensions).join();
	  }

	  /**
	   * Set up the socket and the internal resources.
	   *
	   * @param {net.Socket} socket The network socket between the server and client
	   * @param {Buffer} head The first packet of the upgraded stream
	   * @param {Number} maxPayload The maximum allowed message size
	   * @private
	   */
	  setSocket(socket, head, maxPayload) {
	    const receiver = new Receiver(
	      this._binaryType,
	      this._extensions,
	      maxPayload
	    );

	    this._sender = new Sender(socket, this._extensions);
	    this._receiver = receiver;
	    this._socket = socket;

	    receiver[kWebSocket] = this;
	    socket[kWebSocket] = this;

	    receiver.on('conclude', receiverOnConclude);
	    receiver.on('drain', receiverOnDrain);
	    receiver.on('error', receiverOnError);
	    receiver.on('message', receiverOnMessage);
	    receiver.on('ping', receiverOnPing);
	    receiver.on('pong', receiverOnPong);

	    socket.setTimeout(0);
	    socket.setNoDelay();

	    if (head.length > 0) socket.unshift(head);

	    socket.on('close', socketOnClose);
	    socket.on('data', socketOnData);
	    socket.on('end', socketOnEnd);
	    socket.on('error', socketOnError);

	    this.readyState = WebSocket.OPEN;
	    this.emit('open');
	  }

	  /**
	   * Emit the `'close'` event.
	   *
	   * @private
	   */
	  emitClose() {
	    this.readyState = WebSocket.CLOSED;

	    if (!this._socket) {
	      this.emit('close', this._closeCode, this._closeMessage);
	      return;
	    }

	    if (this._extensions[PerMessageDeflate.extensionName]) {
	      this._extensions[PerMessageDeflate.extensionName].cleanup();
	    }

	    this._receiver.removeAllListeners();
	    this.emit('close', this._closeCode, this._closeMessage);
	  }

	  /**
	   * Start a closing handshake.
	   *
	   *          +----------+   +-----------+   +----------+
	   *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
	   *    |     +----------+   +-----------+   +----------+     |
	   *          +----------+   +-----------+         |
	   * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
	   *          +----------+   +-----------+   |
	   *    |           |                        |   +---+        |
	   *                +------------------------+-->|fin| - - - -
	   *    |         +---+                      |   +---+
	   *     - - - - -|fin|<---------------------+
	   *              +---+
	   *
	   * @param {Number} code Status code explaining why the connection is closing
	   * @param {String} data A string explaining why the connection is closing
	   * @public
	   */
	  close(code, data) {
	    if (this.readyState === WebSocket.CLOSED) return;
	    if (this.readyState === WebSocket.CONNECTING) {
	      const msg = 'WebSocket was closed before the connection was established';
	      return abortHandshake(this, this._req, msg);
	    }

	    if (this.readyState === WebSocket.CLOSING) {
	      if (this._closeFrameSent && this._closeFrameReceived) this._socket.end();
	      return;
	    }

	    this.readyState = WebSocket.CLOSING;
	    this._sender.close(code, data, !this._isServer, (err) => {
	      //
	      // This error is handled by the `'error'` listener on the socket. We only
	      // want to know if the close frame has been sent here.
	      //
	      if (err) return;

	      this._closeFrameSent = true;
	      if (this._closeFrameReceived) this._socket.end();
	    });

	    //
	    // Specify a timeout for the closing handshake to complete.
	    //
	    this._closeTimer = setTimeout(
	      this._socket.destroy.bind(this._socket),
	      closeTimeout
	    );
	  }

	  /**
	   * Send a ping.
	   *
	   * @param {*} data The data to send
	   * @param {Boolean} mask Indicates whether or not to mask `data`
	   * @param {Function} cb Callback which is executed when the ping is sent
	   * @public
	   */
	  ping(data, mask, cb) {
	    if (this.readyState === WebSocket.CONNECTING) {
	      throw new Error('WebSocket is not open: readyState 0 (CONNECTING)');
	    }

	    if (typeof data === 'function') {
	      cb = data;
	      data = mask = undefined;
	    } else if (typeof mask === 'function') {
	      cb = mask;
	      mask = undefined;
	    }

	    if (typeof data === 'number') data = data.toString();

	    if (this.readyState !== WebSocket.OPEN) {
	      sendAfterClose(this, data, cb);
	      return;
	    }

	    if (mask === undefined) mask = !this._isServer;
	    this._sender.ping(data || EMPTY_BUFFER, mask, cb);
	  }

	  /**
	   * Send a pong.
	   *
	   * @param {*} data The data to send
	   * @param {Boolean} mask Indicates whether or not to mask `data`
	   * @param {Function} cb Callback which is executed when the pong is sent
	   * @public
	   */
	  pong(data, mask, cb) {
	    if (this.readyState === WebSocket.CONNECTING) {
	      throw new Error('WebSocket is not open: readyState 0 (CONNECTING)');
	    }

	    if (typeof data === 'function') {
	      cb = data;
	      data = mask = undefined;
	    } else if (typeof mask === 'function') {
	      cb = mask;
	      mask = undefined;
	    }

	    if (typeof data === 'number') data = data.toString();

	    if (this.readyState !== WebSocket.OPEN) {
	      sendAfterClose(this, data, cb);
	      return;
	    }

	    if (mask === undefined) mask = !this._isServer;
	    this._sender.pong(data || EMPTY_BUFFER, mask, cb);
	  }

	  /**
	   * Send a data message.
	   *
	   * @param {*} data The message to send
	   * @param {Object} options Options object
	   * @param {Boolean} options.compress Specifies whether or not to compress
	   *     `data`
	   * @param {Boolean} options.binary Specifies whether `data` is binary or text
	   * @param {Boolean} options.fin Specifies whether the fragment is the last one
	   * @param {Boolean} options.mask Specifies whether or not to mask `data`
	   * @param {Function} cb Callback which is executed when data is written out
	   * @public
	   */
	  send(data, options, cb) {
	    if (this.readyState === WebSocket.CONNECTING) {
	      throw new Error('WebSocket is not open: readyState 0 (CONNECTING)');
	    }

	    if (typeof options === 'function') {
	      cb = options;
	      options = {};
	    }

	    if (typeof data === 'number') data = data.toString();

	    if (this.readyState !== WebSocket.OPEN) {
	      sendAfterClose(this, data, cb);
	      return;
	    }

	    const opts = {
	      binary: typeof data !== 'string',
	      mask: !this._isServer,
	      compress: true,
	      fin: true,
	      ...options
	    };

	    if (!this._extensions[PerMessageDeflate.extensionName]) {
	      opts.compress = false;
	    }

	    this._sender.send(data || EMPTY_BUFFER, opts, cb);
	  }

	  /**
	   * Forcibly close the connection.
	   *
	   * @public
	   */
	  terminate() {
	    if (this.readyState === WebSocket.CLOSED) return;
	    if (this.readyState === WebSocket.CONNECTING) {
	      const msg = 'WebSocket was closed before the connection was established';
	      return abortHandshake(this, this._req, msg);
	    }

	    if (this._socket) {
	      this.readyState = WebSocket.CLOSING;
	      this._socket.destroy();
	    }
	  }
	}

	readyStates.forEach((readyState, i) => {
	  WebSocket[readyState] = i;
	});

	//
	// Add the `onopen`, `onerror`, `onclose`, and `onmessage` attributes.
	// See https://html.spec.whatwg.org/multipage/comms.html#the-websocket-interface
	//
	['open', 'error', 'close', 'message'].forEach((method) => {
	  Object.defineProperty(WebSocket.prototype, `on${method}`, {
	    /**
	     * Return the listener of the event.
	     *
	     * @return {(Function|undefined)} The event listener or `undefined`
	     * @public
	     */
	    get() {
	      const listeners = this.listeners(method);
	      for (let i = 0; i < listeners.length; i++) {
	        if (listeners[i]._listener) return listeners[i]._listener;
	      }

	      return undefined;
	    },
	    /**
	     * Add a listener for the event.
	     *
	     * @param {Function} listener The listener to add
	     * @public
	     */
	    set(listener) {
	      const listeners = this.listeners(method);
	      for (let i = 0; i < listeners.length; i++) {
	        //
	        // Remove only the listeners added via `addEventListener`.
	        //
	        if (listeners[i]._listener) this.removeListener(method, listeners[i]);
	      }
	      this.addEventListener(method, listener);
	    }
	  });
	});

	WebSocket.prototype.addEventListener = addEventListener;
	WebSocket.prototype.removeEventListener = removeEventListener;

	websocket = WebSocket;

	/**
	 * Initialize a WebSocket client.
	 *
	 * @param {WebSocket} websocket The client to initialize
	 * @param {(String|url.URL)} address The URL to which to connect
	 * @param {String} protocols The subprotocols
	 * @param {Object} options Connection options
	 * @param {(Boolean|Object)} options.perMessageDeflate Enable/disable
	 *     permessage-deflate
	 * @param {Number} options.handshakeTimeout Timeout in milliseconds for the
	 *     handshake request
	 * @param {Number} options.protocolVersion Value of the `Sec-WebSocket-Version`
	 *     header
	 * @param {String} options.origin Value of the `Origin` or
	 *     `Sec-WebSocket-Origin` header
	 * @param {Number} options.maxPayload The maximum allowed message size
	 * @param {Boolean} options.followRedirects Whether or not to follow redirects
	 * @param {Number} options.maxRedirects The maximum number of redirects allowed
	 * @private
	 */
	function initAsClient(websocket, address, protocols, options) {
	  const opts = {
	    protocolVersion: protocolVersions[1],
	    maxPayload: 100 * 1024 * 1024,
	    perMessageDeflate: true,
	    followRedirects: false,
	    maxRedirects: 10,
	    ...options,
	    createConnection: undefined,
	    socketPath: undefined,
	    hostname: undefined,
	    protocol: undefined,
	    timeout: undefined,
	    method: undefined,
	    auth: undefined,
	    host: undefined,
	    path: undefined,
	    port: undefined
	  };

	  if (!protocolVersions.includes(opts.protocolVersion)) {
	    throw new RangeError(
	      `Unsupported protocol version: ${opts.protocolVersion} ` +
	        `(supported versions: ${protocolVersions.join(', ')})`
	    );
	  }

	  let parsedUrl;

	  if (address instanceof URL) {
	    parsedUrl = address;
	    websocket.url = address.href;
	  } else {
	    parsedUrl = new URL(address);
	    websocket.url = address;
	  }

	  const isUnixSocket = parsedUrl.protocol === 'ws+unix:';

	  if (!parsedUrl.host && (!isUnixSocket || !parsedUrl.pathname)) {
	    throw new Error(`Invalid URL: ${websocket.url}`);
	  }

	  const isSecure =
	    parsedUrl.protocol === 'wss:' || parsedUrl.protocol === 'https:';
	  const defaultPort = isSecure ? 443 : 80;
	  const key = randomBytes(16).toString('base64');
	  const get = isSecure ? https.get : http.get;
	  let perMessageDeflate;

	  opts.createConnection = isSecure ? tlsConnect : netConnect;
	  opts.defaultPort = opts.defaultPort || defaultPort;
	  opts.port = parsedUrl.port || defaultPort;
	  opts.host = parsedUrl.hostname.startsWith('[')
	    ? parsedUrl.hostname.slice(1, -1)
	    : parsedUrl.hostname;
	  opts.headers = {
	    'Sec-WebSocket-Version': opts.protocolVersion,
	    'Sec-WebSocket-Key': key,
	    Connection: 'Upgrade',
	    Upgrade: 'websocket',
	    ...opts.headers
	  };
	  opts.path = parsedUrl.pathname + parsedUrl.search;
	  opts.timeout = opts.handshakeTimeout;

	  if (opts.perMessageDeflate) {
	    perMessageDeflate = new PerMessageDeflate(
	      opts.perMessageDeflate !== true ? opts.perMessageDeflate : {},
	      false,
	      opts.maxPayload
	    );
	    opts.headers['Sec-WebSocket-Extensions'] = format({
	      [PerMessageDeflate.extensionName]: perMessageDeflate.offer()
	    });
	  }
	  if (protocols) {
	    opts.headers['Sec-WebSocket-Protocol'] = protocols;
	  }
	  if (opts.origin) {
	    if (opts.protocolVersion < 13) {
	      opts.headers['Sec-WebSocket-Origin'] = opts.origin;
	    } else {
	      opts.headers.Origin = opts.origin;
	    }
	  }
	  if (parsedUrl.username || parsedUrl.password) {
	    opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
	  }

	  if (isUnixSocket) {
	    const parts = opts.path.split(':');

	    opts.socketPath = parts[0];
	    opts.path = parts[1];
	  }

	  let req = (websocket._req = get(opts));

	  if (opts.timeout) {
	    req.on('timeout', () => {
	      abortHandshake(websocket, req, 'Opening handshake has timed out');
	    });
	  }

	  req.on('error', (err) => {
	    if (websocket._req.aborted) return;

	    req = websocket._req = null;
	    websocket.readyState = WebSocket.CLOSING;
	    websocket.emit('error', err);
	    websocket.emitClose();
	  });

	  req.on('response', (res) => {
	    const location = res.headers.location;
	    const statusCode = res.statusCode;

	    if (
	      location &&
	      opts.followRedirects &&
	      statusCode >= 300 &&
	      statusCode < 400
	    ) {
	      if (++websocket._redirects > opts.maxRedirects) {
	        abortHandshake(websocket, req, 'Maximum redirects exceeded');
	        return;
	      }

	      req.abort();

	      const addr = new URL(location, address);

	      initAsClient(websocket, addr, protocols, options);
	    } else if (!websocket.emit('unexpected-response', req, res)) {
	      abortHandshake(
	        websocket,
	        req,
	        `Unexpected server response: ${res.statusCode}`
	      );
	    }
	  });

	  req.on('upgrade', (res, socket, head) => {
	    websocket.emit('upgrade', res);

	    //
	    // The user may have closed the connection from a listener of the `upgrade`
	    // event.
	    //
	    if (websocket.readyState !== WebSocket.CONNECTING) return;

	    req = websocket._req = null;

	    const digest = createHash('sha1')
	      .update(key + GUID)
	      .digest('base64');

	    if (res.headers['sec-websocket-accept'] !== digest) {
	      abortHandshake(websocket, socket, 'Invalid Sec-WebSocket-Accept header');
	      return;
	    }

	    const serverProt = res.headers['sec-websocket-protocol'];
	    const protList = (protocols || '').split(/, */);
	    let protError;

	    if (!protocols && serverProt) {
	      protError = 'Server sent a subprotocol but none was requested';
	    } else if (protocols && !serverProt) {
	      protError = 'Server sent no subprotocol';
	    } else if (serverProt && !protList.includes(serverProt)) {
	      protError = 'Server sent an invalid subprotocol';
	    }

	    if (protError) {
	      abortHandshake(websocket, socket, protError);
	      return;
	    }

	    if (serverProt) websocket.protocol = serverProt;

	    if (perMessageDeflate) {
	      try {
	        const extensions = parse(res.headers['sec-websocket-extensions']);

	        if (extensions[PerMessageDeflate.extensionName]) {
	          perMessageDeflate.accept(extensions[PerMessageDeflate.extensionName]);
	          websocket._extensions[
	            PerMessageDeflate.extensionName
	          ] = perMessageDeflate;
	        }
	      } catch (err) {
	        abortHandshake(
	          websocket,
	          socket,
	          'Invalid Sec-WebSocket-Extensions header'
	        );
	        return;
	      }
	    }

	    websocket.setSocket(socket, head, opts.maxPayload);
	  });
	}

	/**
	 * Create a `net.Socket` and initiate a connection.
	 *
	 * @param {Object} options Connection options
	 * @return {net.Socket} The newly created socket used to start the connection
	 * @private
	 */
	function netConnect(options) {
	  options.path = options.socketPath;
	  return net.connect(options);
	}

	/**
	 * Create a `tls.TLSSocket` and initiate a connection.
	 *
	 * @param {Object} options Connection options
	 * @return {tls.TLSSocket} The newly created socket used to start the connection
	 * @private
	 */
	function tlsConnect(options) {
	  options.path = undefined;

	  if (!options.servername && options.servername !== '') {
	    options.servername = options.host;
	  }

	  return tls.connect(options);
	}

	/**
	 * Abort the handshake and emit an error.
	 *
	 * @param {WebSocket} websocket The WebSocket instance
	 * @param {(http.ClientRequest|net.Socket)} stream The request to abort or the
	 *     socket to destroy
	 * @param {String} message The error message
	 * @private
	 */
	function abortHandshake(websocket, stream, message) {
	  websocket.readyState = WebSocket.CLOSING;

	  const err = new Error(message);
	  Error.captureStackTrace(err, abortHandshake);

	  if (stream.setHeader) {
	    stream.abort();
	    stream.once('abort', websocket.emitClose.bind(websocket));
	    websocket.emit('error', err);
	  } else {
	    stream.destroy(err);
	    stream.once('error', websocket.emit.bind(websocket, 'error'));
	    stream.once('close', websocket.emitClose.bind(websocket));
	  }
	}

	/**
	 * Handle cases where the `ping()`, `pong()`, or `send()` methods are called
	 * when the `readyState` attribute is `CLOSING` or `CLOSED`.
	 *
	 * @param {WebSocket} websocket The WebSocket instance
	 * @param {*} data The data to send
	 * @param {Function} cb Callback
	 * @private
	 */
	function sendAfterClose(websocket, data, cb) {
	  if (data) {
	    const length = toBuffer(data).length;

	    //
	    // The `_bufferedAmount` property is used only when the peer is a client and
	    // the opening handshake fails. Under these circumstances, in fact, the
	    // `setSocket()` method is not called, so the `_socket` and `_sender`
	    // properties are set to `null`.
	    //
	    if (websocket._socket) websocket._sender._bufferedBytes += length;
	    else websocket._bufferedAmount += length;
	  }

	  if (cb) {
	    const err = new Error(
	      `WebSocket is not open: readyState ${websocket.readyState} ` +
	        `(${readyStates[websocket.readyState]})`
	    );
	    cb(err);
	  }
	}

	/**
	 * The listener of the `Receiver` `'conclude'` event.
	 *
	 * @param {Number} code The status code
	 * @param {String} reason The reason for closing
	 * @private
	 */
	function receiverOnConclude(code, reason) {
	  const websocket = this[kWebSocket];

	  websocket._socket.removeListener('data', socketOnData);
	  websocket._socket.resume();

	  websocket._closeFrameReceived = true;
	  websocket._closeMessage = reason;
	  websocket._closeCode = code;

	  if (code === 1005) websocket.close();
	  else websocket.close(code, reason);
	}

	/**
	 * The listener of the `Receiver` `'drain'` event.
	 *
	 * @private
	 */
	function receiverOnDrain() {
	  this[kWebSocket]._socket.resume();
	}

	/**
	 * The listener of the `Receiver` `'error'` event.
	 *
	 * @param {(RangeError|Error)} err The emitted error
	 * @private
	 */
	function receiverOnError(err) {
	  const websocket = this[kWebSocket];

	  websocket._socket.removeListener('data', socketOnData);

	  websocket.readyState = WebSocket.CLOSING;
	  websocket._closeCode = err[kStatusCode];
	  websocket.emit('error', err);
	  websocket._socket.destroy();
	}

	/**
	 * The listener of the `Receiver` `'finish'` event.
	 *
	 * @private
	 */
	function receiverOnFinish() {
	  this[kWebSocket].emitClose();
	}

	/**
	 * The listener of the `Receiver` `'message'` event.
	 *
	 * @param {(String|Buffer|ArrayBuffer|Buffer[])} data The message
	 * @private
	 */
	function receiverOnMessage(data) {
	  this[kWebSocket].emit('message', data);
	}

	/**
	 * The listener of the `Receiver` `'ping'` event.
	 *
	 * @param {Buffer} data The data included in the ping frame
	 * @private
	 */
	function receiverOnPing(data) {
	  const websocket = this[kWebSocket];

	  websocket.pong(data, !websocket._isServer, NOOP);
	  websocket.emit('ping', data);
	}

	/**
	 * The listener of the `Receiver` `'pong'` event.
	 *
	 * @param {Buffer} data The data included in the pong frame
	 * @private
	 */
	function receiverOnPong(data) {
	  this[kWebSocket].emit('pong', data);
	}

	/**
	 * The listener of the `net.Socket` `'close'` event.
	 *
	 * @private
	 */
	function socketOnClose() {
	  const websocket = this[kWebSocket];

	  this.removeListener('close', socketOnClose);
	  this.removeListener('end', socketOnEnd);

	  websocket.readyState = WebSocket.CLOSING;

	  //
	  // The close frame might not have been received or the `'end'` event emitted,
	  // for example, if the socket was destroyed due to an error. Ensure that the
	  // `receiver` stream is closed after writing any remaining buffered data to
	  // it. If the readable side of the socket is in flowing mode then there is no
	  // buffered data as everything has been already written and `readable.read()`
	  // will return `null`. If instead, the socket is paused, any possible buffered
	  // data will be read as a single chunk and emitted synchronously in a single
	  // `'data'` event.
	  //
	  websocket._socket.read();
	  websocket._receiver.end();

	  this.removeListener('data', socketOnData);
	  this[kWebSocket] = undefined;

	  clearTimeout(websocket._closeTimer);

	  if (
	    websocket._receiver._writableState.finished ||
	    websocket._receiver._writableState.errorEmitted
	  ) {
	    websocket.emitClose();
	  } else {
	    websocket._receiver.on('error', receiverOnFinish);
	    websocket._receiver.on('finish', receiverOnFinish);
	  }
	}

	/**
	 * The listener of the `net.Socket` `'data'` event.
	 *
	 * @param {Buffer} chunk A chunk of data
	 * @private
	 */
	function socketOnData(chunk) {
	  if (!this[kWebSocket]._receiver.write(chunk)) {
	    this.pause();
	  }
	}

	/**
	 * The listener of the `net.Socket` `'end'` event.
	 *
	 * @private
	 */
	function socketOnEnd() {
	  const websocket = this[kWebSocket];

	  websocket.readyState = WebSocket.CLOSING;
	  websocket._receiver.end();
	  this.end();
	}

	/**
	 * The listener of the `net.Socket` `'error'` event.
	 *
	 * @private
	 */
	function socketOnError() {
	  const websocket = this[kWebSocket];

	  this.removeListener('error', socketOnError);
	  this.on('error', NOOP);

	  if (websocket) {
	    websocket.readyState = WebSocket.CLOSING;
	    this.destroy();
	  }
	}
	return websocket;
}

var WebSocket_1;
var hasRequiredWebSocket;

function requireWebSocket () {
	if (hasRequiredWebSocket) return WebSocket_1;
	hasRequiredWebSocket = 1;
	// This a Wrapper for the node ws WebSocket implementation to resemble the
	// browser WebSocket implementation better. 
	var WebSocket = requireWebsocket();

	class SafeWebSocketClient extends WebSocket {
		constructor(url, protocols) {
			super(url, protocols, { perMessageDeflate: false });
		}
	}

	WebSocket_1 = SafeWebSocketClient;
	return WebSocket_1;
}

var sha1 = {exports: {}};

/*
 * [js-sha1]{@link https://github.com/emn178/js-sha1}
 *
 * @version 0.6.0
 * @author Chen, Yi-Cyuan [emn178@gmail.com]
 * @copyright Chen, Yi-Cyuan 2014-2017
 * @license MIT
 */

var hasRequiredSha1;

function requireSha1 () {
	if (hasRequiredSha1) return sha1.exports;
	hasRequiredSha1 = 1;
	(function (module) {
		/*jslint bitwise: true */
		(function() {

		  var root = typeof window === 'object' ? window : {};
		  var NODE_JS = !root.JS_SHA1_NO_NODE_JS && typeof process === 'object' && process.versions && process.versions.node;
		  if (NODE_JS) {
		    root = commonjsGlobal;
		  }
		  var COMMON_JS = !root.JS_SHA1_NO_COMMON_JS && 'object' === 'object' && module.exports;
		  var HEX_CHARS = '0123456789abcdef'.split('');
		  var EXTRA = [-2147483648, 8388608, 32768, 128];
		  var SHIFT = [24, 16, 8, 0];
		  var OUTPUT_TYPES = ['hex', 'array', 'digest', 'arrayBuffer'];

		  var blocks = [];

		  var createOutputMethod = function (outputType) {
		    return function (message) {
		      return new Sha1(true).update(message)[outputType]();
		    };
		  };

		  var createMethod = function () {
		    var method = createOutputMethod('hex');
		    if (NODE_JS) {
		      method = nodeWrap(method);
		    }
		    method.create = function () {
		      return new Sha1();
		    };
		    method.update = function (message) {
		      return method.create().update(message);
		    };
		    for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
		      var type = OUTPUT_TYPES[i];
		      method[type] = createOutputMethod(type);
		    }
		    return method;
		  };

		  var nodeWrap = function (method) {
		    var crypto = eval("require('crypto')");
		    var Buffer = eval("require('buffer').Buffer");
		    var nodeMethod = function (message) {
		      if (typeof message === 'string') {
		        return crypto.createHash('sha1').update(message, 'utf8').digest('hex');
		      } else if (message.constructor === ArrayBuffer) {
		        message = new Uint8Array(message);
		      } else if (message.length === undefined) {
		        return method(message);
		      }
		      return crypto.createHash('sha1').update(new Buffer(message)).digest('hex');
		    };
		    return nodeMethod;
		  };

		  function Sha1(sharedMemory) {
		    if (sharedMemory) {
		      blocks[0] = blocks[16] = blocks[1] = blocks[2] = blocks[3] =
		      blocks[4] = blocks[5] = blocks[6] = blocks[7] =
		      blocks[8] = blocks[9] = blocks[10] = blocks[11] =
		      blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
		      this.blocks = blocks;
		    } else {
		      this.blocks = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
		    }

		    this.h0 = 0x67452301;
		    this.h1 = 0xEFCDAB89;
		    this.h2 = 0x98BADCFE;
		    this.h3 = 0x10325476;
		    this.h4 = 0xC3D2E1F0;

		    this.block = this.start = this.bytes = this.hBytes = 0;
		    this.finalized = this.hashed = false;
		    this.first = true;
		  }

		  Sha1.prototype.update = function (message) {
		    if (this.finalized) {
		      return;
		    }
		    var notString = typeof(message) !== 'string';
		    if (notString && message.constructor === root.ArrayBuffer) {
		      message = new Uint8Array(message);
		    }
		    var code, index = 0, i, length = message.length || 0, blocks = this.blocks;

		    while (index < length) {
		      if (this.hashed) {
		        this.hashed = false;
		        blocks[0] = this.block;
		        blocks[16] = blocks[1] = blocks[2] = blocks[3] =
		        blocks[4] = blocks[5] = blocks[6] = blocks[7] =
		        blocks[8] = blocks[9] = blocks[10] = blocks[11] =
		        blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
		      }

		      if(notString) {
		        for (i = this.start; index < length && i < 64; ++index) {
		          blocks[i >> 2] |= message[index] << SHIFT[i++ & 3];
		        }
		      } else {
		        for (i = this.start; index < length && i < 64; ++index) {
		          code = message.charCodeAt(index);
		          if (code < 0x80) {
		            blocks[i >> 2] |= code << SHIFT[i++ & 3];
		          } else if (code < 0x800) {
		            blocks[i >> 2] |= (0xc0 | (code >> 6)) << SHIFT[i++ & 3];
		            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
		          } else if (code < 0xd800 || code >= 0xe000) {
		            blocks[i >> 2] |= (0xe0 | (code >> 12)) << SHIFT[i++ & 3];
		            blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
		            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
		          } else {
		            code = 0x10000 + (((code & 0x3ff) << 10) | (message.charCodeAt(++index) & 0x3ff));
		            blocks[i >> 2] |= (0xf0 | (code >> 18)) << SHIFT[i++ & 3];
		            blocks[i >> 2] |= (0x80 | ((code >> 12) & 0x3f)) << SHIFT[i++ & 3];
		            blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
		            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
		          }
		        }
		      }

		      this.lastByteIndex = i;
		      this.bytes += i - this.start;
		      if (i >= 64) {
		        this.block = blocks[16];
		        this.start = i - 64;
		        this.hash();
		        this.hashed = true;
		      } else {
		        this.start = i;
		      }
		    }
		    if (this.bytes > 4294967295) {
		      this.hBytes += this.bytes / 4294967296 << 0;
		      this.bytes = this.bytes % 4294967296;
		    }
		    return this;
		  };

		  Sha1.prototype.finalize = function () {
		    if (this.finalized) {
		      return;
		    }
		    this.finalized = true;
		    var blocks = this.blocks, i = this.lastByteIndex;
		    blocks[16] = this.block;
		    blocks[i >> 2] |= EXTRA[i & 3];
		    this.block = blocks[16];
		    if (i >= 56) {
		      if (!this.hashed) {
		        this.hash();
		      }
		      blocks[0] = this.block;
		      blocks[16] = blocks[1] = blocks[2] = blocks[3] =
		      blocks[4] = blocks[5] = blocks[6] = blocks[7] =
		      blocks[8] = blocks[9] = blocks[10] = blocks[11] =
		      blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
		    }
		    blocks[14] = this.hBytes << 3 | this.bytes >>> 29;
		    blocks[15] = this.bytes << 3;
		    this.hash();
		  };

		  Sha1.prototype.hash = function () {
		    var a = this.h0, b = this.h1, c = this.h2, d = this.h3, e = this.h4;
		    var f, j, t, blocks = this.blocks;

		    for(j = 16; j < 80; ++j) {
		      t = blocks[j - 3] ^ blocks[j - 8] ^ blocks[j - 14] ^ blocks[j - 16];
		      blocks[j] =  (t << 1) | (t >>> 31);
		    }

		    for(j = 0; j < 20; j += 5) {
		      f = (b & c) | ((~b) & d);
		      t = (a << 5) | (a >>> 27);
		      e = t + f + e + 1518500249 + blocks[j] << 0;
		      b = (b << 30) | (b >>> 2);

		      f = (a & b) | ((~a) & c);
		      t = (e << 5) | (e >>> 27);
		      d = t + f + d + 1518500249 + blocks[j + 1] << 0;
		      a = (a << 30) | (a >>> 2);

		      f = (e & a) | ((~e) & b);
		      t = (d << 5) | (d >>> 27);
		      c = t + f + c + 1518500249 + blocks[j + 2] << 0;
		      e = (e << 30) | (e >>> 2);

		      f = (d & e) | ((~d) & a);
		      t = (c << 5) | (c >>> 27);
		      b = t + f + b + 1518500249 + blocks[j + 3] << 0;
		      d = (d << 30) | (d >>> 2);

		      f = (c & d) | ((~c) & e);
		      t = (b << 5) | (b >>> 27);
		      a = t + f + a + 1518500249 + blocks[j + 4] << 0;
		      c = (c << 30) | (c >>> 2);
		    }

		    for(; j < 40; j += 5) {
		      f = b ^ c ^ d;
		      t = (a << 5) | (a >>> 27);
		      e = t + f + e + 1859775393 + blocks[j] << 0;
		      b = (b << 30) | (b >>> 2);

		      f = a ^ b ^ c;
		      t = (e << 5) | (e >>> 27);
		      d = t + f + d + 1859775393 + blocks[j + 1] << 0;
		      a = (a << 30) | (a >>> 2);

		      f = e ^ a ^ b;
		      t = (d << 5) | (d >>> 27);
		      c = t + f + c + 1859775393 + blocks[j + 2] << 0;
		      e = (e << 30) | (e >>> 2);

		      f = d ^ e ^ a;
		      t = (c << 5) | (c >>> 27);
		      b = t + f + b + 1859775393 + blocks[j + 3] << 0;
		      d = (d << 30) | (d >>> 2);

		      f = c ^ d ^ e;
		      t = (b << 5) | (b >>> 27);
		      a = t + f + a + 1859775393 + blocks[j + 4] << 0;
		      c = (c << 30) | (c >>> 2);
		    }

		    for(; j < 60; j += 5) {
		      f = (b & c) | (b & d) | (c & d);
		      t = (a << 5) | (a >>> 27);
		      e = t + f + e - 1894007588 + blocks[j] << 0;
		      b = (b << 30) | (b >>> 2);

		      f = (a & b) | (a & c) | (b & c);
		      t = (e << 5) | (e >>> 27);
		      d = t + f + d - 1894007588 + blocks[j + 1] << 0;
		      a = (a << 30) | (a >>> 2);

		      f = (e & a) | (e & b) | (a & b);
		      t = (d << 5) | (d >>> 27);
		      c = t + f + c - 1894007588 + blocks[j + 2] << 0;
		      e = (e << 30) | (e >>> 2);

		      f = (d & e) | (d & a) | (e & a);
		      t = (c << 5) | (c >>> 27);
		      b = t + f + b - 1894007588 + blocks[j + 3] << 0;
		      d = (d << 30) | (d >>> 2);

		      f = (c & d) | (c & e) | (d & e);
		      t = (b << 5) | (b >>> 27);
		      a = t + f + a - 1894007588 + blocks[j + 4] << 0;
		      c = (c << 30) | (c >>> 2);
		    }

		    for(; j < 80; j += 5) {
		      f = b ^ c ^ d;
		      t = (a << 5) | (a >>> 27);
		      e = t + f + e - 899497514 + blocks[j] << 0;
		      b = (b << 30) | (b >>> 2);

		      f = a ^ b ^ c;
		      t = (e << 5) | (e >>> 27);
		      d = t + f + d - 899497514 + blocks[j + 1] << 0;
		      a = (a << 30) | (a >>> 2);

		      f = e ^ a ^ b;
		      t = (d << 5) | (d >>> 27);
		      c = t + f + c - 899497514 + blocks[j + 2] << 0;
		      e = (e << 30) | (e >>> 2);

		      f = d ^ e ^ a;
		      t = (c << 5) | (c >>> 27);
		      b = t + f + b - 899497514 + blocks[j + 3] << 0;
		      d = (d << 30) | (d >>> 2);

		      f = c ^ d ^ e;
		      t = (b << 5) | (b >>> 27);
		      a = t + f + a - 899497514 + blocks[j + 4] << 0;
		      c = (c << 30) | (c >>> 2);
		    }

		    this.h0 = this.h0 + a << 0;
		    this.h1 = this.h1 + b << 0;
		    this.h2 = this.h2 + c << 0;
		    this.h3 = this.h3 + d << 0;
		    this.h4 = this.h4 + e << 0;
		  };

		  Sha1.prototype.hex = function () {
		    this.finalize();

		    var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3, h4 = this.h4;

		    return HEX_CHARS[(h0 >> 28) & 0x0F] + HEX_CHARS[(h0 >> 24) & 0x0F] +
		           HEX_CHARS[(h0 >> 20) & 0x0F] + HEX_CHARS[(h0 >> 16) & 0x0F] +
		           HEX_CHARS[(h0 >> 12) & 0x0F] + HEX_CHARS[(h0 >> 8) & 0x0F] +
		           HEX_CHARS[(h0 >> 4) & 0x0F] + HEX_CHARS[h0 & 0x0F] +
		           HEX_CHARS[(h1 >> 28) & 0x0F] + HEX_CHARS[(h1 >> 24) & 0x0F] +
		           HEX_CHARS[(h1 >> 20) & 0x0F] + HEX_CHARS[(h1 >> 16) & 0x0F] +
		           HEX_CHARS[(h1 >> 12) & 0x0F] + HEX_CHARS[(h1 >> 8) & 0x0F] +
		           HEX_CHARS[(h1 >> 4) & 0x0F] + HEX_CHARS[h1 & 0x0F] +
		           HEX_CHARS[(h2 >> 28) & 0x0F] + HEX_CHARS[(h2 >> 24) & 0x0F] +
		           HEX_CHARS[(h2 >> 20) & 0x0F] + HEX_CHARS[(h2 >> 16) & 0x0F] +
		           HEX_CHARS[(h2 >> 12) & 0x0F] + HEX_CHARS[(h2 >> 8) & 0x0F] +
		           HEX_CHARS[(h2 >> 4) & 0x0F] + HEX_CHARS[h2 & 0x0F] +
		           HEX_CHARS[(h3 >> 28) & 0x0F] + HEX_CHARS[(h3 >> 24) & 0x0F] +
		           HEX_CHARS[(h3 >> 20) & 0x0F] + HEX_CHARS[(h3 >> 16) & 0x0F] +
		           HEX_CHARS[(h3 >> 12) & 0x0F] + HEX_CHARS[(h3 >> 8) & 0x0F] +
		           HEX_CHARS[(h3 >> 4) & 0x0F] + HEX_CHARS[h3 & 0x0F] +
		           HEX_CHARS[(h4 >> 28) & 0x0F] + HEX_CHARS[(h4 >> 24) & 0x0F] +
		           HEX_CHARS[(h4 >> 20) & 0x0F] + HEX_CHARS[(h4 >> 16) & 0x0F] +
		           HEX_CHARS[(h4 >> 12) & 0x0F] + HEX_CHARS[(h4 >> 8) & 0x0F] +
		           HEX_CHARS[(h4 >> 4) & 0x0F] + HEX_CHARS[h4 & 0x0F];
		  };

		  Sha1.prototype.toString = Sha1.prototype.hex;

		  Sha1.prototype.digest = function () {
		    this.finalize();

		    var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3, h4 = this.h4;

		    return [
		      (h0 >> 24) & 0xFF, (h0 >> 16) & 0xFF, (h0 >> 8) & 0xFF, h0 & 0xFF,
		      (h1 >> 24) & 0xFF, (h1 >> 16) & 0xFF, (h1 >> 8) & 0xFF, h1 & 0xFF,
		      (h2 >> 24) & 0xFF, (h2 >> 16) & 0xFF, (h2 >> 8) & 0xFF, h2 & 0xFF,
		      (h3 >> 24) & 0xFF, (h3 >> 16) & 0xFF, (h3 >> 8) & 0xFF, h3 & 0xFF,
		      (h4 >> 24) & 0xFF, (h4 >> 16) & 0xFF, (h4 >> 8) & 0xFF, h4 & 0xFF
		    ];
		  };

		  Sha1.prototype.array = Sha1.prototype.digest;

		  Sha1.prototype.arrayBuffer = function () {
		    this.finalize();

		    var buffer = new ArrayBuffer(20);
		    var dataView = new DataView(buffer);
		    dataView.setUint32(0, this.h0);
		    dataView.setUint32(4, this.h1);
		    dataView.setUint32(8, this.h2);
		    dataView.setUint32(12, this.h3);
		    dataView.setUint32(16, this.h4);
		    return buffer;
		  };

		  var exports = createMethod();

		  if (COMMON_JS) {
		    module.exports = exports;
		  } else {
		    root.sha1 = exports;
		  }
		})(); 
	} (sha1));
	return sha1.exports;
}

var globals = {};

var hasRequiredGlobals;

function requireGlobals () {
	if (hasRequiredGlobals) return globals;
	hasRequiredGlobals = 1;
	/*
	 * Copyright (c) 2013-2024 Vanessa Freudenberg
	 *
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:
	 *
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 *
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 */

	// Create Squeak VM namespace
	if (!self.Squeak) self.Squeak = {};

	// Setup a storage for settings
	if (!Squeak.Settings) {
	    // Try (a working) localStorage and fall back to regular dictionary otherwise
	    var settings;
	    try {
	        // fails in restricted iframe
	        settings = self.localStorage;
	        settings["squeak-foo:"] = "bar";
	        if (settings["squeak-foo:"] !== "bar") throw Error();
	        delete settings["squeak-foo:"];
	    } catch(e) {
	        settings = {};
	    }
	    Squeak.Settings = settings;
	}

	if (!Object.extend) {
	    // Extend object by adding specified properties
	    Object.extend = function(obj /* + more args */ ) {
	        // skip arg 0, copy properties of other args to obj
	        for (var i = 1; i < arguments.length; i++)
	            if (typeof arguments[i] == 'object')
	                for (var name in arguments[i])
	                    obj[name] = arguments[i][name];
	    };
	}


	// This mimics the Lively Kernel's subclassing scheme.
	// When running there, Lively's subclasses and modules are used.
	// Modules serve as namespaces in Lively. SqueakJS uses a flat namespace
	// named "Squeak", but the code below still supports hierarchical names.
	if (!Function.prototype.subclass) {
	    // Create subclass using specified class path and given properties
	    Function.prototype.subclass = function(classPath /* + more args */ ) {
	        // create subclass
	        var subclass = function() {
	            if (this.initialize) {
	                var result = this.initialize.apply(this, arguments);
	                if (result !== undefined) return result;
	            }
	            return this;
	        };
	        // set up prototype
	        var protoclass = function() { };
	        protoclass.prototype = this.prototype;
	        subclass.prototype = new protoclass();
	        // skip arg 0, copy properties of other args to prototype
	        for (var i = 1; i < arguments.length; i++)
	            Object.extend(subclass.prototype, arguments[i]);
	        // add class to namespace
	        var path = classPath.split("."),
	            className = path.pop(),
	            // Walk path starting at the global namespace (self)
	            // creating intermediate namespaces if necessary
	            namespace = path.reduce(function(namespace, path) {
	                if (!namespace[path]) namespace[path] = {};
	                return namespace[path];
	            }, self);
	        namespace[className] = subclass;
	        return subclass;
	    };

	}
	return globals;
}

var vm = {};

var hasRequiredVm;

function requireVm () {
	if (hasRequiredVm) return vm;
	hasRequiredVm = 1;
	/*
	 * Copyright (c) 2013-2024 Vanessa Freudenberg
	 *
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:
	 *
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 *
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 */

	Object.extend(Squeak,
	"version", {
	    // system attributes
	    vmVersion: "SqueakJS 1.2.3",
	    vmDate: "2024-09-28",               // Maybe replace at build time?
	    vmBuild: "cp-202501-10",                 // or replace at runtime by last-modified?
	    vmPath: "unknown",                  // Replace at runtime
	    vmFile: "vm.js",
	    vmMakerVersion: "[VMMakerJS-bf.17 VMMaker-bf.353]", // for Smalltalk vmVMMakerVersion
	    vmInterpreterVersion: "JSInterpreter VMMaker.js-codefrau.1", // for Smalltalk interpreterVMMakerVersion
	    platformName: "JS",
	    platformSubtype: "unknown",         // Replace at runtime
	    osVersion: "unknown",               // Replace at runtime
	    windowSystem: "unknown",            // Replace at runtime
	},
	"object header", {
	    // object headers
	    HeaderTypeMask: 3,
	    HeaderTypeSizeAndClass: 0, //3-word header
	    HeaderTypeClass: 1,        //2-word header
	    HeaderTypeFree: 2,         //free block
	    HeaderTypeShort: 3,        //1-word header
	},
	"special objects", {
	    // Indices into SpecialObjects array
	    splOb_NilObject: 0,
	    splOb_FalseObject: 1,
	    splOb_TrueObject: 2,
	    splOb_SchedulerAssociation: 3,
	    splOb_ClassBitmap: 4,
	    splOb_ClassInteger: 5,
	    splOb_ClassString: 6,
	    splOb_ClassArray: 7,
	    splOb_SmalltalkDictionary: 8,
	    splOb_ClassFloat: 9,
	    splOb_ClassMethodContext: 10,
	    splOb_ClassBlockContext: 11,
	    splOb_ClassPoint: 12,
	    splOb_ClassLargePositiveInteger: 13,
	    splOb_TheDisplay: 14,
	    splOb_ClassMessage: 15,
	    splOb_ClassCompiledMethod: 16,
	    splOb_TheLowSpaceSemaphore: 17,
	    splOb_ClassSemaphore: 18,
	    splOb_ClassCharacter: 19,
	    splOb_SelectorDoesNotUnderstand: 20,
	    splOb_SelectorCannotReturn: 21,
	    // splOb_TheInputSemaphore: 22, // old? unused in SqueakJS
	    splOb_ProcessSignalingLowSpace: 22,
	    splOb_SpecialSelectors: 23,
	    splOb_CharacterTable: 24,
	    splOb_SelectorMustBeBoolean: 25,
	    splOb_ClassByteArray: 26,
	    splOb_ClassProcess: 27,
	    splOb_CompactClasses: 28,
	    splOb_TheTimerSemaphore: 29,
	    splOb_TheInterruptSemaphore: 30,
	    splOb_FloatProto: 31,
	    splOb_SelectorCannotInterpret: 34,
	    splOb_MethodContextProto: 35,
	    splOb_ClassBlockClosure: 36,
	    splOb_ClassFullBlockClosure: 37,
	    splOb_ExternalObjectsArray: 38,
	    splOb_ClassPseudoContext: 39,
	    splOb_ClassTranslatedMethod: 40,
	    splOb_TheFinalizationSemaphore: 41,
	    splOb_ClassLargeNegativeInteger: 42,
	    splOb_ClassExternalAddress: 43,
	    splOb_ClassExternalStructure: 44,
	    splOb_ClassExternalData: 45,
	    splOb_ClassExternalFunction: 46,
	    splOb_ClassExternalLibrary: 47,
	    splOb_SelectorAboutToReturn: 48,
	    splOb_SelectorRunWithIn: 49,
	    splOb_SelectorAttemptToAssign: 50,
	    splOb_PrimErrTableIndex: 51,
	    splOb_ClassAlien: 52,
	    splOb_InvokeCallbackSelector: 53,
	    splOb_ClassUnsafeAlien: 54,
	    splOb_ClassWeakFinalizer: 55,
	},
	"known classes", {
	    // AdditionalMethodState layout:
	    AdditionalMethodState_selector: 1,
	    // Class layout:
	    Class_superclass: 0,
	    Class_mdict: 1,
	    Class_format: 2,
	    Class_instVars: null,   // 3 or 4 depending on image, see instVarNames()
	    Class_name: 6,
	    // ClassBinding layout:
	    ClassBinding_value: 1,
	    // Context layout:
	    Context_sender: 0,
	    Context_instructionPointer: 1,
	    Context_stackPointer: 2,
	    Context_method: 3,
	    Context_closure: 4,
	    Context_receiver: 5,
	    Context_tempFrameStart: 6,
	    Context_smallFrameSize: 16,
	    Context_largeFrameSize: 56,
	    BlockContext_caller: 0,
	    BlockContext_argumentCount: 3,
	    BlockContext_initialIP: 4,
	    BlockContext_home: 5,
	    // Closure layout:
	    Closure_outerContext: 0,
	    Closure_startpc: 1,
	    Closure_numArgs: 2,
	    Closure_firstCopiedValue: 3,
	    ClosureFull_method: 1,
	    ClosureFull_receiver: 3,
	    ClosureFull_firstCopiedValue: 4,
	    // Stream layout:
	    Stream_array: 0,
	    Stream_position: 1,
	    Stream_limit: 2,
	    //ProcessorScheduler layout:
	    ProcSched_processLists: 0,
	    ProcSched_activeProcess: 1,
	    //Link layout:
	    Link_nextLink: 0,
	    //LinkedList layout:
	    LinkedList_firstLink: 0,
	    LinkedList_lastLink: 1,
	    //Semaphore layout:
	    Semaphore_excessSignals: 2,
	    //Mutex layout:
	    Mutex_owner: 2,
	    //Process layout:
	    Proc_suspendedContext: 1,
	    Proc_priority: 2,
	    Proc_myList: 3,
	    Proc_name: 4,
	    // Association layout:
	    Assn_key: 0,
	    Assn_value: 1,
	    // MethodDict layout:
	    MethodDict_array: 1,
	    MethodDict_selectorStart: 2,
	    // Message layout
	    Message_selector: 0,
	    Message_arguments: 1,
	    Message_lookupClass: 2,
	    // Point layout:
	    Point_x: 0,
	    Point_y: 1,
	    // LargeInteger layout:
	    LargeInteger_bytes: 0,
	    LargeInteger_neg: 1,
	    // WeakFinalizationList layout:
	    WeakFinalizationList_first: 0,
	    // WeakFinalizerItem layout:
	    WeakFinalizerItem_list: 0,
	    WeakFinalizerItem_next: 1,
	},
	"constants", {
	    MinSmallInt: -0x40000000,
	    MaxSmallInt:  0x3FFFFFFF,
	    NonSmallInt: -0x50000000,           // non-small and neg (so non pos32 too)
	    MillisecondClockMask: 0x1FFFFFFF,
	},
	"error codes", {
	    PrimNoErr: 0,
	    PrimErrGenericFailure: 1,
	    PrimErrBadReceiver: 2,
	    PrimErrBadArgument: 3,
	    PrimErrBadIndex: 4,
	    PrimErrBadNumArgs: 5,
	    PrimErrInappropriate: 6,
	    PrimErrUnsupported: 7,
	    PrimErrNoModification: 8,
	    PrimErrNoMemory: 9,
	    PrimErrNoCMemory: 10,
	    PrimErrNotFound: 11,
	    PrimErrBadMethod: 12,
	    PrimErrNamedInternal: 13,
	    PrimErrObjectMayMove: 14,
	    PrimErrLimitExceeded: 15,
	    PrimErrObjectIsPinned: 16,
	    PrimErrWritePastObject: 17,
	},
	"modules", {
	    // don't clobber registered modules
	    externalModules: Squeak.externalModules || {},
	    registerExternalModule: function(name, module) {
	        this.externalModules[name] = module;
	    },
	},
	"time", {
	    Epoch: Date.UTC(1901,0,1) + (new Date()).getTimezoneOffset()*60000,        // local timezone
	    EpochUTC: Date.UTC(1901,0,1),
	    totalSeconds: function() {
	        // seconds since 1901-01-01, local time
	        return Math.floor((Date.now() - Squeak.Epoch) / 1000);
	    },
	},
	"utils", {
	    bytesAsString: function(bytes) {
	        var chars = [];
	        for (var i = 0; i < bytes.length; )
	            chars.push(String.fromCharCode.apply(
	                null, bytes.subarray(i, i += 16348)));
	        return chars.join('');
	    },
	    word64FromUint32: function(hi, lo) {
	        // Max safe integer as Uint64: 001FFFFF_FFFFFFFF
	        // Min safe integer as Uint64: FFE00000_00000001
	        if (hi < 0x00200000) { // positive, <= 53 bits
	            return hi * 0x100000000 + lo;
	        } else if (hi > 0xFFE00000) { // negative, <= 53 bits
	            return (hi>>0) * 0x100000000 + lo;
	        } else return [hi, lo]; // probably SmallFloat
	    },
	});
	return vm;
}

var vm_object = {};

var hasRequiredVm_object;

function requireVm_object () {
	if (hasRequiredVm_object) return vm_object;
	hasRequiredVm_object = 1;
	/*
	 * Copyright (c) 2013-2024 Vanessa Freudenberg
	 *
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:
	 *
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 *
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 */

	Object.subclass('Squeak.Object',
	'initialization', {
	    initInstanceOf: function(aClass, indexableSize, hash, nilObj) {
	        this.sqClass = aClass;
	        this.hash = hash;
	        var instSpec = aClass.pointers[Squeak.Class_format],
	            instSize = ((instSpec>>1) & 0x3F) + ((instSpec>>10) & 0xC0) - 1; //0-255
	        this._format = (instSpec>>7) & 0xF; //This is the 0-15 code

	        if (this._format < 8) {
	            if (this._format != 6) {
	                if (instSize + indexableSize > 0)
	                    this.pointers = this.fillArray(instSize + indexableSize, nilObj);
	            } else // Words
	                if (indexableSize > 0)
	                    if (aClass.isFloatClass) {
	                        this.isFloat = true;
	                        this.float = 0.0;
	                    } else
	                        this.words = new Uint32Array(indexableSize);
	        } else // Bytes
	            if (indexableSize > 0) {
	                // this._format |= -indexableSize & 3;       //deferred to writeTo()
	                this.bytes = new Uint8Array(indexableSize); //Methods require further init of pointers
	            }

	//      Definition of Squeak's format code...
	//
	//      Pointers only...
	//        0      no fields
	//        1      fixed fields only (all containing pointers)
	//        2      indexable fields only (all containing pointers)
	//        3      both fixed and indexable fields (all containing pointers)
	//        4      both fixed and indexable weak fields (all containing pointers).
	//        5      unused
	//      Bits only...
	//        6      indexable word fields only (no pointers)
	//        7      unused
	//        8-11   indexable byte fields only (no pointers) (low 2 bits are low 2 bits of size)
	//      Pointer and bits (CompiledMethods only)...
	//       12-15   compiled methods:
	//               # of literal oops specified in method header,
	//               followed by indexable bytes (same interpretation of low 2 bits as above)
	    },
	    initAsClone: function(original, hash) {
	        this.sqClass = original.sqClass;
	        this.hash = hash;
	        this._format = original._format;
	        if (original.isFloat) {
	            this.isFloat = original.isFloat;
	            this.float = original.float;
	        } else {
	            if (original.pointers) this.pointers = original.pointers.slice(0);   // copy
	            if (original.words) this.words = new Uint32Array(original.words);    // copy
	            if (original.bytes) this.bytes = new Uint8Array(original.bytes);     // copy
	        }
	    },
	    initFromImage: function(oop, cls, fmt, hsh) {
	        // initial creation from Image, with unmapped data
	        this.oop = oop;
	        this.sqClass = cls;
	        this._format = fmt;
	        this.hash = hsh;
	    },
	    classNameFromImage: function(oopMap, rawBits) {
	        var name = oopMap[rawBits[this.oop][Squeak.Class_name]];
	        if (name && name._format >= 8 && name._format < 12) {
	            var bits = rawBits[name.oop],
	                bytes = name.decodeBytes(bits.length, bits, 0, name._format & 3);
	            return Squeak.bytesAsString(bytes);
	        }
	        return "Class";
	    },
	    renameFromImage: function(oopMap, rawBits, ccArray) {
	        var classObj = this.sqClass < 32 ? oopMap[ccArray[this.sqClass-1]] : oopMap[this.sqClass];
	        if (!classObj) return this;
	        var instProto = classObj.instProto || classObj.classInstProto(classObj.classNameFromImage(oopMap, rawBits));
	        if (!instProto) return this;
	        var renamedObj = new instProto; // Squeak.Object
	        renamedObj.oop = this.oop;
	        renamedObj.sqClass = this.sqClass;
	        renamedObj._format = this._format;
	        renamedObj.hash = this.hash;
	        return renamedObj;
	    },
	    installFromImage: function(oopMap, rawBits, ccArray, floatClass, littleEndian, nativeFloats) {
	        //Install this object by decoding format, and rectifying pointers
	        var ccInt = this.sqClass;
	        // map compact classes
	        if ((ccInt>0) && (ccInt<32))
	            this.sqClass = oopMap[ccArray[ccInt-1]];
	        else
	            this.sqClass = oopMap[ccInt];
	        var bits = rawBits[this.oop],
	            nWords = bits.length;
	        if (this._format < 5) {
	            //Formats 0...4 -- Pointer fields
	            if (nWords > 0) {
	                var oops = bits; // endian conversion was already done
	                this.pointers = this.decodePointers(nWords, oops, oopMap);
	            }
	        } else if (this._format >= 12) {
	            //Formats 12-15 -- CompiledMethods both pointers and bits
	            var methodHeader = this.decodeWords(1, bits, littleEndian)[0],
	                numLits = (methodHeader>>10) & 255,
	                oops = this.decodeWords(numLits+1, bits, littleEndian);
	            this.pointers = this.decodePointers(numLits+1, oops, oopMap); //header+lits
	            this.bytes = this.decodeBytes(nWords-(numLits+1), bits, numLits+1, this._format & 3);
	        } else if (this._format >= 8) {
	            //Formats 8..11 -- ByteArrays (and ByteStrings)
	            if (nWords > 0)
	                this.bytes = this.decodeBytes(nWords, bits, 0, this._format & 3);
	        } else if (this.sqClass == floatClass) {
	            //These words are actually a Float
	            this.isFloat = true;
	            this.float = this.decodeFloat(bits, littleEndian, nativeFloats);
	        } else {
	            if (nWords > 0)
	                this.words = this.decodeWords(nWords, bits, littleEndian);
	        }
	        this.mark = false; // for GC
	    },
	    decodePointers: function(nWords, theBits, oopMap) {
	        //Convert small ints and look up object pointers in oopMap
	        var ptrs = new Array(nWords);
	        for (var i = 0; i < nWords; i++) {
	            var oop = theBits[i];
	            if ((oop & 1) === 1) {          // SmallInteger
	                ptrs[i] = oop >> 1;
	            } else {                        // Object
	                ptrs[i] = oopMap[oop] || 42424242;
	                // when loading a context from image segment, there is
	                // garbage beyond its stack pointer, resulting in the oop
	                // not being found in oopMap. We just fill in an arbitrary
	                // SmallInteger - it's never accessed anyway
	            }
	        }
	        return ptrs;
	    },
	    decodeWords: function(nWords, theBits, littleEndian) {
	        var data = new DataView(theBits.buffer, theBits.byteOffset),
	            words = new Uint32Array(nWords);
	        for (var i = 0; i < nWords; i++)
	            words[i] = data.getUint32(i*4, littleEndian);
	        return words;
	    },
	    decodeBytes: function (nWords, theBits, wordOffset, fmtLowBits) {
	        // Adjust size for low bits and make a copy
	        var nBytes = (nWords * 4) - fmtLowBits,
	            wordsAsBytes = new Uint8Array(theBits.buffer, theBits.byteOffset + wordOffset * 4, nBytes),
	            bytes = new Uint8Array(nBytes);
	        bytes.set(wordsAsBytes);
	        return bytes;
	    },
	    decodeFloat: function(theBits, littleEndian, nativeFloats) {
	        var data = new DataView(theBits.buffer, theBits.byteOffset);
	        // it's either big endian ...
	        if (!littleEndian) return data.getFloat64(0, false);
	        // or real little endian
	        if (nativeFloats) return data.getFloat64(0, true);
	        // or little endian, but with swapped words
	        var buffer = new ArrayBuffer(8),
	            swapped = new DataView(buffer);
	        swapped.setUint32(0, data.getUint32(4));
	        swapped.setUint32(4, data.getUint32(0));
	        return swapped.getFloat64(0, true);
	    },
	    fillArray: function(length, filler) {
	        var array = new Array(length);
	        array.fill(filler);
	        return array;
	    },
	},
	'testing', {
	    isWords: function() {
	        return this._format === 6;
	    },
	    isBytes: function() {
	        var fmt = this._format;
	        return fmt >= 8 && fmt <= 11;
	    },
	    isWordsOrBytes: function() {
	        var fmt = this._format;
	        return fmt == 6  || (fmt >= 8 && fmt <= 11);
	    },
	    isPointers: function() {
	        return this._format <= 4;
	    },
	    isWeak: function() {
	        return this._format === 4;
	    },
	    isMethod: function() {
	        return this._format >= 12;
	    },
	    sameFormats: function(a, b) {
	        return a < 8 ? a === b : (a & 0xC) === (b & 0xC);
	    },
	    sameFormatAs: function(obj) {
	        return this.sameFormats(this._format, obj._format);
	    },
	},
	'printing', {
	    toString: function() {
	        return this.sqInstName();
	    },
	    bytesAsString: function() {
	        if (!this.bytes) return '';
	        return Squeak.bytesAsString(this.bytes);
	    },
	    bytesAsNumberString: function(negative) {
	        if (!this.bytes) return '';
	        var hex = '0123456789ABCDEF',
	            digits = [],
	            value = 0;
	        for (var i = this.bytes.length - 1; i >= 0; i--) {
	            digits.push(hex[this.bytes[i] >> 4]);
	            digits.push(hex[this.bytes[i] & 15]);
	            value = value * 256 + this.bytes[i];
	        }
	        var sign = negative ? '-' : '',
	            approx = value > 0x1FFFFFFFFFFFFF ? '≈' : '';
	        return sign + '16r' + digits.join('') + ' (' + approx + sign + value + 'L)';
	    },
	    assnKeyAsString: function() {
	        return this.pointers[Squeak.Assn_key].bytesAsString();
	    },
	    slotNameAt: function(index) {
	        // one-based index
	        var instSize = this.instSize();
	        if (index <= instSize)
	            return this.sqClass.allInstVarNames()[index - 1] || 'ivar' + (index - 1);
	        else
	            return (index - instSize).toString();
	    },
	    sqInstName: function() {
	        if (this.isNil) return "nil";
	        if (this.isTrue) return "true";
	        if (this.isFalse) return "false";
	        if (this.isFloat) {var str = this.float.toString(); if (!/\./.test(str)) str += '.0'; return str; }
	        var className = this.sqClass.className();
	        if (/ /.test(className))
	            return 'the ' + className;
	        switch (className) {
	            case 'String':
	            case 'ByteString': return "'" + this.bytesAsString() + "'";
	            case 'Symbol':
	            case 'ByteSymbol':  return "#" + this.bytesAsString();
	            case 'Point': return this.pointers.join("@");
	            case 'Rectangle': return this.pointers.join(" corner: ");
	            case 'Association':
	            case 'ReadOnlyVariableBinding': return this.pointers.join("->");
	            case 'LargePositiveInteger': return this.bytesAsNumberString(false);
	            case 'LargeNegativeInteger': return this.bytesAsNumberString(true);
	            case 'Character': var unicode = this.pointers ? this.pointers[0] : this.hash; // Spur
	                return "$" + String.fromCharCode(unicode) + " (" + unicode.toString() + ")";
	            case 'CompiledMethod': return this.methodAsString();
	            case 'CompiledBlock': return "[] in " + this.blockOuterCode().sqInstName();
	        }
	        return  /^[aeiou]/i.test(className) ? 'an' + className : 'a' + className;
	    },
	},
	'accessing', {
	    pointersSize: function() {
	        return this.pointers ? this.pointers.length : 0;
	    },
	    bytesSize: function() {
	        return this.bytes ? this.bytes.length : 0;
	    },
	    wordsSize: function() {
	        return this.isFloat ? 2 : this.words ? this.words.length : 0;
	    },
	    instSize: function() {//same as class.classInstSize, but faster from format
	        var fmt = this._format;
	        if (fmt > 4 || fmt === 2) return 0;      //indexable fields only
	        if (fmt < 2) return this.pointersSize(); //fixed fields only
	        return this.sqClass.classInstSize();
	    },
	    indexableSize: function(primHandler) {
	        var fmt = this._format;
	        if (fmt < 2) return -1; //not indexable
	        if (fmt === 3 && primHandler.vm.isContext(this) && !primHandler.allowAccessBeyondSP)
	            return this.pointers[Squeak.Context_stackPointer]; // no access beyond top of stacks
	        if (fmt < 6) return this.pointersSize() - this.instSize(); // pointers
	        if (fmt < 8) return this.wordsSize(); // words
	        if (fmt < 12) return this.bytesSize(); // bytes
	        return this.bytesSize() + (4 * this.pointersSize()); // methods
	    },
	    floatData: function() {
	        var buffer = new ArrayBuffer(8);
	        var data = new DataView(buffer);
	        data.setFloat64(0, this.float, false);
	        //1st word is data.getUint32(0, false);
	        //2nd word is data.getUint32(4, false);
	        return data;
	    },
	    wordsAsFloat32Array: function() {
	        return this.float32Array
	            || (this.words && (this.float32Array = new Float32Array(this.words.buffer)));
	    },
	    wordsAsFloat64Array: function() {
	        return this.float64Array
	            || (this.words && (this.float64Array = new Float64Array(this.words.buffer)));
	    },
	    wordsAsInt32Array: function() {
	        return this.int32Array
	            || (this.words && (this.int32Array = new Int32Array(this.words.buffer)));
	    },
	    wordsAsInt16Array: function() {
	        return this.int16Array
	            || (this.words && (this.int16Array = new Int16Array(this.words.buffer)));
	    },
	    wordsAsUint16Array: function() {
	        return this.uint16Array
	            || (this.words && (this.uint16Array = new Uint16Array(this.words.buffer)));
	    },
	    wordsAsUint8Array: function() {
	        return this.uint8Array
	            || (this.words && (this.uint8Array = new Uint8Array(this.words.buffer)));
	    },
	    wordsOrBytes: function() {
	        if (this.words) return this.words;
	        if (this.uint32Array) return this.uint32Array;
	        if (!this.bytes) return null;
	        return this.uint32Array = new Uint32Array(this.bytes.buffer, 0, this.bytes.length >>> 2);
	    },
	    setAddr: function(addr) {
	        // Move this object to addr by setting its oop. Answer address after this object.
	        // Used to assign an oop for the first time when tenuring this object during GC.
	        // When compacting, the oop is adjusted directly, since header size does not change.
	        var words = this.snapshotSize();
	        this.oop = addr + words.header * 4;
	        return addr + (words.header + words.body) * 4;
	    },
	    snapshotSize: function() {
	        // words of extra object header and body this object would take up in image snapshot
	        // body size includes one header word that is always present
	        var nWords =
	            this.isFloat ? 2 :
	            this.words ? this.words.length :
	            this.pointers ? this.pointers.length : 0;
	        // methods have both pointers and bytes
	        if (this.bytes) nWords += (this.bytes.length + 3) >>> 2;
	        nWords++; // one header word always present
	        var extraHeader = nWords > 63 ? 2 : this.sqClass.isCompact ? 0 : 1;
	        return {header: extraHeader, body: nWords};
	    },
	    addr: function() { // start addr of this object in a snapshot
	        return this.oop - this.snapshotSize().header * 4;
	    },
	    totalBytes: function() {
	        // size in bytes this object would take up in image snapshot
	        var words = this.snapshotSize();
	        return (words.header + words.body) * 4;
	    },
	    writeTo: function(data, pos, image) {
	        // Write 1 to 3 header words encoding type, class, and size, then instance data
	        if (this.bytes) this._format |= -this.bytes.length & 3;
	        var beforePos = pos,
	            size = this.snapshotSize(),
	            formatAndHash = ((this._format & 15) << 8) | ((this.hash & 4095) << 17);
	        // write header words first
	        switch (size.header) {
	            case 2:
	                data.setUint32(pos, size.body << 2 | Squeak.HeaderTypeSizeAndClass); pos += 4;
	                data.setUint32(pos, this.sqClass.oop | Squeak.HeaderTypeSizeAndClass); pos += 4;
	                data.setUint32(pos, formatAndHash | Squeak.HeaderTypeSizeAndClass); pos += 4;
	                break;
	            case 1:
	                data.setUint32(pos, this.sqClass.oop | Squeak.HeaderTypeClass); pos += 4;
	                data.setUint32(pos, formatAndHash | size.body << 2 | Squeak.HeaderTypeClass); pos += 4;
	                break;
	            case 0:
	                var classIndex = image.compactClasses.indexOf(this.sqClass) + 1;
	                data.setUint32(pos, formatAndHash | classIndex << 12 | size.body << 2 | Squeak.HeaderTypeShort); pos += 4;
	        }
	        // now write body, if any
	        if (this.isFloat) {
	            data.setFloat64(pos, this.float); pos += 8;
	        } else if (this.words) {
	            for (var i = 0; i < this.words.length; i++) {
	                data.setUint32(pos, this.words[i]); pos += 4;
	            }
	        } else if (this.pointers) {
	            for (var i = 0; i < this.pointers.length; i++) {
	                data.setUint32(pos, image.objectToOop(this.pointers[i])); pos += 4;
	            }
	        }
	        // no "else" because CompiledMethods have both pointers and bytes
	        if (this.bytes) {
	            for (var i = 0; i < this.bytes.length; i++)
	                data.setUint8(pos++, this.bytes[i]);
	            // skip to next word
	            pos += -this.bytes.length & 3;
	        }
	        // done
	        if (pos !== beforePos + this.totalBytes()) throw Error("written size does not match");
	        return pos;
	    },
	},
	'as class', {
	    classInstFormat: function() {
	        return (this.pointers[Squeak.Class_format] >> 7) & 0xF;
	    },
	    classInstSize: function() {
	        // this is a class, answer number of named inst vars
	        var spec = this.pointers[Squeak.Class_format];
	        return ((spec >> 10) & 0xC0) + ((spec >> 1) & 0x3F) - 1;
	    },
	    classInstIsBytes: function() {
	        var fmt = this.classInstFormat();
	        return fmt >= 8 && fmt <= 11;
	    },
	    classInstIsPointers: function() {
	        return this.classInstFormat() <= 4;
	    },
	    instVarNames: function() {
	        // index changed from 4 to 3 in newer images
	        for (var index = 3; index <= 4; index++) {
	            var varNames = this.pointers[index].pointers;
	            if (varNames && varNames.length && varNames[0].bytes) {
	                return varNames.map(function(each) {
	                    return each.bytesAsString();
	                });
	            }
	        }
	        return [];
	    },
	    allInstVarNames: function() {
	        var superclass = this.superclass();
	        if (superclass.isNil)
	            return this.instVarNames();
	        else
	            return superclass.allInstVarNames().concat(this.instVarNames());
	    },
	    superclass: function() {
	        return this.pointers[0];
	    },
	    className: function() {
	        if (!this.pointers) return "_NOTACLASS_";
	        for (var nameIdx = 6; nameIdx <= 7; nameIdx++) {
	            var name = this.pointers[nameIdx];
	            if (name && name.bytes) return name.bytesAsString();
	        }
	        // must be meta class
	        for (var clsIndex = 3; clsIndex <= 6; clsIndex++) {
	            var cls = this.pointers[clsIndex];
	            if (cls && cls.pointers) {
	                for (var nameIdx = 6; nameIdx <= 7; nameIdx++) {
	                    var name = cls.pointers[nameIdx];
	                    if (name && name.bytes) return name.bytesAsString() + " class";
	                }
	            }
	        }
	        return "_SOMECLASS_";
	    },
	    defaultInst: function() {
	        return Squeak.Object;
	    },
	    classInstProto: function(className) {
	        if (this.instProto) return this.instProto;
	        var proto = this.defaultInst();  // in case below fails
	        try {
	            if (!className) className = this.className();
	            var safeName = className.replace(/[^A-Za-z0-9]/g,'_');
	            if (safeName === "UndefinedObject") safeName = "nil";
	            else if (safeName === "True") safeName = "true_";
	            else if (safeName === "False") safeName = "false_";
	            else safeName = ((/^[AEIOU]/.test(safeName)) ? 'an' : 'a') + safeName;
	            // fail okay if no eval()
	            proto = new Function("return function " + safeName + "() {};")();
	            proto.prototype = this.defaultInst().prototype;
	        } catch(e) {}
	        Object.defineProperty(this, 'instProto', { value: proto });
	        return proto;
	    },
	},
	'as method', {
	    methodSignFlag: function() {
	        return false;
	    },
	    methodNumLits: function() {
	        return (this.pointers[0]>>9) & 0xFF;
	    },
	    methodNumArgs: function() {
	        return (this.pointers[0]>>24) & 0xF;
	    },
	    methodPrimitiveIndex: function() {
	        var primBits = this.pointers[0] & 0x300001FF;
	        if (primBits > 0x1FF)
	            return (primBits & 0x1FF) + (primBits >> 19);
	        else
	            return primBits;
	    },
	    methodClassForSuper: function() {//assn found in last literal
	        var assn = this.pointers[this.methodNumLits()];
	        return assn.pointers[Squeak.Assn_value];
	    },
	    methodNeedsLargeFrame: function() {
	        return (this.pointers[0] & 0x20000) > 0;
	    },
	    methodAddPointers: function(headerAndLits) {
	        this.pointers = headerAndLits;
	    },
	    methodTempCount: function() {
	        return (this.pointers[0]>>18) & 63;
	    },
	    methodGetLiteral: function(zeroBasedIndex) {
	        return this.pointers[1+zeroBasedIndex]; // step over header
	    },
	    methodGetSelector: function(zeroBasedIndex) {
	        return this.pointers[1+zeroBasedIndex]; // step over header
	    },
	    methodAsString: function() {
	      return 'aCompiledMethod';
	    },
	},
	'as context', {
	    contextHome: function() {
	        return this.contextIsBlock() ? this.pointers[Squeak.BlockContext_home] : this;
	    },
	    contextIsBlock: function() {
	        return typeof this.pointers[Squeak.BlockContext_argumentCount] === 'number';
	    },
	    contextMethod: function() {
	        return this.contextHome().pointers[Squeak.Context_method];
	    },
	    contextSender: function() {
	        return this.pointers[Squeak.Context_sender];
	    },
	    contextSizeWithStack: function(vm) {
	        // Actual context size is inst vars + stack size. Slots beyond that may contain garbage.
	        // If passing in a VM, and this is the activeContext, use the VM's current value.
	        if (vm && vm.activeContext === this)
	            return vm.sp + 1;
	        // following is same as decodeSqueakSP() but works without vm ref
	        var sp = this.pointers[Squeak.Context_stackPointer];
	        return Squeak.Context_tempFrameStart + (typeof sp === "number" ? sp : 0);
	    },
	});
	return vm_object;
}

var vm_object_spur = {};

var hasRequiredVm_object_spur;

function requireVm_object_spur () {
	if (hasRequiredVm_object_spur) return vm_object_spur;
	hasRequiredVm_object_spur = 1;
	/*
	 * Copyright (c) 2013-2024 Vanessa Freudenberg
	 *
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:
	 *
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 *
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 */

	Squeak.Object.subclass('Squeak.ObjectSpur',
	'initialization',
	{
	    initInstanceOf: function(aClass, indexableSize, hash, nilObj) {
	        this.sqClass = aClass;
	        this.hash = hash;
	        var instSpec = aClass.pointers[Squeak.Class_format],
	            instSize = instSpec & 0xFFFF,
	            format = (instSpec>>16) & 0x1F;
	        this._format = format;
	        if (format < 12) {
	            if (format < 10) {
	                if (instSize + indexableSize > 0)
	                    this.pointers = this.fillArray(instSize + indexableSize, nilObj);
	            } else // Words
	                if (indexableSize > 0)
	                    if (aClass.isFloatClass) {
	                        this.isFloat = true;
	                        this.float = 0.0;
	                    } else
	                        this.words = new Uint32Array(indexableSize);
	        } else // Bytes
	            if (indexableSize > 0) {
	                // this._format |= -indexableSize & 3;       //deferred to writeTo()
	                this.bytes = new Uint8Array(indexableSize);  //Methods require further init of pointers
	            }
	//      Definition of Spur's format code...
	//
	//     0 = 0 sized objects (UndefinedObject True False et al)
	//     1 = non-indexable objects with inst vars (Point et al)
	//     2 = indexable objects with no inst vars (Array et al)
	//     3 = indexable objects with inst vars (MethodContext AdditionalMethodState et al)
	//     4 = weak indexable objects with inst vars (WeakArray et al)
	//     5 = weak non-indexable objects with inst vars (ephemerons) (Ephemeron)
	//     6 = unused
	//     7 = immediates (SmallInteger, Character)
	//     8 = unused
	//     9 = 64-bit indexable
	// 10-11 = 32-bit indexable (Bitmap)          (plus one odd bit, unused in 32-bits)
	// 12-15 = 16-bit indexable                   (plus two odd bits, one unused in 32-bits)
	// 16-23 = 8-bit indexable                    (plus three odd bits, one unused in 32-bits)
	// 24-31 = compiled methods (CompiledMethod)  (plus three odd bits, one unused in 32-bits)
	    },
	    installFromImage: function(oopMap, rawBits, classTable, floatClass, littleEndian, getCharacter, is64Bit) {
	        //Install this object by decoding format, and rectifying pointers
	        var classID = this.sqClass;
	        if (classID < 32) throw Error("Invalid class ID: " + classID);
	        this.sqClass = classTable[classID];
	        if (!this.sqClass) throw Error("Class ID not in class table: " + classID);
	        var bits = rawBits[this.oop],
	            nWords = bits.length;
	        switch (this._format) {
	            case 0: // zero sized object
	              // Pharo bug: Pharo 6.0 still has format 0 objects that actually do have inst vars
	              // https://pharo.fogbugz.com/f/cases/19010/ImmediateLayout-and-EphemeronLayout-have-wrong-object-format
	              // so we pretend these are regular objects and rely on nWords
	            case 1: // only inst vars
	            case 2: // only indexed vars
	            case 3: // inst vars and indexed vars
	            case 4: // only indexed vars (weak)
	            case 5: // only inst vars (weak)
	                if (nWords > 0) {
	                    var oops = bits; // endian conversion was already done
	                    this.pointers = this.decodePointers(nWords, oops, oopMap, getCharacter, is64Bit);
	                }
	                break;
	            case 11: // 32 bit array (odd length in 64 bits)
	                nWords--;
	                this._format = 10;
	            case 10: // 32 bit array
	                if (this.sqClass === floatClass) {
	                    //These words are actually a Float
	                    this.isFloat = true;
	                    this.float = this.decodeFloat(bits, littleEndian, true);
	                } else if (nWords > 0) {
	                    this.words = this.decodeWords(nWords, bits, littleEndian);
	                }
	                break;
	            case 12: // 16 bit array
	            case 13: // 16 bit array (odd length)
	                throw Error("16 bit arrays not supported yet");
	            case 20: // 8 bit array, length-4 (64 bit image)
	            case 21: // ... length-5
	            case 22: // ... length-6
	            case 23: // ... length-7
	                nWords--;
	                this._format -= 4;
	                // fall through
	            case 16: // 8 bit array
	            case 17: // ... length-1
	            case 18: // ... length-2
	            case 19: // ... length-3
	                if (nWords > 0)
	                    this.bytes = this.decodeBytes(nWords, bits, 0, this._format & 3);
	                break;
	            case 28: // CompiledMethod, length-4 (64 bit image)
	            case 29: // ... length-5
	            case 30: // ... length-6
	            case 31: // ... length-7
	                nWords--;
	                this._format -= 4;
	                // fall through
	            case 24: // CompiledMethod
	            case 25: // ... length-1
	            case 26: // ... length-2
	            case 27: // ... length-3
	                var rawHeader = this.decodeWords(1, bits, littleEndian)[0];
	                var intHeader = rawHeader >> (is64Bit ? 3 : 1);
	                var numLits = intHeader & 0x7FFF,
	                    oops = is64Bit
	                      ? this.decodeWords64(numLits+1, bits, littleEndian)
	                      : this.decodeWords(numLits+1, bits, littleEndian),
	                    ptrWords = is64Bit ? (numLits + 1) * 2 : numLits + 1;
	                this.pointers = this.decodePointers(numLits+1, oops, oopMap, getCharacter, is64Bit); //header+lits
	                this.bytes = this.decodeBytes(nWords-ptrWords, bits, ptrWords, this._format & 3);
	                if (is64Bit) this.pointers[0] = (bits[1] & 0x80000000) | intHeader; // fix header
	                break;
	            default:
	                throw Error("Unknown object format: " + this._format);

	        }
	        this.mark = false; // for GC
	    },
	    decodeWords64: function(nWords, theBits, littleEndian) {
	        // we assume littleEndian for now
	        var words = new Array(nWords);
	        for (var i = 0; i < nWords; i++) {
	            var lo = theBits[i*2],
	                hi = theBits[i*2+1];
	            words[i] = Squeak.word64FromUint32(hi, lo);
	        }
	        return words;
	    },
	    decodePointers: function(nWords, theBits, oopMap, getCharacter, is64Bit) {
	        //Convert immediate objects and look up object pointers in oopMap
	        var ptrs = new Array(nWords);
	        for (var i = 0; i < nWords; i++) {
	            var oop = theBits[i];
	            // in 64 bits, oops > 53 bits are read as [hi, lo]
	            if (typeof oop !== "number") {
	                if ((oop[1] & 7) === 4) {
	                    ptrs[i] = this.decodeSmallFloat(oop[0], oop[1], is64Bit);
	                } else if ((oop[1] & 7) === 1) {
	                    ptrs[i] = is64Bit.makeLargeFromSmall(oop[0], oop[1]);
	                } else if ((oop[1] & 7) === 2) {
	                    throw Error("Large Immediate Characters not implemented yet");
	                } else {
	                    throw Error("Large OOPs not implemented yet");
	                }
	            } else if ((oop & 1) === 1) {          // SmallInteger
	                if (is64Bit) {
	                    // if it fits in a 31 bit SmallInt ...
	                    ptrs[i] = (oop >= 0 ? oop <= 0x1FFFFFFFF : oop >= -0x200000000)
	                        ? oop / 4 >> 1  // ... then convert directly, otherwise make large
	                        : is64Bit.makeLargeFromSmall((oop - (oop >>> 0)) / 0x100000000 >>> 0, oop >>> 0);
	                } else ptrs[i] = oop >> 1;
	            } else if ((oop & 3) === 2) {   // Character
	                if (oop < 0 || oop > 0x1FFFFFFFF) throw Error("Large Immediate Characters not implemented yet");
	                ptrs[i] = getCharacter(oop >>> (is64Bit ? 3 : 2));
	            } else if (is64Bit && (oop & 7) === 4) {   // SmallFloat
	                ptrs[i] = this.decodeSmallFloat((oop - (oop >>> 0)) / 0x100000000 >>> 0, oop >>> 0, is64Bit);
	            } else {                        // Object
	                ptrs[i] = oopMap[oop] || 42424242;
	                // when loading a context from image segment, there is
	                // garbage beyond its stack pointer, resulting in the oop
	                // not being found in oopMap. We just fill in an arbitrary
	                // SmallInteger - it's never accessed anyway

	                // until 64 bit is working correctly, leave this here as a check ...
	                if (ptrs[i] === 42424242) debugger;
	            }
	        }
	        return ptrs;
	    },
	    decodeSmallFloat: function(hi, lo, is64Bit) {
	        // SmallFloats are stored with full 52 bit mantissa, but shortened exponent.
	        // The lowest 3 bits are tags, the next is the sign bit
	        var newHi = 0,
	            newLo = 0,
	            sign = (lo & 8) << (32-4),               // shift sign bit to msb
	            isZero = (hi | (lo & 0xFFFFFFF0)) === 0; // ignore sign and tag bits
	        if (isZero) {
	            // zero is special - can be positive or negative
	            newHi = sign;
	        } else {
	            // shift everything right by 4, fix exponent, add sign
	            newHi = (hi >>> 4) + 0x38000000 | sign;
	            newLo = (lo >>> 4) | (hi & 0xF) << (32-4);
	            // 1023 is the bias of the 11-bit exponent in an IEEE 754 64-bit float,
	            // and 127 is the bias of our 8-bit exponent. 1023-127 == 0x380
	        }
	        return is64Bit.makeFloat(new Uint32Array([newLo, newHi]));
	    },
	    overhead64: function(bits) {
	        // the number of bytes this object is larger in 64 bits than in 32 bits
	        // (due to 8-byte alignment even in 32 bits this only affects pointer objects)
	        var overhead = 0;
	        var words32 = 0;
	        var words64 = 0;
	        if (this._format <= 5) {
	            // pointer objects
	            overhead = bits.length & ~1; // each oop occupied 2 words instead of 1 ...
	            // ... but odd lengths get padded so we subtract 1
	            // words32 === words64 because same number of oops
	        } else if (this._format >= 24) {
	            // compiled methods
	            var numLits = (bits[0] >> 3) & 0x7FFF; // assumes 64 bit little endian
	            var overhead = numLits + 1;  // each oop occupied 2 words instead of 1 ...
	            var oddOops = (overhead & 1) === 1;
	            var oddBytes = this._format >= 28;
	            // ... odd-word lengths would get padded so we subtract 1,
	            // but if there is also odd-word bytecodes it cancels out so we save 1 word instead
	            if (oddOops) overhead += oddBytes ? +1 : -1;
	            words64 = bits.length / 2;
	            words32 = bits.length - overhead;
	        } else {
	            // non-pointer objects have no oop overhead
	            words32 = bits.length;
	            words64 = words32 / 2;
	        }
	        // we need an extra header in 32 bits if we now use more words than before
	        return {
	            bytes: overhead * 4,
	            sizeHeader: words32 >= 255 && words64 < 255,
	        }
	    },
	    initInstanceOfChar: function(charClass, unicode) {
	        this.oop = (unicode << 2) | 2;
	        this.sqClass = charClass;
	        this.hash = unicode;
	        this._format = 7;
	        this.mark = true;   // stays always marked so not traced by GC
	    },
	    initInstanceOfFloat: function(floatClass, bits) {
	        this.sqClass = floatClass;
	        this.hash = 0;
	        this._format = 10;
	        this.isFloat = true;
	        this.float = this.decodeFloat(bits, true, true);
	    },
	    initInstanceOfLargeInt: function(largeIntClass, size) {
	        this.sqClass = largeIntClass;
	        this.hash = 0;
	        this._format = 16;
	        // this._format |= -indexableSize & 3;       //deferred to writeTo()
	        this.bytes = new Uint8Array(size);
	    },
	    classNameFromImage: function(oopMap, rawBits) {
	        var name = oopMap[rawBits[this.oop][Squeak.Class_name]];
	        if (name && name._format >= 16 && name._format < 24) {
	            var bits = rawBits[name.oop],
	                bytes = name.decodeBytes(bits.length, bits, 0, name._format & 7);
	            return Squeak.bytesAsString(bytes);
	        }
	        return "Class";
	    },
	    renameFromImage: function(oopMap, rawBits, classTable) {
	        var classObj = classTable[this.sqClass];
	        if (!classObj) return this;
	        var instProto = classObj.instProto || classObj.classInstProto(classObj.classNameFromImage(oopMap, rawBits));
	        if (!instProto) return this;
	        var renamedObj = new instProto; // Squeak.SpurObject
	        renamedObj.oop = this.oop;
	        renamedObj.sqClass = this.sqClass;
	        renamedObj._format = this._format;
	        renamedObj.hash = this.hash;
	        return renamedObj;
	    },
	},
	'accessing', {
	    instSize: function() {//same as class.classInstSize, but faster from format
	        if (this._format < 2) return this.pointersSize(); //fixed fields only
	        return this.sqClass.classInstSize();
	    },
	    indexableSize: function(primHandler) {
	        var fmt = this._format;
	        if (fmt < 2) return -1; //not indexable
	        if (fmt === 3 && primHandler.vm.isContext(this))
	            return this.pointers[Squeak.Context_stackPointer]; // no access beyond top of stacks
	        if (fmt < 6) return this.pointersSize() - this.instSize(); // pointers
	        if (fmt < 12) return this.wordsSize(); // words
	        if (fmt < 16) return this.shortsSize(); // shorts
	        if (fmt < 24) return this.bytesSize(); // bytes
	        return 4 * this.pointersSize() + this.bytesSize(); // methods
	    },
	    snapshotSize: function() {
	        // words of extra object header and body this object would take up in image snapshot
	        // body size includes header size that is always present
	        var nWords =
	            this.isFloat ? 2 :
	            this.words ? this.words.length :
	            this.pointers ? this.pointers.length : 0;
	        // methods have both pointers and bytes
	        if (this.bytes) nWords += (this.bytes.length + 3) >>> 2;
	        var extraHeader = nWords >= 255 ? 2 : 0;
	        nWords += nWords & 1; // align to 8 bytes
	        nWords += 2; // one 64 bit header always present
	        if (nWords < 4) nWords = 4; // minimum object size
	        return {header: extraHeader, body: nWords};
	    },
	    writeTo: function(data, pos, littleEndian, objToOop) {
	        var nWords =
	            this.isFloat ? 2 :
	            this.words ? this.words.length :
	            this.pointers ? this.pointers.length : 0;
	        if (this.bytes) {
	            nWords += (this.bytes.length + 3) >>> 2;
	            this._format |= -this.bytes.length & 3;
	        }
	        var beforePos = pos,
	            formatAndClass = (this._format << 24) | (this.sqClass.hash & 0x003FFFFF),
	            sizeAndHash = (nWords << 24) | (this.hash & 0x003FFFFF);
	        // write extra header if needed
	        if (nWords >= 255) {
	            data.setUint32(pos, nWords, littleEndian); pos += 4;
	            sizeAndHash = (255 << 24) | (this.hash & 0x003FFFFF);
	            data.setUint32(pos, sizeAndHash, littleEndian); pos += 4;
	        }
	        // write regular header
	        data.setUint32(pos, formatAndClass, littleEndian); pos += 4;
	        data.setUint32(pos, sizeAndHash, littleEndian); pos += 4;
	        // now write body, if any
	        if (this.isFloat) {
	            data.setFloat64(pos, this.float, littleEndian); pos += 8;
	        } else if (this.words) {
	            for (var i = 0; i < this.words.length; i++) {
	                data.setUint32(pos, this.words[i], littleEndian); pos += 4;
	            }
	        } else if (this.pointers) {
	            var startIndex = 0;
	            if (this._format >= 24) {
	                // preserve signFlag in method header
	                var mask = this.methodSignFlag() ? 0x80000000 : 0;
	                var taggedHeader = this.pointers[0] << 1 | 1 | mask;
	                data.setUint32(pos, taggedHeader, littleEndian); pos += 4;
	                startIndex = 1;
	            }
	            for (var i = startIndex; i < this.pointers.length; i++) {
	                data.setUint32(pos, objToOop(this.pointers[i]), littleEndian); pos += 4;
	            }
	        }
	        // no "else" because CompiledMethods have both pointers and bytes
	        if (this.bytes) {
	            for (var i = 0; i < this.bytes.length; i++)
	                data.setUint8(pos++, this.bytes[i]);
	            // skip to next word
	            pos += -this.bytes.length & 3;
	        }
	        // minimum object size is 16, align to 8 bytes
	        if (nWords === 0) pos += 8;
	        else pos += (nWords & 1) * 4;
	        // done
	        if (pos !== beforePos + this.totalBytes()) throw Error("written size does not match");
	        return pos;
	    },
	},
	'testing', {
	    isBytes: function() {
	        var fmt = this._format;
	        return fmt >= 16 && fmt <= 23;
	    },
	    isPointers: function() {
	        return this._format <= 6;
	    },
	    isWords: function() {
	        return this._format === 10;
	    },
	    isWordsOrBytes: function() {
	        var fmt = this._format;
	        return fmt === 10 || (fmt >= 16 && fmt <= 23);
	    },
	    isWeak: function() {
	        return this._format === 4;
	    },
	    isMethod: function() {
	        return this._format >= 24;
	    },
	    sameFormats: function(a, b) {
	        return a < 16 ? a === b : (a & 0xF8) === (b & 0xF8);
	    },
	},
	'as class', {
	    defaultInst: function() {
	        return Squeak.ObjectSpur;
	    },
	    classInstFormat: function() {
	        return (this.pointers[Squeak.Class_format] >> 16) & 0x1F;
	    },
	    classInstSize: function() {
	        // this is a class, answer number of named inst vars
	        return this.pointers[Squeak.Class_format] & 0xFFFF;
	    },
	    classInstIsBytes: function() {
	        var fmt = this.classInstFormat();
	        return fmt >= 16 && fmt <= 23;
	    },
	    classInstIsPointers: function() {
	        return this.classInstFormat() <= 6;
	    },
	    classByteSizeOfInstance: function(nElements) {
	        var format = this.classInstFormat(),
	            nWords = this.classInstSize();
	        if (format < 9) nWords += nElements;                        // 32 bit
	        else if (format >= 16) nWords += (nElements + 3) / 4 | 0;   //  8 bit
	        else if (format >= 12) nWords += (nElements + 1) / 2 | 0;   // 16 bit
	        else if (format >= 10) nWords += nElements;                 // 32 bit
	        else nWords += nElements * 2;                               // 64 bit
	        nWords += nWords & 1;                                       // align to 64 bits
	        nWords += nWords >= 255 ? 4 : 2;                            // header words
	        if (nWords < 4) nWords = 4;                                 // minimum object size
	        return nWords * 4;
	    },
	},
	'as compiled block', {
	    blockOuterCode: function() {
	        return this.pointers[this.pointers.length - 1];
	    },
	},
	'as method', {
	    methodSignFlag: function() {
	        return this.pointers[0] < 0;
	    },
	    methodNumLits: function() {
	        return this.pointers[0] & 0x7FFF;
	    },
	    methodPrimitiveIndex: function() {
	        if ((this.pointers[0] & 0x10000) === 0) return 0;
	        return this.bytes[1] + 256 * this.bytes[2];
	    },
	    methodAsString: function() {
	        var cls = this.pointers[this.pointers.length - 1].pointers[Squeak.ClassBinding_value];
	        var selector = this.pointers[this.pointers.length - 2];
	        if (selector.pointers) selector = selector.pointers[Squeak.AdditionalMethodState_selector];
	        return cls.className() + ">>" + selector.bytesAsString();
	    },
	});
	return vm_object_spur;
}

var vm_image = {};

var hasRequiredVm_image;

function requireVm_image () {
	if (hasRequiredVm_image) return vm_image;
	hasRequiredVm_image = 1;
	/*
	 * Copyright (c) 2013-2024 Vanessa Freudenberg
	 *
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:
	 *
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 *
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 */

	Object.subclass('Squeak.Image',
	'about', {
	    about: function() {
	    /*
	    Object Format
	    =============
	    Each Squeak object is a Squeak.Object instance, only SmallIntegers are JS numbers.
	    Instance variables/fields reference other objects directly via the "pointers" property.
	    A Spur image uses Squeak.ObjectSpur instances instead. Characters are not immediate,
	    but made identical using a character table. They are created with their mark bit set to
	    true, so are ignored by the GC.
	    {
	        sqClass: reference to class object
	        format: format integer as in Squeak oop header
	        hash: identity hash integer
	        pointers: (optional) Array referencing inst vars + indexable fields
	        words: (optional) Array of numbers (words)
	        bytes: (optional) Array of numbers (bytes)
	        float: (optional) float value if this is a Float object
	        isNil: (optional) true if this is the nil object
	        isTrue: (optional) true if this is the true object
	        isFalse: (optional) true if this is the false object
	        isFloat: (optional) true if this is a Float object
	        isFloatClass: (optional) true if this is the Float class
	        isCompact: (optional) true if this is a compact class
	        oop: identifies this object in a snapshot (assigned on GC, new space object oops are negative)
	        mark: boolean (used only during GC, otherwise false)
	        dirty: boolean (true when an object may have a ref to a new object, set on every write, reset on GC)
	        nextObject: linked list of objects in old space and young space (newly created objects do not have this yet)
	    }

	    Object Memory
	    =============
	    Objects in old space are a linked list (firstOldObject). When loading an image, all objects are old.
	    Objects are tenured to old space during a full GC.
	    New objects are only referenced by other objects' pointers, and thus can be garbage-collected
	    at any time by the Javascript GC.
	    A partial GC creates a linked list of new objects reachable from old space. We call this
	    list "young space". It is not stored, but only created by primitives like nextObject,
	    nextInstance, or become to support enumeration of new space.
	    To efficiently find potential young space roots, any write to an instance variable sets
	    the "dirty" flag of the object, allowing to skip clean objects.

	    Weak references are finalized by a full GC. A partial GC only finalizes young weak references.

	    */
	    }
	},
	'initializing', {
	    initialize: function(name) {
	        this.headRoom = 100000000; // TODO: pass as option
	        this.totalMemory = 0;
	        this.headerFlags = 0;
	        this.name = name;
	        this.gcCount = 0;
	        this.gcMilliseconds = 0;
	        this.pgcCount = 0;
	        this.pgcMilliseconds = 0;
	        this.gcTenured = 0;
	        this.allocationCount = 0;
	        this.oldSpaceCount = 0;
	        this.youngSpaceCount = 0;
	        this.newSpaceCount = 0;
	        this.hasNewInstances = {};
	    },
	    readFromBuffer: function(arraybuffer, thenDo, progressDo) {
	        console.log('squeak: reading ' + this.name + ' (' + arraybuffer.byteLength + ' bytes)');
	        this.startupTime = Date.now();
	        var data = new DataView(arraybuffer),
	            littleEndian = false,
	            pos = 0;
	        var readWord32 = function() {
	            var int = data.getUint32(pos, littleEndian);
	            pos += 4;
	            return int;
	        };
	        var readWord64 = function() {
	            // we assume littleEndian for now
	            var lo = data.getUint32(pos, true),
	                hi = data.getUint32(pos+4, true);
	            pos += 8;
	            return Squeak.word64FromUint32(hi, lo);
	        };
	        var readWord = readWord32;
	        var wordSize = 4;
	        var readBits = function(nWords, isPointers) {
	            if (isPointers) { // do endian conversion
	                var oops = [];
	                while (oops.length < nWords)
	                    oops.push(readWord());
	                return oops;
	            } else { // words (no endian conversion yet)
	                var bits = new Uint32Array(arraybuffer, pos, nWords * wordSize / 4);
	                pos += nWords * wordSize;
	                return bits;
	            }
	        };
	        // read version and determine endianness
	        var baseVersions = [6501, 6502, 6504, 68000, 68002, 68004],
	            baseVersionMask = 0x119EE,
	            version = 0,
	            fileHeaderSize = 0;
	        while (true) {  // try all four endianness + header combos
	            littleEndian = !littleEndian;
	            pos = fileHeaderSize;
	            version = readWord();
	            if (baseVersions.indexOf(version & baseVersionMask) >= 0) break;
	            if (!littleEndian) fileHeaderSize += 512;
	            if (fileHeaderSize > 512) throw Error("bad image version"); // we tried all combos
	        }	        this.version = version;
	        var nativeFloats = (version & 1) !== 0;
	        this.hasClosures = !([6501, 6502, 68000].indexOf(version) >= 0);
	        this.isSpur = (version & 16) !== 0;
	        // var multipleByteCodeSetsActive = (version & 256) !== 0; // not used
	        var is64Bit = version >= 68000;
	        if (is64Bit && !this.isSpur) throw Error("64 bit non-spur images not supported yet");
	        if (is64Bit)  { readWord = readWord64; wordSize = 8; }
	        this.is64Bit = is64Bit;
	        console.log(`squeak: Image Spur: ${this.isSpur} is64Bit: ${is64Bit} hasClosures: ${this.hasClosures} version: ${version}`);
	        // parse image header
	        var imageHeaderSize = readWord32(); // always 32 bits
	        var objectMemorySize = readWord(); //first unused location in heap
	        var oldBaseAddr = readWord(); //object memory base address of image
	        var specialObjectsOopInt = readWord(); //oop of array of special oops
	        var lastHash = readWord32(); if (is64Bit) readWord32(); // not used
	        var savedWindowSize = readWord(); // not used
	        this.headerFlags = readWord(); // vm attribute 48
	        this.savedHeaderWords = [lastHash, savedWindowSize, this.headerFlags];
	        for (var i = 0; i < 4; i++) {
	            this.savedHeaderWords.push(readWord32());
	        }
	        var firstSegSize = readWord();
	        var prevObj;
	        var oopMap = {};
	        var rawBits = {};
	        var headerSize = fileHeaderSize + imageHeaderSize;
	        pos = headerSize;
	        if (!this.isSpur) {
	            // read traditional object memory
	            while (pos < headerSize + objectMemorySize) {
	                var nWords = 0;
	                var classInt = 0;
	                var header = readWord();
	                switch (header & Squeak.HeaderTypeMask) {
	                    case Squeak.HeaderTypeSizeAndClass:
	                        nWords = header >>> 2;
	                        classInt = readWord();
	                        header = readWord();
	                        break;
	                    case Squeak.HeaderTypeClass:
	                        classInt = header - Squeak.HeaderTypeClass;
	                        header = readWord();
	                        nWords = (header >>> 2) & 63;
	                        break;
	                    case Squeak.HeaderTypeShort:
	                        nWords = (header >>> 2) & 63;
	                        classInt = (header >>> 12) & 31; //compact class index
	                        //Note classInt<32 implies compact class index
	                        break;
	                    case Squeak.HeaderTypeFree:
	                        throw Error("Unexpected free block");
	                }
	                nWords--;  //length includes base header which we have already read
	                var oop = pos - 4 - headerSize, //0-rel byte oop of this object (base header)
	                    format = (header>>>8) & 15,
	                    hash = (header>>>17) & 4095,
	                    bits = readBits(nWords, format < 5);
	                var object = new Squeak.Object();
	                object.initFromImage(oop, classInt, format, hash);
	                if (classInt < 32) object.hash |= 0x10000000;    // see fixCompactOops()
	                if (prevObj) prevObj.nextObject = object;
	                this.oldSpaceCount++;
	                prevObj = object;
	                //oopMap is from old oops to actual objects
	                oopMap[oldBaseAddr + oop] = object;
	                //rawBits holds raw content bits for objects
	                rawBits[oop] = bits;
	            }
	            this.firstOldObject = oopMap[oldBaseAddr+4];
	            this.lastOldObject = object;
	            this.lastOldObject.nextObject = null; // Add next object pointer as indicator this is in fact an old object
	            this.oldSpaceBytes = objectMemorySize;
	        } else {
	            // Read all Spur object memory segments
	            this.oldSpaceBytes = firstSegSize - 16;
	            var segmentEnd = pos + firstSegSize,
	                addressOffset = 0,
	                classPages = null,
	                skippedBytes = 0,
	                oopAdjust = {};
	            while (pos < segmentEnd) {
	                while (pos < segmentEnd - 16) {
	                    // read objects in segment
	                    var objPos = pos,
	                        formatAndClass = readWord32(),
	                        sizeAndHash = readWord32(),
	                        size = sizeAndHash >>> 24;
	                    if (size === 255) { // this was the extended size header, read actual header
	                        size = formatAndClass;
	                        // In 64 bit images the size can actually be 56 bits. LOL. Nope.
	                        // if (is64Bit) size += (sizeAndHash & 0x00FFFFFF) * 0x100000000;
	                        formatAndClass = readWord32();
	                        sizeAndHash = readWord32();
	                    }
	                    var oop = addressOffset + pos - 8 - headerSize,
	                        format = (formatAndClass >>> 24) & 0x1F,
	                        classID = formatAndClass & 0x003FFFFF,
	                        hash = sizeAndHash & 0x003FFFFF;
	                    var bits = readBits(size, format < 10 && classID > 0);
	                    // align on 8 bytes, min size 16 bytes
	                    pos += is64Bit
	                      ? (size < 1 ? 1 - size : 0) * 8
	                      : (size < 2 ? 2 - size : size & 1) * 4;
	                    // low class ids are internal to Spur
	                    if (classID >= 32) {
	                        var object = new Squeak.ObjectSpur();
	                        object.initFromImage(oop, classID, format, hash);
	                        if (prevObj) prevObj.nextObject = object;
	                        this.oldSpaceCount++;
	                        prevObj = object;
	                        //oopMap is from old oops to actual objects
	                        oopMap[oldBaseAddr + oop] = object;
	                        //rawBits holds raw content bits for objects
	                        rawBits[oop] = bits;
	                        oopAdjust[oop] = skippedBytes;
	                        // account for size difference of 32 vs 64 bit oops
	                        if (is64Bit) {
	                            var overhead = object.overhead64(bits);
	                            skippedBytes += overhead.bytes;
	                            // OTOH, in 32 bits we need the extra size header sooner
	                            // so in some cases 64 bits has 2 words less overhead
	                            if (overhead.sizeHeader) {
	                                oopAdjust[oop] -= 8;
	                                skippedBytes -= 8;
	                            }
	                        }
	                    } else {
	                        skippedBytes += pos - objPos;
	                        if (classID === 16 && !classPages) classPages = bits;
	                        if (classID) oopMap[oldBaseAddr + oop] = bits;  // used in spurClassTable()
	                    }
	                }
	                if (pos !== segmentEnd - 16) throw Error("invalid segment");
	                // last 16 bytes in segment is a bridge object
	                var deltaWords = readWord32(),
	                    deltaWordsHi = readWord32(),
	                    segmentBytes = readWord32();
	                    readWord32();
	                //  if segmentBytes is zero, the end of the image has been reached
	                if (segmentBytes !== 0) {
	                    var deltaBytes = deltaWordsHi & 0xFF000000 ? (deltaWords & 0x00FFFFFF) * 4 : 0;
	                    segmentEnd += segmentBytes;
	                    addressOffset += deltaBytes;
	                    skippedBytes += 16 + deltaBytes;
	                    this.oldSpaceBytes += deltaBytes + segmentBytes;
	                }
	            }
	            this.oldSpaceBytes -= skippedBytes;
	            this.firstOldObject = oopMap[oldBaseAddr];
	            this.lastOldObject = object;
	            this.lastOldObject.nextObject = null; // Add next object pointer as indicator this is in fact an old object
	        }

	        this.totalMemory = this.oldSpaceBytes + this.headRoom;
	        this.totalMemory = Math.ceil(this.totalMemory / 1000000) * 1000000;

	        {
	            // For debugging: re-create all objects from named prototypes
	            var _splObs = oopMap[specialObjectsOopInt],
	                cc = this.isSpur ? this.spurClassTable(oopMap, rawBits, classPages, _splObs)
	                    : rawBits[oopMap[rawBits[_splObs.oop][Squeak.splOb_CompactClasses]].oop];
	            var renamedObj = null;
	            object = this.firstOldObject;
	            prevObj = null;
	            while (object) {
	                prevObj = renamedObj;
	                renamedObj = object.renameFromImage(oopMap, rawBits, cc);
	                if (prevObj) prevObj.nextObject = renamedObj;
	                else this.firstOldObject = renamedObj;
	                oopMap[oldBaseAddr + object.oop] = renamedObj;
	                object = object.nextObject;
	            }
	            this.lastOldObject = renamedObj;
	            this.lastOldObject.nextObject = null; // Add next object pointer as indicator this is in fact an old object
	        }

	        // properly link objects by mapping via oopMap
	        var splObs         = oopMap[specialObjectsOopInt];
	        var compactClasses = rawBits[oopMap[rawBits[splObs.oop][Squeak.splOb_CompactClasses]].oop];
	        var floatClass     = oopMap[rawBits[splObs.oop][Squeak.splOb_ClassFloat]];
	        // Spur needs different arguments for installFromImage()
	        if (this.isSpur) {
	            this.initImmediateClasses(oopMap, rawBits, splObs);
	            compactClasses = this.spurClassTable(oopMap, rawBits, classPages, splObs);
	            nativeFloats = this.getCharacter.bind(this);
	            this.initSpurOverrides();
	        }
	        var obj = this.firstOldObject,
	            done = 0;
	        // Hack for the tiny image in CodeParadise to keep floats alive.
	        // The tiny image does not have BoxedFloat64 and only a Float
	        // class. When saving/snapshotting an image Float will be deleted
	        // from the class table. To fix this, the class hash is set explicitly.
	        // Apart from that, snapshotting seems to work correctly, even if
	        // multiple classes are freed during snapshot (which feels awkward).
	        // Tried adding a BoxedFloat64 class, but similar issues remained.
	        floatClass.hash = 34;
	        var mapSomeObjects = function() {
	            if (obj) {
	                var stop = done + (this.oldSpaceCount / 20 | 0);    // do it in 20 chunks
	                while (obj && done < stop) {
	                    obj.installFromImage(oopMap, rawBits, compactClasses, floatClass, littleEndian, nativeFloats, is64Bit && {
	                            makeFloat: function makeFloat(bits) {
	                                return this.instantiateFloat(bits);
	                            }.bind(this),
	                            makeLargeFromSmall: function makeLargeFromSmall(hi, lo) {
	                                return this.instantiateLargeFromSmall(hi, lo);
	                            }.bind(this),
	                        });
	                    obj = obj.nextObject;
	                    done++;
	                }
	                if (progressDo) progressDo(done / this.oldSpaceCount);
	                return true;    // do more
	            } else { // done
	                this.specialObjectsArray = splObs;
	                this.decorateKnownObjects();
	                if (this.isSpur) {
	                    this.fixSkippedOops(oopAdjust);
	                    if (is64Bit) this.fixPCs();
	                    this.ensureFullBlockClosureClass(this.specialObjectsArray, compactClasses);
	                } else {
	                    this.fixCompiledMethods();
	                    this.fixCompactOops();
	                }
	                return false;   // don't do more
	            }
	        }.bind(this);
	        function mapSomeObjectsAsync() {
	            if (mapSomeObjects()) {
	                self.setTimeout(mapSomeObjectsAsync, 0);
	            } else {
	                if (thenDo) thenDo();
	            }
	        }	        if (!progressDo) {
	            while (mapSomeObjects()) {}	            if (thenDo) thenDo();
	        } else {
	            self.setTimeout(mapSomeObjectsAsync, 0);
	        }
	    },
	    decorateKnownObjects: function() {
	        var splObjs = this.specialObjectsArray.pointers;
	        splObjs[Squeak.splOb_NilObject].isNil = true;
	        splObjs[Squeak.splOb_TrueObject].isTrue = true;
	        splObjs[Squeak.splOb_FalseObject].isFalse = true;
	        splObjs[Squeak.splOb_ClassFloat].isFloatClass = true;
	        if (!this.isSpur) {
	            this.compactClasses = this.specialObjectsArray.pointers[Squeak.splOb_CompactClasses].pointers;
	            for (var i = 0; i < this.compactClasses.length; i++)
	                if (!this.compactClasses[i].isNil)
	                    this.compactClasses[i].isCompact = true;
	        }
	        if (!Number.prototype.sqInstName)
	            Object.defineProperty(Number.prototype, 'sqInstName', {
	                enumerable: false,
	                value: function() { return this.toString() }
	            });
	    },
	    fixCompactOops: function() {
	        // instances of compact classes might have been saved with a non-compact header
	        // fix their oops here so validation succeeds later
	        if (this.isSpur) return;
	        var obj = this.firstOldObject,
	            adjust = 0;
	        while (obj) {
	            var hadCompactHeader = obj.hash > 0x0FFFFFFF,
	                mightBeCompact = !!obj.sqClass.isCompact;
	            if (hadCompactHeader !== mightBeCompact) {
	                var isCompact = obj.snapshotSize().header === 0;
	                if (hadCompactHeader !== isCompact) {
	                    adjust += isCompact ? -4 : 4;
	                }
	            }
	            obj.hash &= 0x0FFFFFFF;
	            obj.oop += adjust;
	            obj = obj.nextObject;
	        }
	        this.oldSpaceBytes += adjust;
	    },
	    fixCompiledMethods: function() {
	        // in the 6501 pre-release image, some CompiledMethods
	        // do not have the proper class
	        if (this.version >= 6502) return;
	        var obj = this.firstOldObject,
	            compiledMethodClass = this.specialObjectsArray.pointers[Squeak.splOb_ClassCompiledMethod];
	        while (obj) {
	            if (obj.isMethod()) obj.sqClass = compiledMethodClass;
	            obj = obj.nextObject;
	        }
	    },
	    fixSkippedOops: function(oopAdjust) {
	        // reading Spur skips some internal objects
	        // we adjust the oops of following objects here
	        // this is like the compaction phase of our GC
	        var obj = this.firstOldObject;
	        while (obj) {
	            obj.oop -= oopAdjust[obj.oop];
	            obj = obj.nextObject;
	        }
	        // do a sanity check
	        obj = this.lastOldObject;
	        if (obj.addr() + obj.totalBytes() !== this.oldSpaceBytes)
	            throw Error("image size doesn't match object sizes")
	    },
	    fixPCs: function() {
	        // In 64 bits literals take up twice as much space
	        // The pc starts after the last literal. Fix it.
	        var clsMethodContext = this.specialObjectsArray.pointers[Squeak.splOb_ClassMethodContext],
	            pc = Squeak.Context_instructionPointer,
	            method = Squeak.Context_method,
	            clsBlockClosure = this.specialObjectsArray.pointers[Squeak.splOb_ClassBlockClosure],
	            startpc = Squeak.Closure_startpc,
	            outerContext = Squeak.Closure_outerContext,
	            obj = this.firstOldObject;
	        while (obj) {
	            if (obj.sqClass === clsMethodContext) {
	                obj.pointers[pc] -= obj.pointers[method].pointers.length * 4;
	            } else if (obj.sqClass === clsBlockClosure) {
	                obj.pointers[startpc] -= obj.pointers[outerContext].pointers[method].pointers.length * 4;
	            }
	            obj = obj.nextObject;
	        }
	    },
	    ensureFullBlockClosureClass: function(splObs, compactClasses) {
	        // Read FullBlockClosure class from compactClasses if not yet present in specialObjectsArray.
	        if (splObs.pointers[Squeak.splOb_ClassFullBlockClosure].isNil && compactClasses[38]) {
	            splObs.pointers[Squeak.splOb_ClassFullBlockClosure] = compactClasses[38];
	        }
	    },
	},
	'garbage collection - full', {
	    fullGC: function(reason) {
	        // Collect garbage and return first tenured object (to support object enumeration)
	        // Old space is a linked list of objects - each object has an "nextObject" reference.
	        // New space objects do not have that pointer, they are garbage-collected by JavaScript.
	        // But they have an allocation id so the survivors can be ordered on tenure.
	        // The "nextObject" references are created by collecting all new objects,
	        // sorting them by id, and then linking them into old space.
	        this.vm.addMessage("fullGC: " + reason);
	        var start = Date.now();
	        var previousNew = this.newSpaceCount; // includes young and newly allocated
	        var previousOld = this.oldSpaceCount;
	        var newObjects = this.markReachableObjects(); // technically these are young objects
	        this.removeUnmarkedOldObjects();
	        this.appendToOldObjects(newObjects);
	        this.finalizeWeakReferences();
	        this.allocationCount += this.newSpaceCount;
	        this.newSpaceCount = 0;
	        this.youngSpaceCount = 0;
	        this.hasNewInstances = {};
	        this.gcCount++;
	        this.gcMilliseconds += Date.now() - start;
	        var delta = previousOld - this.oldSpaceCount; // absolute change
	        var survivingNew = newObjects.length;
	        var survivingOld = this.oldSpaceCount - survivingNew;
	        var gcedNew = previousNew - survivingNew;
	        var gcedOld = previousOld - survivingOld;
	        console.log("Full GC (" + reason + "): " + (Date.now() - start) + " ms;" +
	            " before: " + previousOld.toLocaleString() + " old objects;" +
	            " allocated " + previousNew.toLocaleString() + " new;" +
	            " surviving " + survivingOld.toLocaleString() + " old;" +
	            " tenuring " + survivingNew.toLocaleString() + " new;" +
	            " gc'ed " + gcedOld.toLocaleString() + " old and " + gcedNew.toLocaleString() + " new;" +
	            " total now: " + this.oldSpaceCount.toLocaleString() + " (" + (delta > 0 ? "+" : "") + delta.toLocaleString() + ", "
	            + this.oldSpaceBytes.toLocaleString() + " bytes)"
	            );

	        return newObjects.length > 0 ? newObjects[0] : null;
	    },
	    gcRoots: function() {
	        // the roots of the system
	        this.vm.storeContextRegisters();        // update active context
	        return [this.specialObjectsArray, this.vm.activeContext];
	    },
	    markReachableObjects: function() {
	        // FullGC: Visit all reachable objects and mark them.
	        // Return surviving new objects (young objects to be tenured).
	        // Contexts are handled specially: they have garbage beyond the stack pointer
	        // which must not be traced, and is cleared out here
	        // In weak objects, only the inst vars are traced
	        var todo = this.gcRoots();
	        var newObjects = [];
	        this.weakObjects = [];
	        while (todo.length > 0) {
	            var object = todo.pop();
	            if (object.mark) continue;    // objects are added to todo more than once
	            if (object.oop < 0)           // it's a new object
	                newObjects.push(object);
	            object.mark = true;           // mark it
	            if (!object.sqClass.mark)     // trace class if not marked
	                todo.push(object.sqClass);
	            var body = object.pointers;
	            if (body) {                   // trace all unmarked pointers
	                var n = body.length;
	                if (object.isWeak()) {
	                    n = object.sqClass.classInstSize();     // do not trace weak fields
	                    this.weakObjects.push(object);
	                }
	                if (this.vm.isContext(object)) {            // contexts have garbage beyond SP
	                    n = object.contextSizeWithStack();
	                    for (var i = n; i < body.length; i++)   // clean up that garbage
	                        body[i] = this.vm.nilObj;
	                }
	                for (var i = 0; i < n; i++)
	                    if (typeof body[i] === "object" && !body[i].mark)      // except immediates
	                        todo.push(body[i]);
	                // Note: "immediate" character objects in Spur always stay marked
	            }
	        }
	        // pre-spur sort by oop to preserve creation order
	        return this.isSpur ? newObjects : newObjects.sort(function(a,b){return b.oop - a.oop});
	    },
	    removeUnmarkedOldObjects: function() {
	        // FullGC: Unlink unmarked old objects from the nextObject linked list
	        // Reset marks of remaining objects, and adjust their oops
	        // Set this.lastOldObject to last old object
	        var removedCount = 0,
	            removedBytes = 0,
	            obj = this.firstOldObject;
	        obj.mark = false; // we know the first object (nil) was marked
	        while (true) {
	            var next = obj.nextObject;
	            if (!next) {// we're done
	                this.lastOldObject = obj;
	                this.lastOldObject.nextObject = null; // Add next object pointer as indicator this is in fact an old object
	                this.oldSpaceBytes -= removedBytes;
	                this.oldSpaceCount -= removedCount;
	                return;
	            }
	            // reset partial GC flag
	            if (next.dirty) next.dirty = false;
	            // if marked, continue with next object
	            if (next.mark) {
	                obj = next;
	                obj.mark = false;           // unmark for next GC
	                obj.oop -= removedBytes;    // compact oops
	            } else { // otherwise, remove it
	                var corpse = next;
	                obj.nextObject = corpse.nextObject;     // drop from old-space list
	                corpse.oop = -(++this.newSpaceCount);   // move to new-space for finalizing
	                removedBytes += corpse.totalBytes();
	                removedCount++;
	                //console.log("removing " + removedCount + " " + removedBytes + " " + corpse.totalBytes() + " " + corpse.toString())
	            }
	        }
	    },
	    appendToOldObjects: function(newObjects) {
	        // FullGC: append new objects to linked list of old objects
	        // and unmark them
	        var oldObj = this.lastOldObject;
	        //var oldBytes = this.oldSpaceBytes;
	        for (var i = 0; i < newObjects.length; i++) {
	            var newObj = newObjects[i];
	            newObj.mark = false;
	            this.oldSpaceBytes = newObj.setAddr(this.oldSpaceBytes);     // add at end of memory
	            oldObj.nextObject = newObj;
	            oldObj = newObj;
	            //console.log("tenuring " + (i+1) + " " + (this.oldSpaceBytes - oldBytes) + " " + newObj.totalBytes() + " " + newObj.toString());
	        }
	        oldObj.nextObject = null;   // might have been in young space
	        this.lastOldObject = oldObj;
	        this.lastOldObject.nextObject = null; // Add next object pointer as indicator this is in fact an old object
	        this.oldSpaceCount += newObjects.length;
	        this.gcTenured += newObjects.length;
	        // this is the only place that increases oldSpaceBytes / decreases bytesLeft
	        this.vm.signalLowSpaceIfNecessary(this.bytesLeft());
	        // TODO: keep track of newSpaceBytes and youngSpaceBytes, and signal low space if necessary
	        // basically, add obj.totalBytes() to newSpaceBytes when instantiating,
	        // trigger partial GC if newSpaceBytes + lowSpaceThreshold > totalMemory - (youngSpaceBytes + oldSpaceBytes)
	        // which would set newSpaceBytes to 0 and youngSpaceBytes to the actual survivors.
	        // for efficiency, only compute object size once per object and store? test impact on GC speed
	    },
	    tenureIfYoung: function(object) {
	        if (object.oop < 0) {
	            this.appendToOldObjects([object]);
	        }
	    },
	    finalizeWeakReferences: function() {
	        // nil out all weak fields that did not survive GC
	        var weakObjects = this.weakObjects;
	        this.weakObjects = null;
	        for (var o = 0; o < weakObjects.length; o++) {
	            var weakObj = weakObjects[o],
	                pointers = weakObj.pointers,
	                firstWeak = weakObj.sqClass.classInstSize(),
	                finalized = false;
	            for (var i = firstWeak; i < pointers.length; i++) {
	                if (pointers[i].oop < 0) {    // ref is not in old-space
	                    pointers[i] = this.vm.nilObj;
	                    finalized = true;
	                }
	            }
	            if (finalized) {
	                this.vm.pendingFinalizationSignals++;
	                if (firstWeak >= 2) { // check if weak obj is a finalizer item
	                    var list = weakObj.pointers[Squeak.WeakFinalizerItem_list];
	                    if (list.sqClass == this.vm.specialObjects[Squeak.splOb_ClassWeakFinalizer]) {
	                        // add weak obj as first in the finalization list
	                        var items = list.pointers[Squeak.WeakFinalizationList_first];
	                        weakObj.pointers[Squeak.WeakFinalizerItem_next] = items;
	                        list.pointers[Squeak.WeakFinalizationList_first] = weakObj;
	                    }
	                }
	            }
	        }	        if (this.vm.pendingFinalizationSignals > 0) {
	            this.vm.forceInterruptCheck();                      // run finalizer asap
	        }
	    },
	},
	'garbage collection - partial', {
	    partialGC: function(reason) {
	        // make a linked list of young objects
	        // and finalize weak refs
	        this.vm.addMessage("partialGC: " + reason);
	        var start = Date.now();
	        var previous = this.newSpaceCount;
	        var young = this.findYoungObjects();
	        this.appendToYoungSpace(young);
	        this.finalizeWeakReferences();
	        this.cleanupYoungSpace(young);
	        this.allocationCount += this.newSpaceCount - young.length;
	        this.youngSpaceCount = young.length;
	        this.newSpaceCount = this.youngSpaceCount;
	        this.pgcCount++;
	        this.pgcMilliseconds += Date.now() - start;
	        console.log("Partial GC (" + reason+ "): " + (Date.now() - start) + " ms, " +
	            "found " + this.youngRootsCount.toLocaleString() + " roots in " + this.oldSpaceCount.toLocaleString() + " old, " +
	            "kept " + this.youngSpaceCount.toLocaleString() + " young (" + (previous - this.youngSpaceCount).toLocaleString() + " gc'ed)");
	        return young[0];
	    },
	    youngRoots: function() {
	        // PartialGC: Find new objects directly pointed to by old objects.
	        // For speed we only scan "dirty" objects that have been written to
	        var roots = this.gcRoots().filter(function(obj){return obj.oop < 0;}),
	            object = this.firstOldObject;
	        while (object) {
	            if (object.dirty) {
	                var body = object.pointers,
	                    dirty = false;
	                for (var i = 0; i < body.length; i++) {
	                    var child = body[i];
	                    if (typeof child === "object" && child.oop < 0) { // if child is new
	                        roots.push(child);
	                        dirty = true;
	                    }
	                }
	                if (!dirty) object.dirty = false;
	            }
	            object = object.nextObject;
	        }
	        return roots;
	    },
	    findYoungObjects: function() {
	        // PartialGC: find new objects transitively reachable from old objects
	        var todo = this.youngRoots(),     // direct pointers from old space
	            newObjects = [];
	        this.youngRootsCount = todo.length;
	        this.weakObjects = [];
	        while (todo.length > 0) {
	            var object = todo.pop();
	            if (object.mark) continue;    // objects are added to todo more than once
	            newObjects.push(object);
	            object.mark = true;           // mark it
	            if (object.sqClass.oop < 0)   // trace class if new
	                todo.push(object.sqClass);
	            var body = object.pointers;
	            if (body) {                   // trace all unmarked pointers
	                var n = body.length;
	                if (object.isWeak()) {
	                    n = object.sqClass.classInstSize();     // do not trace weak fields
	                    this.weakObjects.push(object);
	                }
	                if (this.vm.isContext(object)) {            // contexts have garbage beyond SP
	                    n = object.contextSizeWithStack();
	                    for (var i = n; i < body.length; i++)   // clean up that garbage
	                        body[i] = this.vm.nilObj;
	                }
	                for (var i = 0; i < n; i++) {
	                    var child = body[i];
	                    if (typeof child === "object" && child.oop < 0)
	                        todo.push(child);
	                }
	            }
	        }
	        // pre-spur sort by oop to preserve creation order
	        return this.isSpur ? newObjects : newObjects.sort(function(a,b){return b.oop - a.oop});
	    },
	    appendToYoungSpace: function(objects) {
	        // PartialGC: link new objects into young list
	        // and give them positive oops temporarily so finalization works
	        var tempOop = this.lastOldObject.oop + 1;
	        for (var i = 0; i < objects.length; i++) {
	            var obj = objects[i];
	            if (this.hasNewInstances[obj.oop]) {
	                delete this.hasNewInstances[obj.oop];
	                this.hasNewInstances[tempOop] = true;
	            }
	            obj.oop = tempOop;
	            obj.nextObject = objects[i + 1];
	            tempOop++;
	        }
	    },
	    cleanupYoungSpace: function(objects) {
	        // PartialGC: After finalizing weak refs, make oops
	        // in young space negative again
	        var obj = objects[0],
	            youngOop = -1;
	        while (obj) {
	            if (this.hasNewInstances[obj.oop]) {
	                delete this.hasNewInstances[obj.oop];
	                this.hasNewInstances[youngOop] = true;
	            }
	            obj.oop = youngOop;
	            obj.mark = false;
	            obj = obj.nextObject;
	            youngOop--;
	        }
	    },
	},
	'creating', {
	    registerObject: function(obj) {
	        // We don't actually register the object yet, because that would prevent
	        // it from being garbage-collected by the Javascript collector
	        obj.oop = -(++this.newSpaceCount); // temp oops are negative. Real oop assigned when surviving GC
	        this.lastHash = (13849 + (27181 * this.lastHash)) & 0xFFFFFFFF;
	        return this.lastHash & 0xFFF;
	    },
	    registerObjectSpur: function(obj) {
	        // We don't actually register the object yet, because that would prevent
	        // it from being garbage-collected by the Javascript collector
	        obj.oop = -(++this.newSpaceCount); // temp oops are negative. Real oop assigned when surviving GC
	        return 0; // actual hash created on demand
	    },
	    instantiateClass: function(aClass, indexableSize, filler) {
	        var newObject = new (aClass.classInstProto()); // Squeak.Object
	        var hash = this.registerObject(newObject);
	        newObject.initInstanceOf(aClass, indexableSize, hash, filler);
	        this.hasNewInstances[aClass.oop] = true;   // need GC to find all instances
	        return newObject;
	    },
	    clone: function(object) {
	        var newObject = new (object.sqClass.classInstProto()); // Squeak.Object
	        var hash = this.registerObject(newObject);
	        newObject.initAsClone(object, hash);
	        this.hasNewInstances[newObject.sqClass.oop] = true;   // need GC to find all instances
	        return newObject;
	    },
	},
	'operations', {
	    bulkBecome: function(fromArray, toArray, twoWay, copyHash) {
	        if (!fromArray)
	            return !toArray;
	        var n = fromArray.length;
	        if (n !== toArray.length)
	            return false;
	        // need to visit all objects: find young objects now
	        // so oops do not change later
	        var firstYoungObject = null;
	        if (this.newSpaceCount > 0)
	            firstYoungObject = this.partialGC("become");  // does update context
	        else
	            this.vm.storeContextRegisters();    // still need to update active context
	        // obj.oop used as dict key here is why we store them
	        // rather than just calculating at image snapshot time
	        var mutations = {};
	        for (var i = 0; i < n; i++) {
	            var obj = fromArray[i];
	            if (!obj.sqClass) return false;  //non-objects in from array
	            if (mutations[obj.oop]) return false; //repeated oops in from array
	            else mutations[obj.oop] = toArray[i];
	        }
	        if (twoWay) for (var i = 0; i < n; i++) {
	            var obj = toArray[i];
	            if (!obj.sqClass) return false;  //non-objects in to array
	            if (mutations[obj.oop]) return false; //repeated oops in to array
	            else mutations[obj.oop] = fromArray[i];
	        }
	        // unless copyHash is false, make hash stay with the reference, not with the object
	        if (copyHash) for (var i = 0; i < n; i++) {
	            if (!toArray[i].sqClass) return false; //cannot change hash of non-objects
	            var fromHash = fromArray[i].hash;
	            fromArray[i].hash = toArray[i].hash;
	            toArray[i].hash = fromHash;
	            // Spur class table is not part of the object memory in SqueakJS
	            // so won't be updated below, we have to update it manually
	            if (this.isSpur && this.classTable[fromHash] === fromArray[i]) {
	                this.classTable[fromHash] = toArray[i];
	            }
	            if (twoWay && this.isSpur && this.classTable[toArray[i].hash] === toArray[i]) {
	var fromClass = fromArray[i];
	var fromClassName = fromClass.className ? fromClass.className() : fromClass.sqClass.className();
	var toClass = toArray[i];
	var toClassName = toClass.className ? toClass.className() : toClass.sqClass.className();
	console.warn("Unexpected two way class become", fromClassName, toClassName);
	                this.classTable[toArray[i].hash] = fromArray[i];
	            }
	        }
	        // temporarily append young objects to old space
	        this.lastOldObject.nextObject = firstYoungObject;
	        // Now, for every object...
	        var obj = this.firstOldObject;
	        while (obj) {
	            // mutate the class
	            var mut = mutations[obj.sqClass.oop];
	            if (mut) {
	                obj.sqClass = mut;
	                if (mut.oop < 0) obj.dirty = true;
	            }
	            // and mutate body pointers
	            var body = obj.pointers;
	            if (body) for (var j = 0; j < body.length; j++) {
	                mut = mutations[body[j].oop];
	                if (mut) {
	                    body[j] = mut;
	                    if (mut.oop < 0) obj.dirty = true;
	                }
	            }
	            obj = obj.nextObject;
	        }
	        // separate old / young space again
	        this.lastOldObject.nextObject = null;
	        this.vm.flushMethodCacheAfterBecome(mutations);
	        return true;
	    },
	    objectAfter: function(obj) {
	        // if this was the last old object, continue with young objects
	        return obj.nextObject || this.nextObjectWithGC("nextObject", obj);
	    },
	    someInstanceOf: function(clsObj) {
	        var obj = this.firstOldObject;
	        while (obj) {
	            if (obj.sqClass === clsObj)
	                return obj;
	            obj = obj.nextObject || this.nextObjectWithGCFor(obj, clsObj);
	        }
	        return null;
	    },
	    nextInstanceAfter: function(obj) {
	        var clsObj = obj.sqClass;
	        while (true) {
	            obj = obj.nextObject || this.nextObjectWithGCFor(obj, clsObj);
	            if (!obj) return null;
	            if (obj.sqClass === clsObj)
	                return obj;
	        }
	    },
	    nextObjectWithGC: function(reason, obj) {
	        // obj is either the last object in old space (after enumerating it)
	        // or young space (after enumerating the list returned by partialGC)
	        // or a random new object
	        var limit = obj.oop > 0 ? 0 : this.youngSpaceCount;
	        if (this.newSpaceCount <= limit) return null; // no more objects
	        if (obj.oop < 0) this.fullGC(reason); // found a non-young new object
	        return this.partialGC(reason);
	    },
	    nextObjectWithGCFor: function(obj, clsObj) {
	        // this is nextObjectWithGC but avoids GC if no instances in new space
	        if (!this.hasNewInstances[clsObj.oop]) return null;
	        return this.nextObjectWithGC("instance of " + clsObj.className(), obj);
	    },
	    allInstancesOf: function(clsObj) {
	        var obj = this.firstOldObject,
	            result = [];
	        while (obj) {
	            if (obj.sqClass === clsObj) result.push(obj);
	            obj = obj.nextObject || this.nextObjectWithGCFor(obj, clsObj);
	        }
	        return result;
	    },
	    writeToBuffer: function() {
	        var headerSize = 64,
	            data = new DataView(new ArrayBuffer(headerSize + this.oldSpaceBytes)),
	            pos = 0;
	        var writeWord = function(word) {
	            data.setUint32(pos, word);
	            pos += 4;
	        };
	        writeWord(this.formatVersion()); // magic number
	        writeWord(headerSize);
	        writeWord(this.oldSpaceBytes); // end of memory
	        writeWord(this.firstOldObject.addr()); // base addr (0)
	        writeWord(this.objectToOop(this.specialObjectsArray));
	        writeWord(this.lastHash);
	        writeWord((800 << 16) + 600);  // window size
	        while (pos < headerSize)
	            writeWord(0);
	        // objects
	        var obj = this.firstOldObject,
	            n = 0;
	        while (obj) {
	            pos = obj.writeTo(data, pos, this);
	            obj = obj.nextObject;
	            n++;
	        }
	        if (pos !== data.byteLength) throw Error("wrong image size");
	        if (n !== this.oldSpaceCount) throw Error("wrong object count");
	        return data.buffer;
	    },
	    objectToOop: function(obj) {
	        // unsigned word for use in snapshot
	        if (typeof obj ===  "number")
	            return obj << 1 | 1; // add tag bit
	        if (obj.oop < 0) throw Error("temporary oop");
	        return obj.oop;
	    },
	    bytesLeft: function() {
	        return this.totalMemory - this.oldSpaceBytes;
	    },
	    formatVersion: function() {
	        return this.isSpur ? 6521 : this.hasClosures ? 6504 : 6502;
	    },
	    segmentVersion: function() {
	        // a more complex version that tells both the word reversal and the endianness
	        // of the machine it came from.  Low half of word is 6502.  Top byte is top byte
	        // of #doesNotUnderstand: ($d on big-endian or $s on little-endian).
	        // In SqueakJS we write non-Spur images and segments as big-endian, Spur as little-endian
	        // (TODO: write non-Spur as little-endian too since that matches all modern platforms)
	        var dnuFirstWord = this.isSpur ? 'seod' : 'does';
	        return this.formatVersion() | (dnuFirstWord.charCodeAt(0) << 24);
	    },
	    storeImageSegment: function(segmentWordArray, outPointerArray, arrayOfRoots) {
	        // This primitive will store a binary image segment (in the same format as the Squeak image file) of the receiver and every object in its proper tree of subParts (ie, that is not refered to from anywhere else outside the tree).  Note: all elements of the receiver are treated as roots determining the extent of the tree.  All pointers from within the tree to objects outside the tree will be copied into the array of outpointers.  In their place in the image segment will be an oop equal to the offset in the outpointer array (the first would be 4). but with the high bit set.
	        // The primitive expects the array and wordArray to be more than adequately long.  In this case it returns normally, and truncates the two arrays to exactly the right size.  If either array is too small, the primitive will fail, but in no other case.

	        // use a DataView to access the segment as big-endian words
	        var segment = new DataView(segmentWordArray.words.buffer),
	            pos = 0, // write position in segment in bytes
	            outPointers = outPointerArray.pointers,
	            outPos = 0; // write position in outPointers in words

	        // write header
	        segment.setUint32(pos, this.segmentVersion()); pos += 4;

	        // we don't want to deal with new space objects
	        this.fullGC("storeImageSegment");

	        // First mark the root array and all root objects
	        arrayOfRoots.mark = true;
	        for (var i = 0; i < arrayOfRoots.pointers.length; i++)
	            if (typeof arrayOfRoots.pointers[i] === "object")
	                arrayOfRoots.pointers[i].mark = true;

	        // Then do a mark pass over all objects. This will stop at our marked roots,
	        // thus leaving our segment unmarked in their shadow
	        this.markReachableObjects();

	        // Finally unmark the rootArray and all root objects
	        arrayOfRoots.mark = false;
	        for (var i = 0; i < arrayOfRoots.pointers.length; i++)
	            if (typeof arrayOfRoots.pointers[i] === "object")
	                arrayOfRoots.pointers[i].mark = false;

	        // helpers for mapping objects to segment oops
	        var segmentOops = {}, // map from object oop to segment oop
	            todo = []; // objects that were added to the segment but still need to have their oops mapped

	        // if an object does not yet have a segment oop, write it to the segment or outPointers
	        function addToSegment(object) {
	            var oop = segmentOops[object.oop];
	            if (!oop) {
	                if (object.mark) {
	                    // object is outside segment, add to outPointers
	                    if (outPos >= outPointers.length) return 0; // fail if outPointerArray is too small
	                    oop = 0x80000004 + outPos * 4;
	                    outPointers[outPos++] = object;
	                    // no need to mark outPointerArray dirty, all objects are in old space
	                } else {
	                    // add object to segment.
	                    if (pos + object.totalBytes() > segment.byteLength) return 0; // fail if segment is too small
	                    oop = pos + (object.snapshotSize().header + 1) * 4; // addr plus extra headers + base header
	                    pos = object.writeTo(segment, pos, this);
	                    // the written oops inside the object still need to be mapped to segment oops
	                    todo.push(object);
	                }
	                segmentOops[object.oop] = oop;
	            }
	            return oop;
	        }
	        addToSegment = addToSegment.bind(this);

	        // if we have to bail out, clean up what we modified
	        function cleanUp() {
	            // unmark all objects
	            var obj = this.firstOldObject;
	            while (obj) {
	                obj.mark = false;
	                obj = obj.nextObject;
	            }
	            // forget weak objects collected by markReachableObjects()
	            this.weakObjects = null;
	            // return code for failure
	            return false;
	        }
	        cleanUp = cleanUp.bind(this);

	        // All external objects, and only they, are now marked.
	        // Write the array of roots into the segment
	        addToSegment(arrayOfRoots);

	        // Now fix the oops inside written objects.
	        // This will add more objects to the segment (if they are unmarked),
	        // or to outPointers (if they are marked).
	        while (todo.length > 0) {
	            var obj = todo.shift(),
	                oop = segmentOops[obj.oop],
	                headerSize = obj.snapshotSize().header,
	                objBody = obj.pointers,
	                hasClass = headerSize > 0;
	            if (hasClass) {
	                var classOop = addToSegment(obj.sqClass);
	                if (!classOop) return cleanUp(); // ran out of space
	                var headerType = headerSize === 1 ? Squeak.HeaderTypeClass : Squeak.HeaderTypeSizeAndClass;
	                segment.setUint32(oop - 8, classOop | headerType);
	            }
	            if (!objBody) continue;
	            for (var i = 0; i < objBody.length; i++) {
	                var child = objBody[i];
	                if (typeof child !== "object") continue;
	                var childOop = addToSegment(child);
	                if (!childOop) return cleanUp(); // ran out of space
	                segment.setUint32(oop + i * 4, childOop);
	            }
	        }

	        // Truncate image segment and outPointerArray to actual size
	        var obj = segmentWordArray.oop < outPointerArray.oop ? segmentWordArray : outPointerArray,
	            removedBytes = 0;
	        while (obj) {
	            obj.oop -= removedBytes;
	            if (obj === segmentWordArray) {
	                removedBytes += (obj.words.length * 4) - pos;
	                obj.words = new Uint32Array(obj.words.buffer.slice(0, pos));
	            } else if (obj === outPointerArray) {
	                removedBytes += (obj.pointers.length - outPos) * 4;
	                obj.pointers.length = outPos;
	            }
	            obj = obj.nextObject;
	        }
	        this.oldSpaceBytes -= removedBytes;

	        // unmark all objects etc
	        cleanUp();

	        return true;
	    },
	    loadImageSegment: function(segmentWordArray, outPointerArray) {
	        // The C VM creates real objects from the segment in-place.
	        // We do the same, inserting the new objects directly into old-space
	        // between segmentWordArray and its following object (endMarker).
	        // This only increases oldSpaceCount but not oldSpaceBytes.
	        // The code below is almost the same as readFromBuffer() ... should unify
	        if (segmentWordArray.words.length === 1) {
	            // segment already loaded
	            return segmentWordArray.nextObject;
	        }
	        var segment = new DataView(segmentWordArray.words.buffer),
	            littleEndian = false,
	            nativeFloats = false,
	            pos = 0;
	        var readWord = function() {
	            var word = segment.getUint32(pos, littleEndian);
	            pos += 4;
	            return word;
	        };
	        var readBits = function(nWords, format) {
	            if (format < 5) { // pointers (do endian conversion)
	                var oops = [];
	                while (oops.length < nWords)
	                    oops.push(readWord());
	                return oops;
	            } else { // words (no endian conversion yet)
	                var bits = new Uint32Array(segment.buffer, pos, nWords);
	                pos += nWords * 4;
	                return bits;
	            }
	        };
	        // check version
	        var version = readWord();
	        if (version & 0xFFFF !== 6502) {
	            littleEndian = true; pos = 0;
	            version = readWord();
	            if (version & 0xFFFF !== 6502) {
	                console.error("image segment format not supported");
	                return null;
	            }
	        }
	        // read objects
	        this.tenureIfYoung(segmentWordArray);
	        var prevObj = segmentWordArray,
	            endMarker = prevObj.nextObject,
	            oopOffset = segmentWordArray.oop,
	            oopMap = {},
	            rawBits = {};
	        while (pos < segment.byteLength) {
	            var nWords = 0,
	                classInt = 0,
	                header = readWord();
	            switch (header & Squeak.HeaderTypeMask) {
	                case Squeak.HeaderTypeSizeAndClass:
	                    nWords = header >>> 2;
	                    classInt = readWord();
	                    header = readWord();
	                    break;
	                case Squeak.HeaderTypeClass:
	                    classInt = header - Squeak.HeaderTypeClass;
	                    header = readWord();
	                    nWords = (header >>> 2) & 63;
	                    break;
	                case Squeak.HeaderTypeShort:
	                    nWords = (header >>> 2) & 63;
	                    classInt = (header >>> 12) & 31; //compact class index
	                    //Note classInt<32 implies compact class index
	                    break;
	                case Squeak.HeaderTypeFree:
	                    throw Error("Unexpected free block");
	            }
	            nWords--;  //length includes base header which we have already read
	            var oop = pos, //0-rel byte oop of this object (base header)
	                format = (header>>>8) & 15,
	                hash = (header>>>17) & 4095,
	                bits = readBits(nWords, format);

	            var object = new Squeak.Object();
	            object.initFromImage(oop + oopOffset, classInt, format, hash);
	            prevObj.nextObject = object;
	            this.oldSpaceCount++;
	            prevObj = object;
	            oopMap[oop] = object;
	            rawBits[oop + oopOffset] = bits;
	        }
	        object.nextObject = endMarker;
	        // add outPointers to oopMap
	        for (var i = 0; i < outPointerArray.pointers.length; i++)
	            oopMap[0x80000004 + i * 4] = outPointerArray.pointers[i];
	        // add compactClasses to oopMap
	        var compactClasses = this.specialObjectsArray.pointers[Squeak.splOb_CompactClasses].pointers,
	            fakeClsOop = 0, // make up a compact-classes array with oops, as if loading an image
	            compactClassOops = compactClasses.map(function(cls) {
	                oopMap[--fakeClsOop] = cls; return fakeClsOop; });
	        // truncate segmentWordArray array to one element
	        segmentWordArray.words = new Uint32Array([segmentWordArray.words[0]]);
	        delete segmentWordArray.uint8Array; // in case it was a view onto words
	        // map objects using oopMap
	        var roots = segmentWordArray.nextObject,
	            floatClass = this.specialObjectsArray.pointers[Squeak.splOb_ClassFloat],
	            obj = roots;
	        do {
	            obj.installFromImage(oopMap, rawBits, compactClassOops, floatClass, littleEndian, nativeFloats);
	            obj = obj.nextObject;
	        } while (obj !== endMarker);
	        return roots;
	    },
	},
	'spur support',
	{
	    initSpurOverrides: function() {
	        this.registerObject = this.registerObjectSpur;
	        this.writeToBuffer = this.writeToBufferSpur;
	        this.storeImageSegment = this.storeImageSegmentSpur;
	        this.loadImageSegment = this.loadImageSegmentSpur;
	    },
	    spurClassTable: function(oopMap, rawBits, classPages, splObjs) {
	        var classes = {},
	            nil = this.firstOldObject;
	        // read class table pages
	        for (var p = 0; p < 4096; p++) {
	            var page = oopMap[classPages[p]];
	            if (page.oop) page = rawBits[page.oop]; // page was not properly hidden
	            if (page.length === 1024) for (var i = 0; i < 1024; i++) {
	                var entry = oopMap[page[i]];
	                if (!entry) throw Error("Invalid class table entry (oop " + page[i] + ")");
	                if (entry !== nil) {
	                    var classIndex = p * 1024 + i;
	                    classes[classIndex] = entry;
	                }
	            }
	        }
	        // add known classes which may not be in the table
	        for (var key in Squeak) {
	            if (/^splOb_Class/.test(key)) {
	                var knownClass = oopMap[rawBits[splObjs.oop][Squeak[key]]];
	                if (knownClass !== nil) {
	                    var classIndex = knownClass.hash;
	                    if (classIndex > 0 && classIndex < 1024)
	                        classes[classIndex] = knownClass;
	                }
	            }
	        }
	        classes[3] = classes[1];      // SmallInteger needs two entries
	        this.classTable = classes;
	        this.classTableIndex = 1024;  // first page is special
	        return classes;
	    },
	    enterIntoClassTable: function(newClass) {
	        var index = this.classTableIndex,
	            table = this.classTable;
	        while (index <= 0x3FFFFF) {
	            if (!table[index]) {
	                table[index] = newClass;
	                newClass.hash = index;
	                this.classTableIndex = index;
	                return index;
	            }
	            index++;
	        }
	        console.error("class table full?"); // todo: clean out old class table entries
	        return null;
	    },
	    initImmediateClasses: function(oopMap, rawBits, splObs) {
	        var special = rawBits[splObs.oop];
	        this.characterClass = oopMap[special[Squeak.splOb_ClassCharacter]];
	        this.floatClass = oopMap[special[Squeak.splOb_ClassFloat]];
	        this.largePosIntClass = oopMap[special[Squeak.splOb_ClassLargePositiveInteger]];
	        this.largeNegIntClass = oopMap[special[Squeak.splOb_ClassLargeNegativeInteger]];
	        // init named prototypes
	        this.characterClass.classInstProto("Character");
	        // In the tiny image for CodeParadise no BoxedFloat64 exists, use Float instead
	        //this.floatClass.classInstProto("BoxedFloat64");
	        this.floatClass.classInstProto("Float");
	        this.largePosIntClass.classInstProto("LargePositiveInteger");
	        this.largeNegIntClass.classInstProto("LargeNegativeInteger");
	        this.characterTable = {};
	    },
	    getCharacter: function(unicode) {
	        var char = this.characterTable[unicode];
	        if (!char) {
	            char = new this.characterClass.instProto;
	            char.initInstanceOfChar(this.characterClass, unicode);
	            this.characterTable[unicode] = char;
	        }
	        return char;
	    },
	    instantiateFloat: function(bits) {
	        var float = new this.floatClass.instProto;
	        this.registerObjectSpur(float);
	        this.hasNewInstances[this.floatClass.oop] = true;
	        float.initInstanceOfFloat(this.floatClass, bits);
	        return float;
	    },
	    instantiateLargeFromSmall: function(hi, lo) {
	        // get rid of 3 tag bits
	        lo = hi << 29 | lo >>> 3 ; // shift 3 bits from hi to lo
	        hi = hi >> 3; // shift by 3 with sign extension
	        // value is always positive, class determines sign
	        var negative = hi < 0;
	        if (negative) { hi = -hi; lo = -lo; if (lo !== 0) hi--; }
	        var size = hi === 0 ? 4 : hi <= 0xFF ? 5 : hi <= 0xFFFF ? 6 : hi <= 0xFFFFFF ? 7 : 8;
	        var largeIntClass = negative ? this.largeNegIntClass : this.largePosIntClass;
	        var largeInt = new largeIntClass.instProto;
	        this.registerObjectSpur(largeInt);
	        this.hasNewInstances[largeIntClass.oop] = true;
	        largeInt.initInstanceOfLargeInt(largeIntClass, size);
	        var bytes = largeInt.bytes;
	        for (var i = 0; i < 4; i++) { bytes[i] = lo & 255; lo >>= 8; }
	        for (var i = 4; i < size; i++) { bytes[i] = hi & 255; hi >>= 8; }
	        return largeInt;
	    },
	    ensureClassesInTable: function() {
	        // make sure all classes are in class table
	        // answer number of class pages
	        var obj = this.firstOldObject;
	        var maxIndex = 1024; // at least one page
	        while (obj) {
	            var cls = obj.sqClass;
	            if (cls.hash === 0) this.enterIntoClassTable(cls);
	            if (cls.hash > maxIndex) maxIndex = cls.hash;
	            if (this.classTable[cls.hash] !== cls) throw Error("Class not in class table");
	            obj = obj.nextObject;
	        }
	        return (maxIndex >> 10) + 1;
	    },
	    classTableBytes: function(numPages) {
	        // space needed for master table and minor pages
	        return (4 + 4104 + numPages * (4 + 1024)) * 4;
	    },
	    writeFreeLists: function(data, pos, littleEndian, oopOffset) {
	        // we fake an empty free lists object
	        data.setUint32(pos, 0x0A000012, littleEndian); pos += 4;
	        data.setUint32(pos, 0x20000000, littleEndian); pos += 4;
	        pos += 32 * 4;  // 32 zeros
	        return pos;
	    },
	    writeClassTable: function(data, pos, littleEndian, objToOop, numPages) {
	        // write class tables as Spur expects them, faking their oops
	        var nilFalseTrueBytes = 3 * 16,
	            freeListBytes = 8 + 32 * 4,
	            majorTableSlots = 4096 + 8,         // class pages plus 8 hiddenRootSlots
	            minorTableSlots = 1024,
	            majorTableBytes = 16 + majorTableSlots * 4,
	            minorTableBytes = 16 + minorTableSlots * 4,
	            firstPageOop = nilFalseTrueBytes + freeListBytes + majorTableBytes + 8;
	        // major table
	        data.setUint32(pos, majorTableSlots, littleEndian); pos += 4;
	        data.setUint32(pos,      0xFF000000, littleEndian); pos += 4;
	        data.setUint32(pos,      0x02000010, littleEndian); pos += 4;
	        data.setUint32(pos,      0xFF000000, littleEndian); pos += 4;
	        for (var p = 0; p < numPages; p++) {
	            data.setUint32(pos, firstPageOop + p * minorTableBytes, littleEndian); pos += 4;
	        }
	        pos += (majorTableSlots - numPages) * 4;  // rest is nil
	        // minor tables
	        var classID = 0;
	        for (var p = 0; p < numPages; p++) {
	            data.setUint32(pos, minorTableSlots, littleEndian); pos += 4;
	            data.setUint32(pos,      0xFF000000, littleEndian); pos += 4;
	            data.setUint32(pos,      0x02000010, littleEndian); pos += 4;
	            data.setUint32(pos,      0xFF000000, littleEndian); pos += 4;
	            for (var i = 0; i < minorTableSlots; i++) {
	                var classObj = this.classTable[classID];
	                if (classObj && classObj.pointers) {
	                    if (!classObj.hash) throw Error("class without id");
	                    if (classObj.hash !== classID && classID >= 32 || classObj.oop < 0) {
	                        console.warn("freeing class index " + classID + " " + classObj.className());
	                        classObj = null;
	                        delete this.classTable[classID];
	                    }
	                }
	                if (classObj) data.setUint32(pos, objToOop(classObj), littleEndian);
	                pos += 4;
	                classID++;
	            }
	        }
	        return pos;
	    },
	    writeToBufferSpur: function() {
	        var headerSize = 64,
	            trailerSize = 16,
	            freeListsSize = 136,
	            numPages = this.ensureClassesInTable(),
	            hiddenSize = freeListsSize + this.classTableBytes(numPages),
	            data = new DataView(new ArrayBuffer(headerSize + hiddenSize + this.oldSpaceBytes + trailerSize)),
	            littleEndian = true,
	            start = Date.now(),
	            pos = 0;
	        function writeWord(word) {
	            data.setUint32(pos, word, littleEndian);
	            pos += 4;
	        }	        function objToOop(obj) {
	            if (typeof obj === "number")
	                return obj << 1 | 1; // add tag bit
	            if (obj._format === 7) {
	                if (obj.hash !== (obj.oop >> 2) || (obj.oop & 3) !== 2)
	                    throw Error("Bad immediate char");
	                return obj.oop;
	            }
	            if (obj.oop < 0) throw Error("temporary oop");
	            // oops after nil/false/true are shifted by size of hidden objects
	            return obj.oop < 48 ? obj.oop : obj.oop + hiddenSize;
	        }	        writeWord(this.formatVersion()); // magic number
	        writeWord(headerSize);
	        writeWord(hiddenSize + this.oldSpaceBytes + trailerSize); // end of memory
	        writeWord(this.firstOldObject.addr()); // base addr (0)
	        writeWord(objToOop(this.specialObjectsArray));
	        this.savedHeaderWords.forEach(writeWord);
	        writeWord(hiddenSize + this.oldSpaceBytes + trailerSize); //first segment size
	        while (pos < headerSize)
	            writeWord(0);
	        // write objects
	        var obj = this.firstOldObject,
	            n = 0;
	        pos = obj.writeTo(data, pos, littleEndian, objToOop); obj = obj.nextObject; n++; // write nil
	        pos = obj.writeTo(data, pos, littleEndian, objToOop); obj = obj.nextObject; n++; // write false
	        pos = obj.writeTo(data, pos, littleEndian, objToOop); obj = obj.nextObject; n++; // write true
	        pos = this.writeFreeLists(data, pos, littleEndian, objToOop); // write hidden free list
	        pos = this.writeClassTable(data, pos, littleEndian, objToOop, numPages); // write hidden class table
	        while (obj) {
	            pos = obj.writeTo(data, pos, littleEndian, objToOop);
	            obj = obj.nextObject;
	            n++;
	        }
	        // write segement trailer
	        writeWord(0x4A000003);
	        writeWord(0x00800000);
	        writeWord(0);
	        writeWord(0);
	        // done
	        if (pos !== data.byteLength) throw Error("wrong image size");
	        if (n !== this.oldSpaceCount) throw Error("wrong object count");
	        var time = Date.now() - start;
	        console.log("Wrote " + n + " objects in " + time + " ms, image size " + pos + " bytes");
	        return data.buffer;
	    },
	    storeImageSegmentSpur: function(segmentWordArray, outPointerArray, arrayOfRoots) {
	        // see comment in segmentVersion() if you implement this
	        // also see markReachableObjects() about immediate chars
	        this.vm.warnOnce("not implemented for Spur yet: primitive 98 (primitiveStoreImageSegment)");
	        return false;
	    },
	    loadImageSegmentSpur: function(segmentWordArray, outPointerArray) {
	        this.vm.warnOnce("not implemented for Spur yet: primitive 99 (primitiveLoadImageSegment)");
	        return null;
	    },
	});
	return vm_image;
}

var vm_interpreter = {};

var hasRequiredVm_interpreter;

function requireVm_interpreter () {
	if (hasRequiredVm_interpreter) return vm_interpreter;
	hasRequiredVm_interpreter = 1;
	/*
	 * Copyright (c) 2013-2024 Vanessa Freudenberg
	 *
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:
	 *
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 *
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 */

	Object.subclass('Squeak.Interpreter',
	'initialization', {
	    initialize: function(image, display, options) {
	        console.log('squeak: initializing interpreter ' + Squeak.vmVersion + ' (' + Squeak.vmDate + ')');
	        this.Squeak = Squeak;   // store locally to avoid dynamic lookup in Lively
	        this.image = image;
	        this.image.vm = this;
	        this.options = options || {};
	        this.primHandler = new Squeak.Primitives(this, display);
	        this.loadImageState();
	        this.initVMState();
	        this.loadInitialContext();
	        this.hackImage();
	        this.initCompiler();
	        console.log('squeak: ready');
	    },
	    loadImageState: function() {
	        this.specialObjects = this.image.specialObjectsArray.pointers;
	        this.specialSelectors = this.specialObjects[Squeak.splOb_SpecialSelectors].pointers;
	        this.nilObj = this.specialObjects[Squeak.splOb_NilObject];
	        this.falseObj = this.specialObjects[Squeak.splOb_FalseObject];
	        this.trueObj = this.specialObjects[Squeak.splOb_TrueObject];
	        this.hasClosures = this.image.hasClosures;
	        this.getGlobals = this.globalsGetter();
	        // hack for old image that does not support Unix files
	        if (!this.hasClosures && !this.findMethod("UnixFileDirectory class>>pathNameDelimiter"))
	            this.primHandler.emulateMac = true;
	        // pre-release image has inverted colors
	        if (this.image.version == 6501)
	            this.primHandler.reverseDisplay = true;
	    },
	    initVMState: function() {
	        this.byteCodeCount = 0;
	        this.sendCount = 0;
	        this.interruptCheckCounter = 0;
	        this.interruptCheckCounterFeedBackReset = 1000;
	        this.interruptChecksEveryNms = 3;
	        this.lowSpaceThreshold = 1000000;
	        this.signalLowSpace = false;
	        this.nextPollTick = 0;
	        this.nextWakeupTick = 0;
	        this.lastTick = 0;
	        this.interruptKeycode = 2094;  //"cmd-."
	        this.interruptPending = false;
	        this.pendingFinalizationSignals = 0;
	        this.freeContexts = this.nilObj;
	        this.freeLargeContexts = this.nilObj;
	        this.reclaimableContextCount = 0;
	        this.nRecycledContexts = 0;
	        this.nAllocatedContexts = 0;
	        this.methodCacheSize = 1024;
	        this.methodCacheMask = this.methodCacheSize - 1;
	        this.methodCacheRandomish = 0;
	        this.methodCache = [];
	        for (var i = 0; i < this.methodCacheSize; i++)
	            this.methodCache[i] = {lkupClass: null, selector: null, method: null, primIndex: 0, argCount: 0, mClass: null};
	        this.breakOutOfInterpreter = false;
	        this.breakOutTick = 0;
	        this.breakOnMethod = null; // method to break on
	        this.breakOnNewMethod = false;
	        this.breakOnMessageNotUnderstood = false;
	        this.breakOnContextChanged = false;
	        this.breakOnContextReturned = null; // context to break on
	        this.messages = {};
	        this.startupTime = Date.now(); // base for millisecond clock
	    },
	    loadInitialContext: function() {
	        var schedAssn = this.specialObjects[Squeak.splOb_SchedulerAssociation];
	        var sched = schedAssn.pointers[Squeak.Assn_value];
	        var proc = sched.pointers[Squeak.ProcSched_activeProcess];
	        this.activeContext = proc.pointers[Squeak.Proc_suspendedContext];
	        this.activeContext.dirty = true;
	        this.fetchContextRegisters(this.activeContext);
	        this.reclaimableContextCount = 0;
	    },
	    globalsGetter: function() {
	        // Globals (more specifically the pointers we are interested in) might
	        // change during execution, because a Dictionary needs growing for example.
	        // Therefore answer a getter function to access the actual globals (pointers).
	        // This getter can be used, even if the Dictionary has grown (and thereby the
	        // underlying Array is replaced by a larger one), because it uses the reference
	        // to the 'outer' Dictionary instead of the pointers to the values.
	        var smalltalk = this.specialObjects[Squeak.splOb_SmalltalkDictionary],
	            smalltalkClass = smalltalk.sqClass.className();
	        if (smalltalkClass === "Association") {
	            smalltalk = smalltalk.pointers[1];
	            smalltalkClass = smalltalk.sqClass.className();
	        }
	        if (smalltalkClass === "SystemDictionary")
	            return function() { return smalltalk.pointers[1].pointers; };
	        if (smalltalkClass === "SmalltalkImage") {
	            var globals = smalltalk.pointers[0],
	                globalsClass = globals.sqClass.className();
	            if (globalsClass === "SystemDictionary")
	                return function() { return globals.pointers[1].pointers; };
	            if (globalsClass === "Environment")
	                return function() { return globals.pointers[2].pointers[1].pointers; };
	        }
	        console.warn("cannot find global dict");
	        return function() { return []; };
	    },
	    initCompiler: function() {
	        if (!Squeak.Compiler)
	            return console.warn("Squeak.Compiler not loaded, using interpreter only");
	        // some JS environments disallow creating functions at runtime (e.g. FireFox OS apps)
	        try {
	            if (new Function("return 42")() !== 42)
	                return console.warn("function constructor not working, disabling JIT");
	        } catch (e) {
	            return console.warn("disabling JIT: " + e);
	        }
	        // disable JIT on slow machines, which are likely memory-limited
	        var kObjPerSec = this.image.oldSpaceCount / (this.startupTime - this.image.startupTime);
	        if (kObjPerSec < 10)
	            return console.warn("Slow machine detected (loaded " + (kObjPerSec*1000|0) + " objects/sec), using interpreter only");
	        // compiler might decide to not handle current image
	        try {
	            console.log("squeak: initializing JIT compiler");
	            var compiler = new Squeak.Compiler(this);
	            if (compiler.compile) this.compiler = compiler;
	        } catch(e) {
	            console.warn("Compiler: " + e);
	        }
	        if (!this.compiler) {
	            console.warn("SqueakJS will be running in interpreter mode only (slow)");
	        }
	    },
	    hackImage: function() {
	        // hack methods to make work / speed up
	        this.method.methodSignFlag();
	        [
	            // Etoys fallback for missing translation files is hugely inefficient.
	            // This speeds up opening a viewer by 10x (!)
	            // Remove when we added translation files.
	            //{method: "String>>translated", primitive: returnSelf, enabled: true},
	            //{method: "String>>translatedInAllDomains", primitive: returnSelf, enabled: true},
	            // 64 bit Squeak does not flush word size on snapshot
	            // {method: "SmalltalkImage>>wordSize", literal: {index: 1, old: 8, hack: 4}, enabled: true},
	            // Squeak 5.3 disable wizard by replacing #open send with pop
	            // {method: "ReleaseBuilder class>>prepareEnvironment", bytecode: {pc: 28, old: 0xD8, hack: 0x87}, enabled: opts.includes("wizard=false")},
	            // Squeak source file should use UTF8 not MacRoman (both V3 and Sista)
	            // {method: "Latin1Environment class>>systemConverterClass", bytecode: {pc: 53, old: 0x45, hack: 0x49}, enabled: !this.image.isSpur},
	            // {method: "Latin1Environment class>>systemConverterClass", bytecode: {pc: 38, old: 0x16, hack: 0x13}, enabled: this.image.isSpur && sista},
	            // {method: "Latin1Environment class>>systemConverterClass", bytecode: {pc: 50, old: 0x44, hack: 0x48}, enabled: this.image.isSpur && !sista},
	        ].forEach(function(each) {
	            try {
	                var m = each.enabled && this.findMethod(each.method);
	                if (m) {
	                    var prim = each.primitive,
	                        byte = each.bytecode,
	                        lit = each.literal,
	                        hacked = true;
	                    if (prim) m.pointers[0] |= prim;
	                    else if (byte && m.bytes[byte.pc] === byte.old) m.bytes[byte.pc] = byte.hack;
	                    else if (byte && m.bytes[byte.pc] === byte.hack) hacked = false; // already there
	                    else if (lit && m.pointers[lit.index].pointers[1] === lit.old) m.pointers[lit.index].pointers[1] = lit.hack;
	                    else if (lit && m.pointers[lit.index].pointers[1] === lit.hack) hacked = false; // already there
	                    else { hacked = false; console.warn("Not hacking " + each.method); }
	                    if (hacked) console.warn("Hacking " + each.method);
	                }
	            } catch (error) {
	                console.error("Failed to hack " + each.method + " with error " + error);
	            }

	        }, this);
	    },
	},
	'interpreting', {
	    interpretOne: function(singleStep) {
	        if (this.method.compiled) {
	            if (singleStep) {
	                if (!this.compiler.enableSingleStepping(this.method)) {
	                    this.method.compiled = null;
	                    return this.interpretOne(singleStep);
	                }
	                this.breakNow();
	            }
	            this.method.compiled(this);
	            return;
	        }
	        if (this.method.methodSignFlag()) {
	            return this.interpretOneSistaWithExtensions(singleStep, 0, 0);
	        }
	        var Squeak = this.Squeak; // avoid dynamic lookup of "Squeak" in Lively
	        var b, b2;
	        this.byteCodeCount++;
	        b = this.nextByte();
	        switch (b) { /* The Main V3 Bytecode Dispatch Loop */

	            // load receiver variable
	            case 0x00: case 0x01: case 0x02: case 0x03: case 0x04: case 0x05: case 0x06: case 0x07:
	            case 0x08: case 0x09: case 0x0A: case 0x0B: case 0x0C: case 0x0D: case 0x0E: case 0x0F:
	                this.push(this.receiver.pointers[b&0xF]); return;

	            // load temporary variable
	            case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15: case 0x16: case 0x17:
	            case 0x18: case 0x19: case 0x1A: case 0x1B: case 0x1C: case 0x1D: case 0x1E: case 0x1F:
	                this.push(this.homeContext.pointers[Squeak.Context_tempFrameStart+(b&0xF)]); return;

	            // loadLiteral
	            case 0x20: case 0x21: case 0x22: case 0x23: case 0x24: case 0x25: case 0x26: case 0x27:
	            case 0x28: case 0x29: case 0x2A: case 0x2B: case 0x2C: case 0x2D: case 0x2E: case 0x2F:
	            case 0x30: case 0x31: case 0x32: case 0x33: case 0x34: case 0x35: case 0x36: case 0x37:
	            case 0x38: case 0x39: case 0x3A: case 0x3B: case 0x3C: case 0x3D: case 0x3E: case 0x3F:
	                this.push(this.method.methodGetLiteral(b&0x1F)); return;

	            // loadLiteralIndirect
	            case 0x40: case 0x41: case 0x42: case 0x43: case 0x44: case 0x45: case 0x46: case 0x47:
	            case 0x48: case 0x49: case 0x4A: case 0x4B: case 0x4C: case 0x4D: case 0x4E: case 0x4F:
	            case 0x50: case 0x51: case 0x52: case 0x53: case 0x54: case 0x55: case 0x56: case 0x57:
	            case 0x58: case 0x59: case 0x5A: case 0x5B: case 0x5C: case 0x5D: case 0x5E: case 0x5F:
	                this.push((this.method.methodGetLiteral(b&0x1F)).pointers[Squeak.Assn_value]); return;

	            // storeAndPop rcvr, temp
	            case 0x60: case 0x61: case 0x62: case 0x63: case 0x64: case 0x65: case 0x66: case 0x67:
	                this.receiver.dirty = true;
	                this.receiver.pointers[b&7] = this.pop(); return;
	            case 0x68: case 0x69: case 0x6A: case 0x6B: case 0x6C: case 0x6D: case 0x6E: case 0x6F:
	                this.homeContext.pointers[Squeak.Context_tempFrameStart+(b&7)] = this.pop(); return;

	            // Quick push
	            case 0x70: this.push(this.receiver); return;
	            case 0x71: this.push(this.trueObj); return;
	            case 0x72: this.push(this.falseObj); return;
	            case 0x73: this.push(this.nilObj); return;
	            case 0x74: this.push(-1); return;
	            case 0x75: this.push(0); return;
	            case 0x76: this.push(1); return;
	            case 0x77: this.push(2); return;

	            // Quick return
	            case 0x78: this.doReturn(this.receiver); return;
	            case 0x79: this.doReturn(this.trueObj); return;
	            case 0x7A: this.doReturn(this.falseObj); return;
	            case 0x7B: this.doReturn(this.nilObj); return;
	            case 0x7C: this.doReturn(this.pop()); return;
	            case 0x7D: this.doReturn(this.pop(), this.activeContext.pointers[Squeak.BlockContext_caller]); return; // blockReturn
	            case 0x7E: this.nono(); return;
	            case 0x7F: this.nono(); return;
	            // Sundry
	            case 0x80: this.extendedPush(this.nextByte()); return;
	            case 0x81: this.extendedStore(this.nextByte()); return;
	            case 0x82: this.extendedStorePop(this.nextByte()); return;
	            // singleExtendedSend
	            case 0x83: b2 = this.nextByte(); this.send(this.method.methodGetSelector(b2&31), b2>>5, false); return;
	            case 0x84: this.doubleExtendedDoAnything(this.nextByte()); return;
	            // singleExtendedSendToSuper
	            case 0x85: b2= this.nextByte(); this.send(this.method.methodGetSelector(b2&31), b2>>5, true); return;
	            // secondExtendedSend
	            case 0x86: b2= this.nextByte(); this.send(this.method.methodGetSelector(b2&63), b2>>6, false); return;
	            case 0x87: this.pop(); return;  // pop
	            case 0x88: this.push(this.top()); return;   // dup
	            // thisContext
	            case 0x89: this.push(this.exportThisContext()); return;

	            // Closures
	            case 0x8A: this.pushNewArray(this.nextByte());   // create new temp vector
	                return;
	            case 0x8B: this.callPrimBytecode(0x81);
	                return;
	            case 0x8C: b2 = this.nextByte(); // remote push from temp vector
	                this.push(this.homeContext.pointers[Squeak.Context_tempFrameStart+this.nextByte()].pointers[b2]);
	                return;
	            case 0x8D: b2 = this.nextByte(); // remote store into temp vector
	                var vec = this.homeContext.pointers[Squeak.Context_tempFrameStart+this.nextByte()];
	                vec.pointers[b2] = this.top();
	                vec.dirty = true;
	                return;
	            case 0x8E: b2 = this.nextByte(); // remote store and pop into temp vector
	                var vec = this.homeContext.pointers[Squeak.Context_tempFrameStart+this.nextByte()];
	                vec.pointers[b2] = this.pop();
	                vec.dirty = true;
	                return;
	            case 0x8F: this.pushClosureCopy(); return;

	            // Short jmp
	            case 0x90: case 0x91: case 0x92: case 0x93: case 0x94: case 0x95: case 0x96: case 0x97:
	                this.pc += (b&7)+1; return;
	            // Short conditional jump on false
	            case 0x98: case 0x99: case 0x9A: case 0x9B: case 0x9C: case 0x9D: case 0x9E: case 0x9F:
	                this.jumpIfFalse((b&7)+1); return;
	            // Long jump, forward and back
	            case 0xA0: case 0xA1: case 0xA2: case 0xA3: case 0xA4: case 0xA5: case 0xA6: case 0xA7:
	                b2 = this.nextByte();
	                this.pc += (((b&7)-4)*256 + b2);
	                if ((b&7)<4)        // check for process switch on backward jumps (loops)
	                    if (this.interruptCheckCounter-- <= 0) this.checkForInterrupts();
	                return;
	            // Long conditional jump on true
	            case 0xA8: case 0xA9: case 0xAA: case 0xAB:
	                this.jumpIfTrue((b&3)*256 + this.nextByte()); return;
	            // Long conditional jump on false
	            case 0xAC: case 0xAD: case 0xAE: case 0xAF:
	                this.jumpIfFalse((b&3)*256 + this.nextByte()); return;

	            // Arithmetic Ops... + - < > <= >= = ~=    * /  @ lshift: lxor: land: lor:
	            case 0xB0: this.success = true; this.resultIsFloat = false;
	                if (!this.pop2AndPushNumResult(this.stackIntOrFloat(1) + this.stackIntOrFloat(0))) this.sendSpecial(b&0xF); return;  // PLUS +
	            case 0xB1: this.success = true; this.resultIsFloat = false;
	                if (!this.pop2AndPushNumResult(this.stackIntOrFloat(1) - this.stackIntOrFloat(0))) this.sendSpecial(b&0xF); return;  // MINUS -
	            case 0xB2: this.success = true;
	                if (!this.pop2AndPushBoolResult(this.stackIntOrFloat(1) < this.stackIntOrFloat(0))) this.sendSpecial(b&0xF); return;  // LESS <
	            case 0xB3: this.success = true;
	                if (!this.pop2AndPushBoolResult(this.stackIntOrFloat(1) > this.stackIntOrFloat(0))) this.sendSpecial(b&0xF); return;  // GRTR >
	            case 0xB4: this.success = true;
	                if (!this.pop2AndPushBoolResult(this.stackIntOrFloat(1) <= this.stackIntOrFloat(0))) this.sendSpecial(b&0xF); return;  // LEQ <=
	            case 0xB5: this.success = true;
	                if (!this.pop2AndPushBoolResult(this.stackIntOrFloat(1) >= this.stackIntOrFloat(0))) this.sendSpecial(b&0xF); return;  // GEQ >=
	            case 0xB6: this.success = true;
	                if (!this.pop2AndPushBoolResult(this.stackIntOrFloat(1) === this.stackIntOrFloat(0))) this.sendSpecial(b&0xF); return;  // EQU =
	            case 0xB7: this.success = true;
	                if (!this.pop2AndPushBoolResult(this.stackIntOrFloat(1) !== this.stackIntOrFloat(0))) this.sendSpecial(b&0xF); return;  // NEQ ~=
	            case 0xB8: this.success = true; this.resultIsFloat = false;
	                if (!this.pop2AndPushNumResult(this.stackIntOrFloat(1) * this.stackIntOrFloat(0))) this.sendSpecial(b&0xF); return;  // TIMES *
	            case 0xB9: this.success = true;
	                if (!this.pop2AndPushIntResult(this.quickDivide(this.stackInteger(1),this.stackInteger(0)))) this.sendSpecial(b&0xF); return;  // Divide /
	            case 0xBA: this.success = true;
	                if (!this.pop2AndPushIntResult(this.mod(this.stackInteger(1),this.stackInteger(0)))) this.sendSpecial(b&0xF); return;  // MOD \
	            case 0xBB: this.success = true;
	                if (!this.primHandler.primitiveMakePoint(1, true)) this.sendSpecial(b&0xF); return;  // MakePt int@int
	            case 0xBC: this.success = true;
	                if (!this.pop2AndPushIntResult(this.safeShift(this.stackInteger(1),this.stackInteger(0)))) this.sendSpecial(b&0xF); return; // bitShift:
	            case 0xBD: this.success = true;
	                if (!this.pop2AndPushIntResult(this.div(this.stackInteger(1),this.stackInteger(0)))) this.sendSpecial(b&0xF); return;  // Divide //
	            case 0xBE: this.success = true;
	                if (!this.pop2AndPushIntResult(this.stackInteger(1) & this.stackInteger(0))) this.sendSpecial(b&0xF); return; // bitAnd:
	            case 0xBF: this.success = true;
	                if (!this.pop2AndPushIntResult(this.stackInteger(1) | this.stackInteger(0))) this.sendSpecial(b&0xF); return; // bitOr:

	            // at:, at:put:, size, next, nextPut:, ...
	            case 0xC0: case 0xC1: case 0xC2: case 0xC3: case 0xC4: case 0xC5: case 0xC6: case 0xC7:
	            case 0xC8: case 0xC9: case 0xCA: case 0xCB: case 0xCC: case 0xCD: case 0xCE: case 0xCF:
	                if (!this.primHandler.quickSendOther(this.receiver, b&0xF))
	                    this.sendSpecial((b&0xF)+16); return;

	            // Send Literal Selector with 0, 1, and 2 args
	            case 0xD0: case 0xD1: case 0xD2: case 0xD3: case 0xD4: case 0xD5: case 0xD6: case 0xD7:
	            case 0xD8: case 0xD9: case 0xDA: case 0xDB: case 0xDC: case 0xDD: case 0xDE: case 0xDF:
	                this.send(this.method.methodGetSelector(b&0xF), 0, false); return;
	            case 0xE0: case 0xE1: case 0xE2: case 0xE3: case 0xE4: case 0xE5: case 0xE6: case 0xE7:
	            case 0xE8: case 0xE9: case 0xEA: case 0xEB: case 0xEC: case 0xED: case 0xEE: case 0xEF:
	                this.send(this.method.methodGetSelector(b&0xF), 1, false); return;
	            case 0xF0: case 0xF1: case 0xF2: case 0xF3: case 0xF4: case 0xF5: case 0xF6: case 0xF7:
	            case 0xF8: case 0xF9: case 0xFA: case 0xFB: case 0xFC: case 0xFD: case 0xFE: case 0xFF:
	                this.send(this.method.methodGetSelector(b&0xF), 2, false); return;
	        }
	        throw Error("not a bytecode: " + b);
	    },
	    interpretOneSistaWithExtensions: function(singleStep, extA, extB) {
	        var Squeak = this.Squeak; // avoid dynamic lookup of "Squeak" in Lively
	        var b, b2;
	        this.byteCodeCount++;
	        b = this.nextByte();
	        switch (b) { /* The Main Sista Bytecode Dispatch Loop */

	            // 1 Byte Bytecodes

	            // load receiver variable
	            case 0x00: case 0x01: case 0x02: case 0x03: case 0x04: case 0x05: case 0x06: case 0x07:
	            case 0x08: case 0x09: case 0x0A: case 0x0B: case 0x0C: case 0x0D: case 0x0E: case 0x0F:
	                this.push(this.receiver.pointers[b&0xF]); return;

	            // load literal variable
	            case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15: case 0x16: case 0x17:
	            case 0x18: case 0x19: case 0x1A: case 0x1B: case 0x1C: case 0x1D: case 0x1E: case 0x1F:
	                this.push((this.method.methodGetLiteral(b&0xF)).pointers[Squeak.Assn_value]); return;

	            // load literal constant
	            case 0x20: case 0x21: case 0x22: case 0x23: case 0x24: case 0x25: case 0x26: case 0x27:
	            case 0x28: case 0x29: case 0x2A: case 0x2B: case 0x2C: case 0x2D: case 0x2E: case 0x2F:
	            case 0x30: case 0x31: case 0x32: case 0x33: case 0x34: case 0x35: case 0x36: case 0x37:
	            case 0x38: case 0x39: case 0x3A: case 0x3B: case 0x3C: case 0x3D: case 0x3E: case 0x3F:
	                this.push(this.method.methodGetLiteral(b&0x1F)); return;

	            // load temporary variable
	            case 0x40: case 0x41: case 0x42: case 0x43: case 0x44: case 0x45: case 0x46: case 0x47:
	                this.push(this.homeContext.pointers[Squeak.Context_tempFrameStart+(b&0x7)]); return;
	            case 0x48: case 0x49: case 0x4A: case 0x4B:
	                this.push(this.homeContext.pointers[Squeak.Context_tempFrameStart+(b&0x3)+8]); return;

	            case 0x4C: this.push(this.receiver); return;
	            case 0x4D: this.push(this.trueObj); return;
	            case 0x4E: this.push(this.falseObj); return;
	            case 0x4F: this.push(this.nilObj); return;
	            case 0x50: this.push(0); return;
	            case 0x51: this.push(1); return;
	            case 0x52:
	                if (extB == 0) {
	                    this.push(this.exportThisContext()); return;
	                } else {
	                    this.nono(); return;
	                }
	            case 0x53: this.push(this.top()); return;
	            case 0x54: case 0x55: case 0x56: case 0x57: this.nono(); return; // unused
	            case 0x58: this.doReturn(this.receiver); return;
	            case 0x59: this.doReturn(this.trueObj); return;
	            case 0x5A: this.doReturn(this.falseObj); return;
	            case 0x5B: this.doReturn(this.nilObj); return;
	            case 0x5C: this.doReturn(this.pop()); return;
	            case 0x5D: this.doReturn(this.nilObj, this.activeContext.pointers[Squeak.BlockContext_caller]); return; // blockReturn nil
	            case 0x5E:
	                if (extA == 0) {
	                    this.doReturn(this.pop(), this.activeContext.pointers[Squeak.BlockContext_caller]); return; // blockReturn
	                } else {
	                    this.nono(); return;
	                }
	            case 0x5F:
	                return; // nop

	             // Arithmetic Ops... + - < > <= >= = ~=    * /  @ lshift: lxor: land: lor:
	             case 0x60: this.success = true; this.resultIsFloat = false;
	                if (!this.pop2AndPushNumResult(this.stackIntOrFloat(1) + this.stackIntOrFloat(0))) this.sendSpecial(b&0xF); return;  // PLUS +
	            case 0x61: this.success = true; this.resultIsFloat = false;
	                if (!this.pop2AndPushNumResult(this.stackIntOrFloat(1) - this.stackIntOrFloat(0))) this.sendSpecial(b&0xF); return;  // MINUS -
	            case 0x62: this.success = true;
	                if (!this.pop2AndPushBoolResult(this.stackIntOrFloat(1) < this.stackIntOrFloat(0))) this.sendSpecial(b&0xF); return;  // LESS <
	            case 0x63: this.success = true;
	                if (!this.pop2AndPushBoolResult(this.stackIntOrFloat(1) > this.stackIntOrFloat(0))) this.sendSpecial(b&0xF); return;  // GRTR >
	            case 0x64: this.success = true;
	                if (!this.pop2AndPushBoolResult(this.stackIntOrFloat(1) <= this.stackIntOrFloat(0))) this.sendSpecial(b&0xF); return;  // LEQ <=
	            case 0x65: this.success = true;
	                if (!this.pop2AndPushBoolResult(this.stackIntOrFloat(1) >= this.stackIntOrFloat(0))) this.sendSpecial(b&0xF); return;  // GEQ >=
	            case 0x66: this.success = true;
	                if (!this.pop2AndPushBoolResult(this.stackIntOrFloat(1) === this.stackIntOrFloat(0))) this.sendSpecial(b&0xF); return;  // EQU =
	            case 0x67: this.success = true;
	                if (!this.pop2AndPushBoolResult(this.stackIntOrFloat(1) !== this.stackIntOrFloat(0))) this.sendSpecial(b&0xF); return;  // NEQ ~=
	            case 0x68: this.success = true; this.resultIsFloat = false;
	                if (!this.pop2AndPushNumResult(this.stackIntOrFloat(1) * this.stackIntOrFloat(0))) this.sendSpecial(b&0xF); return;  // TIMES *
	            case 0x69: this.success = true;
	                if (!this.pop2AndPushIntResult(this.quickDivide(this.stackInteger(1),this.stackInteger(0)))) this.sendSpecial(b&0xF); return;  // Divide /
	            case 0x6A: this.success = true;
	                if (!this.pop2AndPushIntResult(this.mod(this.stackInteger(1),this.stackInteger(0)))) this.sendSpecial(b&0xF); return;  // MOD \
	            case 0x6B: this.success = true;
	                if (!this.primHandler.primitiveMakePoint(1, true)) this.sendSpecial(b&0xF); return;  // MakePt int@int
	            case 0x6C: this.success = true;
	                if (!this.pop2AndPushIntResult(this.safeShift(this.stackInteger(1),this.stackInteger(0)))) this.sendSpecial(b&0xF); return; // bitShift:
	            case 0x6D: this.success = true;
	                if (!this.pop2AndPushIntResult(this.div(this.stackInteger(1),this.stackInteger(0)))) this.sendSpecial(b&0xF); return;  // Divide //
	            case 0x6E: this.success = true;
	                if (!this.pop2AndPushIntResult(this.stackInteger(1) & this.stackInteger(0))) this.sendSpecial(b&0xF); return; // bitAnd:
	            case 0x6F: this.success = true;
	                if (!this.pop2AndPushIntResult(this.stackInteger(1) | this.stackInteger(0))) this.sendSpecial(b&0xF); return; // bitOr:

	            // at:, at:put:, size, next, nextPut:, ...
	            case 0x70: case 0x71: case 0x72: case 0x73: case 0x74: case 0x75: case 0x76: case 0x77:
	            case 0x78: case 0x79: case 0x7A: case 0x7B: case 0x7C: case 0x7D: case 0x7E: case 0x7F:
	                if (!this.primHandler.quickSendOther(this.receiver, b&0xF))
	                    this.sendSpecial((b&0xF)+16); return;

	            // Send Literal Selector with 0, 1, and 2 args
	            case 0x80: case 0x81: case 0x82: case 0x83: case 0x84: case 0x85: case 0x86: case 0x87:
	            case 0x88: case 0x89: case 0x8A: case 0x8B: case 0x8C: case 0x8D: case 0x8E: case 0x8F:
	                this.send(this.method.methodGetSelector(b&0xF), 0, false); return;
	            case 0x90: case 0x91: case 0x92: case 0x93: case 0x94: case 0x95: case 0x96: case 0x97:
	            case 0x98: case 0x99: case 0x9A: case 0x9B: case 0x9C: case 0x9D: case 0x9E: case 0x9F:
	                this.send(this.method.methodGetSelector(b&0xF), 1, false); return;
	            case 0xA0: case 0xA1: case 0xA2: case 0xA3: case 0xA4: case 0xA5: case 0xA6: case 0xA7:
	            case 0xA8: case 0xA9: case 0xAA: case 0xAB: case 0xAC: case 0xAD: case 0xAE: case 0xAF:
	                this.send(this.method.methodGetSelector(b&0xF), 2, false); return;

	            // Short jmp
	            case 0xB0: case 0xB1: case 0xB2: case 0xB3: case 0xB4: case 0xB5: case 0xB6: case 0xB7:
	                this.pc += (b&7)+1; return;
	            // Short conditional jump on true
	            case 0xB8: case 0xB9: case 0xBA: case 0xBB: case 0xBC: case 0xBD: case 0xBE: case 0xBF:
	                this.jumpIfTrue((b&7)+1); return;
	            // Short conditional jump on false
	            case 0xC0: case 0xC1: case 0xC2: case 0xC3: case 0xC4: case 0xC5: case 0xC6: case 0xC7:
	                this.jumpIfFalse((b&7)+1); return;

	            // storeAndPop rcvr, temp
	            case 0xC8: case 0xC9: case 0xCA: case 0xCB: case 0xCC: case 0xCD: case 0xCE: case 0xCF:
	                this.receiver.dirty = true;
	                this.receiver.pointers[b&7] = this.pop(); return;
	            case 0xD0: case 0xD1: case 0xD2: case 0xD3: case 0xD4: case 0xD5: case 0xD6: case 0xD7:
	                this.homeContext.pointers[Squeak.Context_tempFrameStart+(b&7)] = this.pop(); return;

	            case 0xD8: this.pop(); return;  // pop
	            case 0xD9: this.nono(); return; // FIXME: Unconditional trap
	            case 0xDA: case 0xDB: case 0xDC: case 0xDD: case 0xDE: case 0xDF:
	                this.nono(); return; // unused

	            // 2 Byte Bytecodes

	            case 0xE0:
	                b2 = this.nextByte(); this.interpretOneSistaWithExtensions(singleStep, (extA << 8) + b2, extB); return;
	            case 0xE1:
	                b2 = this.nextByte(); this.interpretOneSistaWithExtensions(singleStep, extA, (extB << 8) + (b2 < 128 ? b2 : b2-256)); return;
	            case 0xE2:
	                b2 = this.nextByte(); this.push(this.receiver.pointers[b2 + (extA << 8)]); return;
	            case 0xE3:
	                b2 = this.nextByte(); this.push((this.method.methodGetLiteral(b2 + (extA << 8))).pointers[Squeak.Assn_value]); return;
	            case 0xE4:
	                b2 = this.nextByte(); this.push(this.method.methodGetLiteral(b2 + (extA << 8))); return;
	            case 0xE5:
	                b2 = this.nextByte(); this.push(this.homeContext.pointers[Squeak.Context_tempFrameStart+b2]); return;
	            case 0xE6: this.nono(); return; // unused
	            case 0xE7: this.pushNewArray(this.nextByte()); return; // create new temp vector
	            case 0xE8: b2 = this.nextByte(); this.push(b2 + (extB << 8)); return; // push SmallInteger
	            case 0xE9: b2 = this.nextByte(); this.push(this.image.getCharacter(b2 + (extB << 8))); return; // push Character
	            case 0xEA:
	                b2 = this.nextByte();
	                this.send(this.method.methodGetSelector((b2 >> 3) + (extA << 5)), (b2 & 7) + (extB << 3), false); return;
	            case 0xEB:
	                b2 = this.nextByte();
	                var literal = this.method.methodGetSelector((b2 >> 3) + (extA << 5));
	                if (extB >= 64) {
	                    this.sendSuperDirected(literal, (b2 & 7) + ((extB & 63) << 3)); return;
	                } else {
	                    this.send(literal, (b2 & 7) + (extB << 3), true); return;
	                }
	            case 0xEC: this.nono(); return; // unused
	            case 0xED: // long jump, forward and back
	                var offset = this.nextByte() + (extB << 8);
	                this.pc += offset;
	                if (offset < 0)        // check for process switch on backward jumps (loops)
	                    if (this.interruptCheckCounter-- <= 0) this.checkForInterrupts();
	                return;
	            case 0xEE: // long conditional jump on true
	                this.jumpIfTrue(this.nextByte() + (extB << 8)); return;
	            case 0xEF: // long conditional jump on false
	                this.jumpIfFalse(this.nextByte() + (extB << 8)); return;
	            case 0xF0: // pop into receiver
	                this.receiver.dirty = true;
	                this.receiver.pointers[this.nextByte() + (extA << 8)] = this.pop();
	                return;
	            case 0xF1: // pop into literal
	                var assoc = this.method.methodGetLiteral(this.nextByte() + (extA << 8));
	                assoc.dirty = true;
	                assoc.pointers[Squeak.Assn_value] = this.pop();
	                return;
	            case 0xF2: // pop into temp
	                this.homeContext.pointers[Squeak.Context_tempFrameStart + this.nextByte()] = this.pop();
	                return;
	            case 0xF3: // store into receiver
	                this.receiver.dirty = true;
	                this.receiver.pointers[this.nextByte() + (extA << 8)] = this.top();
	                return;
	            case 0xF4: // store into literal
	                var assoc = this.method.methodGetLiteral(this.nextByte() + (extA << 8));
	                assoc.dirty = true;
	                assoc.pointers[Squeak.Assn_value] = this.top();
	                return;
	            case 0xF5: // store into temp
	                this.homeContext.pointers[Squeak.Context_tempFrameStart + this.nextByte()] = this.top();
	                return;
	            case 0xF6: case 0xF7: this.nono(); return; // unused

	            // 3 Byte Bytecodes

	            case 0xF8: this.callPrimBytecode(0xF5); return;
	            case 0xF9: this.pushFullClosure(extA); return;
	            case 0xFA: this.pushClosureCopyExtended(extA, extB); return;
	            case 0xFB: b2 = this.nextByte(); // remote push from temp vector
	                this.push(this.homeContext.pointers[Squeak.Context_tempFrameStart+this.nextByte()].pointers[b2]);
	                return;
	            case 0xFC: b2 = this.nextByte(); // remote store into temp vector
	                var vec = this.homeContext.pointers[Squeak.Context_tempFrameStart+this.nextByte()];
	                vec.pointers[b2] = this.top();
	                vec.dirty = true;
	                return;
	            case 0xFD: b2 = this.nextByte(); // remote store and pop into temp vector
	                var vec = this.homeContext.pointers[Squeak.Context_tempFrameStart+this.nextByte()];
	                vec.pointers[b2] = this.pop();
	                vec.dirty = true;
	                return;
	            case 0xFE: case 0xFF: this.nono(); return; // unused
	        }
	        throw Error("not a bytecode: " + b);
	    },
	    interpret: function(forMilliseconds, thenDo) {
	        // run for a couple milliseconds (but only until idle or break)
	        // answer milliseconds to sleep (until next timer wakeup)
	        // or 'break' if reached breakpoint
	        // call thenDo with that result when done
	        if (this.frozen) return 'frozen';
	        this.isIdle = false;
	        this.breakOutOfInterpreter = false;
	        this.breakAfter(forMilliseconds || 500);
	        while (this.breakOutOfInterpreter === false)
	            if (this.method.compiled) {
	                this.method.compiled(this);
	            } else {
	                this.interpretOne();
	            }
	        // this is to allow 'freezing' the interpreter and restarting it asynchronously. See freeze()
	        if (typeof this.breakOutOfInterpreter == "function")
	            return this.breakOutOfInterpreter(thenDo);
	        // normally, we answer regularly
	        var result = this.breakOutOfInterpreter == 'break' ? 'break'
	            : !this.isIdle ? 0
	            : !this.nextWakeupTick ? 'sleep'        // all processes waiting
	            : Math.max(1, this.nextWakeupTick - this.primHandler.millisecondClockValue());
	        if (thenDo) thenDo(result);
	        return result;
	    },
	    goIdle: function() {
	        // make sure we tend to pending delays
	        var hadTimer = this.nextWakeupTick !== 0;
	        this.forceInterruptCheck();
	        this.checkForInterrupts();
	        var hasTimer = this.nextWakeupTick !== 0;
	        // go idle unless a timer just expired
	        this.isIdle = hasTimer || !hadTimer;
	        this.breakOut();
	    },
	    freeze: function(frozenDo) {
	        // Stop the interpreter. Answer a function that can be
	        // called to continue interpreting.
	        // Optionally, frozenDo is called asynchronously when frozen
	        var continueFunc;
	        this.frozen = true;
	        this.breakOutOfInterpreter = function(thenDo) {
	            if (!thenDo) throw Error("need function to restart interpreter");
	            continueFunc = thenDo;
	            return "frozen";
	        }.bind(this);
	        var unfreeze = function() {
	            this.frozen = false;
	            if (!continueFunc) throw Error("no continue function");
	            continueFunc(0);    //continue without timeout
	        }.bind(this);
	        if (frozenDo) self.setTimeout(function(){frozenDo(unfreeze);}, 0);
	        return unfreeze;
	    },
	    breakOut: function() {
	        this.breakOutOfInterpreter = this.breakOutOfInterpreter || true; // do not overwrite break string
	    },
	    nextByte: function() {
	        return this.method.bytes[this.pc++];
	    },
	    nono: function() {
	        throw Error("Oh No!");
	    },
	    forceInterruptCheck: function() {
	        this.interruptCheckCounter = -1000;
	    },
	    checkForInterrupts: function() {
	        //Check for interrupts at sends and backward jumps
	        var now = this.primHandler.millisecondClockValue();
	        if (now < this.lastTick) { // millisecond clock wrapped
	            this.nextPollTick = now + (this.nextPollTick - this.lastTick);
	            this.breakOutTick = now + (this.breakOutTick - this.lastTick);
	            if (this.nextWakeupTick !== 0)
	                this.nextWakeupTick = now + (this.nextWakeupTick - this.lastTick);
	        }
	        //Feedback logic attempts to keep interrupt response around 3ms...
	        if (this.interruptCheckCounter > -100) { // only if not a forced check
	            if ((now - this.lastTick) < this.interruptChecksEveryNms) { //wrapping is not a concern
	                this.interruptCheckCounterFeedBackReset += 10;
	            } else { // do a thousand sends even if we are too slow for 3ms
	                if (this.interruptCheckCounterFeedBackReset <= 1000)
	                    this.interruptCheckCounterFeedBackReset = 1000;
	                else
	                    this.interruptCheckCounterFeedBackReset -= 12;
	            }
	        }
	        this.interruptCheckCounter = this.interruptCheckCounterFeedBackReset; //reset the interrupt check counter
	        this.lastTick = now; //used to detect wraparound of millisecond clock
	        if (this.signalLowSpace) {
	            this.signalLowSpace = false; // reset flag
	            var sema = this.specialObjects[Squeak.splOb_TheLowSpaceSemaphore];
	            if (!sema.isNil) this.primHandler.synchronousSignal(sema);
	        }
	        //  if (now >= nextPollTick) {
	        //            ioProcessEvents(); //sets interruptPending if interrupt key pressed
	        //            nextPollTick= now + 500; } //msecs to wait before next call to ioProcessEvents"
	        if (this.interruptPending) {
	            this.interruptPending = false; //reset interrupt flag
	            var sema = this.specialObjects[Squeak.splOb_TheInterruptSemaphore];
	            if (!sema.isNil) this.primHandler.synchronousSignal(sema);
	        }
	        if ((this.nextWakeupTick !== 0) && (now >= this.nextWakeupTick)) {
	            this.nextWakeupTick = 0; //reset timer interrupt
	            var sema = this.specialObjects[Squeak.splOb_TheTimerSemaphore];
	            if (!sema.isNil) this.primHandler.synchronousSignal(sema);
	        }
	        if (this.pendingFinalizationSignals > 0) { //signal any pending finalizations
	            var sema = this.specialObjects[Squeak.splOb_TheFinalizationSemaphore];
	            this.pendingFinalizationSignals = 0;
	            if (!sema.isNil) this.primHandler.synchronousSignal(sema);
	        }
	        if (this.primHandler.semaphoresToSignal.length > 0)
	            this.primHandler.signalExternalSemaphores();  // signal pending semaphores, if any
	        // if this is a long-running do-it, compile it
	        if (!this.method.compiled) this.compileIfPossible(this.method);
	        // have to return to web browser once in a while
	        if (now >= this.breakOutTick)
	            this.breakOut();
	    },
	    extendedPush: function(nextByte) {
	        var lobits = nextByte & 63;
	        switch (nextByte>>6) {
	            case 0: this.push(this.receiver.pointers[lobits]);break;
	            case 1: this.push(this.homeContext.pointers[Squeak.Context_tempFrameStart+lobits]); break;
	            case 2: this.push(this.method.methodGetLiteral(lobits)); break;
	            case 3: this.push(this.method.methodGetLiteral(lobits).pointers[Squeak.Assn_value]); break;
	        }
	    },
	    extendedStore: function( nextByte) {
	        var lobits = nextByte & 63;
	        switch (nextByte>>6) {
	            case 0:
	                this.receiver.dirty = true;
	                this.receiver.pointers[lobits] = this.top();
	                break;
	            case 1:
	                this.homeContext.pointers[Squeak.Context_tempFrameStart+lobits] = this.top();
	                break;
	            case 2:
	                this.nono();
	                break;
	            case 3:
	                var assoc = this.method.methodGetLiteral(lobits);
	                assoc.dirty = true;
	                assoc.pointers[Squeak.Assn_value] = this.top();
	                break;
	        }
	    },
	    extendedStorePop: function(nextByte) {
	        var lobits = nextByte & 63;
	        switch (nextByte>>6) {
	            case 0:
	                this.receiver.dirty = true;
	                this.receiver.pointers[lobits] = this.pop();
	                break;
	            case 1:
	                this.homeContext.pointers[Squeak.Context_tempFrameStart+lobits] = this.pop();
	                break;
	            case 2:
	                this.nono();
	                break;
	            case 3:
	                var assoc = this.method.methodGetLiteral(lobits);
	                assoc.dirty = true;
	                assoc.pointers[Squeak.Assn_value] = this.pop();
	                break;
	        }
	    },
	    doubleExtendedDoAnything: function(byte2) {
	        var byte3 = this.nextByte();
	        switch (byte2>>5) {
	            case 0: this.send(this.method.methodGetSelector(byte3), byte2&31, false); break;
	            case 1: this.send(this.method.methodGetSelector(byte3), byte2&31, true); break;
	            case 2: this.push(this.receiver.pointers[byte3]); break;
	            case 3: this.push(this.method.methodGetLiteral(byte3)); break;
	            case 4: this.push(this.method.methodGetLiteral(byte3).pointers[Squeak.Assn_value]); break;
	            case 5: this.receiver.dirty = true; this.receiver.pointers[byte3] = this.top(); break;
	            case 6: this.receiver.dirty = true; this.receiver.pointers[byte3] = this.pop(); break;
	            case 7: var assoc = this.method.methodGetLiteral(byte3);
	                assoc.dirty = true;
	                assoc.pointers[Squeak.Assn_value] = this.top(); break;
	        }
	    },
	    jumpIfTrue: function(delta) {
	        var top = this.pop();
	        if (top.isTrue) {this.pc += delta; return;}
	        if (top.isFalse) return;
	        this.push(top); //Uh-oh it's not even a boolean (that we know of ;-).  Restore stack...
	        this.send(this.specialObjects[Squeak.splOb_SelectorMustBeBoolean], 0, false);
	    },
	    jumpIfFalse: function(delta) {
	        var top = this.pop();
	        if (top.isFalse) {this.pc += delta; return;}
	        if (top.isTrue) return;
	        this.push(top); //Uh-oh it's not even a boolean (that we know of ;-).  Restore stack...
	        this.send(this.specialObjects[Squeak.splOb_SelectorMustBeBoolean], 0, false);
	    },
	    sendSpecial: function(lobits) {
	        this.send(this.specialSelectors[lobits*2],
	            this.specialSelectors[(lobits*2)+1],
	            false);  //specialSelectors is  {...sel,nArgs,sel,nArgs,...)
	    },
	    callPrimBytecode: function(extendedStoreBytecode) {
	        this.pc += 2; // skip over primitive number
	        if (this.primFailCode) {
	            if (this.method.bytes[this.pc] === extendedStoreBytecode)
	                this.stackTopPut(this.getErrorObjectFromPrimFailCode());
	            this.primFailCode = 0;
	        }
	    },
	    getErrorObjectFromPrimFailCode: function() {
	        var primErrTable = this.specialObjects[Squeak.splOb_PrimErrTableIndex];
	        if (primErrTable && primErrTable.pointers) {
	            var errorObject = primErrTable.pointers[this.primFailCode - 1];
	            if (errorObject) return errorObject;
	        }
	        return this.primFailCode;
	    },
	},
	'closures', {
	    pushNewArray: function(nextByte) {
	        var popValues = nextByte > 127,
	            count = nextByte & 127,
	            array = this.instantiateClass(this.specialObjects[Squeak.splOb_ClassArray], count);
	        if (popValues) {
	            for (var i = 0; i < count; i++)
	                array.pointers[i] = this.stackValue(count - i - 1);
	            this.popN(count);
	        }
	        this.push(array);
	    },
	    pushClosureCopy: function() {
	        // The compiler has pushed the values to be copied, if any.  Find numArgs and numCopied in the byte following.
	        // Create a Closure with space for the copiedValues and pop numCopied values off the stack into the closure.
	        // Set numArgs as specified, and set startpc to the pc following the block size and jump over that code.
	        var numArgsNumCopied = this.nextByte(),
	            numArgs = numArgsNumCopied & 0xF,
	            numCopied = numArgsNumCopied >> 4,
	            blockSizeHigh = this.nextByte(),
	            blockSize = blockSizeHigh * 256 + this.nextByte(),
	            initialPC = this.encodeSqueakPC(this.pc, this.method),
	            closure = this.newClosure(numArgs, initialPC, numCopied);
	        closure.pointers[Squeak.Closure_outerContext] = this.activeContext;
	        this.reclaimableContextCount = 0; // The closure refers to thisContext so it can't be reclaimed
	        if (numCopied > 0) {
	            for (var i = 0; i < numCopied; i++)
	                closure.pointers[Squeak.Closure_firstCopiedValue + i] = this.stackValue(numCopied - i - 1);
	            this.popN(numCopied);
	        }
	        this.pc += blockSize;
	        this.push(closure);
	    },
	    pushClosureCopyExtended: function(extA, extB) {
	        var byteA = this.nextByte();
	        var byteB = this.nextByte();
	        var numArgs = (byteA & 7) + this.mod(extA, 16) * 8,
	            numCopied = (byteA >> 3 & 0x7) + this.div(extA, 16) * 8,
	            blockSize = byteB + (extB << 8),
	            initialPC = this.encodeSqueakPC(this.pc, this.method),
	            closure = this.newClosure(numArgs, initialPC, numCopied);
	        closure.pointers[Squeak.Closure_outerContext] = this.activeContext;
	        this.reclaimableContextCount = 0; // The closure refers to thisContext so it can't be reclaimed
	        if (numCopied > 0) {
	            for (var i = 0; i < numCopied; i++)
	                closure.pointers[Squeak.Closure_firstCopiedValue + i] = this.stackValue(numCopied - i - 1);
	            this.popN(numCopied);
	        }
	        this.pc += blockSize;
	        this.push(closure);
	    },
	    pushFullClosure: function(extA) {
	        var byteA = this.nextByte();
	        var byteB = this.nextByte();
	        var literalIndex = byteA + (extA << 8);
	        var numCopied = byteB & 63;
	        var context;
	        if ((byteB >> 6 & 1) == 1) {
	            context = this.vm.nilObj;
	        } else {
	            context = this.activeContext;
	        }
	        var compiledBlock = this.method.methodGetLiteral(literalIndex);
	        var closure = this.newFullClosure(context, numCopied, compiledBlock);
	        if ((byteB >> 7 & 1) == 1) {
	            throw Error("on-stack receiver not yet supported");
	        } else {
	            closure.pointers[Squeak.ClosureFull_receiver] = this.receiver;
	        }
	        this.reclaimableContextCount = 0; // The closure refers to thisContext so it can't be reclaimed
	        if (numCopied > 0) {
	            for (var i = 0; i < numCopied; i++)
	                closure.pointers[Squeak.ClosureFull_firstCopiedValue + i] = this.stackValue(numCopied - i - 1);
	            this.popN(numCopied);
	        }
	        this.push(closure);
	    },
	    newClosure: function(numArgs, initialPC, numCopied) {
	        var closure = this.instantiateClass(this.specialObjects[Squeak.splOb_ClassBlockClosure], numCopied);
	        closure.pointers[Squeak.Closure_startpc] = initialPC;
	        closure.pointers[Squeak.Closure_numArgs] = numArgs;
	        return closure;
	    },
	    newFullClosure: function(context, numCopied, compiledBlock) {
	        var closure = this.instantiateClass(this.specialObjects[Squeak.splOb_ClassFullBlockClosure], numCopied);
	        closure.pointers[Squeak.Closure_outerContext] = context;
	        closure.pointers[Squeak.ClosureFull_method] = compiledBlock;
	        closure.pointers[Squeak.Closure_numArgs] = compiledBlock.methodNumArgs();
	        return closure;
	    },
	},
	'sending', {
	    send: function(selector, argCount, doSuper) {
	        var newRcvr = this.stackValue(argCount);
	        var lookupClass;
	        if (doSuper) {
	            lookupClass = this.method.methodClassForSuper();
	            lookupClass = lookupClass.pointers[Squeak.Class_superclass];
	        } else {
	            lookupClass = this.getClass(newRcvr);
	        }
	        var entry = this.findSelectorInClass(selector, argCount, lookupClass);
	        if (entry.primIndex) {
	            //note details for verification of at/atput primitives
	            this.verifyAtSelector = selector;
	            this.verifyAtClass = lookupClass;
	        }
	        this.executeNewMethod(newRcvr, entry.method, entry.argCount, entry.primIndex, entry.mClass, selector);
	    },
	    sendSuperDirected: function(selector, argCount) {
	        var lookupClass = this.pop().pointers[Squeak.Class_superclass];
	        var newRcvr = this.stackValue(argCount);
	        var entry = this.findSelectorInClass(selector, argCount, lookupClass);
	        if (entry.primIndex) {
	            //note details for verification of at/atput primitives
	            this.verifyAtSelector = selector;
	            this.verifyAtClass = lookupClass;
	        }
	        this.executeNewMethod(newRcvr, entry.method, entry.argCount, entry.primIndex, entry.mClass, selector);
	    },
	    sendAsPrimitiveFailure: function(rcvr, method, argCount) {
	        this.executeNewMethod(rcvr, method, argCount, 0);
	    },
	    /**
	     * @param {*} trueArgCount The number of arguments for the method to be found
	     * @param {*} argCount The number of arguments currently on the stack (may be different from trueArgCount in the context of primitive 84 etc.)
	     */
	    findSelectorInClass: function(selector, trueArgCount, startingClass, argCount = trueArgCount) {
	        this.currentSelector = selector; // for primitiveInvokeObjectAsMethod
	        var cacheEntry = this.findMethodCacheEntry(selector, startingClass);
	        if (cacheEntry.method) return cacheEntry; // Found it in the method cache
	        var currentClass = startingClass;
	        var mDict;
	        while (!currentClass.isNil) {
	            mDict = currentClass.pointers[Squeak.Class_mdict];
	            if (mDict.isNil) {
	                // MethodDict pointer is nil (hopefully due a swapped out stub)
	                //        -- send #cannotInterpret:
	                var cantInterpSel = this.specialObjects[Squeak.splOb_SelectorCannotInterpret],
	                    cantInterpMsg = this.createActualMessage(selector, trueArgCount, startingClass);
	                this.popNandPush(argCount + 1, cantInterpMsg);
	                return this.findSelectorInClass(cantInterpSel, 1, currentClass.superclass());
	            }
	            var newMethod = this.lookupSelectorInDict(mDict, selector);
	            if (!newMethod.isNil) {
	                cacheEntry.method = newMethod;
	                if (newMethod.isMethod()) {
	                    cacheEntry.primIndex = newMethod.methodPrimitiveIndex();
	                cacheEntry.argCount = newMethod.methodNumArgs();
	                } else {
	                    // if method is not actually a CompiledMethod, let primitiveInvokeObjectAsMethod (576) handle it
	                    cacheEntry.primIndex = 576;
	                    cacheEntry.argCount = trueArgCount;
	                }
	                cacheEntry.mClass = currentClass;
	                return cacheEntry;
	            }
	            currentClass = currentClass.superclass();
	        }
	        //Cound not find a normal message -- send #doesNotUnderstand:
	        var dnuSel = this.specialObjects[Squeak.splOb_SelectorDoesNotUnderstand];
	        if (selector === dnuSel) // Cannot find #doesNotUnderstand: -- unrecoverable error.
	            throw Error("Recursive not understood error encountered");
	        var dnuMsg = this.createActualMessage(selector, trueArgCount, startingClass); // The argument to doesNotUnderstand:
	        if (this.breakOnMessageNotUnderstood) {
	            var receiver = this.stackValue(argCount);
	            this.breakNow("Message not understood: " + receiver + " " + startingClass.className() + ">>" + selector.bytesAsString());
	        }
	        this.popNandPush(argCount, dnuMsg);
	        return this.findSelectorInClass(dnuSel, 1, startingClass);
	    },
	    lookupSelectorInDict: function(mDict, messageSelector) {
	        //Returns a method or nilObject
	        var dictSize = mDict.pointersSize();
	        var mask = (dictSize - Squeak.MethodDict_selectorStart) - 1;
	        var index = (mask & messageSelector.hash) + Squeak.MethodDict_selectorStart;
	        // If there are no nils (should always be), then stop looping on second wrap.
	        var hasWrapped = false;
	        while (true) {
	            var nextSelector = mDict.pointers[index];
	            if (nextSelector === messageSelector) {
	                var methArray = mDict.pointers[Squeak.MethodDict_array];
	                return methArray.pointers[index - Squeak.MethodDict_selectorStart];
	            }
	            if (nextSelector.isNil) return this.nilObj;
	            if (++index === dictSize) {
	                if (hasWrapped) return this.nilObj;
	                index = Squeak.MethodDict_selectorStart;
	                hasWrapped = true;
	            }
	        }
	    },
	    executeNewMethod: function(newRcvr, newMethod, argumentCount, primitiveIndex, optClass, optSel) {
	        this.sendCount++;
	        if (newMethod === this.breakOnMethod) this.breakNow("executing method " + this.printMethod(newMethod, optClass, optSel));
	        if (this.logSends) {
	            var indent = ' ';
	            var ctx = this.activeContext;
	            while (!ctx.isNil) { indent += '| '; ctx = ctx.pointers[Squeak.Context_sender]; }
	            var args = this.activeContext.pointers.slice(this.sp + 1 - argumentCount, this.sp + 1);
	            console.log(this.sendCount + indent + this.printMethod(newMethod, optClass, optSel, args));
	        }
	        if (this.breakOnContextChanged) {
	            this.breakOnContextChanged = false;
	            this.breakNow();
	        }
	        if (primitiveIndex > 0)
	            if (this.tryPrimitive(primitiveIndex, argumentCount, newMethod))
	                return;  //Primitive succeeded -- end of story
	        var newContext = this.allocateOrRecycleContext(newMethod.methodNeedsLargeFrame());
	        var tempCount = newMethod.methodTempCount();
	        var newPC = 0; // direct zero-based index into byte codes
	        var newSP = Squeak.Context_tempFrameStart + tempCount - 1; // direct zero-based index into context pointers
	        newContext.pointers[Squeak.Context_method] = newMethod;
	        //Following store is in case we alloc without init; all other fields get stored
	        newContext.pointers[Squeak.BlockContext_initialIP] = this.nilObj;
	        newContext.pointers[Squeak.Context_sender] = this.activeContext;
	        //Copy receiver and args to new context
	        //Note this statement relies on the receiver slot being contiguous with args...
	        this.arrayCopy(this.activeContext.pointers, this.sp-argumentCount, newContext.pointers, Squeak.Context_tempFrameStart-1, argumentCount+1);
	        //...and fill the remaining temps with nil
	        this.arrayFill(newContext.pointers, Squeak.Context_tempFrameStart+argumentCount, Squeak.Context_tempFrameStart+tempCount, this.nilObj);
	        this.popN(argumentCount+1);
	        this.reclaimableContextCount++;
	        this.storeContextRegisters();
	        /////// Woosh //////
	        this.activeContext = newContext; //We're off and running...
	        //Following are more efficient than fetchContextRegisters() in newActiveContext()
	        this.activeContext.dirty = true;
	        this.homeContext = newContext;
	        this.method = newMethod;
	        this.pc = newPC;
	        this.sp = newSP;
	        this.receiver = newContext.pointers[Squeak.Context_receiver];
	        if (this.receiver !== newRcvr)
	            throw Error("receivers don't match");
	        if (!newMethod.compiled) this.compileIfPossible(newMethod, optClass, optSel);
	        // check for process switch on full method activation
	        if (this.interruptCheckCounter-- <= 0) this.checkForInterrupts();
	    },
	    compileIfPossible(newMethod, optClass, optSel) {
	        if (!newMethod.compiled && this.compiler) {
	            this.compiler.compile(newMethod, optClass, optSel);
	        }
	    },
	    doReturn: function(returnValue, targetContext) {
	        // get sender from block home or closure's outerContext
	        if (!targetContext) {
	            var ctx = this.homeContext;
	            if (this.hasClosures) {
	                var closure;
	                while (!(closure = ctx.pointers[Squeak.Context_closure]).isNil)
	                    ctx = closure.pointers[Squeak.Closure_outerContext];
	            }
	            targetContext = ctx.pointers[Squeak.Context_sender];
	        }
	        if (targetContext.isNil || targetContext.pointers[Squeak.Context_instructionPointer].isNil)
	            return this.cannotReturn(returnValue);
	        // search up stack for unwind
	        var thisContext = this.activeContext.pointers[Squeak.Context_sender];
	        while (thisContext !== targetContext) {
	            if (thisContext.isNil)
	                return this.cannotReturn(returnValue);
	            if (this.isUnwindMarked(thisContext))
	                return this.aboutToReturnThrough(returnValue, thisContext);
	            thisContext = thisContext.pointers[Squeak.Context_sender];
	        }
	        // no unwind to worry about, just peel back the stack (usually just to sender)
	        var nextContext;
	        thisContext = this.activeContext;
	        while (thisContext !== targetContext) {
	            if (this.breakOnContextReturned === thisContext) {
	                this.breakOnContextReturned = null;
	                this.breakNow();
	            }
	            nextContext = thisContext.pointers[Squeak.Context_sender];
	            thisContext.pointers[Squeak.Context_sender] = this.nilObj;
	            thisContext.pointers[Squeak.Context_instructionPointer] = this.nilObj;
	            if (this.reclaimableContextCount > 0) {
	                this.reclaimableContextCount--;
	                this.recycleIfPossible(thisContext);
	            }
	            thisContext = nextContext;
	        }
	        this.activeContext = thisContext;
	        this.activeContext.dirty = true;
	        this.fetchContextRegisters(this.activeContext);
	        this.push(returnValue);
	        if (this.breakOnContextChanged) {
	            this.breakOnContextChanged = false;
	            this.breakNow();
	        }
	    },
	    aboutToReturnThrough: function(resultObj, aContext) {
	        this.push(this.exportThisContext());
	        this.push(resultObj);
	        this.push(aContext);
	        var aboutToReturnSel = this.specialObjects[Squeak.splOb_SelectorAboutToReturn];
	        this.send(aboutToReturnSel, 2);
	    },
	    cannotReturn: function(resultObj) {
	        this.push(this.exportThisContext());
	        this.push(resultObj);
	        var cannotReturnSel = this.specialObjects[Squeak.splOb_SelectorCannotReturn];
	        this.send(cannotReturnSel, 1);
	    },
	    tryPrimitive: function(primIndex, argCount, newMethod) {
	        if ((primIndex > 255) && (primIndex < 520)) {
	            if (primIndex >= 264) {//return instvars
	                this.popNandPush(1, this.top().pointers[primIndex - 264]);
	                return true;
	            }
	            switch (primIndex) {
	                case 256: //return self
	                    return true;
	                case 257: this.popNandPush(1, this.trueObj); //return true
	                    return true;
	                case 258: this.popNandPush(1, this.falseObj); //return false
	                    return true;
	                case 259: this.popNandPush(1, this.nilObj); //return nil
	                    return true;
	            }
	            this.popNandPush(1, primIndex - 261); //return -1...2
	            return true;
	        }
	        var sp = this.sp;
	        var context = this.activeContext;
	        var success = this.primHandler.doPrimitive(primIndex, argCount, newMethod);
	        if (success
	            && this.sp !== sp - argCount
	            && context === this.activeContext
	            && primIndex !== 117    // named prims are checked separately (see namedPrimitive)
	            && primIndex !== 118    // primitiveDoPrimitiveWithArgs (will call tryPrimitive again)
	            && primIndex !== 218    // primitiveDoNamedPrimitive (will call namedPrimitive)
	            && !this.frozen) {
	                this.warnOnce("stack unbalanced after primitive " + primIndex, "error");
	            }
	        return success;
	    },
	    createActualMessage: function(selector, argCount, cls) {
	        //Bundle up receiver, args and selector as a messageObject
	        var message = this.instantiateClass(this.specialObjects[Squeak.splOb_ClassMessage], 0);
	        var argArray = this.instantiateClass(this.specialObjects[Squeak.splOb_ClassArray], argCount);
	        this.arrayCopy(this.activeContext.pointers, this.sp-argCount+1, argArray.pointers, 0, argCount); //copy args from stack
	        message.pointers[Squeak.Message_selector] = selector;
	        message.pointers[Squeak.Message_arguments] = argArray;
	        if (message.pointers.length > Squeak.Message_lookupClass) //Early versions don't have lookupClass
	            message.pointers[Squeak.Message_lookupClass] = cls;
	        return message;
	    },
	    primitivePerform: function(argCount) {
	        var selector = this.stackValue(argCount-1);
	        var rcvr = this.stackValue(argCount);
	        var trueArgCount = argCount - 1;
	        var entry = this.findSelectorInClass(selector, trueArgCount, this.getClass(rcvr), argCount);
	        if (entry.selector === selector) {
	            // selector has been found, rearrange stack
	            if (entry.argCount !== trueArgCount)
	                return false;
	        var stack = this.activeContext.pointers; // slide eveything down...
	            var selectorIndex = this.sp - trueArgCount;
	        this.arrayCopy(stack, selectorIndex+1, stack, selectorIndex, trueArgCount);
	        this.sp--; // adjust sp accordingly
	        } else {
	            // stack has already been arranged for #doesNotUnderstand:/#cannotInterpret:
	            rcvr = this.stackValue(entry.argCount);
	        }
	        this.executeNewMethod(rcvr, entry.method, entry.argCount, entry.primIndex, entry.mClass, selector);
	        return true;
	    },
	    primitivePerformWithArgs: function(argCount, supered) {
	        var rcvrPos = supered ? 3 : 2;
	        var rcvr = this.stackValue(rcvrPos);
	        var selector = this.stackValue(rcvrPos - 1);
	        var args = this.stackValue(rcvrPos - 2);
	        if (args.sqClass !== this.specialObjects[Squeak.splOb_ClassArray])
	            return false;
	        var lookupClass = supered ? this.top() : this.getClass(rcvr);
	        if (supered) { // verify that lookupClass is in fact in superclass chain of receiver;
	            var cls = this.getClass(rcvr);
	            while (cls !== lookupClass) {
	                cls = cls.pointers[Squeak.Class_superclass];
	                if (cls.isNil) return false;
	            }
	        }
	        var trueArgCount = args.pointersSize();
	        var entry = this.findSelectorInClass(selector, trueArgCount, lookupClass, argCount);
	        if (entry.selector === selector) {
	            // selector has been found, rearrange stack
	            if (entry.argCount !== trueArgCount)
	                return false;
	        var stack = this.activeContext.pointers;
	            var selectorIndex = this.sp - (argCount - 1);
	            stack[selectorIndex - 1] = rcvr;
	        this.arrayCopy(args.pointers, 0, stack, selectorIndex, trueArgCount);
	            this.sp += trueArgCount - argCount; // pop old args then push new args
	        } else {
	            // stack has already been arranged for #doesNotUnderstand: or #cannotInterpret:
	            rcvr = this.stackValue(entry.argCount);
	        }
	        this.executeNewMethod(rcvr, entry.method, entry.argCount, entry.primIndex, entry.mClass, selector);
	        return true;
	    },
	    primitiveInvokeObjectAsMethod: function(argCount, method) {
	        // invoked from VM if non-method found in lookup
	        var orgArgs = this.instantiateClass(this.specialObjects[Squeak.splOb_ClassArray], argCount);
	        for (var i = 0; i < argCount; i++)
	            orgArgs.pointers[argCount - i - 1] = this.pop();
	        var orgReceiver = this.pop(),
	            orgSelector = this.currentSelector;
	        // send run:with:in: to non-method object
	        var runWithIn = this.specialObjects[Squeak.splOb_SelectorRunWithIn];
	        this.push(method);       // not actually a method
	        this.push(orgSelector);
	        this.push(orgArgs);
	        this.push(orgReceiver);
	        this.send(runWithIn, 3, false);
	        return true;
	    },
	    findMethodCacheEntry: function(selector, lkupClass) {
	        //Probe the cache, and return the matching entry if found
	        //Otherwise return one that can be used (selector and class set) with method == null.
	        //Initial probe is class xor selector, reprobe delta is selector
	        //We do not try to optimize probe time -- all are equally 'fast' compared to lookup
	        //Instead we randomize the reprobe so two or three very active conflicting entries
	        //will not keep dislodging each other
	        var entry;
	        this.methodCacheRandomish = (this.methodCacheRandomish + 1) & 3;
	        var firstProbe = (selector.hash ^ lkupClass.hash) & this.methodCacheMask;
	        var probe = firstProbe;
	        for (var i = 0; i < 4; i++) { // 4 reprobes for now
	            entry = this.methodCache[probe];
	            if (entry.selector === selector && entry.lkupClass === lkupClass) return entry;
	            if (i === this.methodCacheRandomish) firstProbe = probe;
	            probe = (probe + selector.hash) & this.methodCacheMask;
	        }
	        entry = this.methodCache[firstProbe];
	        entry.lkupClass = lkupClass;
	        entry.selector = selector;
	        entry.method = null;
	        return entry;
	    },
	    flushMethodCache: function() { //clear all cache entries (prim 89)
	        for (var i = 0; i < this.methodCacheSize; i++) {
	            this.methodCache[i].selector = null;   // mark it free
	            this.methodCache[i].method = null;  // release the method
	        }
	        return true;
	    },
	    flushMethodCacheForSelector: function(selector) { //clear cache entries for selector (prim 119)
	        for (var i = 0; i < this.methodCacheSize; i++)
	            if (this.methodCache[i].selector === selector) {
	                this.methodCache[i].selector = null;   // mark it free
	                this.methodCache[i].method = null;  // release the method
	            }
	        return true;
	    },
	    flushMethodCacheForMethod: function(method) { //clear cache entries for method (prim 116)
	        for (var i = 0; i < this.methodCacheSize; i++)
	            if (this.methodCache[i].method === method) {
	                this.methodCache[i].selector = null;   // mark it free
	                this.methodCache[i].method = null;  // release the method
	            }
	        return true;
	    },
	    flushMethodCacheAfterBecome: function(mutations) {
	        // could be selective by checking lkupClass, selector,
	        // and method against mutations dict
	        this.flushMethodCache();
	    },
	},
	'contexts', {
	    isUnwindMarked: function(ctx) {
	        if (!this.isMethodContext(ctx)) return false;
	        var method = ctx.pointers[Squeak.Context_method];
	        return method.methodPrimitiveIndex() == 198;
	    },
	    newActiveContext: function(newContext) {
	        // Note: this is inlined in executeNewMethod() and doReturn()
	        this.storeContextRegisters();
	        this.activeContext = newContext; //We're off and running...
	        this.activeContext.dirty = true;
	        this.fetchContextRegisters(newContext);
	        if (this.breakOnContextChanged) {
	            this.breakOnContextChanged = false;
	            this.breakNow();
	        }
	    },
	    exportThisContext: function() {
	        this.storeContextRegisters();
	        this.reclaimableContextCount = 0;
	        return this.activeContext;
	    },
	    fetchContextRegisters: function(ctxt) {
	        var meth = ctxt.pointers[Squeak.Context_method];
	        if (this.isSmallInt(meth)) { //if the Method field is an integer, activeCntx is a block context
	            this.homeContext = ctxt.pointers[Squeak.BlockContext_home];
	            meth = this.homeContext.pointers[Squeak.Context_method];
	        } else { //otherwise home==ctxt
	            this.homeContext = ctxt;
	        }
	        this.receiver = this.homeContext.pointers[Squeak.Context_receiver];
	        this.method = meth;
	        this.pc = this.decodeSqueakPC(ctxt.pointers[Squeak.Context_instructionPointer], meth);
	        this.sp = this.decodeSqueakSP(ctxt.pointers[Squeak.Context_stackPointer]);
	    },
	    storeContextRegisters: function() {
	        //Save pc, sp into activeContext object, prior to change of context
	        //   see fetchContextRegisters for symmetry
	        //   expects activeContext, pc, sp, and method state vars to still be valid
	        this.activeContext.pointers[Squeak.Context_instructionPointer] = this.encodeSqueakPC(this.pc, this.method);
	        this.activeContext.pointers[Squeak.Context_stackPointer] = this.encodeSqueakSP(this.sp);
	    },
	    encodeSqueakPC: function(intPC, method) {
	        // Squeak pc is offset by header and literals
	        // and 1 for z-rel addressing
	        return intPC + method.pointers.length * 4 + 1;
	    },
	    decodeSqueakPC: function(squeakPC, method) {
	        return squeakPC - method.pointers.length * 4 - 1;
	    },
	    encodeSqueakSP: function(intSP) {
	        // sp is offset by tempFrameStart, -1 for z-rel addressing
	        return intSP - (Squeak.Context_tempFrameStart - 1);
	    },
	    decodeSqueakSP: function(squeakSP) {
	        return squeakSP + (Squeak.Context_tempFrameStart - 1);
	    },
	    recycleIfPossible: function(ctxt) {
	        if (!this.isMethodContext(ctxt)) return;
	        if (ctxt.pointersSize() === (Squeak.Context_tempFrameStart+Squeak.Context_smallFrameSize)) {
	            // Recycle small contexts
	            ctxt.pointers[0] = this.freeContexts;
	            this.freeContexts = ctxt;
	        } else { // Recycle large contexts
	            if (ctxt.pointersSize() !== (Squeak.Context_tempFrameStart+Squeak.Context_largeFrameSize))
	                return;
	            ctxt.pointers[0] = this.freeLargeContexts;
	            this.freeLargeContexts = ctxt;
	        }
	    },
	    allocateOrRecycleContext: function(needsLarge) {
	        //Return a recycled context or a newly allocated one if none is available for recycling."
	        var freebie;
	        if (needsLarge) {
	            if (!this.freeLargeContexts.isNil) {
	                freebie = this.freeLargeContexts;
	                this.freeLargeContexts = freebie.pointers[0];
	                this.nRecycledContexts++;
	                return freebie;
	            }
	            this.nAllocatedContexts++;
	            return this.instantiateClass(this.specialObjects[Squeak.splOb_ClassMethodContext], Squeak.Context_largeFrameSize);
	        } else {
	            if (!this.freeContexts.isNil) {
	                freebie = this.freeContexts;
	                this.freeContexts = freebie.pointers[0];
	                this.nRecycledContexts++;
	                return freebie;
	            }
	            this.nAllocatedContexts++;
	            return this.instantiateClass(this.specialObjects[Squeak.splOb_ClassMethodContext], Squeak.Context_smallFrameSize);
	        }
	    },
	},
	'stack access', {
	    pop: function() {
	        //Note leaves garbage above SP.  Cleaned out by fullGC.
	        return this.activeContext.pointers[this.sp--];
	    },
	    popN: function(nToPop) {
	        this.sp -= nToPop;
	    },
	    push: function(object) {
	        this.activeContext.pointers[++this.sp] = object;
	    },
	    popNandPush: function(nToPop, object) {
	        this.activeContext.pointers[this.sp -= nToPop - 1] = object;
	    },
	    top: function() {
	        return this.activeContext.pointers[this.sp];
	    },
	    stackTopPut: function(object) {
	        this.activeContext.pointers[this.sp] = object;
	    },
	    stackValue: function(depthIntoStack) {
	        return this.activeContext.pointers[this.sp - depthIntoStack];
	    },
	    stackInteger: function(depthIntoStack) {
	        return this.checkSmallInt(this.stackValue(depthIntoStack));
	    },
	    stackIntOrFloat: function(depthIntoStack) {
	        var num = this.stackValue(depthIntoStack);
	        // is it a SmallInt?
	        if (typeof num === "number") return num;
	        if (num === undefined) {this.success = false; return 0;}
	        // is it a Float?
	        if (num.isFloat) {
	            this.resultIsFloat = true;   // need to return result as Float
	            return num.float;
	        }
	        // maybe a 32-bit LargeInt?
	        var bytes = num.bytes;
	        if (bytes && bytes.length == 4) {
	            var value = 0;
	            for (var i = 3; i >= 0; i--)
	                value = value * 256 + bytes[i];
	            if (num.sqClass === this.specialObjects[Squeak.splOb_ClassLargePositiveInteger])
	                return value;
	            if (num.sqClass === this.specialObjects[Squeak.splOb_ClassLargeNegativeInteger])
	                return -value;
	        }
	        // none of the above
	        this.success = false;
	        return 0;
	    },
	    pop2AndPushIntResult: function(intResult) {// returns success boolean
	        if (this.success && this.canBeSmallInt(intResult)) {
	            this.popNandPush(2, intResult);
	            return true;
	        }
	        return false;
	    },
	    pop2AndPushNumResult: function(numResult) {// returns success boolean
	        if (this.success) {
	            if (this.resultIsFloat) {
	                this.popNandPush(2, this.primHandler.makeFloat(numResult));
	                return true;
	            }
	            if (numResult >= Squeak.MinSmallInt && numResult <= Squeak.MaxSmallInt) {
	                this.popNandPush(2, numResult);
	                return true;
	            }
	            if (numResult >= -0xFFFFFFFF && numResult <= 0xFFFFFFFF) {
	                var negative = numResult < 0,
	                    unsigned = negative ? -numResult : numResult,
	                    lgIntClass = negative ? Squeak.splOb_ClassLargeNegativeInteger : Squeak.splOb_ClassLargePositiveInteger,
	                    lgIntObj = this.instantiateClass(this.specialObjects[lgIntClass], 4),
	                    bytes = lgIntObj.bytes;
	                bytes[0] = unsigned     & 255;
	                bytes[1] = unsigned>>8  & 255;
	                bytes[2] = unsigned>>16 & 255;
	                bytes[3] = unsigned>>24 & 255;
	                this.popNandPush(2, lgIntObj);
	                return true;
	            }
	        }
	        return false;
	    },
	    pop2AndPushBoolResult: function(boolResult) {
	        if (!this.success) return false;
	        this.popNandPush(2, boolResult ? this.trueObj : this.falseObj);
	        return true;
	    },
	},
	'numbers', {
	    getClass: function(obj) {
	        if (this.isSmallInt(obj))
	            return this.specialObjects[Squeak.splOb_ClassInteger];
	        return obj.sqClass;
	    },
	    canBeSmallInt: function(anInt) {
	        return (anInt >= Squeak.MinSmallInt) && (anInt <= Squeak.MaxSmallInt);
	    },
	    isSmallInt: function(object) {
	        return typeof object === "number";
	    },
	    checkSmallInt: function(maybeSmallInt) { // returns an int and sets success
	        if (typeof maybeSmallInt === "number")
	            return maybeSmallInt;
	        this.success = false;
	        return 1;
	    },
	    quickDivide: function(rcvr, arg) { // must only handle exact case
	        if (arg === 0) return Squeak.NonSmallInt;  // fail if divide by zero
	        var result = rcvr / arg | 0;
	        if (result * arg === rcvr) return result;
	        return Squeak.NonSmallInt;     // fail if result is not exact
	    },
	    div: function(rcvr, arg) {
	        if (arg === 0) return Squeak.NonSmallInt;  // fail if divide by zero
	        return Math.floor(rcvr/arg);
	    },
	    mod: function(rcvr, arg) {
	        if (arg === 0) return Squeak.NonSmallInt;  // fail if divide by zero
	        return rcvr - Math.floor(rcvr/arg) * arg;
	    },
	    safeShift: function(smallInt, shiftCount) {
	        // must only be used if smallInt is actually a SmallInt!
	        // the logic is complex because JS shifts only up to 31 bits
	        // and treats e.g. 1<<32 as 1<<0, so we have to do our own checks
	        if (shiftCount < 0) {
	            if (shiftCount < -31) return smallInt < 0 ? -1 : 0;
	            // this would wrongly return a negative result if
	            // smallInt >= 0x80000000, but the largest smallInt
	            // is 0x3FFFFFFF so we're ok
	            return smallInt >> -shiftCount; // OK to lose bits shifting right
	        }
	        if (shiftCount > 31) return smallInt === 0 ? 0 : Squeak.NonSmallInt;
	        var shifted = smallInt << shiftCount;
	        // check for lost bits by seeing if computation is reversible
	        if ((shifted>>shiftCount) !== smallInt) return Squeak.NonSmallInt; // fail
	        return shifted; // caller will check if still within SmallInt range
	    },
	},
	'utils',
	{
	    isContext: function(obj) {//either block or methodContext
	        if (obj.sqClass === this.specialObjects[Squeak.splOb_ClassMethodContext]) return true;
	        if (obj.sqClass === this.specialObjects[Squeak.splOb_ClassBlockContext]) return true;
	        return false;
	    },
	    isMethodContext: function(obj) {
	        return obj.sqClass === this.specialObjects[Squeak.splOb_ClassMethodContext];
	    },
	    instantiateClass: function(aClass, indexableSize) {
	        return this.image.instantiateClass(aClass, indexableSize, this.nilObj);
	    },
	    arrayFill: function(array, fromIndex, toIndex, value) {
	        // assign value to range from fromIndex (inclusive) to toIndex (exclusive)
	        for (var i = fromIndex; i < toIndex; i++)
	            array[i] = value;
	    },
	    arrayCopy: function(src, srcPos, dest, destPos, length) {
	        // copy length elements from src at srcPos to dest at destPos
	        if (src === dest && srcPos < destPos)
	            for (var i = length - 1; i >= 0; i--)
	                dest[destPos + i] = src[srcPos + i];
	        else
	            for (var i = 0; i < length; i++)
	                dest[destPos + i] = src[srcPos + i];
	    },
	    signalLowSpaceIfNecessary: function(bytesLeft) {
	        if (bytesLeft < this.lowSpaceThreshold && this.lowSpaceThreshold > 0) {
	            var increase = prompt && prompt("Out of memory, " + Math.ceil(this.image.totalMemory/1000000)
	                + " MB used.\nEnter additional MB, or 0 to signal low space in image", "0");
	            if (increase) {
	                var bytes = parseInt(increase, 10) * 1000000;
	                this.image.totalMemory += bytes;
	                this.signalLowSpaceIfNecessary(this.image.bytesLeft());
	            } else {
	                console.warn("squeak: low memory (" + bytesLeft + "/" + this.image.totalMemory + " bytes left), signaling low space");
	                this.signalLowSpace = true;
	                this.lowSpaceThreshold = 0;
	                var lastSavedProcess = this.specialObjects[Squeak.splOb_ProcessSignalingLowSpace];
	                if (lastSavedProcess.isNil) {
	                    this.specialObjects[Squeak.splOb_ProcessSignalingLowSpace] = this.primHandler.activeProcess();
	                }
	                this.forceInterruptCheck();
	            }
	        }
	   },
	},
	'debugging', {
	    addMessage: function(message) {
	        return this.messages[message] ? ++this.messages[message] : this.messages[message] = 1;
	    },
	    warnOnce: function(message, what) {
	        if (this.addMessage(message) == 1) {
	            console[what || "warn"](message);
	            return true;
	        }
	    },
	    printMethod: function(aMethod, optContext, optSel, optArgs) {
	        // return a 'class>>selector' description for the method
	        if (aMethod.sqClass != this.specialObjects[Squeak.splOb_ClassCompiledMethod]) {
	          return this.printMethod(aMethod.blockOuterCode(), optContext, optSel, optArgs)
	        }
	        var found;
	        if (optSel) {
	            var printed = optContext.className() + '>>';
	            var selector = optSel.bytesAsString();
	            if (!optArgs || !optArgs.length) printed += selector;
	            else {
	                // var parts = selector.split(/(?<=:)/); // keywords
	                // ES: Changed, because original code is incompatible with JS on earlier iOS versions (lookbehind assertion not supported)
	                var parts = selector.replace(/(:[a-zA-Z])/g, ": $1").split(" :"); // keywords
	                for (var i = 0; i < optArgs.length; i++) {
	                    if (i > 0) printed += ' ';
	                    printed += parts[i] + ' ' + optArgs[i];
	                }
	            }
	            return printed;
	        }
	        // this is expensive, we have to search all classes
	        if (!aMethod) aMethod = this.activeContext.contextMethod();
	        this.allMethodsDo(function(classObj, methodObj, selectorObj) {
	            if (methodObj === aMethod)
	                return found = classObj.className() + '>>' + selectorObj.bytesAsString();
	        });
	        if (found) return found;
	        if (optContext) {
	            var rcvr = optContext.pointers[Squeak.Context_receiver];
	            return "(" + rcvr + ")>>?";
	        }
	        return "?>>?";
	    },
	    allInstancesOf: function(classObj, callback) {
	        if (typeof classObj === "string") classObj = this.globalNamed(classObj);
	        var instances = [],
	            inst = this.image.someInstanceOf(classObj);
	        while (inst) {
	            if (callback) callback(inst);
	            else instances.push(inst);
	            inst = this.image.nextInstanceAfter(inst);
	        }
	        return instances;
	    },
	    globalNamed: function(name) {
	        return this.allGlobalsDo(function(nameObj, globalObj){
	            if (nameObj.bytesAsString() === name) return globalObj;
	        });
	    },
	    allGlobalsDo: function(callback) {
	        // callback(globalNameObj, globalObj), truish result breaks out of iteration
	        var globals = this.getGlobals();
	        for (var i = 0; i < globals.length; i++) {
	            var assn = globals[i];
	            if (!assn.isNil) {
	                var result = callback(assn.pointers[0], assn.pointers[1]);
	                if (result) return result;
	            }
	        }
	    },
	    allMethodsDo: function(callback) {
	        // callback(classObj, methodObj, selectorObj), truish result breaks out of iteration
	        this.allGlobalsDo(function(globalNameObj, globalObj) {
	            if (globalObj.pointers && globalObj.pointers.length >= 9) {
	                var clsAndMeta = [globalObj, globalObj.sqClass];
	                for (var c = 0; c < clsAndMeta.length; c++) {
	                    var cls = clsAndMeta[c];
	                    var mdict = cls.pointers[1];
	                    if (!mdict.pointers || !mdict.pointers[1]) continue;
	                    var methods = mdict.pointers[1].pointers;
	                    if (!methods) continue;
	                    var selectors = mdict.pointers;
	                    if (methods.length + 2 !== selectors.length) continue;
	                    for (var j = 0; j < methods.length; j++) {
	                        var method = methods[j];
	                        var selector = selectors[2+j];
	                        if (!method.isMethod || !method.isMethod()) continue;
	                        if (!selector.bytesSize || !selector.bytesSize()) continue;
	                        var result = callback.call(null, cls, method, selector);
	                        if (result) return true;
	                    }
	                }
	            }
	        });
	    },
	    printStack: function(ctx, limit, indent) {
	        // both args are optional
	        if (typeof ctx == "number") {limit = ctx; ctx = null;}
	        if (!ctx) ctx = this.activeContext;
	        if (!limit) limit = 100;
	        var contexts = [],
	            hardLimit = Math.max(limit, 1000000);
	        while (!ctx.isNil && hardLimit-- > 0) {
	            contexts.push(ctx);
	            ctx = ctx.pointers[Squeak.Context_sender];
	        }
	        var extra = 200;
	        if (contexts.length > limit + extra) {
	            if (!ctx.isNil) contexts.push('...'); // over hard limit
	            contexts = contexts.slice(0, limit).concat(['...']).concat(contexts.slice(-extra));
	        }
	        var stack = [],
	            i = contexts.length,
	            indents = '';
	        if (indent && this.logSends) indents = Array((""+this.sendCount).length + 2).join(' ');
	        while (i-- > 0) {
	            var ctx = contexts[i];
	            if (!ctx.pointers) {
	                stack.push('...\n');
	            } else {
	                var block = '',
	                    method = ctx.pointers[Squeak.Context_method];
	                if (typeof method === 'number') { // it's a block context, fetch home
	                    method = ctx.pointers[Squeak.BlockContext_home].pointers[Squeak.Context_method];
	                    block = '[] in ';
	                } else if (!ctx.pointers[Squeak.Context_closure].isNil) {
	                    block = '[] in '; // it's a closure activation
	                }
	                var line = block + this.printMethod(method, ctx);
	                if (indent) line = indents + line;
	                stack.push(line + '\n');
	                if (indent) indents += indent;
	            }
	        }
	        return stack.join('');
	    },
	    findMethod: function(classAndMethodString) {
	        // classAndMethodString is 'Class>>method'
	        var found,
	            className = classAndMethodString.split('>>')[0],
	            methodName = classAndMethodString.split('>>')[1];
	        this.allMethodsDo(function(classObj, methodObj, selectorObj) {
	            if (methodName.length == selectorObj.bytesSize()
	                && methodName == selectorObj.bytesAsString()
	                && className == classObj.className())
	                    return found = methodObj;
	        });
	        return found;
	    },
	    breakAfter: function(ms) {
	        this.breakOutTick = this.primHandler.millisecondClockValue() + ms;
	    },
	    breakNow: function(msg) {
	        if (msg) console.log("Break: " + msg);
	        this.breakOutOfInterpreter = 'break';
	    },
	    breakOn: function(classAndMethodString) {
	        // classAndMethodString is 'Class>>method'
	        return this.breakOnMethod = classAndMethodString && this.findMethod(classAndMethodString);
	    },
	    breakOnReturnFromThisContext: function() {
	        this.breakOnContextChanged = false;
	        this.breakOnContextReturned = this.activeContext;
	    },
	    breakOnSendOrReturn: function() {
	        this.breakOnContextChanged = true;
	        this.breakOnContextReturned = null;
	    },
	    printContext: function(ctx, maxWidth) {
	        if (!this.isContext(ctx)) return "NOT A CONTEXT: " + printObj(ctx);
	        if (!maxWidth) maxWidth = 72;
	        function printObj(obj) {
	            var value = typeof obj === 'number' || typeof obj === 'object' ? obj.sqInstName() : "<" + obj + ">";
	            value = JSON.stringify(value).slice(1, -1);
	            if (value.length > maxWidth - 3) value = value.slice(0, maxWidth - 3) + '...';
	            return value;
	        }
	        // temps and stack in current context
	        var isBlock = typeof ctx.pointers[Squeak.BlockContext_argumentCount] === 'number';
	        var closure = ctx.pointers[Squeak.Context_closure];
	        var isClosure = !isBlock && !closure.isNil;
	        var homeCtx = isBlock ? ctx.pointers[Squeak.BlockContext_home] : ctx;
	        var tempCount = isClosure
	            ? closure.pointers[Squeak.Closure_numArgs]
	            : homeCtx.pointers[Squeak.Context_method].methodTempCount();
	        var stackBottom = this.decodeSqueakSP(0);
	        var stackTop = homeCtx.contextSizeWithStack(this) - 1;
	        var firstTemp = stackBottom + 1;
	        var lastTemp = firstTemp + tempCount - 1;
	        var lastArg = firstTemp + homeCtx.pointers[Squeak.Context_method].methodNumArgs() - 1;
	        var stack = '';
	        for (var i = stackBottom; i <= stackTop; i++) {
	            var value = printObj(homeCtx.pointers[i]);
	            var label = '';
	            if (i === stackBottom) {
	                label = '=rcvr';
	            } else {
	                if (i <= lastTemp) label = '=tmp' + (i - firstTemp);
	                if (i <= lastArg) label += '/arg' + (i - firstTemp);
	            }
	            stack += '\nctx[' + i + ']' + label +': ' + value;
	        }
	        if (isBlock) {
	            stack += '\n';
	            var nArgs = ctx.pointers[Squeak.BlockContext_argumentCount];
	            var firstArg = this.decodeSqueakSP(1);
	            var lastArg = firstArg + nArgs;
	            var sp = ctx === this.activeContext ? this.sp : ctx.pointers[Squeak.Context_stackPointer];
	            if (sp < firstArg) stack += '\nblk <stack empty>';
	            for (var i = firstArg; i <= sp; i++) {
	                var value = printObj(ctx.pointers[i]);
	                var label = '';
	                if (i < lastArg) label = '=arg' + (i - firstArg);
	                stack += '\nblk[' + i + ']' + label +': ' + value;
	            }
	        }
	        return stack;
	    },
	    printActiveContext: function(maxWidth) {
	        return this.printContext(this.activeContext, maxWidth);
	    },
	    printAllProcesses: function() {
	        var schedAssn = this.specialObjects[Squeak.splOb_SchedulerAssociation],
	            sched = schedAssn.pointers[Squeak.Assn_value];
	        // print active process
	        var activeProc = sched.pointers[Squeak.ProcSched_activeProcess],
	            result = "Active: " + this.printProcess(activeProc, true);
	        // print other runnable processes in order of priority
	        var lists = sched.pointers[Squeak.ProcSched_processLists].pointers;
	        for (var priority = lists.length - 1; priority >= 0; priority--) {
	            var process = lists[priority].pointers[Squeak.LinkedList_firstLink];
	            while (!process.isNil) {
	                result += "\n------------------------------------------";
	                result += "\nRunnable: " + this.printProcess(process);
	                process = process.pointers[Squeak.Link_nextLink];
	            }
	        }
	        // print all processes waiting on a semaphore in order of priority
	        var semaClass = this.specialObjects[Squeak.splOb_ClassSemaphore],
	            sema = this.image.someInstanceOf(semaClass),
	            waiting = [];
	        while (sema) {
	            var process = sema.pointers[Squeak.LinkedList_firstLink];
	            while (!process.isNil) {
	                waiting.push(process);
	                process = process.pointers[Squeak.Link_nextLink];
	            }
	            sema = this.image.nextInstanceAfter(sema);
	        }
	        waiting.sort(function(a, b){
	            return b.pointers[Squeak.Proc_priority] - a.pointers[Squeak.Proc_priority];
	        });
	        for (var i = 0; i < waiting.length; i++) {
	            result += "\n------------------------------------------";
	            result += "\nWaiting: " + this.printProcess(waiting[i]);
	        }
	        return result;
	    },
	    printProcess: function(process, active, indent) {
	        if (!process) {
	            var schedAssn = this.specialObjects[Squeak.splOb_SchedulerAssociation],
	            sched = schedAssn.pointers[Squeak.Assn_value];
	            process = sched.pointers[Squeak.ProcSched_activeProcess],
	            active = true;
	        }
	        var context = active ? this.activeContext : process.pointers[Squeak.Proc_suspendedContext],
	            priority = process.pointers[Squeak.Proc_priority],
	            stack = this.printStack(context, 20, indent),
	            values = indent && this.logSends ? "" : this.printContext(context) + "\n";
	        return process.toString() +" at priority " + priority + "\n" + stack + values;
	    },
	    printByteCodes: function(aMethod, optionalIndent, optionalHighlight, optionalPC) {
	        if (!aMethod) aMethod = this.method;
	        var printer = new Squeak.InstructionPrinter(aMethod, this);
	        return printer.printInstructions(optionalIndent, optionalHighlight, optionalPC);
	    },
	    logStack: function() {
	        // useful for debugging interactively:
	        // SqueakJS.vm.logStack()
	        console.log(this.printStack()
	            + this.printActiveContext() + '\n\n'
	            + this.printByteCodes(this.method, '   ', '=> ', this.pc),
	            this.activeContext.pointers.slice(0, this.sp + 1));
	    },
	    willSendOrReturn: function() {
	        // Answer whether the next bytecode corresponds to a Smalltalk
	        // message send or return
	        var byte = this.method.bytes[this.pc];
	        if (this.method.methodSignFlag()) {
	          if (0x60 <= byte && byte <= 0x7F) {
	            selectorObj = this.specialSelectors[2 * (byte - 0x60)];
	          } else if (0x80 <= byte && byte <= 0xAF) {
	            selectorObj = this.method.methodGetSelector(byte&0xF);
	          } else if (byte == 0xEA || byte == 0xEB) {
	            this.method.methodGetSelector((this.method.bytes[this.pc+1] >> 3)); // (extA << 5)
	          } else if (0x58 <= byte && byte <= 0x5E) {
	            return true; // return
	          }
	        } else {
	          if (byte >= 120 && byte <= 125) return true; // return
	          if (byte < 131 || byte == 200) return false;
	          if (byte >= 176) return true; // special send or short send
	          if (byte <= 134) {         // long sends
	            // long form support demands we check the selector
	            var litIndex;
	            if (byte === 132) {
	              if ((this.method.bytes[this.pc + 1] >> 5) > 1) return false;
	              litIndex = this.method.bytes[this.pc + 2];
	            } else
	              litIndex = this.method.bytes[this.pc + 1] & (byte === 134 ? 63 : 31);
	            var selectorObj = this.method.methodGetLiteral(litIndex);
	            if (selectorObj.bytesAsString() !== 'blockCopy:') return true;
	          }
	        }
	        return false;
	    },
	    nextSendSelector: function() {
	        // if the next bytecode corresponds to a Smalltalk
	        // message send, answer the selector
	        var byte = this.method.bytes[this.pc];
	        var selectorObj;
	        if (this.method.methodSignFlag()) {
	          if (0x60 <= byte && byte <= 0x7F) {
	            selectorObj = this.specialSelectors[2 * (byte - 0x60)];
	          } else if (0x80 <= byte && byte <= 0xAF) {
	            selectorObj = this.method.methodGetSelector(byte&0xF);
	          } else if (byte == 0xEA || byte == 0xEB) {
	            this.method.methodGetSelector((this.method.bytes[this.pc+1] >> 3)); // (extA << 5)
	          } else {
	            return null;
	          }
	        } else {
	          if (byte < 131 || byte == 200) return null;
	          if (byte >= 0xD0 ) {
	            selectorObj = this.method.methodGetLiteral(byte & 0x0F);
	          } else if (byte >= 0xB0 ) {
	            selectorObj = this.specialSelectors[2 * (byte - 0xB0)];
	          } else if (byte <= 134) {
	            // long form support demands we check the selector
	            var litIndex;
	            if (byte === 132) {
	                if ((this.method.bytes[this.pc + 1] >> 5) > 1) return null;
	                litIndex = this.method.bytes[this.pc + 2];
	            } else
	                litIndex = this.method.bytes[this.pc + 1] & (byte === 134 ? 63 : 31);
	            selectorObj = this.method.methodGetLiteral(litIndex);
	          }
	        }
	        if (selectorObj) {
	          var selector = selectorObj.bytesAsString();
	          if (selector !== 'blockCopy:') return selector;
	        }
	    },
	});
	return vm_interpreter;
}

var vm_interpreter_proxy = {};

var hasRequiredVm_interpreter_proxy;

function requireVm_interpreter_proxy () {
	if (hasRequiredVm_interpreter_proxy) return vm_interpreter_proxy;
	hasRequiredVm_interpreter_proxy = 1;
	/*
	 * Copyright (c) 2013-2024 Vanessa Freudenberg
	 *
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:
	 *
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 *
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 */

	Object.subclass('Squeak.InterpreterProxy',
	// provides function names exactly like the C interpreter, for ease of porting
	// but maybe less efficiently because of the indirection
	// mostly used for plugins translated from Slang (see plugins/*.js)
	// built-in primitives use the interpreter directly
	'initialization', {
	    VM_PROXY_MAJOR: 1,
	    VM_PROXY_MINOR: 11,
	    initialize: function(vm) {
	        this.vm = vm;
	        this.remappableOops = [];
	        Object.defineProperty(this, 'successFlag', {
	          get: function() { return vm.primHandler.success; },
	          set: function(success) { vm.primHandler.success = success; },
	        });
	    },
	    majorVersion: function() {
	        return this.VM_PROXY_MAJOR;
	    },
	    minorVersion: function() {
	        return this.VM_PROXY_MINOR;
	    },
	},
	'success',
	{
	    failed: function() {
	        return !this.successFlag;
	    },
	    primitiveFail: function() {
	        this.successFlag = false;
	    },
	    primitiveFailFor: function(reasonCode) {
	        this.successFlag = false;
	    },
	    success: function(boolean) {
	        if (!boolean) this.successFlag = false;
	    },
	},
	'stack access',
	{
	    pop: function(n) {
	        this.vm.popN(n);
	    },
	    popthenPush: function(n, obj) {
	        this.vm.popNandPush(n, obj);
	    },
	    push: function(obj) {
	        this.vm.push(obj);
	    },
	    pushBool: function(bool) {
	        this.vm.push(bool ? this.vm.trueObj : this.vm.falseObj);
	    },
	    pushInteger: function(int) {
	        this.vm.push(int);
	    },
	    pushFloat: function(num) {
	        this.vm.push(this.floatObjectOf(num));
	    },
	    stackValue: function(n) {
	        return this.vm.stackValue(n);
	    },
	    stackIntegerValue: function(n) {
	        var int = this.vm.stackValue(n);
	        if (typeof int === "number") return int;
	        this.successFlag = false;
	        return 0;
	    },
	    stackFloatValue: function(n) {
	        this.vm.success = true;
	        var float = this.vm.stackIntOrFloat(n);
	        if (this.vm.success) return float;
	        this.successFlag = false;
	        return 0;
	    },
	    stackObjectValue: function(n) {
	        var obj = this.vm.stackValue(n);
	        if (typeof obj !== "number") return obj;
	        this.successFlag = false;
	        return this.vm.nilObj;
	    },
	    stackBytes: function(n) {
	        var oop = this.vm.stackValue(n);
	        if (oop.bytes) return oop.bytes;
	        if (typeof oop === "number" || !oop.isBytes()) this.successFlag = false;
	        return [];
	    },
	    stackWords: function(n) {
	        var oop = this.vm.stackValue(n);
	        if (oop.words) return oop.words;
	        if (typeof oop === "number" || !oop.isWords()) this.successFlag = false;
	        return [];
	    },
	    stackInt32Array: function(n) {
	        var oop = this.vm.stackValue(n);
	        if (oop.words) return oop.wordsAsInt32Array();
	        if (typeof oop === "number" || !oop.isWords()) this.successFlag = false;
	        return [];
	    },
	    stackInt16Array: function(n) {
	        var oop = this.vm.stackValue(n);
	        if (oop.words) return oop.wordsAsInt16Array();
	        if (typeof oop === "number" || !oop.isWords()) this.successFlag = false;
	        return [];
	    },
	    stackUint16Array: function(n) {
	        var oop = this.vm.stackValue(n);
	        if (oop.words) return oop.wordsAsUint16Array();
	        if (typeof oop === "number" || !oop.isWords()) this.successFlag = false;
	        return [];
	    },
	},
	'object access',
	{
	    isBytes: function(obj) {
	        return typeof obj !== "number" && obj.isBytes();
	    },
	    isWords: function(obj) {
	        return typeof obj !== "number" && obj.isWords();
	    },
	    isWordsOrBytes: function(obj) {
	        return typeof obj !== "number" && obj.isWordsOrBytes();
	    },
	    isPointers: function(obj) {
	        return typeof obj !== "number" && obj.isPointers();
	    },
	    isIntegerValue: function(obj) {
	        return typeof obj === "number" && obj >= -0x40000000 && obj <= 0x3FFFFFFF;
	    },
	    isArray: function(obj) {
	        return obj.sqClass === this.vm.specialObjects[Squeak.splOb_ClassArray];
	    },
	    isMemberOf: function(obj, className) {
	        var nameBytes = obj.sqClass.pointers[Squeak.Class_name].bytes;
	        if (className.length !== nameBytes.length) return false;
	        for (var i = 0; i < className.length; i++)
	            if (className.charCodeAt(i) !== nameBytes[i]) return false;
	        return true;
	    },
	    booleanValueOf: function(obj) {
	        if (obj.isTrue) return true;
	        if (obj.isFalse) return false;
	        this.successFlag = false;
	        return false;
	    },
	    positive32BitValueOf: function(obj) {
	        return this.vm.primHandler.positive32BitValueOf(obj);
	    },
	    positive32BitIntegerFor: function(int) {
	        return this.vm.primHandler.pos32BitIntFor(int);
	    },
	    floatValueOf: function(obj) {
	        if (obj.isFloat) return obj.float;
	        this.successFlag = false;
	        return 0;
	    },
	    floatObjectOf: function(num) {
	        return this.vm.primHandler.makeFloat(num);
	    },
	    fetchPointerofObject: function(n, obj) {
	        return obj.pointers[n];
	    },
	    fetchBytesofObject: function(n, obj) {
	        var oop = obj.pointers[n];
	        if (oop.bytes) return oop.bytes;
	        if (oop.words) return oop.wordsAsUint8Array();
	        if (typeof oop === "number" || !oop.isWordsOrBytes()) this.successFlag = false;
	        return [];
	    },
	    fetchWordsofObject: function(n, obj) {
	        var oop = obj.pointers[n];
	        if (oop.words) return oop.words;
	        if (typeof oop === "number" || !oop.isWords()) this.successFlag = false;
	        return [];
	    },
	    fetchInt32ArrayofObject: function(n, obj) {
	        var oop = obj.pointers[n];
	        if (oop.words) return oop.wordsAsInt32Array();
	        if (typeof oop === "number" || !oop.isWords()) this.successFlag = false;
	        return [];
	    },
	    fetchInt16ArrayofObject: function(n, obj) {
	        var oop = obj.pointers[n];
	        if (oop.words) return oop.wordsAsInt16Array();
	        if (typeof oop === "number" || !oop.isWords()) this.successFlag = false;
	        return [];
	    },
	    fetchUint16ArrayofObject: function(n, obj) {
	        var oop = obj.pointers[n];
	        if (oop.words) return oop.wordsAsUint16Array();
	        if (typeof oop === "number" || !oop.isWords()) this.successFlag = false;
	        return [];
	    },
	    fetchIntegerofObject: function(n, obj) {
	        var int = obj.pointers[n];
	        if (typeof int === "number") return int;
	        this.successFlag = false;
	        return 0;
	    },
	    fetchLong32ofObject: function(n, obj) {
	        return obj.words[n];
	    },
	    fetchFloatofObject: function(n, obj) {
	        return this.floatValueOf(obj.pointers[n]);
	    },
	    storeIntegerofObjectwithValue: function(n, obj, value) {
	        if (typeof value === "number")
	            obj.pointers[n] = value;
	        else this.successFlag = false;
	    },
	    storePointerofObjectwithValue: function(n, obj, value) {
	        obj.pointers[n] = value;
	    },
	    stObjectatput: function(array, index, obj) {
	        if (array.sqClass !== this.classArray()) throw Error("Array expected");
	        if (index < 1 || index > array.pointers.length) return this.successFlag = false;
	        array.pointers[index-1] = obj;
	    },
	},
	'constant access',
	{
	    isKindOfInteger: function(obj) {
	        return typeof obj === "number" ||
	            obj.sqClass == this.classLargeNegativeInteger() ||
	            obj.sqClass == this.classLargePositiveInteger();
	    },
	    classArray: function() {
	        return this.vm.specialObjects[Squeak.splOb_ClassArray];
	    },
	    classBitmap: function() {
	        return this.vm.specialObjects[Squeak.splOb_ClassBitmap];
	    },
	    classSmallInteger: function() {
	        return this.vm.specialObjects[Squeak.splOb_ClassInteger];
	    },
	    classLargePositiveInteger: function() {
	        return this.vm.specialObjects[Squeak.splOb_ClassLargePositiveInteger];
	    },
	    classLargeNegativeInteger: function() {
	        return this.vm.specialObjects[Squeak.splOb_ClassLargeNegativeInteger];
	    },
	    classPoint: function() {
	        return this.vm.specialObjects[Squeak.splOb_ClassPoint];
	    },
	    classString: function() {
	        return this.vm.specialObjects[Squeak.splOb_ClassString];
	    },
	    classByteArray: function() {
	        return this.vm.specialObjects[Squeak.splOb_ClassByteArray];
	    },
	    nilObject: function() {
	        return this.vm.nilObj;
	    },
	    falseObject: function() {
	        return this.vm.falseObj;
	    },
	    trueObject: function() {
	        return this.vm.trueObj;
	    },
	},
	'vm functions',
	{
	    clone: function(object) {
	        return this.vm.image.clone(object);
	    },
	    instantiateClassindexableSize: function(aClass, indexableSize) {
	        return this.vm.instantiateClass(aClass, indexableSize);
	    },
	    methodArgumentCount: function() {
	        return this.argCount;
	    },
	    makePointwithxValueyValue: function(x, y) {
	        return this.vm.primHandler.makePointWithXandY(x, y);
	    },
	    pushRemappableOop: function(obj) {
	        this.remappableOops.push(obj);
	    },
	    popRemappableOop: function() {
	        return this.remappableOops.pop();
	    },
	    showDisplayBitsLeftTopRightBottom: function(form, left, top, right, bottom) {
	        if (left < right && top < bottom) {
	            var rect = {left: left, top: top, right: right, bottom: bottom};
	            this.vm.primHandler.displayDirty(form, rect);
	        }
	    },
	    ioLoadFunctionFrom: function(funcName, pluginName) {
	        return this.vm.primHandler.loadFunctionFrom(funcName, pluginName);
	    },
	});
	return vm_interpreter_proxy;
}

var vm_instruction_stream = {};

var hasRequiredVm_instruction_stream;

function requireVm_instruction_stream () {
	if (hasRequiredVm_instruction_stream) return vm_instruction_stream;
	hasRequiredVm_instruction_stream = 1;
	/*
	 * Copyright (c) 2013-2024 Vanessa Freudenberg
	 *
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:
	 *
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 *
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 */

	Object.subclass('Squeak.InstructionStream',
	'initialization', {
	    initialize: function(method, vm) {
	        this.vm = vm;
	        this.method = method;
	        this.pc = 0;
	        this.specialConstants = [vm.trueObj, vm.falseObj, vm.nilObj, -1, 0, 1, 2];
	    },
	},
	'decoding', {
	    interpretNextInstructionFor: function(client) {
	        // Send to the argument, client, a message that specifies the type of the next instruction.
	        var method = this.method;
	        var byte = method.bytes[this.pc++];
	        var type = (byte / 16) | 0;
	        var offset = byte % 16;
	        if (type === 0) return client.pushReceiverVariable(offset);
	        if (type === 1) return client.pushTemporaryVariable(offset);
	        if (type === 2) return client.pushConstant(method.methodGetLiteral(offset));
	        if (type === 3) return client.pushConstant(method.methodGetLiteral(offset + 16));
	        if (type === 4) return client.pushLiteralVariable(method.methodGetLiteral(offset));
	        if (type === 5) return client.pushLiteralVariable(method.methodGetLiteral(offset + 16));
	        if (type === 6)
	            if (offset<8) return client.popIntoReceiverVariable(offset)
	            else return client.popIntoTemporaryVariable(offset-8);
	        if (type === 7) {
	            if (offset===0) return client.pushReceiver()
	            if (offset < 8) return client.pushConstant(this.specialConstants[offset - 1])
	            if (offset===8) return client.methodReturnReceiver();
	            if (offset < 12) return client.methodReturnConstant(this.specialConstants[offset - 9]);
	            if (offset===12) return client.methodReturnTop();
	            if (offset===13) return client.blockReturnTop();
	            if (offset > 13) throw Error("unusedBytecode");
	        }
	        if (type === 8) return this.interpretExtension(offset, method, client);
	        if (type === 9) // short jumps
	                if (offset<8) return client.jump(offset+1);
	                else return client.jumpIf(false, offset-8+1);
	        if (type === 10) {// long jumps
	            byte = this.method.bytes[this.pc++];
	            if (offset<8) return client.jump((offset-4)*256 + byte);
	            else return client.jumpIf(offset<12, (offset & 3)*256 + byte);
	        }
	        if (type === 11)
	            return client.send(this.vm.specialSelectors[2 * offset],
	                this.vm.specialSelectors[2 * offset + 1],
	                false);
	        if (type === 12)
	            return client.send(this.vm.specialSelectors[2 * (offset + 16)],
	                this.vm.specialSelectors[2 * (offset + 16) + 1],
	                false);
	        if (type > 12)
	            return client.send(method.methodGetLiteral(offset), type-13, false);
	    },
	    interpretExtension: function(offset, method, client) {
	        if (offset <= 6) { // Extended op codes 128-134
	            var byte2 = this.method.bytes[this.pc++];
	            if (offset <= 2) { // 128-130:  extended pushes and pops
	                var type = byte2 / 64 | 0;
	                var offset2 = byte2 % 64;
	                if (offset === 0) {
	                    if (type === 0) return client.pushReceiverVariable(offset2);
	                    if (type === 1) return client.pushTemporaryVariable(offset2);
	                    if (type === 2) return client.pushConstant(this.method.methodGetLiteral(offset2));
	                    if (type === 3) return client.pushLiteralVariable(this.method.methodGetLiteral(offset2));
	                }
	                if (offset === 1) {
	                    if (type === 0) return client.storeIntoReceiverVariable(offset2);
	                    if (type === 1) return client.storeIntoTemporaryVariable(offset2);
	                    if (type === 2) throw Error("illegalStore");
	                    if (type === 3) return client.storeIntoLiteralVariable(this.method.methodGetLiteral(offset2));
	                }
	                if (offset === 2) {
	                    if (type === 0) return client.popIntoReceiverVariable(offset2);
	                    if (type === 1) return client.popIntoTemporaryVariable(offset2);
	                    if (type === 2) throw Error("illegalStore");
	                    if (type === 3) return client.popIntoLiteralVariable(this.method.methodGetLiteral(offset2));
	                }
	            }
	            // 131-134 (extended sends)
	            if (offset === 3) // Single extended send
	                return client.send(this.method.methodGetLiteral(byte2 % 32), byte2 / 32 | 0, false);
	            if (offset === 4) { // Double extended do-anything
	                var byte3 = this.method.bytes[this.pc++];
	                var type = byte2 / 32 | 0;
	                if (type === 0) return client.send(this.method.methodGetLiteral(byte3), byte2 % 32, false);
	                if (type === 1) return client.send(this.method.methodGetLiteral(byte3), byte2 % 32, true);
	                if (type === 2) return client.pushReceiverVariable(byte3);
	                if (type === 3) return client.pushConstant(this.method.methodGetLiteral(byte3));
	                if (type === 4) return client.pushLiteralVariable(this.method.methodGetLiteral(byte3));
	                if (type === 5) return client.storeIntoReceiverVariable(byte3);
	                if (type === 6) return client.popIntoReceiverVariable(byte3);
	                if (type === 7) return client.storeIntoLiteralVariable(this.method.methodGetLiteral(byte3));
	            }
	            if (offset === 5) // Single extended send to super
	                return client.send(this.method.methodGetLiteral(byte2 & 31), byte2 >> 5, true);
	            if (offset === 6) // Second extended send
	                return client.send(this.method.methodGetLiteral(byte2 & 63), byte2 >> 6, false);
	        }
	        if (offset === 7) return client.doPop();
	        if (offset === 8) return client.doDup();
	        if (offset === 9) return client.pushActiveContext();
	        // closures
	        var byte2 = this.method.bytes[this.pc++];
	        if (offset === 10)
	            return byte2 < 128 ? client.pushNewArray(byte2) : client.popIntoNewArray(byte2 - 128);
	        var byte3 = this.method.bytes[this.pc++];
	        if (offset === 11) return client.callPrimitive(byte2 + 256 * byte3);
	        if (offset === 12) return client.pushRemoteTemp(byte2, byte3);
	        if (offset === 13) return client.storeIntoRemoteTemp(byte2, byte3);
	        if (offset === 14) return client.popIntoRemoteTemp(byte2, byte3);
	        // offset === 15
	        var byte4 = this.method.bytes[this.pc++];
	        return client.pushClosureCopy(byte2 >> 4, byte2 & 0xF, (byte3 * 256) + byte4);
	    }
	});
	return vm_instruction_stream;
}

var vm_instruction_stream_sista = {};

var hasRequiredVm_instruction_stream_sista;

function requireVm_instruction_stream_sista () {
	if (hasRequiredVm_instruction_stream_sista) return vm_instruction_stream_sista;
	hasRequiredVm_instruction_stream_sista = 1;
	/*
	 * Copyright (c) 2013-2024 Vanessa Freudenberg
	 *
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:
	 *
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 *
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 */

	Squeak.InstructionStream.subclass('Squeak.InstructionStreamSista',
	'decoding', {
	    interpretNextInstructionFor: function(client) {
	        return this.interpretNextInstructionExtFor(client, 0, 0);
	    },
	    interpretNextInstructionExtFor: function(client, extA, extB) {
	        this.Squeak; // avoid dynamic lookup of "Squeak" in Lively
	        // Send to the argument, client, a message that specifies the type of the next instruction.
	        var b = this.method.bytes[this.pc++];
	        switch (b) {

	            case 0x00: case 0x01: case 0x02: case 0x03: case 0x04: case 0x05: case 0x06: case 0x07:
	            case 0x08: case 0x09: case 0x0A: case 0x0B: case 0x0C: case 0x0D: case 0x0E: case 0x0F:
	                return client.pushReceiverVariable(b&0xF);

	            case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15: case 0x16: case 0x17:
	            case 0x18: case 0x19: case 0x1A: case 0x1B: case 0x1C: case 0x1D: case 0x1E: case 0x1F:
	                return client.pushLiteralVariable(this.method.methodGetLiteral(b&0xF));

	            case 0x20: case 0x21: case 0x22: case 0x23: case 0x24: case 0x25: case 0x26: case 0x27:
	            case 0x28: case 0x29: case 0x2A: case 0x2B: case 0x2C: case 0x2D: case 0x2E: case 0x2F:
	            case 0x30: case 0x31: case 0x32: case 0x33: case 0x34: case 0x35: case 0x36: case 0x37:
	            case 0x38: case 0x39: case 0x3A: case 0x3B: case 0x3C: case 0x3D: case 0x3E: case 0x3F:
	                return client.pushConstant(this.method.methodGetLiteral(b&0x1F));

	            case 0x40: case 0x41: case 0x42: case 0x43: case 0x44: case 0x45: case 0x46: case 0x47:
	                return client.pushTemporaryVariable(b&0xF);
	            case 0x48: case 0x49: case 0x4A: case 0x4B:
	                return client.pushTemporaryVariable((b&0x3)+8);
	            case 0x4C: return client.pushReceiver();
	            case 0x4D: return client.pushConstant(this.vm.trueObj);
	            case 0x4E: return client.pushConstant(this.vm.falseObj);
	            case 0x4F: return client.pushConstant(this.vm.nilObj);
	            case 0x50: return client.pushConstant(0);
	            case 0x51: return client.pushConstant(1);
	            case 0x52: return client.pushActiveContext();
	            case 0x53: return client.doDup();
	            case 0x58: return client.methodReturnReceiver();
	            case 0x59: return client.methodReturnConstant(this.vm.trueObj);
	            case 0x5A: return client.methodReturnConstant(this.vm.falseObj);
	            case 0x5B: return client.methodReturnConstant(this.vm.nilObj);
	            case 0x5C: return client.methodReturnTop();
	            case 0x5D: return client.blockReturnConstant(this.vm.nilObj);
	            case 0x5E: if (extA===0) return client.blockReturnTop(); else break;
	            case 0x5F: return client.nop();
	            case 0x60: case 0x61: case 0x62: case 0x63: case 0x64: case 0x65: case 0x66: case 0x67:
	            case 0x68: case 0x69: case 0x6A: case 0x6B: case 0x6C: case 0x6D: case 0x6E: case 0x6F:
	            case 0x70: case 0x71: case 0x72: case 0x73: case 0x74: case 0x75: case 0x76: case 0x77:
	            case 0x78: case 0x79: case 0x7A: case 0x7B: case 0x7C: case 0x7D: case 0x7E: case 0x7F:
	                return client.send(this.vm.specialSelectors[2 * (b - 0x60)],
	                    this.vm.specialSelectors[2 * (b - 0x60) + 1], false);

	            case 0x80: case 0x81: case 0x82: case 0x83: case 0x84: case 0x85: case 0x86: case 0x87:
	            case 0x88: case 0x89: case 0x8A: case 0x8B: case 0x8C: case 0x8D: case 0x8E: case 0x8F:
	                return client.send(this.method.methodGetLiteral(b&0xF), 0, false);
	            case 0x90: case 0x91: case 0x92: case 0x93: case 0x94: case 0x95: case 0x96: case 0x97:
	            case 0x98: case 0x99: case 0x9A: case 0x9B: case 0x9C: case 0x9D: case 0x9E: case 0x9F:
	                return client.send(this.method.methodGetLiteral(b&0xF), 1, false);
	            case 0xA0: case 0xA1: case 0xA2: case 0xA3: case 0xA4: case 0xA5: case 0xA6: case 0xA7:
	            case 0xA8: case 0xA9: case 0xAA: case 0xAB: case 0xAC: case 0xAD: case 0xAE: case 0xAF:
	                return client.send(this.method.methodGetLiteral(b&0xF), 2, false);
	            case 0xB0: case 0xB1: case 0xB2: case 0xB3: case 0xB4: case 0xB5: case 0xB6: case 0xB7:
	                return client.jump((b&7) + 1);
	            case 0xB8: case 0xB9: case 0xBA: case 0xBB: case 0xBC: case 0xBD: case 0xBE: case 0xBF:
	                return client.jumpIf(true, (b&7) + 1);
	            case 0xC0: case 0xC1: case 0xC2: case 0xC3: case 0xC4: case 0xC5: case 0xC6: case 0xC7:
	                return client.jumpIf(false, (b&7) + 1);
	            case 0xC8: case 0xC9: case 0xCA: case 0xCB: case 0xCC: case 0xCD: case 0xCE: case 0xCF:
	                return client.popIntoReceiverVariable(b&7)
	            case 0xD0: case 0xD1: case 0xD2: case 0xD3: case 0xD4: case 0xD5: case 0xD6: case 0xD7:
	                return client.popIntoTemporaryVariable(b - 0xD0);
	            case 0xD8: return client.doPop();
	        }
	        var b2 = this.method.bytes[this.pc++];
	        switch (b) {
	            case 0xE0: return this.interpretNextInstructionExtFor(client, (extA << 8) + b2, extB);
	            case 0xE1: return this.interpretNextInstructionExtFor(client, extA, (extB << 8) + (b2 < 128 ? b2 : b2-256));
	            case 0xE2:
	                return client.pushReceiverVariable(b2 + (extA << 8));
	            case 0xE3:
	                return client.pushLiteralVariable(this.method.methodGetLiteral(b2 + (extA << 8)));
	            case 0xE4:
	                return client.pushConstant(this.method.methodGetLiteral(b2 + (extA << 8)));
	            case 0xE5:
	                return client.pushTemporaryVariable(b2);
	            case 0xE7: {
	                return b2 < 128 ? client.pushNewArray(b2) : client.popIntoNewArray(b2 - 128);
	            }
	            case 0xE8: return client.pushConstant(b2 + (extB << 8));
	            case 0xE9:
	                var unicode = b2 + (extB << 8);
	                return client.pushConstant("$" + String.fromCodePoint(unicode) + " (" + unicode + ")");
	            case 0xEA: return client.send(this.method.methodGetSelector((b2 >> 3) + (extA << 5)), (b2 & 7) + (extB << 3), false);
	            case 0xEB:
	                var literal = this.method.methodGetSelector((b2 >> 3) + (extA << 5));
	                if (extB >= 64) {
	                    return client.sendSuperDirected(literal);
	                } else {
	                    return client.send(literal, (b2 & 7) + (extB << 3), true);
	                }
	            case 0xED:
	                return client.jump(b2 + (extB << 8));
	            case 0xEE:
	                return client.jumpIf(true, b2 + (extB << 8));
	            case 0xEF:
	                return client.jumpIf(false, b2 + (extB << 8));
	            case 0xF0:
	                return client.popIntoReceiverVariable(b2 + (extA << 8));
	            case 0xF1:
	                return client.popIntoLiteralVariable(this.method.methodGetLiteral(b2 + (extA << 8)));
	            case 0xF2:
	                return client.popIntoTemporaryVariable(b2);
	            case 0xF3:
	                return client.storeIntoReceiverVariable(b2 + (extA << 8));
	            case 0xF4:
	                return client.storeIntoLiteralVariable(this.method.methodGetLiteral(b2 + (extA << 8)));
	            case 0xF5:
	                return client.storeIntoTemporaryVariable(b2);
	        }
	        var b3 = this.method.bytes[this.pc++];
	        switch (b) {
	            case 0xF8: return client.callPrimitive(b2 + (b3 << 8));
	            case 0xF9: {
	                var literalIndex = b2 + (extA << 8),
	                    numCopied = b3 & 63,
	                    compiledBlock = this.method.methodGetLiteral(literalIndex);
	                return client.pushFullClosure(literalIndex, numCopied, compiledBlock.methodNumArgs());
	            }
	            case 0xFA: {
	                var numArgs = (b2 & 7) + this.mod(extA, 16) * 8,
	                    numCopied = (b2 >> 3 & 0x7) + this.div(extA, 16) * 8,
	                    blockSize = b3 + (extB << 8);
	                return client.pushClosureCopy(numCopied, numArgs, blockSize);
	            }
	            case 0xFB:
	                return client.pushRemoteTemp(b2, b3);
	            case 0xFC:
	                return client.storeIntoRemoteTemp(b2, b3);
	            case 0xFD:
	                return client.popIntoRemoteTemp(b2, b3);
	        }
	        throw Error("Unknown bytecode: " + b);
	    }
	});
	return vm_instruction_stream_sista;
}

var vm_instruction_printer = {};

var hasRequiredVm_instruction_printer;

function requireVm_instruction_printer () {
	if (hasRequiredVm_instruction_printer) return vm_instruction_printer;
	hasRequiredVm_instruction_printer = 1;
	/*
	 * Copyright (c) 2013-2024 Vanessa Freudenberg
	 *
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:
	 *
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 *
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 */

	Object.subclass('Squeak.InstructionPrinter',
	'initialization', {
	    initialize: function(method, vm) {
	        this.method = method;
	        this.vm = vm;
	    },
	},
	'printing', {
	    printInstructions: function(indent, highlight, highlightPC) {
	        // all args are optional
	        this.indent = indent;           // prepend to every line except if highlighted
	        this.highlight = highlight;     // prepend to highlighted line
	        this.highlightPC = highlightPC; // PC of highlighted line
	        this.innerIndents = {};
	        this.result = '';
	        this.scanner = this.method.methodSignFlag()
	            ? new Squeak.InstructionStreamSista(this.method, this.vm)
	            : new Squeak.InstructionStream(this.method, this.vm);
	        this.oldPC = this.scanner.pc;
	        this.endPC = 0;                 // adjusted while scanning
	        this.done = false;
	        try {
	            while (!this.done)
	                this.scanner.interpretNextInstructionFor(this);
	        } catch(ex) {
	            this.print("!!! " + ex.message);
	        }
	        return this.result;
	    },
	    print: function(instruction) {
	        if (this.oldPC === this.highlightPC) {
	            if (this.highlight) this.result += this.highlight;
	        } else {
	            if (this.indent) this.result += this.indent;
	        }
	        this.result += this.oldPC;
	        for (var i = 0; i < this.innerIndents[this.oldPC] || 0; i++)
	            this.result += "   ";
	        this.result += " <";
	        for (var i = this.oldPC; i < this.scanner.pc; i++) {
	            if (i > this.oldPC) this.result += " ";
	            this.result += (this.method.bytes[i]+0x100).toString(16).substr(-2).toUpperCase(); // padded hex
	        }
	        this.result += "> " + instruction + "\n";
	        this.oldPC = this.scanner.pc;
	    }
	},
	'decoding', {
	    blockReturnConstant: function(obj) {
	        this.print('blockReturn: ' + obj.toString());
	        this.done = this.scanner.pc > this.endPC; // full block
	    },
	    blockReturnTop: function() {
	        this.print('blockReturn');
	        this.done = this.scanner.pc > this.endPC; // full block
	    },
	    doDup: function() {
	        this.print('dup');
	    },
	    doPop: function() {
	        this.print('pop');
	    },
	    jump: function(offset) {
	        this.print('jumpTo: ' + (this.scanner.pc + offset));
	        if (this.scanner.pc + offset > this.endPC) this.endPC = this.scanner.pc + offset;
	    },
	    jumpIf: function(condition, offset) {
	        this.print((condition ? 'jumpIfTrue: ' : 'jumpIfFalse: ') + (this.scanner.pc + offset));
	        if (this.scanner.pc + offset > this.endPC) this.endPC = this.scanner.pc + offset;
	    },
	    methodReturnReceiver: function() {
	        this.print('return: receiver');
	        this.done = this.scanner.pc > this.endPC;
	    },
	    methodReturnTop: function() {
	        this.print('return: topOfStack');
	        this.done = this.scanner.pc > this.endPC;
	    },
	    methodReturnConstant: function(obj) {
	        this.print('returnConst: ' + obj.toString());
	        this.done = this.scanner.pc > this.endPC;
	    },
	    nop: function() {
	        this.print('nop');
	    },
	    popIntoLiteralVariable: function(anAssociation) {
	        this.print('popIntoBinding: ' + anAssociation.assnKeyAsString());
	    },
	    popIntoReceiverVariable: function(offset) {
	        this.print('popIntoInstVar: ' + offset);
	    },
	    popIntoTemporaryVariable: function(offset) {
	        this.print('popIntoTemp: ' + offset);
	    },
	    pushActiveContext: function() {
	        this.print('push: thisContext');
	    },
	    pushConstant: function(obj) {
	        var value = obj.sqInstName ? obj.sqInstName() : obj.toString();
	        this.print('pushConst: ' + value);
	    },
	    pushLiteralVariable: function(anAssociation) {
	        this.print('pushBinding: ' + anAssociation.assnKeyAsString());
	    },
	    pushReceiver: function() {
	        this.print('push: self');
	    },
	    pushReceiverVariable: function(offset) {
	        this.print('pushInstVar: ' + offset);
	    },
	    pushTemporaryVariable: function(offset) {
	        this.print('pushTemp: ' + offset);
	    },
	    send: function(selector, numberArguments, supered) {
	        this.print( (supered ? 'superSend: #' : 'send: #') + (selector.bytesAsString ? selector.bytesAsString() : selector));
	    },
	    sendSuperDirected: function(selector) {
	        this.print('directedSuperSend: #' + (selector.bytesAsString ? selector.bytesAsString() : selector));
	    },
	    storeIntoLiteralVariable: function(anAssociation) {
	        this.print('storeIntoBinding: ' + anAssociation.assnKeyAsString());
	    },
	    storeIntoReceiverVariable: function(offset) {
	        this.print('storeIntoInstVar: ' + offset);
	    },
	    storeIntoTemporaryVariable: function(offset) {
	        this.print('storeIntoTemp: ' + offset);
	    },
	    pushNewArray: function(size) {
	        this.print('push: (Array new: ' + size + ')');
	    },
	    popIntoNewArray: function(numElements) {
	        this.print('pop: ' + numElements + ' into: (Array new: ' + numElements + ')');
	    },
	    pushRemoteTemp: function(offset , arrayOffset) {
	        this.print('push: ' + offset + ' ofTemp: ' + arrayOffset);
	    },
	    storeIntoRemoteTemp: function(offset , arrayOffset) {
	        this.print('storeInto: ' + offset + ' ofTemp: ' + arrayOffset);
	    },
	    popIntoRemoteTemp: function(offset , arrayOffset) {
	        this.print('popInto: ' + offset + ' ofTemp: ' + arrayOffset);
	    },
	    pushClosureCopy: function(numCopied, numArgs, blockSize) {
	        var from = this.scanner.pc,
	            to = from + blockSize;
	        this.print('closure(' + from + '-' + (to-1) + '): ' + numCopied + ' copied, ' + numArgs + ' args');
	        for (var i = from; i < to; i++)
	            this.innerIndents[i] = (this.innerIndents[i] || 0) + 1;
	        if (to > this.endPC) this.endPC = to;
	    },
	    pushFullClosure: function(literalIndex, numCopied, numArgs) {
	        this.print('pushFullClosure: (self literalAt: ' + (literalIndex + 1) + ') numCopied: ' + numCopied + ' numArgs: ' + numArgs);
	    },
	    callPrimitive: function(primitiveIndex) {
	        this.print('primitive: ' + primitiveIndex);
	    },
	});
	return vm_instruction_printer;
}

var vm_primitives = {};

var hasRequiredVm_primitives;

function requireVm_primitives () {
	if (hasRequiredVm_primitives) return vm_primitives;
	hasRequiredVm_primitives = 1;
	/*
	 * Copyright (c) 2013-2024 Vanessa Freudenberg
	 *
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:
	 *
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 *
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 */

	Object.subclass('Squeak.Primitives',
	'initialization', {
	    initialize: function(vm, display) {
	        this.vm = vm;
	        this.oldPrims = !this.vm.image.hasClosures;
	        this.allowAccessBeyondSP = this.oldPrims;
	        this.deferDisplayUpdates = false;
	        this.semaphoresToSignal = [];
	        this.initDisplay(display);
	        this.initAtCache();
	        this.initModules();
	        this.initPlugins();
	        if (vm.image.isSpur) {
	            this.charFromInt = this.charFromIntSpur;
	            this.charToInt = this.charToIntSpur;
	            this.identityHash = this.identityHashSpur;
	        }
	    },
	    initDisplay: function(display) {
	        // Placeholder (can be replaced by a display module at runtime, before starting the Squeak interpreter)
	        this.display = display;
	    },
	    initModules: function() {
	        this.loadedModules = {};
	        this.builtinModules = {};
	        this.patchModules = {};
	        this.interpreterProxy = new Squeak.InterpreterProxy(this.vm);
	    },
	    initPlugins: function() {
	        // Empty placeholder (can be replaced by a plugins module at runtime, before starting the Squeak interpreter)
	    }
	},
	'dispatch', {
	    quickSendOther: function(rcvr, lobits) {
	        // returns true if it succeeds
	        this.success = true;
	        switch (lobits) {
	            case 0x0: return this.popNandPushIfOK(2, this.objectAt(true,true,false)); // at:
	            case 0x1: return this.popNandPushIfOK(3, this.objectAtPut(true,true,false)); // at:put:
	            case 0x2: return this.popNandPushIfOK(1, this.objectSize(true)); // size
	            //case 0x3: return false; // next
	            //case 0x4: return false; // nextPut:
	            //case 0x5: return false; // atEnd
	            case 0x6: return this.popNandPushBoolIfOK(2, this.vm.stackValue(1) === this.vm.stackValue(0)); // ==
	            case 0x7: return this.popNandPushIfOK(1,this.vm.getClass(this.vm.top())); // class
	            case 0x8: return this.popNandPushIfOK(2,this.doBlockCopy()); // blockCopy:
	            case 0x9: return this.primitiveBlockValue(0); // value
	            case 0xA: return this.primitiveBlockValue(1); // value:
	            //case 0xB: return false; // do:
	            //case 0xC: return false; // new
	            //case 0xD: return false; // new:
	            //case 0xE: return false; // x
	            //case 0xF: return false; // y
	        }
	        return false;
	    },
	    doPrimitive: function(index, argCount, primMethod) {
	        this.success = true;
	        switch (index) {
	            // Integer Primitives (0-19)
	            case 1: return this.popNandPushIntIfOK(argCount+1,this.stackInteger(1) + this.stackInteger(0));  // Integer.add
	            case 2: return this.popNandPushIntIfOK(argCount+1,this.stackInteger(1) - this.stackInteger(0));  // Integer.subtract
	            case 3: return this.popNandPushBoolIfOK(argCount+1, this.stackInteger(1) < this.stackInteger(0));   // Integer.less
	            case 4: return this.popNandPushBoolIfOK(argCount+1, this.stackInteger(1) > this.stackInteger(0));   // Integer.greater
	            case 5: return this.popNandPushBoolIfOK(argCount+1, this.stackInteger(1) <= this.stackInteger(0));  // Integer.leq
	            case 6: return this.popNandPushBoolIfOK(argCount+1, this.stackInteger(1) >= this.stackInteger(0));  // Integer.geq
	            case 7: return this.popNandPushBoolIfOK(argCount+1, this.stackInteger(1) === this.stackInteger(0)); // Integer.equal
	            case 8: return this.popNandPushBoolIfOK(argCount+1, this.stackInteger(1) !== this.stackInteger(0)); // Integer.notequal
	            case 9: return this.popNandPushIntIfOK(argCount+1,this.stackInteger(1) * this.stackInteger(0));  // Integer.multiply *
	            case 10: return this.popNandPushIntIfOK(argCount+1,this.vm.quickDivide(this.stackInteger(1),this.stackInteger(0)));  // Integer.divide /  (fails unless exact)
	            case 11: return this.popNandPushIntIfOK(argCount+1,this.vm.mod(this.stackInteger(1),this.stackInteger(0)));  // Integer.mod \\
	            case 12: return this.popNandPushIntIfOK(argCount+1,this.vm.div(this.stackInteger(1),this.stackInteger(0)));  // Integer.div //
	            case 13: return this.popNandPushIntIfOK(argCount+1,this.stackInteger(1) / this.stackInteger(0) | 0);  // Integer.quo
	            case 14: return this.popNandPushIfOK(argCount+1,this.doBitAnd());  // SmallInt.bitAnd
	            case 15: return this.popNandPushIfOK(argCount+1,this.doBitOr());  // SmallInt.bitOr
	            case 16: return this.popNandPushIfOK(argCount+1,this.doBitXor());  // SmallInt.bitXor
	            case 17: return this.popNandPushIfOK(argCount+1,this.doBitShift());  // SmallInt.bitShift
	            case 18: return this.primitiveMakePoint(argCount, false);
	            case 19: return false;                                 // Guard primitive for simulation -- *must* fail
	            // LargeInteger Primitives (20-39)
	            // 32-bit logic is aliased to Integer prims above
	            case 20: return this.primitiveRemLargeIntegers(argCount);
	            case 21: return this.primitiveAddLargeIntegers(argCount);
	            case 22: return this.primitiveSubtractLargeIntegers(argCount);
	            case 23: return this.primitiveLessThanLargeIntegers(argCount);
	            case 24: return this.primitiveGreaterThanLargeIntegers(argCount);
	            case 25: return this.primitiveLessOrEqualLargeIntegers(argCount);
	            case 26: return this.primitiveGreaterOrEqualLargeIntegers(argCount);
	            case 27: return this.primitiveEqualLargeIntegers(argCount);
	            case 28: return this.primitiveNotEqualLargeIntegers(argCount);
	            case 29: return this.primitiveMultiplyLargeIntegers(argCount);
	            case 30: return this.primitiveDivideLargeIntegers(argCount);
	            case 31: return this.primitiveModLargeIntegers(argCount);
	            case 32: return this.primitiveDivLargeIntegers(argCount);
	            case 33: return this.primitiveQuoLargeIntegers(argCount);
	            case 34: this.vm.warnOnce("missing primitive: 34 (primitiveBitAndLargeIntegers)"); return false;
	            case 35: this.vm.warnOnce("missing primitive: 35 (primitiveBitOrLargeIntegers)"); return false;
	            case 36: this.vm.warnOnce("missing primitive: 36 (primitiveBitXorLargeIntegers)"); return false;
	            case 37: this.vm.warnOnce("missing primitive: 37 (primitiveBitShiftLargeIntegers)"); return false;
	            case 38: return this.popNandPushIfOK(argCount+1, this.objectAt(false,false,false)); // Float basicAt
	            case 39: return this.popNandPushIfOK(argCount+1, this.objectAtPut(false,false,false)); // Float basicAtPut
	            // Float Primitives (40-59)
	            case 40: return this.popNandPushFloatIfOK(argCount+1,this.stackInteger(0)); // primitiveAsFloat
	            case 41: return this.popNandPushFloatIfOK(argCount+1,this.stackFloat(1)+this.stackFloat(0));  // Float +
	            case 42: return this.popNandPushFloatIfOK(argCount+1,this.stackFloat(1)-this.stackFloat(0));  // Float -
	            case 43: return this.popNandPushBoolIfOK(argCount+1, this.stackFloat(1)<this.stackFloat(0));  // Float <
	            case 44: return this.popNandPushBoolIfOK(argCount+1, this.stackFloat(1)>this.stackFloat(0));  // Float >
	            case 45: return this.popNandPushBoolIfOK(argCount+1, this.stackFloat(1)<=this.stackFloat(0));  // Float <=
	            case 46: return this.popNandPushBoolIfOK(argCount+1, this.stackFloat(1)>=this.stackFloat(0));  // Float >=
	            case 47: return this.popNandPushBoolIfOK(argCount+1, this.stackFloat(1)===this.stackFloat(0));  // Float =
	            case 48: return this.popNandPushBoolIfOK(argCount+1, this.stackFloat(1)!==this.stackFloat(0));  // Float !=
	            case 49: return this.popNandPushFloatIfOK(argCount+1,this.stackFloat(1)*this.stackFloat(0));  // Float.mul
	            case 50: return this.popNandPushFloatIfOK(argCount+1,this.safeFDiv(this.stackFloat(1),this.stackFloat(0)));  // Float.div
	            case 51: return this.popNandPushIfOK(argCount+1,this.floatAsSmallInt(this.stackFloat(0)));  // Float.asInteger
	            case 52: return this.popNandPushFloatIfOK(argCount+1,this.floatFractionPart(this.stackFloat(0)));
	            case 53: return this.popNandPushIntIfOK(argCount+1, this.frexp_exponent(this.stackFloat(0)) - 1); // Float.exponent
	            case 54: return this.popNandPushFloatIfOK(argCount+1, this.ldexp(this.stackFloat(1), this.stackFloat(0))); // Float.timesTwoPower
	            case 55: return this.popNandPushFloatIfOK(argCount+1, Math.sqrt(this.stackFloat(0))); // SquareRoot
	            case 56: return this.popNandPushFloatIfOK(argCount+1, Math.sin(this.stackFloat(0))); // Sine
	            case 57: return this.popNandPushFloatIfOK(argCount+1, Math.atan(this.stackFloat(0))); // Arctan
	            case 58: return this.popNandPushFloatIfOK(argCount+1, Math.log(this.stackFloat(0))); // LogN
	            case 59: return this.popNandPushFloatIfOK(argCount+1, Math.exp(this.stackFloat(0))); // Exp
	            // Subscript and Stream Primitives (60-67)
	            case 60: return this.popNandPushIfOK(argCount+1, this.objectAt(false,false,false)); // basicAt:
	            case 61: return this.popNandPushIfOK(argCount+1, this.objectAtPut(false,false,false)); // basicAt:put:
	            case 62: return this.popNandPushIfOK(argCount+1, this.objectSize(false)); // size
	            case 63: return this.popNandPushIfOK(argCount+1, this.objectAt(false,true,false)); // String.basicAt:
	            case 64: return this.popNandPushIfOK(argCount+1, this.objectAtPut(false,true,false)); // String.basicAt:put:
	            case 65: this.vm.warnOnce("missing primitive: 65 (primitiveNext)"); return false;
	            case 66: this.vm.warnOnce("missing primitive: 66 (primitiveNextPut)"); return false;
	            case 67: this.vm.warnOnce("missing primitive: 67 (primitiveAtEnd)"); return false;
	            // StorageManagement Primitives (68-79)
	            case 68: return this.popNandPushIfOK(argCount+1, this.objectAt(false,false,true)); // Method.objectAt:
	            case 69: return this.popNandPushIfOK(argCount+1, this.objectAtPut(false,false,true)); // Method.objectAt:put:
	            case 70: return this.popNandPushIfOK(argCount+1, this.instantiateClass(this.stackNonInteger(0), 0)); // Class.new
	            case 71: return this.popNandPushIfOK(argCount+1, this.instantiateClass(this.stackNonInteger(1), this.stackPos32BitInt(0))); // Class.new:
	            case 72: return this.primitiveArrayBecome(argCount, false, true); // one way, do copy hash
	            case 73: return this.popNandPushIfOK(argCount+1, this.objectAt(false,false,true)); // instVarAt:
	            case 74: return this.popNandPushIfOK(argCount+1, this.objectAtPut(false,false,true)); // instVarAt:put:
	            case 75: return this.popNandPushIfOK(argCount+1, this.identityHash(this.stackNonInteger(0))); // Object.identityHash
	            case 76: return this.primitiveStoreStackp(argCount);  // (Blue Book: primitiveAsObject)
	            case 77: return this.popNandPushIfOK(argCount+1, this.someInstanceOf(this.stackNonInteger(0))); // Class.someInstance
	            case 78: return this.popNandPushIfOK(argCount+1, this.nextInstanceAfter(this.stackNonInteger(0))); // Object.nextInstance
	            case 79: return this.primitiveNewMethod(argCount); // Compiledmethod.new
	            // Control Primitives (80-89)
	            case 80: return this.popNandPushIfOK(argCount+1,this.doBlockCopy()); // blockCopy:
	            case 81: return this.primitiveBlockValue(argCount); // BlockContext.value
	            case 82: return this.primitiveBlockValueWithArgs(argCount); // BlockContext.valueWithArguments:
	            case 83: return this.vm.primitivePerform(argCount); // Object.perform:(with:)*
	            case 84: return this.vm.primitivePerformWithArgs(argCount, false); //  Object.perform:withArguments:
	            case 85: return this.primitiveSignal(); // Semaphore.wait
	            case 86: return this.primitiveWait(); // Semaphore.wait
	            case 87: return this.primitiveResume(); // Process.resume
	            case 88: return this.primitiveSuspend(); // Process.suspend
	            case 89: return this.vm.flushMethodCache(); //primitiveFlushCache
	            // Input/Output Primitives (90-109)
	            case 90: return this.primitiveMousePoint(argCount); // mousePoint
	            case 91: return this.primitiveTestDisplayDepth(argCount); // cursorLocPut in old images
	            case 92: this.vm.warnOnce("missing primitive: 92 (primitiveSetDisplayMode)"); return false;
	            case 93: return this.primitiveInputSemaphore(argCount);
	            case 94: return this.primitiveGetNextEvent(argCount);
	            case 95: return this.primitiveInputWord(argCount);
	            case 96: return this.namedPrimitive('BitBltPlugin', 'primitiveCopyBits', argCount);
	            case 97: return this.primitiveSnapshot(argCount);
	            case 98: return this.primitiveStoreImageSegment(argCount);
	            case 99: return this.primitiveLoadImageSegment(argCount);
	            case 100: return this.vm.primitivePerformWithArgs(argCount, true); // Object.perform:withArguments:inSuperclass: (Blue Book: primitiveSignalAtTick)
	            case 101: return this.primitiveBeCursor(argCount); // Cursor.beCursor
	            case 102: return this.primitiveBeDisplay(argCount); // DisplayScreen.beDisplay
	            case 103: return this.primitiveScanCharacters(argCount);
	            case 104: this.vm.warnOnce("missing primitive: 104 (primitiveDrawLoop)"); return false;
	            case 105: return this.popNandPushIfOK(argCount+1, this.doStringReplace()); // string and array replace
	            case 106: return this.primitiveScreenSize(argCount); // actualScreenSize
	            case 107: return this.primitiveMouseButtons(argCount); // Sensor mouseButtons
	            case 108: return this.primitiveKeyboardNext(argCount); // Sensor kbdNext
	            case 109: return this.primitiveKeyboardPeek(argCount); // Sensor kbdPeek
	            // System Primitives (110-119)
	            case 110: return this.popNandPushBoolIfOK(argCount+1, this.vm.stackValue(1) === this.vm.stackValue(0)); // ==
	            case 111: return this.popNandPushIfOK(argCount+1, this.vm.getClass(this.vm.top())); // Object.class
	            case 112: return this.popNandPushIfOK(argCount+1, this.vm.image.bytesLeft()); //primitiveBytesLeft
	            case 113: return this.primitiveQuit(argCount);
	            case 114: return this.primitiveExitToDebugger(argCount);
	            case 115: return this.primitiveChangeClass(argCount);
	            case 116: return this.vm.flushMethodCacheForMethod(this.vm.top());  // after Squeak 2.2 uses 119
	            case 117: return this.doNamedPrimitive(argCount, primMethod); // named prims
	            case 118: return this.primitiveDoPrimitiveWithArgs(argCount);
	            case 119: return this.vm.flushMethodCacheForSelector(this.vm.top()); // before Squeak 2.3 uses 116
	            // Miscellaneous Primitives (120-149)
	            case 120: return this.primitiveCalloutToFFI(argCount, primMethod);
	            case 121: return this.primitiveImageName(argCount); //get+set imageName
	            case 122: return this.primitiveReverseDisplay(argCount); // Blue Book: primitiveImageVolume
	            case 123: this.vm.warnOnce("missing primitive: 123 (primitiveValueUninterruptably)"); return false;
	            case 124: return this.popNandPushIfOK(argCount+1, this.registerSemaphore(Squeak.splOb_TheLowSpaceSemaphore));
	            case 125: return this.popNandPushIfOK(argCount+1, this.setLowSpaceThreshold());
	            case 126: return this.primitiveDeferDisplayUpdates(argCount);
	            case 127: return this.primitiveShowDisplayRect(argCount);
	            case 128: return this.primitiveArrayBecome(argCount, true, true); // both ways, do copy hash
	            case 129: return this.popNandPushIfOK(argCount+1, this.vm.image.specialObjectsArray); //specialObjectsOop
	            case 130: return this.primitiveFullGC(argCount);
	            case 131: return this.primitivePartialGC(argCount);
	            case 132: return this.popNandPushBoolIfOK(argCount+1, this.pointsTo(this.stackNonInteger(1), this.vm.top())); //Object.pointsTo
	            case 133: return this.popNIfOK(argCount); //TODO primitiveSetInterruptKey
	            case 134: return this.popNandPushIfOK(argCount+1, this.registerSemaphore(Squeak.splOb_TheInterruptSemaphore));
	            case 135: return this.popNandPushIfOK(argCount+1, this.millisecondClockValue());
	            case 136: return this.primitiveSignalAtMilliseconds(argCount); //Delay signal:atMs:();
	            case 137: return this.popNandPushIfOK(argCount+1, this.secondClock()); // seconds since Jan 1, 1901
	            case 138: return this.popNandPushIfOK(argCount+1, this.someObject()); // Object.someObject
	            case 139: return this.popNandPushIfOK(argCount+1, this.nextObject(this.vm.top())); // Object.nextObject
	            case 140: return this.primitiveBeep(argCount);
	            case 141: return this.primitiveClipboardText(argCount);
	            case 142: return this.popNandPushIfOK(argCount+1, this.makeStString(this.filenameToSqueak(Squeak.vmPath)));
	            case 143: // short at and shortAtPut
	            case 144: return this.primitiveShortAtAndPut(argCount);
	            case 145: return this.primitiveConstantFill(argCount);
	            case 146: return this.namedPrimitive('JoystickTabletPlugin', 'primitiveReadJoystick', argCount);
	            case 147: return this.namedPrimitive('BitBltPlugin', 'primitiveWarpBits', argCount);
	            case 148: return this.popNandPushIfOK(argCount+1, this.vm.image.clone(this.vm.top())); //shallowCopy
	            case 149: return this.primitiveGetAttribute(argCount);
	            // File Primitives (150-169)
	            case 150: if (this.oldPrims) return this.primitiveFileAtEnd(argCount);
	            case 151: if (this.oldPrims) return this.primitiveFileClose(argCount);
	            case 152: if (this.oldPrims) return this.primitiveFileGetPosition(argCount);
	            case 153: if (this.oldPrims) return this.primitiveFileOpen(argCount);
	            case 154: if (this.oldPrims) return this.primitiveFileRead(argCount);
	            case 155: if (this.oldPrims) return this.primitiveFileSetPosition(argCount);
	            case 156: if (this.oldPrims) return this.primitiveFileDelete(argCount);
	            case 157: if (this.oldPrims) return this.primitiveFileSize(argCount);
	                break;  // fail 150-157 if fell through
	            case 158: if (this.oldPrims) return this.primitiveFileWrite(argCount);
	                else this.vm.warnOnce("missing primitive: 158 (primitiveCompareWith)"); return false;
	            case 159: if (this.oldPrims) return this.primitiveFileRename(argCount);
	                return this.popNandPushIntIfOK(argCount+1, this.stackSigned53BitInt(0) * 1664525 & 0xFFFFFFF); // primitiveHashMultiply
	            case 160: if (this.oldPrims) return this.primitiveDirectoryCreate(argCount);
	                else return this.primitiveAdoptInstance(argCount);
	            case 161: if (this.oldPrims) return this.primitiveDirectoryDelimitor(argCount);
	                this.vm.warnOnce("missing primitive: 161 (primitiveSetIdentityHash)"); return false;
	            case 162: if (this.oldPrims) return this.primitiveDirectoryLookup(argCount);
	                break;  // fail
	            case 163: if (this.oldPrims) return this.primitiveDirectoryDelete(argCount);
	                else this.vm.warnOnce("missing primitive: 163 (primitiveGetImmutability)"); return false;
	            case 164: return this.popNandPushIfOK(argCount+1, this.vm.trueObj); // Fake primitiveSetImmutability
	            case 165:
	            case 166: return this.primitiveIntegerAtAndPut(argCount);
	            case 167: return false; // Processor.yield
	            case 168: return this.primitiveCopyObject(argCount);
	            case 169: if (this.oldPrims) return this.primitiveDirectorySetMacTypeAndCreator(argCount);
	                else return this.popNandPushBoolIfOK(argCount+1, this.vm.stackValue(1) !== this.vm.stackValue(0)); //new: primitiveNotIdentical
	            // Sound Primitives (170-199)
	            case 170: if (this.oldPrims) return this.namedPrimitive('SoundPlugin', 'primitiveSoundStart', argCount);
	                else return this.primitiveAsCharacter(argCount);
	            case 171: if (this.oldPrims) return this.namedPrimitive('SoundPlugin', 'primitiveSoundStartWithSemaphore', argCount);
	                else return this.popNandPushIfOK(argCount+1, this.stackNonInteger(0).hash); //primitiveImmediateAsInteger
	            case 172: if (this.oldPrims) return this.namedPrimitive('SoundPlugin', 'primitiveSoundStop', argCount);
	                this.vm.warnOnce("missing primitive: 172 (primitiveFetchMourner)");
	                return this.popNandPushIfOK(argCount, this.vm.nilObj); // do not fail
	            case 173: if (this.oldPrims) return this.namedPrimitive('SoundPlugin', 'primitiveSoundAvailableSpace', argCount);
	                else return this.popNandPushIfOK(argCount+1, this.objectAt(false,false,true)); // slotAt:
	            case 174: if (this.oldPrims) return this.namedPrimitive('SoundPlugin', 'primitiveSoundPlaySamples', argCount);
	                else return this.popNandPushIfOK(argCount+1, this.objectAtPut(false,false,true)); // slotAt:put:
	            case 175: if (this.oldPrims) return this.namedPrimitive('SoundPlugin', 'primitiveSoundPlaySilence', argCount);
	                else if (!this.vm.image.isSpur) {
	                    this.vm.warnOnce("primitive 175 called in non-spur image"); // workaround for Cuis
	                    return this.popNandPushIfOK(argCount+1, this.identityHash(this.stackNonInteger(0)));
	                } else return this.popNandPushIfOK(argCount+1, this.behaviorHash(this.stackNonInteger(0)));
	            case 176: if (this.oldPrims) return this.namedPrimitive('SoundGenerationPlugin', 'primWaveTableSoundmixSampleCountintostartingAtpan', argCount);
	                else return this.popNandPushIfOK(argCount+1, this.vm.image.isSpur ? 0x3FFFFF : 0xFFF); // primitiveMaxIdentityHash
	            case 177: if (this.oldPrims) return this.namedPrimitive('SoundGenerationPlugin', 'primFMSoundmixSampleCountintostartingAtpan', argCount);
	                return this.popNandPushIfOK(argCount+1, this.allInstancesOf(this.stackNonInteger(0)));
	            case 178: if (this.oldPrims) return this.namedPrimitive('SoundGenerationPlugin', 'primPluckedSoundmixSampleCountintostartingAtpan', argCount);
	                return false; // allObjectsDo fallback code is just as fast and uses less memory
	            case 179: if (this.oldPrims) return this.namedPrimitive('SoundGenerationPlugin', 'primSampledSoundmixSampleCountintostartingAtpan', argCount);
	                break;  // fail
	            case 180: if (this.oldPrims) return this.namedPrimitive('SoundGenerationPlugin', 'primitiveMixFMSound', argCount);
	                return false; // growMemoryByAtLeast
	            case 181: if (this.oldPrims) return this.namedPrimitive('SoundGenerationPlugin', 'primitiveMixPluckedSound', argCount);
	                return this.primitiveSizeInBytesOfInstance(argCount);
	            case 182: if (this.oldPrims) return this.namedPrimitive('SoundGenerationPlugin', 'oldprimSampledSoundmixSampleCountintostartingAtleftVolrightVol', argCount);
	                return this.primitiveSizeInBytes(argCount);
	            case 183: if (this.oldPrims) return this.namedPrimitive('SoundGenerationPlugin', 'primitiveApplyReverb', argCount);
	                else return this.primitiveIsPinned(argCount);
	            case 184: if (this.oldPrims) return this.namedPrimitive('SoundGenerationPlugin', 'primitiveMixLoopedSampledSound', argCount);
	                else return this.primitivePin(argCount);
	            case 185: if (this.oldPrims) return this.namedPrimitive('SoundGenerationPlugin', 'primitiveMixSampledSound', argCount);
	                else return this.primitiveExitCriticalSection(argCount);
	            case 186: if (this.oldPrims) break; // unused
	                else return this.primitiveEnterCriticalSection(argCount);
	            case 187: if (this.oldPrims) break; // unused
	                else return this.primitiveTestAndSetOwnershipOfCriticalSection(argCount);
	            case 188: if (this.oldPrims) break; // unused
	                else return this.primitiveExecuteMethodArgsArray(argCount);
	            case 189: if (this.oldPrims) return this.namedPrimitive('SoundPlugin', 'primitiveSoundInsertSamples', argCount);
	                return false; // fail to fall back to primitiveExecuteMethodArgsArray (188)
	            case 190: if (this.oldPrims) return this.namedPrimitive('SoundPlugin', 'primitiveSoundStartRecording', argCount);
	            case 191: if (this.oldPrims) return this.namedPrimitive('SoundPlugin', 'primitiveSoundStopRecording', argCount);
	            case 192: if (this.oldPrims) return this.namedPrimitive('SoundPlugin', 'primitiveSoundGetRecordingSampleRate', argCount);
	            case 193: if (this.oldPrims) return this.namedPrimitive('SoundPlugin', 'primitiveSoundRecordSamples', argCount);
	            case 194: if (this.oldPrims) return this.namedPrimitive('SoundPlugin', 'primitiveSoundSetRecordLevel', argCount);
	                break;  // fail 190-194 if fell through
	            case 195: return false; // Context.findNextUnwindContextUpTo:
	            case 196: return false; // Context.terminateTo:
	            case 197: return false; // Context.findNextHandlerContextStarting
	            case 198: return false; // MarkUnwindMethod (must fail)
	            case 199: return false; // MarkHandlerMethod (must fail)
	            // Networking Primitives (200-229)
	            case 200: if (this.oldPrims) return this.namedPrimitive('SocketPlugin', 'primitiveInitializeNetwork', argCount);
	                else return this.primitiveClosureCopyWithCopiedValues(argCount);
	            case 201: if (this.oldPrims) return this.namedPrimitive('SocketPlugin', 'primitiveResolverStartNameLookup', argCount);
	                else return this.primitiveClosureValue(argCount);
	            case 202: if (this.oldPrims) return this.namedPrimitive('SocketPlugin', 'primitiveResolverNameLookupResult', argCount);
	                else return this.primitiveClosureValue(argCount);
	            case 203: if (this.oldPrims) return this.namedPrimitive('SocketPlugin', 'primitiveResolverStartAddressLookup', argCount);
	                else return this.primitiveClosureValue(argCount);
	            case 204: if (this.oldPrims) return this.namedPrimitive('SocketPlugin', 'primitiveResolverAddressLookupResult', argCount);
	                else return this.primitiveClosureValue(argCount);
	            case 205: if (this.oldPrims) return this.namedPrimitive('SocketPlugin', 'primitiveResolverAbortLookup', argCount);
	                else return this.primitiveClosureValue(argCount);
	            case 206: if (this.oldPrims) return this.namedPrimitive('SocketPlugin', 'primitiveResolverLocalAddress', argCount);
	                else return  this.primitiveClosureValueWithArgs(argCount);
	            case 207: if (this.oldPrims) return this.namedPrimitive('SocketPlugin', 'primitiveResolverStatus', argCount);
	                else return this.primitiveFullClosureValue(argCount);
	            case 208: if (this.oldPrims) return this.namedPrimitive('SocketPlugin', 'primitiveResolverError', argCount);
	                else return this.primitiveFullClosureValueWithArgs(argCount);
	            case 209: if (this.oldPrims) return this.namedPrimitive('SocketPlugin', 'primitiveSocketCreate', argCount);
	                else return this.primitiveFullClosureValueNoContextSwitch(argCount);
	            case 210: if (this.oldPrims) return this.namedPrimitive('SocketPlugin', 'primitiveSocketDestroy', argCount);
	                else return this.popNandPushIfOK(argCount+1, this.objectAt(false,false,false)); // contextAt:
	            case 211: if (this.oldPrims) return this.namedPrimitive('SocketPlugin', 'primitiveSocketConnectionStatus', argCount);
	                else return this.popNandPushIfOK(argCount+1, this.objectAtPut(false,false,false)); // contextAt:put:
	            case 212: if (this.oldPrims) return this.namedPrimitive('SocketPlugin', 'primitiveSocketError', argCount);
	                else return this.popNandPushIfOK(argCount+1, this.objectSize(false)); // contextSize
	            case 213: if (this.oldPrims) return this.namedPrimitive('SocketPlugin', 'primitiveSocketLocalAddress', argCount);
	            case 214: if (this.oldPrims) return this.namedPrimitive('SocketPlugin', 'primitiveSocketLocalPort', argCount);
	            case 215: if (this.oldPrims) return this.namedPrimitive('SocketPlugin', 'primitiveSocketRemoteAddress', argCount);
	            case 216: if (this.oldPrims) return this.namedPrimitive('SocketPlugin', 'primitiveSocketRemotePort', argCount);
	            case 217: if (this.oldPrims) return this.namedPrimitive('SocketPlugin', 'primitiveSocketConnectToPort', argCount);
	            case 218: if (this.oldPrims) return this.namedPrimitive('SocketPlugin', 'primitiveSocketListenWithOrWithoutBacklog', argCount);
	                else return this.primitiveDoNamedPrimitive(argCount);
	            case 219: if (this.oldPrims) return this.namedPrimitive('SocketPlugin', 'primitiveSocketCloseConnection', argCount);
	            case 220: if (this.oldPrims) return this.namedPrimitive('SocketPlugin', 'primitiveSocketAbortConnection', argCount);
	                break;  // fail 212-220 if fell through
	            case 221: if (this.oldPrims) return this.namedPrimitive('SocketPlugin', 'primitiveSocketReceiveDataBufCount', argCount);
	                else return this.primitiveClosureValueNoContextSwitch(argCount);
	            case 222: if (this.oldPrims) return this.namedPrimitive('SocketPlugin', 'primitiveSocketReceiveDataAvailable', argCount);
	                else return this.primitiveClosureValueNoContextSwitch(argCount);
	            case 223: if (this.oldPrims) return this.namedPrimitive('SocketPlugin', 'primitiveSocketSendDataBufCount', argCount);
	            case 224: if (this.oldPrims) return this.namedPrimitive('SocketPlugin', 'primitiveSocketSendDone', argCount);
	            case 225: if (this.oldPrims) return this.namedPrimitive('SocketPlugin', 'primitiveSocketAccept', argCount);
	                break;  // fail 223-229 if fell through
	            // 225-229: unused
	            // Other Primitives (230-249)
	            case 230: return this.primitiveRelinquishProcessorForMicroseconds(argCount);
	            case 231: return this.primitiveForceDisplayUpdate(argCount);
	            case 232: this.vm.warnOnce("missing primitive: 232 (primitiveFormPrint)"); return false;
	            case 233: return this.primitiveSetFullScreen(argCount);
	            case 234: if (this.oldPrims) return this.namedPrimitive('MiscPrimitivePlugin', 'primitiveDecompressFromByteArray', argCount);
	            case 235: if (this.oldPrims) return this.namedPrimitive('MiscPrimitivePlugin', 'primitiveCompareString', argCount);
	            case 236: if (this.oldPrims) return this.namedPrimitive('MiscPrimitivePlugin', 'primitiveConvert8BitSigned', argCount);
	            case 237: if (this.oldPrims) return this.namedPrimitive('MiscPrimitivePlugin', 'primitiveCompressToByteArray', argCount);
	                break;  // fail 234-237 if fell through
	            case 238: if (this.oldPrims) return this.namedPrimitive('SerialPlugin', 'primitiveSerialPortOpen', argCount);
	                else return this.namedPrimitive('FloatArrayPlugin', 'primitiveAt', argCount);
	            case 239: if (this.oldPrims) return this.namedPrimitive('SerialPlugin', 'primitiveSerialPortClose', argCount);
	                else return this.namedPrimitive('FloatArrayPlugin', 'primitiveAtPut', argCount);
	            case 240: if (this.oldPrims) return this.namedPrimitive('SerialPlugin', 'primitiveSerialPortWrite', argCount);
	                else return this.popNandPushIfOK(argCount+1, this.microsecondClockUTC());
	            case 241: if (this.oldPrims) return this.namedPrimitive('SerialPlugin', 'primitiveSerialPortRead', argCount);
	                else return this.popNandPushIfOK(argCount+1, this.microsecondClockLocal());
	            case 242: if (this.oldPrims) break; // unused
	                else return this.primitiveSignalAtUTCMicroseconds(argCount);
	            case 243: if (this.oldPrims) return this.namedPrimitive('MiscPrimitivePlugin', 'primitiveTranslateStringWithTable', argCount);
	                else this.vm.warnOnce("missing primitive: 243 (primitiveUpdateTimeZone)"); return false;
	            case 244: if (this.oldPrims) return this.namedPrimitive('MiscPrimitivePlugin', 'primitiveFindFirstInString' , argCount);
	            case 245: if (this.oldPrims) return this.namedPrimitive('MiscPrimitivePlugin', 'primitiveIndexOfAsciiInString', argCount);
	            case 246: if (this.oldPrims) return this.namedPrimitive('MiscPrimitivePlugin', 'primitiveFindSubstring', argCount);
	                break;  // fail 243-246 if fell through
	            // 247: unused
	            case 248: return this.primitiveArrayBecome(argCount, false, false); // one way, do not copy hash
	            case 249: return this.primitiveArrayBecome(argCount, false, true); // one way, opt. copy hash
	            case 254: return this.primitiveVMParameter(argCount);
	            //MIDI Primitives (520-539)
	            case 521: return this.namedPrimitive('MIDIPlugin', 'primitiveMIDIClosePort', argCount);
	            case 522: return this.namedPrimitive('MIDIPlugin', 'primitiveMIDIGetClock', argCount);
	            case 523: return this.namedPrimitive('MIDIPlugin', 'primitiveMIDIGetPortCount', argCount);
	            case 524: return this.namedPrimitive('MIDIPlugin', 'primitiveMIDIGetPortDirectionality', argCount);
	            case 525: return this.namedPrimitive('MIDIPlugin', 'primitiveMIDIGetPortName', argCount);
	            case 526: return this.namedPrimitive('MIDIPlugin', 'primitiveMIDIOpenPort', argCount);
	            case 527: return this.namedPrimitive('MIDIPlugin', 'primitiveMIDIParameterGetOrSet', argCount);
	            case 528: return this.namedPrimitive('MIDIPlugin', 'primitiveMIDIRead', argCount);
	            case 529: return this.namedPrimitive('MIDIPlugin', 'primitiveMIDIWrite', argCount);
	            // 530-539: reserved for extended MIDI primitives
	            // Sound Codec Primitives
	            case 550: return this.namedPrimitive('ADPCMCodecPlugin', 'primitiveDecodeMono', argCount);
	            case 551: return this.namedPrimitive('ADPCMCodecPlugin', 'primitiveDecodeStereo', argCount);
	            case 552: return this.namedPrimitive('ADPCMCodecPlugin', 'primitiveEncodeMono', argCount);
	            case 553: return this.namedPrimitive('ADPCMCodecPlugin', 'primitiveEncodeStereo', argCount);
	            // External primitive support primitives (570-574)
	            // case 570: return this.primitiveFlushExternalPrimitives(argCount);
	            case 571: return this.primitiveUnloadModule(argCount);
	            case 572: return this.primitiveListBuiltinModule(argCount);
	            case 573: return this.primitiveListLoadedModule(argCount);
	            case 575: this.vm.warnOnce("missing primitive: 575 (primitiveHighBit)"); return false;
	            // this is not really a primitive, see findSelectorInClass()
	            case 576: return this.vm.primitiveInvokeObjectAsMethod(argCount, primMethod);
	            case 578: this.vm.warnOnce("missing primitive: 578 (primitiveSuspendAndBackupPC)"); return false; // see bit 5 of vmParameterAt: 65
	        }
	        console.error("primitive " + index + " not implemented yet");
	        return false;
	    },
	    namedPrimitive: function(modName, functionName, argCount) {
	        // duplicated in loadFunctionFrom()
	        var mod = modName === "" ? this : this.loadedModules[modName];
	        var justLoaded = false;
	        if (mod === undefined) { // null if earlier load failed
	            mod = this.loadModule(modName);
	            this.loadedModules[modName] = mod;
	            justLoaded = true;
	        }
	        var result = false;
	        var sp = this.vm.sp;
	        if (mod) {
	            this.interpreterProxy.argCount = argCount;
	            this.interpreterProxy.primitiveName = functionName;
	            var primitive = mod[functionName];
	            if (typeof primitive === "function") {
	                result = mod[functionName](argCount);
	            } else if (typeof primitive === "string") {
	                // allow late binding for built-ins
	                result = this[primitive](argCount);
	            } else {
	                this.vm.warnOnce("missing primitive: " + modName + "." + functionName);
	            }
	        } else if (justLoaded) {
	            if (this.success) this.vm.warnOnce("missing module: " + modName + " (" + functionName + ")");
	            else this.vm.warnOnce("failed to load module: " + modName + " (" + functionName + ")");
	        }
	        if ((result === true || (result !== false && this.success)) && this.vm.sp !== sp - argCount && !this.vm.frozen) {
	            this.vm.warnOnce("stack unbalanced after primitive " + modName + "." + functionName, "error");
	        }
	        if (result === true || result === false) return result;
	        return this.success;
	    },
	    doNamedPrimitive: function(argCount, primMethod) {
	        if (!primMethod.primFunction) {
	            if (primMethod.pointersSize() < 2) return false;
	            var firstLiteral = primMethod.pointers[1]; // skip method header
	            if (firstLiteral.pointersSize() !== 4) return false;
	            this.primMethod = primMethod;
	            var moduleName = firstLiteral.pointers[0].bytesAsString();
	            var functionName = firstLiteral.pointers[1].bytesAsString();
	            primMethod.primFunction = this.loadFunctionFrom(functionName, moduleName);
	            if (!primMethod.primFunction) return false;
	        }
	        this.interpreterProxy.argCount = argCount;
	        var sp = this.vm.sp;
	        var result = primMethod.primFunction(argCount);
	        if ((result === true || (result !== false && this.success)) && this.vm.sp !== sp - argCount && !this.vm.frozen) {
	            var firstLiteral = primMethod.pointers[1]; // skip method header
	            var moduleName = firstLiteral.pointers[0].bytesAsString();
	            var functionName = firstLiteral.pointers[1].bytesAsString();
	            this.vm.warnOnce("stack unbalanced after primitive " + moduleName + "." + functionName, "error");
	        }
	        if (result === true || result === false) return result;
	        return this.success;
	    },
	    fakePrimitive: function(prim, retVal, argCount) {
	        // fake a named primitive
	        // prim and retVal need to be curried when used:
	        //  this.fakePrimitive.bind(this, "Module.primitive", 42)
	        this.vm.warnOnce("faking primitive: " + prim);
	        if (retVal === undefined) this.vm.popN(argCount);
	        else this.vm.popNandPush(argCount+1, this.makeStObject(retVal));
	        return true;
	    },
	},
	'modules', {
	    loadModule: function(modName) {
	        var mod = Squeak.externalModules[modName] || this.builtinModules[modName] || this.loadModuleDynamically(modName);
	        if (!mod) return null;
	        if (this.patchModules[modName])
	            this.patchModule(mod, modName);
	        if (mod.setInterpreter) {
	            if (!mod.setInterpreter(this.interpreterProxy)) {
	                console.log("Wrong interpreter proxy version: " + modName);
	                return null;
	            }
	        }
	        var initFunc = mod.initialiseModule;
	        if (typeof initFunc === 'function') {
	            mod.initialiseModule();
	        } else if (typeof initFunc === 'string') {
	            // allow late binding for built-ins
	            this[initFunc]();
	        }
	        if (this.interpreterProxy.failed()) {
	            console.log("Module initialization failed: " + modName);
	            return null;
	        }
	        if (mod.getModuleName) modName = mod.getModuleName();
	        console.log("Loaded module: " + modName);
	        return mod;
	    },
	    loadModuleDynamically: function(modName) {
	        // Placeholder (can be replaced by a module loader at runtime, before starting the Squeak interpreter)
	        return undefined;
	    },
	    patchModule: function(mod, modName) {
	        var patch = this.patchModules[modName];
	        for (var key in patch)
	            mod[key] = patch[key];
	    },
	    unloadModule: function(modName) {
	        var mod = this.loadedModules[modName];
	        if (!modName || !mod|| mod === this) return null;
	        delete this.loadedModules[modName];
	        var unloadFunc = mod.unloadModule;
	        if (typeof unloadFunc === 'function') {
	            mod.unloadModule(this);
	        } else if (typeof unloadFunc === 'string') {
	            // allow late binding for built-ins
	            this[unloadFunc](this);
	        }
	        console.log("Unloaded module: " + modName);
	        return mod;
	    },
	    loadFunctionFrom: function(functionName, modName) {
	        // copy of namedPrimitive() returning the bound function instead of calling it
	        var mod = modName === "" ? this : this.loadedModules[modName];
	        if (mod === undefined) { // null if earlier load failed
	            mod = this.loadModule(modName);
	            this.loadedModules[modName] = mod;
	        }
	        if (!mod) return null;
	        var func = mod[functionName];
	        if (typeof func === "function") {
	            return func.bind(mod);
	        } else if (typeof func === "string") {
	            return (this[func]).bind(this);
	        }
	        this.vm.warnOnce("missing primitive: " + modName + "." + functionName);
	        return null;
	    },
	    primitiveUnloadModule: function(argCount) {
	        var moduleName = this.stackNonInteger(0).bytesAsString();
	        if (!moduleName) return false;
	        this.unloadModule(moduleName);
	        return this.popNIfOK(argCount);
	    },
	    primitiveListBuiltinModule: function(argCount) {
	        var index = this.stackInteger(0) - 1;
	        if (!this.success) return false;
	        var moduleNames = Object.keys(this.builtinModules);
	        return this.popNandPushIfOK(argCount + 1, this.makeStObject(moduleNames[index]));
	    },
	    primitiveListLoadedModule: function(argCount) {
	        var index = this.stackInteger(0) - 1;
	        if (!this.success) return false;
	        var moduleNames = [];
	        for (var key in this.loadedModules) {
	            var module = this.loadedModules[key];
	            if (module) {
	                var moduleName = module.getModuleName ? module.getModuleName() : key;
	                moduleNames.push(moduleName);
	            }
	        }
	        return this.popNandPushIfOK(argCount + 1, this.makeStObject(moduleNames[index]));
	    },
	},
	'stack access', {
	    popNIfOK: function(nToPop) {
	        if (!this.success) return false;
	        this.vm.popN(nToPop);
	        return true;
	    },
	    pop2andPushBoolIfOK: function(bool) {
	        this.vm.success = this.success;
	        return this.vm.pop2AndPushBoolResult(bool);
	    },
	    popNandPushBoolIfOK: function(nToPop, bool) {
	        if (!this.success) return false;
	        this.vm.popNandPush(nToPop, bool ? this.vm.trueObj : this.vm.falseObj);
	        return true;
	    },
	    popNandPushIfOK: function(nToPop, returnValue) {
	        if (!this.success || returnValue == null) return false;
	        this.vm.popNandPush(nToPop, returnValue);
	        return true;
	    },
	    popNandPushIntIfOK: function(nToPop, returnValue) {
	        if (!this.success || !this.vm.canBeSmallInt(returnValue)) return false;
	        this.vm.popNandPush(nToPop, returnValue);
	        return true;
	    },
	    popNandPushFloatIfOK: function(nToPop, returnValue) {
	        if (!this.success) return false;
	        this.vm.popNandPush(nToPop, this.makeFloat(returnValue));
	        return true;
	    },
	    stackNonInteger: function(nDeep) {
	        return this.checkNonInteger(this.vm.stackValue(nDeep));
	    },
	    stackInteger: function(nDeep) {
	        return this.checkSmallInt(this.vm.stackValue(nDeep));
	    },
	    stackPos32BitInt: function(nDeep) {
	        return this.positive32BitValueOf(this.vm.stackValue(nDeep));
	    },
	    pos32BitIntFor: function(signed32) {
	        // Return the 32-bit quantity as an unsigned 32-bit integer
	        if (signed32 >= 0 && signed32 <= Squeak.MaxSmallInt) return signed32;
	        var lgIntClass = this.vm.specialObjects[Squeak.splOb_ClassLargePositiveInteger],
	            lgIntObj = this.vm.instantiateClass(lgIntClass, 4),
	            bytes = lgIntObj.bytes;
	        for (var i=0; i<4; i++)
	            bytes[i] = (signed32>>>(8*i)) & 255;
	        return lgIntObj;
	    },
	    pos53BitIntFor: function(longlong) {
	        // Return the quantity as an unsigned 64-bit integer
	        if (longlong <= 0xFFFFFFFF) return this.pos32BitIntFor(longlong);
	        if (longlong > 0x1FFFFFFFFFFFFF) {
	            console.warn("Out of range: pos53BitIntFor(" + longlong + ")");
	            this.success = false;
	            return 0;
	        }	        var sz = longlong <= 0xFFFFFFFFFF ? 5 :
	                 longlong <= 0xFFFFFFFFFFFF ? 6 :
	                 7;
	        var lgIntClass = this.vm.specialObjects[Squeak.splOb_ClassLargePositiveInteger],
	            lgIntObj = this.vm.instantiateClass(lgIntClass, sz),
	            bytes = lgIntObj.bytes;
	        for (var i = 0; i < sz; i++) {
	            bytes[i] = longlong & 255;
	            longlong /= 256;
	        }
	        return lgIntObj;
	    },
	    stackSigned32BitInt: function(nDeep) {
	        var stackVal = this.vm.stackValue(nDeep);
	        if (typeof stackVal === "number") {   // SmallInteger
	            return stackVal;
	        }
	        if (stackVal.bytesSize() !== 4) {
	            this.success = false;
	            return 0;
	        }
	        var bytes = stackVal.bytes,
	            value = 0;
	        for (var i = 0, f = 1; i < 4; i++, f *= 256)
	            value += bytes[i] * f;
	        if (this.isA(stackVal, Squeak.splOb_ClassLargePositiveInteger) && value <= 0x7FFFFFFF)
	            return value;
	        if (this.isA(stackVal, Squeak.splOb_ClassLargeNegativeInteger) && -value >= -0x80000000)
	            return -value;
	        this.success = false;
	        return 0;
	    },
	    signed32BitIntegerFor: function(signed32) {
	        // Return the 32-bit quantity as a signed 32-bit integer
	        if (signed32 >= Squeak.MinSmallInt && signed32 <= Squeak.MaxSmallInt) return signed32;
	        var negative = signed32 < 0,
	            unsigned = negative ? -signed32 : signed32,
	            lgIntClass = negative ? Squeak.splOb_ClassLargeNegativeInteger : Squeak.splOb_ClassLargePositiveInteger,
	            lgIntObj = this.vm.instantiateClass(this.vm.specialObjects[lgIntClass], 4),
	            bytes = lgIntObj.bytes;
	        for (var i=0; i<4; i++)
	            bytes[i] = (unsigned>>>(8*i)) & 255;
	        return lgIntObj;
	    },
	    stackFloat: function(nDeep) {
	        return this.checkFloat(this.vm.stackValue(nDeep));
	    },
	    stackBoolean: function(nDeep) {
	        return this.checkBoolean(this.vm.stackValue(nDeep));
	    },
	    stackSigned53BitInt:function(nDeep) {
	        var stackVal = this.vm.stackValue(nDeep);
	        if (typeof stackVal === "number") {   // SmallInteger
	            return stackVal;
	        }
	        var n = stackVal.bytesSize();
	        if (n <= 7) {
	            var bytes = stackVal.bytes,
	                value = 0;
	            for (var i = 0, f = 1; i < n; i++, f *= 256)
	                value += bytes[i] * f;
	            if (value <= 0x1FFFFFFFFFFFFF) {
	                if (this.isA(stackVal, Squeak.splOb_ClassLargePositiveInteger))
	                    return value;
	                if (this.isA(stackVal, Squeak.splOb_ClassLargeNegativeInteger))
	                    return -value;
	            }
	        }
	        this.success = false;
	        return 0;
	    },
	},
	'numbers', {
	    doBitAnd: function() {
	        var rcvr = this.stackPos32BitInt(1);
	        var arg = this.stackPos32BitInt(0);
	        if (!this.success) return 0;
	        return this.pos32BitIntFor(rcvr & arg);
	    },
	    doBitOr: function() {
	        var rcvr = this.stackPos32BitInt(1);
	        var arg = this.stackPos32BitInt(0);
	        if (!this.success) return 0;
	        return this.pos32BitIntFor(rcvr | arg);
	    },
	    doBitXor: function() {
	        var rcvr = this.stackPos32BitInt(1);
	        var arg = this.stackPos32BitInt(0);
	        if (!this.success) return 0;
	        return this.pos32BitIntFor(rcvr ^ arg);
	    },
	    doBitShift: function() {
	        // SmallInts are handled by the bytecode,
	        // so rcvr is a LargeInteger
	        var rcvr = this.stackPos32BitInt(1);
	        var arg = this.stackInteger(0);
	        if (!this.success) return 0;
	        // we're not using safeShift() here because we want the full 32 bits
	        // and we know the receiver is unsigned
	        var result;
	        if (arg < 0) {
	            if (arg < -31) return 0; // JS would treat arg=32 as arg=0
	            result = rcvr >>> -arg;
	        } else {
	            if (arg > 31) {
	                this.success = false; // rcvr is never 0
	                return 0;
	            }
	            result = rcvr << arg;
	            // check for lost bits by seeing if computation is reversible
	            if ((result >>> arg) !== rcvr) {
	                this.success = false;
	                return 0;
	            }
	        }
	        return this.pos32BitIntFor(result);
	    },
	    safeFDiv: function(dividend, divisor) {
	        if (divisor === 0.0) {
	            this.success = false;
	            return 1.0;
	        }
	        return dividend / divisor;
	    },
	    floatAsSmallInt: function(float) {
	        var truncated = float >= 0 ? Math.floor(float) : Math.ceil(float);
	        return this.ensureSmallInt(truncated);
	    },
	    floatFractionPart: function(float) {
	        if (-9007199254740991 /* -((1 << 53) - 1) */ <= float && float <= 9007199254740991 /* (1 << 53) - 1 */) {
	            return float - Math.floor(float);
	        } else {
	            this.success = false;
	            return 0;
	        }
	    },
	    frexp_exponent: function(value) {
	        // frexp separates a float into its mantissa and exponent
	        if (value == 0.0) return 0;     // zero is special
	        var data = new DataView(new ArrayBuffer(8));
	        data.setFloat64(0, value);      // for accessing IEEE-754 exponent bits
	        var bits = (data.getUint32(0) >>> 20) & 0x7FF;
	        if (bits === 0) { // we have a subnormal float (actual zero was handled above)
	            // make it normal by multiplying a large number
	            data.setFloat64(0, value * Math.pow(2, 64));
	            // access its exponent bits, and subtract the large number's exponent
	            bits = ((data.getUint32(0) >>> 20) & 0x7FF) - 64;
	        }
	        var exponent = bits - 1022;                 // apply bias
	        // mantissa = this.ldexp(value, -exponent)  // not needed for Squeak
	        return exponent;
	    },
	    ldexp: function(mantissa, exponent) {
	        // construct a float as mantissa * 2 ^ exponent
	        // avoid multiplying by Infinity and Zero and rounding errors
	        // by splitting the exponent (thanks to Nicolas Cellier)
	        // 3 multiplies needed for e.g. ldexp(5e-324, 1023+1074)
	        var steps = Math.min(3, Math.ceil(Math.abs(exponent) / 1023));
	        var result = mantissa;
	        for (var i = 0; i < steps; i++)
	            result *= Math.pow(2, Math.floor((exponent + i) / steps));
	        return result;
	    },
	    primitiveRemLargeIntegers: function(argCount) {
	        return this.popNandPushIfOK(argCount + 1, this.makeStObject(this.stackSigned53BitInt(1) % this.stackSigned53BitInt(0)));
	    },
	    primitiveAddLargeIntegers: function(argCount) {
	        return this.popNandPushIfOK(argCount + 1, this.makeStObject(this.stackSigned53BitInt(1) + this.stackSigned53BitInt(0)));
	    },
	    primitiveSubtractLargeIntegers: function(argCount) {
	        return this.popNandPushIfOK(argCount + 1, this.makeStObject(this.stackSigned53BitInt(1) - this.stackSigned53BitInt(0)));
	    },
	    primitiveLessThanLargeIntegers: function(argCount) {
	        return this.popNandPushBoolIfOK(argCount+1, this.stackSigned53BitInt(1) < this.stackSigned53BitInt(0));
	    },
	    primitiveGreaterThanLargeIntegers: function(argCount) {
	        return this.popNandPushBoolIfOK(argCount+1, this.stackSigned53BitInt(1) > this.stackSigned53BitInt(0));
	    },
	    primitiveLessOrEqualLargeIntegers: function(argCount) {
	        return this.popNandPushBoolIfOK(argCount+1, this.stackSigned53BitInt(1) <= this.stackSigned53BitInt(0));
	    },
	    primitiveGreaterOrEqualLargeIntegers: function(argCount) {
	        return this.popNandPushBoolIfOK(argCount+1, this.stackSigned53BitInt(1) >= this.stackSigned53BitInt(0));
	    },
	    primitiveEqualLargeIntegers: function(argCount) {
	        return this.popNandPushBoolIfOK(argCount+1, this.stackSigned53BitInt(1) === this.stackSigned53BitInt(0));
	    },
	    primitiveNotEqualLargeIntegers: function(argCount) {
	        return this.popNandPushBoolIfOK(argCount+1, this.stackSigned53BitInt(1) !== this.stackSigned53BitInt(0));
	    },
	    primitiveMultiplyLargeIntegers: function(argCount) {
	        return this.popNandPushIfOK(argCount + 1, this.makeStObject(this.stackSigned53BitInt(1) * this.stackSigned53BitInt(0)));
	    },
	    primitiveDivideLargeIntegers: function(argCount) {
	        return this.popNandPushIfOK(argCount + 1, this.makeStObject(this.stackSigned53BitInt(1) / this.stackSigned53BitInt(0)));
	    },
	    primitiveModLargeIntegers: function(argCount) {
	        return this.popNandPushIfOK(argCount + 1, this.makeStObject(Math.floor(this.stackSigned53BitInt(1) % this.stackSigned53BitInt(0))));
	    },
	    primitiveDivLargeIntegers: function(argCount) {
	        return this.popNandPushIfOK(argCount + 1, this.makeStObject(Math.floor(this.stackSigned53BitInt(1) / this.stackSigned53BitInt(0))));
	    },
	    primitiveQuoLargeIntegers: function(argCount) {
	        return this.popNandPushIfOK(argCount + 1, this.makeStObject(Math.trunc(this.stackSigned53BitInt(1) / this.stackSigned53BitInt(0))));
	    },
	},
	'utils', {
	    floatOrInt: function(obj) {
	        if (obj.isFloat) return obj.float;
	        if (typeof obj === "number") return obj;  // SmallInteger
	        return 0;
	    },
	    positive32BitValueOf: function(obj) {
	        if (typeof obj === "number") { // SmallInteger
	            if (obj >= 0)
	                return obj;
	            this.success = false;
	            return 0;
	        }
	        if (!this.isA(obj, Squeak.splOb_ClassLargePositiveInteger) || obj.bytesSize() !== 4) {
	            this.success = false;
	            return 0;
	        }
	        var bytes = obj.bytes,
	            value = 0;
	        for (var i = 0, f = 1; i < 4; i++, f *= 256)
	            value += bytes[i] * f;
	        return value;
	    },
	    checkFloat: function(maybeFloat) { // returns a number and sets success
	        if (maybeFloat.isFloat)
	            return maybeFloat.float;
	        if (typeof maybeFloat === "number")  // SmallInteger
	            return maybeFloat;
	        this.success = false;
	        return 0.0;
	    },
	    checkSmallInt: function(maybeSmall) { // returns an int and sets success
	        if (typeof maybeSmall === "number")
	            return maybeSmall;
	        this.success = false;
	        return 0;
	    },
	    checkNonInteger: function(obj) { // returns a SqObj and sets success
	        if (typeof obj !== "number")
	            return obj;
	        this.success = false;
	        return this.vm.nilObj;
	    },
	    checkBoolean: function(obj) { // returns true/false and sets success
	        if (obj.isTrue) return true;
	        if (obj.isFalse) return false;
	        return this.success = false;
	    },
	    indexableSize: function(obj) {
	        if (typeof obj === "number") return -1; // -1 means not indexable
	        return obj.indexableSize(this);
	    },
	    isA: function(obj, knownClass) {
	        return obj.sqClass === this.vm.specialObjects[knownClass];
	    },
	    isKindOf: function(obj, knownClass) {
	        var classOrSuper = obj.sqClass;
	        var theClass = this.vm.specialObjects[knownClass];
	        while (!classOrSuper.isNil) {
	            if (classOrSuper === theClass) return true;
	            classOrSuper = classOrSuper.pointers[Squeak.Class_superclass];
	        }
	        return false;
	    },
	    isAssociation: function(obj) {
	        return typeof obj !== "number" && obj.pointersSize() == 2;
	    },
	    ensureSmallInt: function(number) {
	        if (number === (number|0) && this.vm.canBeSmallInt(number))
	            return number;
	        this.success = false;
	        return 0;
	    },
	    charFromInt: function(ascii) {
	        var charTable = this.vm.specialObjects[Squeak.splOb_CharacterTable];
	        var char = charTable.pointers[ascii];
	        if (char) return char;
	        var charClass = this.vm.specialObjects[Squeak.splOb_ClassCharacter];
	        char = this.vm.instantiateClass(charClass, 0);
	        char.pointers[0] = ascii;
	        return char;
	    },
	    charFromIntSpur: function(unicode) {
	        return this.vm.image.getCharacter(unicode);
	    },
	    charToInt: function(obj) {
	        return obj.pointers[0];
	    },
	    charToIntSpur: function(obj) {
	        return obj.hash;
	    },
	    makeFloat: function(value) {
	        var floatClass = this.vm.specialObjects[Squeak.splOb_ClassFloat];
	        var newFloat = this.vm.instantiateClass(floatClass, 2);
	        newFloat.float = value;
	        return newFloat;
	    },
	    makeLargeIfNeeded: function(integer) {
	        return this.vm.canBeSmallInt(integer) ? integer : this.makeLargeInt(integer);
	    },
	    makeLargeInt: function(integer) {
	        if (integer < 0) throw Error("negative large ints not implemented yet");
	        if (integer > 0xFFFFFFFF) throw Error("large large ints not implemented yet");
	        return this.pos32BitIntFor(integer);
	    },
	    makePointWithXandY: function(x, y) {
	        var pointClass = this.vm.specialObjects[Squeak.splOb_ClassPoint];
	        var newPoint = this.vm.instantiateClass(pointClass, 0);
	        newPoint.pointers[Squeak.Point_x] = x;
	        newPoint.pointers[Squeak.Point_y] = y;
	        return newPoint;
	    },
	    makeStArray: function(jsArray, proxyClass) {
	        var array = this.vm.instantiateClass(this.vm.specialObjects[Squeak.splOb_ClassArray], jsArray.length);
	        for (var i = 0; i < jsArray.length; i++)
	            array.pointers[i] = this.makeStObject(jsArray[i], proxyClass);
	        return array;
	    },
	    makeStByteArray: function(jsArray) {
	        var array = this.vm.instantiateClass(this.vm.specialObjects[Squeak.splOb_ClassByteArray], jsArray.length);
	        for (var i = 0; i < jsArray.length; i++)
	            array.bytes[i] = jsArray[i] & 0xff;
	        return array;
	    },
	    makeStString: function(jsString) {
	        var stString = this.vm.instantiateClass(this.vm.specialObjects[Squeak.splOb_ClassString], jsString.length);
	        for (var i = 0; i < jsString.length; ++i)
	            stString.bytes[i] = jsString.charCodeAt(i) & 0xFF;
	        return stString;
	    },
	    makeStStringFromBytes: function(bytes, zeroTerminated) {
	        var length = bytes.length;
	        if (zeroTerminated) {
	            length = bytes.indexOf(0);
	            if (length < 0) length = bytes.length;
	        }
	        var stString = this.vm.instantiateClass(this.vm.specialObjects[Squeak.splOb_ClassString], length);
	        for (var i = 0; i < length; ++i)
	            stString.bytes[i] = bytes[i];
	        return stString;
	    },
	    makeStObject: function(obj, proxyClass) {
	        if (obj === undefined || obj === null) return this.vm.nilObj;
	        if (obj === true) return this.vm.trueObj;
	        if (obj === false) return this.vm.falseObj;
	        if (obj.sqClass) return obj;
	        if (typeof obj === "number")
	            if (obj === (obj|0)) return this.makeLargeIfNeeded(obj);
	            else return this.makeFloat(obj);
	        if (proxyClass) {   // wrap in JS proxy instance
	            var stObj = this.vm.instantiateClass(proxyClass, 0);
	            stObj.jsObject = obj;
	            return stObj;
	        }
	        // A direct test of the buffer's constructor doesn't work on Safari 10.0.
	        if (typeof obj === "string" || obj.constructor.name === "Uint8Array") return this.makeStString(obj);
	        if (obj.constructor.name === "Array") return this.makeStArray(obj);
	        throw Error("cannot make smalltalk object");
	    },
	    pointsTo: function(rcvr, arg) {
	        if (!rcvr.pointers) return false;
	        return rcvr.pointers.indexOf(arg) >= 0;
	    },
	    asUint8Array: function(buffer) {
	        // A direct test of the buffer's constructor doesn't work on Safari 10.0.
	        if (buffer.constructor.name === "Uint8Array") return buffer;
	        if (buffer.constructor.name === "ArrayBuffer") return new Uint8Array(buffer);
	        if (typeof buffer === "string") {
	            var array = new Uint8Array(buffer.length);
	            for (var i = 0; i < buffer.length; i++)
	                array[i] = buffer.charCodeAt(i);
	            return array;
	        }
	        throw Error("unknown buffer type");
	    },
	    filenameToSqueak: function(unixpath) {
	        var slash = unixpath[0] !== "/" ? "/" : "",
	            filepath = "/SqueakJS" + slash + unixpath;                      // add SqueakJS
	        if (this.emulateMac)
	            filepath = ("Macintosh HD" + filepath)                          // add Mac volume
	                .replace(/\//g, "€").replace(/:/g, "/").replace(/€/g, ":"); // substitute : for /
	        return filepath;
	    },
	    filenameFromSqueak: function(filepath) {
	        var unixpath = !this.emulateMac ? filepath :
	            filepath.replace(/^[^:]*:/, ":")                            // remove volume
	            .replace(/\//g, "€").replace(/:/g, "/").replace(/€/g, ":"); // substitute : for /
	        unixpath = unixpath.replace(/^\/*SqueakJS\/?/, "/");            // strip SqueakJS /**/
	        return unixpath;
	    },
	},
	'indexing', {
	    objectAt: function(cameFromBytecode, convertChars, includeInstVars) {
	        //Returns result of at: or sets success false
	        var array = this.stackNonInteger(1);
	        var index = this.stackPos32BitInt(0); //note non-int returns zero
	        if (!this.success) return array;
	        var info;
	        if (cameFromBytecode) {// fast entry checks cache
	            info = this.atCache[array.hash & this.atCacheMask];
	            if (info.array !== array) {this.success = false; return array;}
	        } else {// slow entry installs in cache if appropriate
	            if (array.isFloat) { // present float as word array
	                var floatData = array.floatData();
	                if (index==1) return this.pos32BitIntFor(floatData.getUint32(0, false));
	                if (index==2) return this.pos32BitIntFor(floatData.getUint32(4, false));
	                this.success = false; return array;
	            }
	            info = this.makeAtCacheInfo(this.atCache, this.vm.specialSelectors[32], array, convertChars, includeInstVars);
	        }
	        if (index < 1 || index > info.size) {this.success = false; return array;}
	        if (includeInstVars)  //pointers...   instVarAt and objectAt
	            return array.pointers[index-1];
	        if (array.isPointers())   //pointers...   normal at:
	            return array.pointers[index-1+info.ivarOffset];
	        if (array.isWords()) // words...
	            if (info.convertChars) return this.charFromInt(array.words[index-1] & 0x3FFFFFFF);
	            else return this.pos32BitIntFor(array.words[index-1]);
	        if (array.isBytes()) // bytes...
	            if (info.convertChars) return this.charFromInt(array.bytes[index-1] & 0xFF);
	            else return array.bytes[index-1] & 0xFF;
	        // methods must simulate Squeak's method indexing
	        var offset = array.pointersSize() * 4;
	        if (index-1-offset < 0) {this.success = false; return array;} //reading lits as bytes
	        return array.bytes[index-1-offset] & 0xFF;
	    },
	    objectAtPut: function(cameFromBytecode, convertChars, includeInstVars) {
	        //Returns result of at:put: or sets success false
	        var array = this.stackNonInteger(2);
	        var index = this.stackPos32BitInt(1); //note non-int returns zero
	        if (!this.success) return array;
	        var info;
	        if (cameFromBytecode) {// fast entry checks cache
	            info = this.atPutCache[array.hash & this.atCacheMask];
	            if (info.array !== array) {this.success = false; return array;}
	        } else {// slow entry installs in cache if appropriate
	            if (array.isFloat) { // present float as word array
	                var wordToPut = this.stackPos32BitInt(0);
	                if (this.success && (index == 1 || index == 2)) {
	                    var floatData = array.floatData();
	                    floatData.setUint32(index == 1 ? 0 : 4, wordToPut, false);
	                    array.float = floatData.getFloat64(0);
	                } else this.success = false;
	                return this.vm.stackValue(0);
	            }
	            info = this.makeAtCacheInfo(this.atPutCache, this.vm.specialSelectors[34], array, convertChars, includeInstVars);
	        }
	        if (index<1 || index>info.size) {this.success = false; return array;}
	        var objToPut = this.vm.stackValue(0);
	        if (includeInstVars)  {// pointers...   instVarAtPut and objectAtPut
	            array.dirty = true;
	            return array.pointers[index-1] = objToPut; //eg, objectAt:
	        }
	        if (array.isPointers())  {// pointers...   normal atPut
	            array.dirty = true;
	            return array.pointers[index-1+info.ivarOffset] = objToPut;
	        }
	        var intToPut;
	        if (array.isWords()) {  // words...
	            if (convertChars) {
	                // put a character...
	                if (objToPut.sqClass !== this.vm.specialObjects[Squeak.splOb_ClassCharacter])
	                    {this.success = false; return objToPut;}
	                intToPut = this.charToInt(objToPut);
	                if (typeof intToPut !== "number") {this.success = false; return objToPut;}
	            } else {
	                intToPut = this.stackPos32BitInt(0);
	            }
	            if (this.success) array.words[index-1] = intToPut;
	            return objToPut;
	        }
	        // bytes...
	        if (convertChars) {
	            // put a character...
	            if (objToPut.sqClass !== this.vm.specialObjects[Squeak.splOb_ClassCharacter])
	                {this.success = false; return objToPut;}
	            intToPut = this.charToInt(objToPut);
	            if (typeof intToPut !== "number") {this.success = false; return objToPut;}
	        } else { // put a byte...
	            if (typeof objToPut !== "number") {this.success = false; return objToPut;}
	            intToPut = objToPut;
	        }
	        if (intToPut<0 || intToPut>255) {this.success = false; return objToPut;}
	        if (array.isBytes())  // bytes...
	            {array.bytes[index-1] = intToPut; return objToPut;}
	        // methods must simulate Squeak's method indexing
	        var offset = array.pointersSize() * 4;
	        if (index-1-offset < 0) {this.success = false; return array;} //writing lits as bytes
	        array.bytes[index-1-offset] = intToPut;
	        return objToPut;
	    },
	    objectSize: function(cameFromBytecode) {
	        var rcvr = this.vm.stackValue(0),
	            size = -1;
	        if (cameFromBytecode) {
	            // must only handle classes with size == basicSize, fail otherwise
	            if (rcvr.sqClass === this.vm.specialObjects[Squeak.splOb_ClassArray]) {
	                size = rcvr.pointersSize();
	            } else if (rcvr.sqClass === this.vm.specialObjects[Squeak.splOb_ClassString]) {
	                size = rcvr.bytesSize();
	            }
	        } else { // basicSize
	            size = this.indexableSize(rcvr);
	        }
	        if (size === -1) {this.success = false; return -1}	        return this.pos32BitIntFor(size);
	    },
	    initAtCache: function() {
	        // The purpose of the at-cache is to allow fast (bytecode) access to at/atput code
	        // without having to check whether this object has overridden at, etc.
	        this.atCacheSize = 32; // must be power of 2
	        this.atCacheMask = this.atCacheSize - 1; //...so this is a mask
	        this.atCache = [];
	        this.atPutCache = [];
	        this.nonCachedInfo = {};
	        for (var i= 0; i < this.atCacheSize; i++) {
	            this.atCache.push({});
	            this.atPutCache.push({});
	        }
	    },
	    makeAtCacheInfo: function(atOrPutCache, atOrPutSelector, array, convertChars, includeInstVars) {
	        //Make up an info object and store it in the atCache or the atPutCache.
	        //If it's not cacheable (not a non-super send of at: or at:put:)
	        //then return the info in nonCachedInfo.
	        //Note that info for objectAt (includeInstVars) will have
	        //a zero ivarOffset, and a size that includes the extra instVars
	        var info;
	        var cacheable =
	            (this.vm.verifyAtSelector === atOrPutSelector)         //is at or atPut
	            && (this.vm.verifyAtClass === array.sqClass)           //not a super send
	            && !this.vm.isContext(array);                          //not a context (size can change)
	        info = cacheable ? atOrPutCache[array.hash & this.atCacheMask] : this.nonCachedInfo;
	        info.array = array;
	        info.convertChars = convertChars;
	        if (includeInstVars) {
	            info.size = array.instSize() + Math.max(0, array.indexableSize(this));
	            info.ivarOffset = 0;
	        } else {
	            info.size = array.indexableSize(this);
	            info.ivarOffset = array.isPointers() ? array.instSize() : 0;
	        }
	        return info;
	    },
	},
	'basic',{
	    instantiateClass: function(clsObj, indexableSize) {
	        if (indexableSize * 4 > this.vm.image.bytesLeft()) {
	            // we're not really out of memory, we have no idea how much memory is available
	            // but we need to stop runaway allocations
	            console.warn("squeak: out of memory, failing allocation");
	            this.success = false;
	            this.vm.primFailCode = Squeak.PrimErrNoMemory;
	            return null;
	        } else {
	            return this.vm.instantiateClass(clsObj, indexableSize);
	        }
	    },
	    someObject: function() {
	        return this.vm.image.firstOldObject;
	    },
	    nextObject: function(obj) {
	        return this.vm.image.objectAfter(obj) || 0;
	    },
	    someInstanceOf: function(clsObj) {
	        var someInstance = this.vm.image.someInstanceOf(clsObj);
	        if (someInstance) return someInstance;
	        this.success = false;
	        return 0;
	    },
	    nextInstanceAfter: function(obj) {
	        var nextInstance = this.vm.image.nextInstanceAfter(obj);
	        if (nextInstance) return nextInstance;
	        this.success = false;
	        return 0;
	    },
	    allInstancesOf: function(clsObj) {
	        var instances = this.vm.image.allInstancesOf(clsObj);
	        var array = this.vm.instantiateClass(this.vm.specialObjects[Squeak.splOb_ClassArray], instances.length);
	        array.pointers = instances;
	        return array;
	    },
	    identityHash: function(obj) {
	        return obj.hash;
	    },
	    identityHashSpur: function(obj) {
	        var hash = obj.hash;
	        if (hash > 0) return hash;
	        return obj.hash = this.newObjectHash();
	    },
	    behaviorHash: function(obj) {
	        var hash = obj.hash;
	        if (hash > 0) return hash;
	        return this.vm.image.enterIntoClassTable(obj);
	    },
	    newObjectHash: function(obj) {
	        return Math.floor(Math.random() * 0x3FFFFE) + 1;
	    },
	    primitivePin: function(argCount) {
	        // For us, pinning is a no-op, so we just toggle the pinned flag
	        var rcvr = this.stackNonInteger(1),
	            pin = this.stackBoolean(0);
	        if (!this.success) return false;
	        var wasPinned = rcvr.pinned;
	        rcvr.pinned = pin;
	        return this.popNandPushIfOK(argCount + 1, this.makeStObject(!!wasPinned));
	    },
	    primitiveIsPinned: function(argCount) {
	        var rcvr = this.stackNonInteger(0);
	        if (!this.success) return false;
	        return this.popNandPushIfOK(argCount + 1, this.makeStObject(!!rcvr.pinned));
	    },
	    primitiveSizeInBytesOfInstance: function(argCount) {
	        if (argCount > 1) return false;
	        var classObj = this.stackNonInteger(argCount),
	            nElements = argCount ? this.stackInteger(0) : 0,
	            bytes = classObj.classByteSizeOfInstance(nElements);
	        return this.popNandPushIfOK(argCount + 1, this.makeLargeIfNeeded(bytes));
	    },
	    primitiveSizeInBytes: function(argCount) {
	        var object = this.stackNonInteger(0),
	            bytes = object.totalBytes();
	        return this.popNandPushIfOK(argCount + 1, this.makeLargeIfNeeded(bytes));
	    },
	    primitiveAsCharacter: function(argCount) {
	        var unicode = this.stackInteger(0);
	        if (unicode < 0 || unicode > 0x3FFFFFFF) return false;
	        var char = this.charFromInt(unicode);
	        if (!char) return false;
	        return this.popNandPushIfOK(argCount + 1, char);
	    },
	    primitiveFullGC: function(argCount) {
	        this.vm.image.fullGC("primitive");
	        var bytes = this.vm.image.bytesLeft();
	        return this.popNandPushIfOK(argCount+1, this.makeLargeIfNeeded(bytes));
	    },
	    primitivePartialGC: function(argCount) {
	        var young = this.vm.image.partialGC("primitive");
	        var youngSpaceBytes = 0;
	        while (young) {
	            youngSpaceBytes += young.totalBytes();
	            young = young.nextObject;
	        }
	        console.log("    old space: " + this.vm.image.oldSpaceBytes.toLocaleString() + " bytes, " +
	            "young space: " + youngSpaceBytes.toLocaleString() + " bytes, " +
	            "total: " + (this.vm.image.oldSpaceBytes + youngSpaceBytes).toLocaleString() + " bytes");
	        var bytes = this.vm.image.bytesLeft() - youngSpaceBytes;
	        return this.popNandPushIfOK(argCount+1, this.makeLargeIfNeeded(bytes));
	    },
	    primitiveMakePoint: function(argCount, checkNumbers) {
	        var x = this.vm.stackValue(1);
	        var y = this.vm.stackValue(0);
	        if (checkNumbers) {
	            this.checkFloat(x);
	            this.checkFloat(y);
	            if (!this.success) return false;
	        }
	        this.vm.popNandPush(1+argCount, this.makePointWithXandY(x, y));
	        return true;
	    },
	    primitiveStoreStackp: function(argCount) {
	        var ctxt = this.stackNonInteger(1),
	            newStackp = this.stackInteger(0);
	        if (!this.success || newStackp < 0 || this.vm.decodeSqueakSP(newStackp) >= ctxt.pointers.length)
	            return false;
	        var stackp = ctxt.pointers[Squeak.Context_stackPointer];
	        while (stackp < newStackp)
	            ctxt.pointers[this.vm.decodeSqueakSP(++stackp)] = this.vm.nilObj;
	        ctxt.pointers[Squeak.Context_stackPointer] = newStackp;
	        this.vm.popN(argCount);
	        return true;
	    },
	    primitiveChangeClass: function(argCount) {
	        if (argCount > 2) return false;
	        var rcvr = this.stackNonInteger(1),
	            arg = this.stackNonInteger(0);
	        if (!this.changeClassTo(rcvr, arg.sqClass)) {
	            return false;
	        }
	        return this.popNIfOK(argCount);
	    },
	    primitiveAdoptInstance: function(argCount) {
	        if (argCount > 2) return false;
	        var cls = this.stackNonInteger(1),
	            obj = this.stackNonInteger(0);
	        if (!this.changeClassTo(obj, cls)) {
	            return false;
	        }
	        return this.popNIfOK(argCount);
	    },
	    changeClassTo: function(rcvr, cls) {
	        if (rcvr.sqClass.isCompact !== cls.isCompact) return false;
	        var classInstIsPointers = cls.classInstIsPointers();
	        if (rcvr.isPointers()) {
	            if (!classInstIsPointers) return false;
	            if (rcvr.sqClass.classInstSize() !== cls.classInstSize())
	                return false;
	        } else {
	            if (classInstIsPointers) return false;
	            var hasBytes = rcvr.isBytes(),
	                needBytes = cls.classInstIsBytes();
	            if (hasBytes && !needBytes) {
	                if (rcvr.bytes) {
	                    if (rcvr.bytes.length & 3) return false;
	                    rcvr.words = new Uint32Array(rcvr.bytes.buffer);
	                    delete rcvr.bytes;
	                }
	            } else if (!hasBytes && needBytes) {
	                if (rcvr.words) {
	                    rcvr.bytes = new Uint8Array(rcvr.words.buffer);
	                    delete rcvr.words;
	                }
	            }
	        }
	        rcvr._format = cls.classInstFormat();
	        rcvr.sqClass = cls;
	        return true;
	    },
	    primitiveDoPrimitiveWithArgs: function(argCount) {
	        var argumentArray = this.stackNonInteger(0),
	            primIdx = this.stackInteger(1);
	        if (!this.success) return false;
	        var arraySize = argumentArray.pointersSize(),
	            cntxSize = this.vm.activeContext.pointersSize();
	        if (this.vm.sp + arraySize >= cntxSize) return false;
	        // Pop primIndex and argArray, then push args in place...
	        this.vm.popN(2);
	        for (var i = 0; i < arraySize; i++)
	            this.vm.push(argumentArray.pointers[i]);
	        // Run the primitive
	        if (this.vm.tryPrimitive(primIdx, arraySize))
	            return true;
	        // Primitive failed, restore state for failure code
	        this.vm.popN(arraySize);
	        this.vm.push(primIdx);
	        this.vm.push(argumentArray);
	        return false;
	    },
	    primitiveDoNamedPrimitive: function(argCount) {
	        var argumentArray = this.stackNonInteger(0),
	            rcvr = this.stackNonInteger(1),
	            primMethod = this.stackNonInteger(2);
	        if (!this.success) return false;
	        var arraySize = argumentArray.pointersSize(),
	            cntxSize = this.vm.activeContext.pointersSize();
	        if (this.vm.sp + arraySize >= cntxSize) return false;
	        // Pop primIndex, rcvr, and argArray, then push new receiver and args in place...
	        this.vm.popN(3);
	        this.vm.push(rcvr);
	        for (var i = 0; i < arraySize; i++)
	            this.vm.push(argumentArray.pointers[i]);
	        // Run the primitive
	        if (this.doNamedPrimitive(arraySize, primMethod))
	            return true;
	        // Primitive failed, restore state for failure code
	        this.vm.popN(arraySize + 1);
	        this.vm.push(primMethod);
	        this.vm.push(rcvr);
	        this.vm.push(argumentArray);
	        return false;
	    },
	    primitiveShortAtAndPut: function(argCount) {
	        var rcvr = this.stackNonInteger(argCount),
	            index = this.stackInteger(argCount-1) - 1, // make zero-based
	            array = rcvr.wordsAsInt16Array();
	        if (!this.success || !array || index < 0 || index >= array.length)
	            return false;
	        var value;
	        if (argCount < 2) { // shortAt:
	            value = array[index];
	        } else { // shortAt:put:
	            value = this.stackInteger(0);
	            if (value < -32768 || value > 32767)
	                return false;
	            array[index] = value;
	        }
	        this.popNandPushIfOK(argCount+1, value);
	        return true;
	    },
	    primitiveIntegerAtAndPut:  function(argCount) {
	        var rcvr = this.stackNonInteger(argCount),
	            index = this.stackInteger(argCount-1) - 1, // make zero-based
	            array = rcvr.wordsAsInt32Array();
	        if (!this.success || !array || index < 0 || index >= array.length)
	            return false;
	        var value;
	        if (argCount < 2) { // integerAt:
	            value = this.signed32BitIntegerFor(array[index]);
	        } else { // integerAt:put:
	            value = this.stackSigned32BitInt(0);
	            if (!this.success)
	                return false;
	            array[index] = value;
	        }
	        this.popNandPushIfOK(argCount+1, value);
	        return true;
	    },
	    primitiveConstantFill:  function(argCount) {
	        var rcvr = this.stackNonInteger(1),
	            value = this.stackPos32BitInt(0);
	        if (!this.success || !rcvr.isWordsOrBytes())
	            return false;
	        var array = rcvr.words || rcvr.bytes;
	        if (array) {
	            if (array === rcvr.bytes && value > 255)
	                return false;
	            for (var i = 0; i < array.length; i++)
	                array[i] = value;
	        }
	        this.vm.popN(argCount);
	        return true;
	    },
	    primitiveNewMethod: function(argCount) {
	        var header = this.stackInteger(0);
	        var bytecodeCount = this.stackInteger(1);
	        if (!this.success) return 0;
	        var method = this.vm.instantiateClass(this.vm.stackValue(2), bytecodeCount);
	        method.pointers = [header];
	        var litCount = method.methodNumLits();
	        for (var i = 0; i < litCount; i++)
	            method.pointers.push(this.vm.nilObj);
	        this.vm.popNandPush(1+argCount, method);
	        if (this.vm.breakOnNewMethod)               // break on doit
	            this.vm.breakOnMethod = method;
	        return true;
	    },
	    primitiveExecuteMethodArgsArray: function(argCount) {
	        // receiver, argsArray, then method are on top of stack.  Execute method with
	        // receiver and args.
	        var methodObj = this.stackNonInteger(0),
	            argsArray = this.stackNonInteger(1),
	            receiver = this.vm.stackValue(2);
	        // Allow for up to two extra arguments (e.g. for mirror primitives).
	        if (!this.success || !methodObj.isMethod() || argCount > 4) return false;
	        var numArgs = methodObj.methodNumArgs();
	        if (numArgs !== argsArray.pointersSize()) return false;
	        // drop all args, push receiver, and new arguments
	        this.vm.popNandPush(argCount+1, receiver);
	        for (var i = 0; i < numArgs; i++)
	            this.vm.push(argsArray.pointers[i]);
	        this.vm.executeNewMethod(receiver, methodObj, numArgs, methodObj.methodPrimitiveIndex(), null, null);
	        return true;
	    },
	    primitiveArrayBecome: function(argCount, doBothWays, copyHash) {
	        var rcvr = this.stackNonInteger(argCount),
	            arg = this.stackNonInteger(argCount-1);
	        if (argCount > 1) copyHash = this.stackBoolean(argCount-2);
	        if (!this.success) return false;
	        this.success = this.vm.image.bulkBecome(rcvr.pointers, arg.pointers, doBothWays, copyHash);
	        return this.popNIfOK(argCount);
	    },
	    doStringReplace: function() {
	        var dst = this.stackNonInteger(4);
	        var dstPos = this.stackInteger(3) - 1;
	        var count = this.stackInteger(2) - dstPos;
	        var src = this.stackNonInteger(1);
	        var srcPos = this.stackInteger(0) - 1;
	        if (!this.success) return dst; //some integer not right
	        if (!src.sameFormatAs(dst)) {this.success = false; return dst;} //incompatible formats
	        if (src.isPointers()) {//pointer type objects
	            var totalLength = src.pointersSize();
	            var srcInstSize = src.instSize();
	            srcPos += srcInstSize;
	            if ((srcPos < 0) || (srcPos + count) > totalLength)
	                {this.success = false; return dst;} //would go out of bounds
	            totalLength = dst.pointersSize();
	            var dstInstSize= dst.instSize();
	            dstPos += dstInstSize;
	            if ((dstPos < 0) || (dstPos + count) > totalLength)
	                {this.success= false; return dst;} //would go out of bounds
	            for (var i = 0; i < count; i++)
	                dst.pointers[dstPos + i] = src.pointers[srcPos + i];
	            return dst;
	        } else if (src.isWords()) { //words type objects
	            var totalLength = src.wordsSize();
	            if ((srcPos < 0) || (srcPos + count) > totalLength)
	                {this.success = false; return dst;} //would go out of bounds
	            totalLength = dst.wordsSize();
	            if ((dstPos < 0) || (dstPos + count) > totalLength)
	                {this.success = false; return dst;} //would go out of bounds
	            if (src.isFloat && dst.isFloat)
	                dst.float = src.float;
	            else if (src.isFloat)
	                dst.wordsAsFloat64Array()[dstPos] = src.float;
	            else if (dst.isFloat)
	                dst.float = src.wordsAsFloat64Array()[srcPos];
	            else for (var i = 0; i < count; i++)
	                dst.words[dstPos + i] = src.words[srcPos + i];
	            return dst;
	        } else { //bytes type objects
	            var totalLength = src.bytesSize();
	            if ((srcPos < 0) || (srcPos + count) > totalLength)
	                {this.success = false; return dst;} //would go out of bounds
	            totalLength = dst.bytesSize();
	            if ((dstPos < 0) || (dstPos + count) > totalLength)
	                {this.success = false; return dst;} //would go out of bounds
	            for (var i = 0; i < count; i++)
	                dst.bytes[dstPos + i] = src.bytes[srcPos + i];
	            return dst;
	        }
	    },
	    primitiveCopyObject: function(argCount) {
	        var rcvr = this.stackNonInteger(1),
	            arg = this.stackNonInteger(0),
	            length = rcvr.pointersSize();
	        if (!this.success ||
	            rcvr.isWordsOrBytes() ||
	            rcvr.sqClass !== arg.sqClass ||
	            length !== arg.pointersSize()) return false;
	        for (var i = 0; i < length; i++)
	            rcvr.pointers[i] = arg.pointers[i];
	        rcvr.dirty = arg.dirty;
	        this.vm.popN(argCount);
	        return true;
	    },
	    primitiveStoreImageSegment: function(argCount) {
	        var arrayOfRoots = this.stackNonInteger(2),
	            segmentWordArray = this.stackNonInteger(1),
	            outPointerArray = this.stackNonInteger(0);
	        if (!arrayOfRoots.pointers || !segmentWordArray.words || !outPointerArray.pointers) return false;
	        var success = this.vm.image.storeImageSegment(segmentWordArray, outPointerArray, arrayOfRoots);
	        if (!success) return false;
	        this.vm.popN(argCount); // return self
	        return true;
	    },
	    primitiveLoadImageSegment: function(argCount) {
	        var segmentWordArray = this.stackNonInteger(1),
	            outPointerArray = this.stackNonInteger(0);
	        if (!segmentWordArray.words || !outPointerArray.pointers) return false;
	        var roots = this.vm.image.loadImageSegment(segmentWordArray, outPointerArray);
	        if (!roots) return false;
	        return this.popNandPushIfOK(argCount + 1, roots);
	    },
	},
	'blocks/closures', {
	    doBlockCopy: function() {
	        var rcvr = this.vm.stackValue(1);
	        var sqArgCount = this.stackInteger(0);
	        var homeCtxt = rcvr;
	        if (!this.vm.isContext(homeCtxt)) this.success = false;
	        if (!this.success) return rcvr;
	        if (typeof homeCtxt.pointers[Squeak.Context_method] === "number")
	            // ctxt is itself a block; get the context for its enclosing method
	            homeCtxt = homeCtxt.pointers[Squeak.BlockContext_home];
	        var blockSize = homeCtxt.pointersSize() - homeCtxt.instSize(); // could use a const for instSize
	        var newBlock = this.vm.instantiateClass(this.vm.specialObjects[Squeak.splOb_ClassBlockContext], blockSize);
	        var initialPC = this.vm.encodeSqueakPC(this.vm.pc + 2, this.vm.method); //*** check this...
	        newBlock.pointers[Squeak.BlockContext_initialIP] = initialPC;
	        newBlock.pointers[Squeak.Context_instructionPointer] = initialPC; // claim not needed; value will set it
	        newBlock.pointers[Squeak.Context_stackPointer] = 0;
	        newBlock.pointers[Squeak.BlockContext_argumentCount] = sqArgCount;
	        newBlock.pointers[Squeak.BlockContext_home] = homeCtxt;
	        newBlock.pointers[Squeak.Context_sender] = this.vm.nilObj; // claim not needed; just initialized
	        return newBlock;
	    },
	    primitiveBlockValue: function(argCount) {
	        var rcvr = this.vm.stackValue(argCount);
	        if (!this.isA(rcvr, Squeak.splOb_ClassBlockContext)) return false;
	        var block = rcvr;
	        var blockArgCount = block.pointers[Squeak.BlockContext_argumentCount];
	        if (typeof blockArgCount !== "number") return false;
	        if (blockArgCount != argCount) return false;
	        if (!block.pointers[Squeak.BlockContext_caller].isNil) return false;
	        this.vm.arrayCopy(this.vm.activeContext.pointers, this.vm.sp-argCount+1, block.pointers, Squeak.Context_tempFrameStart, argCount);
	        var initialIP = block.pointers[Squeak.BlockContext_initialIP];
	        block.pointers[Squeak.Context_instructionPointer] = initialIP;
	        block.pointers[Squeak.Context_stackPointer] = argCount;
	        block.pointers[Squeak.BlockContext_caller] = this.vm.activeContext;
	        this.vm.popN(argCount+1);
	        this.vm.newActiveContext(block);
	        if (this.vm.interruptCheckCounter-- <= 0) this.vm.checkForInterrupts();
	        return true;
	    },
	    primitiveBlockValueWithArgs: function(argCount) {
	        var block = this.vm.stackValue(1);
	        var array = this.vm.stackValue(0);
	        if (!this.isA(block, Squeak.splOb_ClassBlockContext)) return false;
	        if (!this.isA(array, Squeak.splOb_ClassArray)) return false;
	        var blockArgCount = block.pointers[Squeak.BlockContext_argumentCount];
	        if (typeof blockArgCount !== "number") return false;
	        if (blockArgCount != array.pointersSize()) return false;
	        if (!block.pointers[Squeak.BlockContext_caller].isNil) return false;
	        this.vm.arrayCopy(array.pointers, 0, block.pointers, Squeak.Context_tempFrameStart, blockArgCount);
	        var initialIP = block.pointers[Squeak.BlockContext_initialIP];
	        block.pointers[Squeak.Context_instructionPointer] = initialIP;
	        block.pointers[Squeak.Context_stackPointer] = blockArgCount;
	        block.pointers[Squeak.BlockContext_caller] = this.vm.activeContext;
	        this.vm.popN(argCount+1);
	        this.vm.newActiveContext(block);
	        if (this.vm.interruptCheckCounter-- <= 0) this.vm.checkForInterrupts();
	        return true;
	    },
	    primitiveClosureCopyWithCopiedValues: function(argCount) {
	        this.vm.breakNow("primitiveClosureCopyWithCopiedValues");
	        debugger;
	        return false;
	    },
	    primitiveClosureValue: function(argCount) {
	        var blockClosure = this.vm.stackValue(argCount),
	            blockArgCount = blockClosure.pointers[Squeak.Closure_numArgs];
	        if (argCount !== blockArgCount) return false;
	        this.activateNewClosureMethod(blockClosure, argCount);
	        if (this.vm.interruptCheckCounter-- <= 0) this.vm.checkForInterrupts();
	        return true;
	    },
	    primitiveClosureValueWithArgs: function(argCount) {
	        var array = this.vm.top(),
	            arraySize = array.pointersSize(),
	            blockClosure = this.vm.stackValue(argCount),
	            blockArgCount = blockClosure.pointers[Squeak.Closure_numArgs];
	        if (arraySize !== blockArgCount) return false;
	        this.vm.pop();
	        for (var i = 0; i < arraySize; i++)
	            this.vm.push(array.pointers[i]);
	        this.activateNewClosureMethod(blockClosure, arraySize);
	        if (this.vm.interruptCheckCounter-- <= 0) this.vm.checkForInterrupts();
	        return true;
	    },
	    primitiveClosureValueNoContextSwitch: function(argCount) {
	        // An exact clone of primitiveClosureValue except that this version will not check for interrupts
	        var blockClosure = this.vm.stackValue(argCount),
	            blockArgCount = blockClosure.pointers[Squeak.Closure_numArgs];
	        if (argCount !== blockArgCount) return false;
	        this.activateNewClosureMethod(blockClosure, argCount);
	        return true;
	    },
	    primitiveFullClosureValue: function(argCount) {
	        var blockClosure = this.vm.stackValue(argCount),
	            blockArgCount = blockClosure.pointers[Squeak.Closure_numArgs];
	        if (argCount !== blockArgCount) return false;
	        this.activateNewFullClosure(blockClosure, argCount);
	        if (this.vm.interruptCheckCounter-- <= 0) this.vm.checkForInterrupts();
	        return true;
	    },
	    primitiveFullClosureValueWithArgs: function(argCount) {
	        var array = this.vm.top(),
	            arraySize = array.pointersSize(),
	            blockClosure = this.vm.stackValue(argCount),
	            blockArgCount = blockClosure.pointers[Squeak.Closure_numArgs];
	        if (arraySize !== blockArgCount) return false;
	        this.vm.pop();
	        for (var i = 0; i < arraySize; i++)
	            this.vm.push(array.pointers[i]);
	        this.activateNewFullClosure(blockClosure, arraySize);
	        if (this.vm.interruptCheckCounter-- <= 0) this.vm.checkForInterrupts();
	        return true;
	    },
	    primitiveFullClosureValueNoContextSwitch: function(argCount) {
	        // An exact clone of primitiveFullClosureValue except that this version will not check for interrupts
	        var blockClosure = this.vm.stackValue(argCount),
	            blockArgCount = blockClosure.pointers[Squeak.Closure_numArgs];
	        if (argCount !== blockArgCount) return false;
	        this.activateNewFullClosure(blockClosure, argCount);
	        return true;
	    },
	    activateNewClosureMethod: function(blockClosure, argCount) {
	        var outerContext = blockClosure.pointers[Squeak.Closure_outerContext],
	            method = outerContext.pointers[Squeak.Context_method],
	            newContext = this.vm.allocateOrRecycleContext(method.methodNeedsLargeFrame()),
	            numCopied = blockClosure.pointers.length - Squeak.Closure_firstCopiedValue;
	        newContext.pointers[Squeak.Context_sender] = this.vm.activeContext;
	        newContext.pointers[Squeak.Context_instructionPointer] = blockClosure.pointers[Squeak.Closure_startpc];
	        newContext.pointers[Squeak.Context_stackPointer] = argCount + numCopied;
	        newContext.pointers[Squeak.Context_method] = outerContext.pointers[Squeak.Context_method];
	        newContext.pointers[Squeak.Context_closure] = blockClosure;
	        newContext.pointers[Squeak.Context_receiver] = outerContext.pointers[Squeak.Context_receiver];
	        // Copy the arguments and copied values ...
	        var where = Squeak.Context_tempFrameStart;
	        for (var i = 0; i < argCount; i++)
	            newContext.pointers[where++] = this.vm.stackValue(argCount - i - 1);
	        for (var i = 0; i < numCopied; i++)
	            newContext.pointers[where++] = blockClosure.pointers[Squeak.Closure_firstCopiedValue + i];
	        // The initial instructions in the block nil-out remaining temps.
	        this.vm.popN(argCount + 1);
	        this.vm.newActiveContext(newContext);
	    },
	    activateNewFullClosure: function(blockClosure, argCount) {
	        var closureMethod = blockClosure.pointers[Squeak.ClosureFull_method],
	            newContext = this.vm.allocateOrRecycleContext(closureMethod.methodNeedsLargeFrame()),
	            numCopied = blockClosure.pointers.length - Squeak.ClosureFull_firstCopiedValue;
	        newContext.pointers[Squeak.Context_sender] = this.vm.activeContext;
	        newContext.pointers[Squeak.Context_instructionPointer] = this.vm.encodeSqueakPC(0, closureMethod);
	        newContext.pointers[Squeak.Context_stackPointer] = closureMethod.methodTempCount(); // argCount + numCopied + numActualTemps
	        newContext.pointers[Squeak.Context_method] = closureMethod;
	        newContext.pointers[Squeak.Context_closure] = blockClosure;
	        newContext.pointers[Squeak.Context_receiver] = blockClosure.pointers[Squeak.ClosureFull_receiver];
	        // Copy the arguments and copied values ...
	        var where = Squeak.Context_tempFrameStart;
	        for (var i = 0; i < argCount; i++)
	            newContext.pointers[where++] = this.vm.stackValue(argCount - i - 1);
	        for (var i = 0; i < numCopied; i++)
	            newContext.pointers[where++] = blockClosure.pointers[Squeak.ClosureFull_firstCopiedValue + i];
	        // No need to nil-out remaining temps as context pointers are nil-initialized.
	        this.vm.popN(argCount + 1);
	        this.vm.newActiveContext(newContext);
	        if (!closureMethod.compiled) this.vm.compileIfPossible(closureMethod);
	    },
	},
	'scheduling', {
	    primitiveResume: function() {
	        this.resume(this.vm.top());
	        return true;
	    },
	    primitiveSuspend: function() {
	        var process = this.vm.top();
	        if (process === this.activeProcess()) {
	            this.vm.popNandPush(1, this.vm.nilObj);
	            this.transferTo(this.wakeHighestPriority());
	        } else if (process.runProcess) {
	            // CodeParadise specific code:
	            // Do not actually suspend a synchronous internal process.
	            // A link to the internal process is maintained elsewhere,
	            // so simply ignore it here.
	            this.vm.popNandPush(1, this.vm.nilObj);
	        } else {
	            var oldList = process.pointers[Squeak.Proc_myList];
	            if (oldList.isNil) return false;
	            this.removeProcessFromList(process, oldList);
	            if (!this.success) return false;
	            process.pointers[Squeak.Proc_myList] = this.vm.nilObj;
	            this.vm.popNandPush(1, oldList);
	        }
	        return true;
	    },
	    getScheduler: function() {
	        var assn = this.vm.specialObjects[Squeak.splOb_SchedulerAssociation];
	        return assn.pointers[Squeak.Assn_value];
	    },
	    activeProcess: function() {
	        return this.getScheduler().pointers[Squeak.ProcSched_activeProcess];
	    },
	    resume: function(newProc) {
	        // CodeParadise specific code:
	        // This should not happen, but if a synchronous internal process
	        // is resumed, try to run it to completion directly.
	        // Normally this type of process is resumed by calling their runProcess()
	        // method from a handler (like the event or transition handler in the
	        // DOM plugin).
	        if(newProc.runProcess) {
	            newProc.runProcess();
	            return;
	        }

	        var activeProc = this.activeProcess();
	        if(activeProc.runProcess) {
	            // CodeParadise specific code:
	            // If a regular Process is resumed before a synchronous internal
	            // process has finished, put the regular process to sleep and let
	            // the internal process continue.
	            this.putToSleep(newProc);
	        } else {
	            // Regular Process switch
	            var activePriority = activeProc.pointers[Squeak.Proc_priority];
	            var newPriority = newProc.pointers[Squeak.Proc_priority];
	            if (newPriority > activePriority) {
	                this.putToSleep(activeProc);
	                this.transferTo(newProc);
	            } else {
	                this.putToSleep(newProc);
	            }
	        }
	    },
	    putToSleep: function(aProcess) {
	        // Do not put synchronous internal processes to sleep (they shoul be kept
	        if (aProcess === null) return;
	        // CodeParadise specific code:
	        if (aProcess.runProcess) {
	            return;
	        }
	        //Save the given process on the scheduler process list for its priority.
	        var priority = aProcess.pointers[Squeak.Proc_priority];
	        var processLists = this.getScheduler().pointers[Squeak.ProcSched_processLists];
	        var processList = processLists.pointers[priority - 1];
	        this.linkProcessToList(aProcess, processList);
	    },
	    transferTo: function(newProc) {
	        //Record a process to be awakened on the next interpreter cycle.
	        var sched = this.getScheduler();
	        var oldProc = sched.pointers[Squeak.ProcSched_activeProcess];
	        if(oldProc === newProc) {
	            return;
	        }
	        sched.pointers[Squeak.ProcSched_activeProcess] = newProc;
	        sched.dirty = true;
	        if(oldProc !== null) {
	          oldProc.pointers[Squeak.Proc_suspendedContext] = this.vm.activeContext;
	          oldProc.dirty = true;
	        }
	        if(newProc !== null) {
	          this.vm.newActiveContext(newProc.pointers[Squeak.Proc_suspendedContext]);
	          newProc.pointers[Squeak.Proc_suspendedContext] = this.vm.nilObj;
	          if (!this.oldPrims) newProc.pointers[Squeak.Proc_myList] = this.vm.nilObj;
	        }
	        this.vm.reclaimableContextCount = 0;
	        if (this.vm.breakOnContextChanged) {
	            this.vm.breakOnContextChanged = false;
	            this.vm.breakNow();
	        }
	        if (this.vm.logProcess) console.log(
	            "\n============= Process Switch ==================\n"
	            + this.vm.printProcess(newProc, true, this.vm.logSends ? '| ' : '')
	            + "===============================================");
	    },
	    wakeHighestPriority: function() {
	        //Return the highest priority process that is ready to run.
	        //Note: It is a fatal VM error if there is no runnable process.
	        var schedLists = this.getScheduler().pointers[Squeak.ProcSched_processLists];
	        var p = schedLists.pointersSize() - 1;  // index of last indexable field
	        var processList;
	        do {
	            if (p < 0) return null;
	            processList = schedLists.pointers[p--];
	        } while (this.isEmptyList(processList));
	        return this.removeFirstLinkOfList(processList);
	    },
	    linkProcessToList: function(proc, aList) {
	        // Add the given process to the given linked list and set the backpointer
	        // of process to its new list.
	        if (this.isEmptyList(aList)) {
	            aList.pointers[Squeak.LinkedList_firstLink] = proc;
	        } else {
	            var lastLink = aList.pointers[Squeak.LinkedList_lastLink];
	            lastLink.pointers[Squeak.Link_nextLink] = proc;
	            lastLink.dirty = true;
	        }
	        aList.pointers[Squeak.LinkedList_lastLink] = proc;
	        aList.dirty = true;
	        proc.pointers[Squeak.Proc_myList] = aList;
	        proc.dirty = true;
	    },
	    isEmptyList: function(aLinkedList) {
	        return aLinkedList.pointers[Squeak.LinkedList_firstLink].isNil;
	    },
	    removeFirstLinkOfList: function(aList) {
	        //Remove the first process from the given linked list.
	        var first = aList.pointers[Squeak.LinkedList_firstLink];
	        var last = aList.pointers[Squeak.LinkedList_lastLink];
	        if (first === last) {
	            aList.pointers[Squeak.LinkedList_firstLink] = this.vm.nilObj;
	            aList.pointers[Squeak.LinkedList_lastLink] = this.vm.nilObj;
	        } else {
	            var next = first.pointers[Squeak.Link_nextLink];
	            aList.pointers[Squeak.LinkedList_firstLink] = next;
	            aList.dirty = true;
	        }
	        first.pointers[Squeak.Link_nextLink] = this.vm.nilObj;
	        return first;
	    },
	    removeProcessFromList: function(process, list) {
	        var first = list.pointers[Squeak.LinkedList_firstLink];
	        var last = list.pointers[Squeak.LinkedList_lastLink];
	        if (process === first) {
	            var next = process.pointers[Squeak.Link_nextLink];
	            list.pointers[Squeak.LinkedList_firstLink] = next;
	            if (process === last) {
	                list.pointers[Squeak.LinkedList_lastLink] = this.vm.nilObj;
	            }
	        } else {
	            var temp = first;
	            while (true) {
	                if (temp.isNil) {
	                    if (this.oldPrims) this.success = false;
	                    return;
	                }
	                next = temp.pointers[Squeak.Link_nextLink];
	                if (next === process) break;
	                temp = next;
	            }
	            next = process.pointers[Squeak.Link_nextLink];
	            temp.pointers[Squeak.Link_nextLink] = next;
	            if (process === last) {
	                list.pointers[Squeak.LinkedList_lastLink] = temp;
	            }
	        }
	        process.pointers[Squeak.Link_nextLink] = this.vm.nilObj;
	    },
	    registerSemaphore: function(specialObjIndex) {
	        var sema = this.vm.top();
	        if (this.isA(sema, Squeak.splOb_ClassSemaphore))
	            this.vm.specialObjects[specialObjIndex] = sema;
	        else
	            this.vm.specialObjects[specialObjIndex] = this.vm.nilObj;
	        return this.vm.stackValue(1);
	    },
	    primitiveWait: function() {
	        var sema = this.vm.top();
	        if (!this.isA(sema, Squeak.splOb_ClassSemaphore)) return false;
	        var excessSignals = sema.pointers[Squeak.Semaphore_excessSignals];
	        if (excessSignals > 0)
	            sema.pointers[Squeak.Semaphore_excessSignals] = excessSignals - 1;
	        else {
	            this.linkProcessToList(this.activeProcess(), sema);
	            this.transferTo(this.wakeHighestPriority());
	        }
	        return true;
	    },
	    primitiveSignal: function() {
	        var sema = this.vm.top();
	        if (!this.isA(sema, Squeak.splOb_ClassSemaphore)) return false;
	        this.synchronousSignal(sema);
	        return true;
	    },
	    synchronousSignal: function(sema) {
	        if (this.isEmptyList(sema)) {
	            // no process is waiting on this semaphore
	            sema.pointers[Squeak.Semaphore_excessSignals]++;
	        } else
	            this.resume(this.removeFirstLinkOfList(sema));
	        return;
	    },
	    signalAtMilliseconds: function(sema, msTime) {
	        if (this.isA(sema, Squeak.splOb_ClassSemaphore)) {
	            this.vm.specialObjects[Squeak.splOb_TheTimerSemaphore] = sema;
	            this.vm.nextWakeupTick = msTime;
	        } else {
	            this.vm.specialObjects[Squeak.splOb_TheTimerSemaphore] = this.vm.nilObj;
	            this.vm.nextWakeupTick = 0;
	        }
	    },
	    primitiveSignalAtMilliseconds: function(argCount) {
	        var msTime = this.stackInteger(0);
	        var sema = this.stackNonInteger(1);
	        if (!this.success) return false;
	        this.signalAtMilliseconds(sema, msTime);
	        this.vm.popN(argCount); // return self
	        return true;
	    },
	    primitiveSignalAtUTCMicroseconds: function(argCount) {
	        var usecsUTC = this.stackSigned53BitInt(0);
	        var sema = this.stackNonInteger(1);
	        if (!this.success) return false;
	        var msTime = (usecsUTC / 1000 + Squeak.EpochUTC - this.vm.startupTime) & Squeak.MillisecondClockMask;
	        this.signalAtMilliseconds(sema, msTime);
	        this.vm.popN(argCount); // return self
	        return true;
	    },
	    signalSemaphoreWithIndex: function(semaIndex) {
	        // asynch signal: will actually be signaled in checkForInterrupts()
	        this.semaphoresToSignal.push(semaIndex);
	    },
	    signalExternalSemaphores: function() {
	        var semaphores = this.vm.specialObjects[Squeak.splOb_ExternalObjectsArray].pointers,
	            semaClass = this.vm.specialObjects[Squeak.splOb_ClassSemaphore];
	        while (this.semaphoresToSignal.length) {
	            var semaIndex = this.semaphoresToSignal.shift(),
	                sema = semaphores[semaIndex - 1];
	            if (sema.sqClass == semaClass)
	                this.synchronousSignal(sema);
	        }
	    },
	    primitiveEnterCriticalSection: function(argCount) {
	        if (argCount > 1) return false;
	        var mutex = this.vm.stackValue(argCount);
	        var activeProc = argCount ? this.vm.top() : this.activeProcess();
	        var owningProcess = mutex.pointers[Squeak.Mutex_owner];
	        if (owningProcess.isNil) {
	            mutex.pointers[Squeak.Mutex_owner] = activeProc;
	            mutex.dirty = true;
	            this.popNandPushIfOK(argCount + 1, this.vm.falseObj);
	        } else if (owningProcess === activeProc) {
	            this.popNandPushIfOK(argCount + 1, this.vm.trueObj);
	        } else {
	            this.popNandPushIfOK(argCount + 1, this.vm.falseObj);
	            this.linkProcessToList(activeProc, mutex);
	            this.transferTo(this.wakeHighestPriority());
	        }
	        return true;
	    },
	    primitiveExitCriticalSection: function(argCount) {
	        var criticalSection = this.vm.top();
	        if (this.isEmptyList(criticalSection)) {
	            criticalSection.pointers[Squeak.Mutex_owner] = this.vm.nilObj;
	        } else {
	            var owningProcess = this.removeFirstLinkOfList(criticalSection);
	            criticalSection.pointers[Squeak.Mutex_owner] = owningProcess;
	            criticalSection.dirty = true;
	            this.resume(owningProcess);
	        }
	        return true;
	    },
	    primitiveTestAndSetOwnershipOfCriticalSection: function(argCount) {
	        if (argCount > 1) return false;
	        var mutex = this.vm.stackValue(argCount);
	        var activeProc = argCount ? this.vm.top() : this.activeProcess();
	        var owningProcess = mutex.pointers[Squeak.Mutex_owner];
	        if (owningProcess.isNil) {
	            mutex.pointers[Squeak.Mutex_owner] = activeProc;
	            mutex.dirty = true;
	            this.popNandPushIfOK(argCount + 1, this.vm.falseObj);
	        } else if (owningProcess === activeProc) {
	            this.popNandPushIfOK(argCount + 1, this.vm.trueObj);
	        } else {
	            this.popNandPushIfOK(argCount + 1, this.vm.nilObj);
	        }
	        return true;
	    },
	},
	'vm functions', {
	    primitiveGetAttribute: function(argCount) {
	        var attr = this.stackInteger(0);
	        if (!this.success) return false;
	        var argv = this.display.argv,
	            vmOptions = this.display.vmOptions,
	            value = null;
	        switch (attr) {
	            case 0: value = (argv && argv[0]) || this.filenameToSqueak(Squeak.vmPath + Squeak.vmFile); break;
	            case 1: value = (argv && argv[1]) || this.display.documentName; break; // 1.x images want document here
	            case 2: value = (argv && argv[2]) || this.display.documentName; break; // later images want document here
	            case 1001: value = this.vm.options.unix ? "unix" : Squeak.platformName; break;
	            case 1002: value = Squeak.osVersion; break;
	            case 1003: value = Squeak.platformSubtype; break;
	            case 1004: value = Squeak.vmVersion + ' ' + Squeak.vmMakerVersion; break;
	            case 1005: value = Squeak.windowSystem; break;
	            case 1006: value = Squeak.vmBuild; break;
	            case 1007: value = Squeak.vmInterpreterVersion; break; // Interpreter class
	            // case 1008: Cogit class
	            case 1009: value = Squeak.vmVersion + ' Date: ' + Squeak.vmDate; break; // Platform source version
	            default:
	                if (attr >= 0 && argv && argv.length > attr) {
	                    value = argv[attr];
	                } else if (attr < 0 && vmOptions && vmOptions.length > -attr - 1) {
	                    value = vmOptions[-attr - 1];
	                } else {
	                    return false;
	                }
	        }
	        this.vm.popNandPush(argCount+1, this.makeStObject(value));
	        return true;
	    },
	    setLowSpaceThreshold: function() {
	        var nBytes = this.stackInteger(0);
	        if (this.success) this.vm.lowSpaceThreshold = nBytes;
	        return this.vm.stackValue(1);
	    },
	    primitiveVMParameter: function(argCount) {
	        /* Behaviour depends on argument count:
	        0 args: return an Array of VM parameter values;
	        1 arg:  return the indicated VM parameter;
	        2 args: set the VM indicated parameter. */
	        var paramsArraySize = this.vm.image.isSpur ? 71 : 44;
	        switch (argCount) {
	            case 0:
	                var arrayObj = this.vm.instantiateClass(this.vm.specialObjects[Squeak.splOb_ClassArray], paramsArraySize);
	                for (var i = 0; i < paramsArraySize; i++)
	                    arrayObj.pointers[i] = this.makeStObject(this.vmParameterAt(i+1));
	                return this.popNandPushIfOK(1, arrayObj);
	            case 1:
	                var parm = this.stackInteger(0);
	                if (parm < 1 || parm > paramsArraySize) return false;
	                return this.popNandPushIfOK(2, this.makeStObject(this.vmParameterAt(parm)));
	            case 2:
	                // ignore writes
	                return this.popNandPushIfOK(3, 0);
	        }	        return false;
	    },
	    vmParameterAt: function(index) {
	        switch (index) {
	            case 1: return this.vm.image.oldSpaceBytes;     // end of old-space (0-based, read-only)
	            case 2: return this.vm.image.oldSpaceBytes;     // end of young-space (read-only)
	            case 3: return this.vm.image.totalMemory;       // end of memory (read-only)
	            case 4: return this.vm.image.allocationCount + this.vm.image.newSpaceCount; // allocationCount (read-only; nil in Cog VMs)
	            // 5    allocations between GCs (read-write; nil in Cog VMs)
	            // 6    survivor count tenuring threshold (read-write)
	            case 7: return this.vm.image.gcCount;           // full GCs since startup (read-only)
	            case 8: return this.vm.image.gcMilliseconds;    // total milliseconds in full GCs since startup (read-only)
	            case 9: return this.vm.image.pgcCount;          // incremental GCs since startup (read-only)
	            case 10: return this.vm.image.pgcMilliseconds;  // total milliseconds in incremental GCs since startup (read-only)
	            case 11: return this.vm.image.gcTenured;        // tenures of surving objects since startup (read-only)
	            // 12-20 specific to the translating VM
	            case 15:
	            case 16:                                        // idle microseconds
	            case 17:
	            case 18:
	            case 19:
	            case 20: return 0;                              // utc microseconds at VM start-up
	            // 21   root table size (read-only)
	            case 22: return 0;                              // root table overflows since startup (read-only)
	            case 23: return this.vm.image.extraVMMemory;    // bytes of extra memory to reserve for VM buffers, plugins, etc.
	            // 24   memory threshold above which to shrink object memory (read-write)
	            // 25   memory headroom when growing object memory (read-write)
	            // 26   interruptChecksEveryNms - force an ioProcessEvents every N milliseconds (read-write)
	            // 27   number of times mark loop iterated for current IGC/FGC (read-only) includes ALL marking
	            // 28   number of times sweep loop iterated for current IGC/FGC (read-only)
	            // 29   number of times make forward loop iterated for current IGC/FGC (read-only)
	            // 30   number of times compact move loop iterated for current IGC/FGC (read-only)
	            // 31   number of grow memory requests (read-only)
	            // 32   number of shrink memory requests (read-only)
	            // 33   number of root table entries used for current IGC/FGC (read-only)
	            // 34   number of allocations done before current IGC/FGC (read-only)
	            // 35   number of survivor objects after current IGC/FGC (read-only)
	            // 36   millisecond clock when current IGC/FGC completed (read-only)
	            // 37   number of marked objects for Roots of the world, not including Root Table entries for current IGC/FGC (read-only)
	            // 38   milliseconds taken by current IGC (read-only)
	            // 39   Number of finalization signals for Weak Objects pending when current IGC/FGC completed (read-only)
	            case 40: return 4; // BytesPerWord for this image
	            case 41: return this.vm.image.formatVersion();
	            //42    number of stack pages in use (Cog Stack VM only, otherwise nil)
	            //43    desired number of stack pages (stored in image file header, max 65535; Cog VMs only, otherwise nil)
	            case 44: return 0; // size of eden, in bytes
	            // 45   desired size of eden, in bytes (stored in image file header; Cog VMs only, otherwise nil)
	            // 46   size of machine code zone, in bytes (stored in image file header; Cog JIT VM only, otherwise nil)
	            case 46: return 0;
	            // 47   desired size of machine code zone, in bytes (applies at startup only, stored in image file header; Cog JIT VM only)
	            case 48: return 0; // not yet using/modifying this.vm.image.headerFlags
	            // 48	various properties stored in the image header (that instruct the VM) as an integer encoding an array of bit flags.
	            //     Bit 0: in a threaded VM, if set, tells the VM that the image's Process class has threadAffinity as its 5th inst var
	            //             (after nextLink, suspendedContext, priority & myList)
	            //     Bit 1: in Cog JIT VMs, if set, asks the VM to set the flag bit in interpreted methods
	            //     Bit 2: if set, preempting a process puts it to the head of its run queue, not the back,
	            //             i.e. preempting a process by a higher priority one will not cause the preempted process to yield
	            //                 to others at the same priority.
	            //     Bit 3: in a muilt-threaded VM, if set, the Window system will only be accessed from the first VM thread (now unassigned)
	            //     Bit 4: in a Spur VM, if set, causes weaklings and ephemerons to be queued individually for finalization
	            //     Bit 5: if set, implies wheel events will be delivered as such and not mapped to arrow key events
	            //     Bit 6: if set, implies arithmetic primitives will fail if given arguments of different types (float vs int)
	            //     Bit 7: if set, causes times delivered from file primitives to be in UTC rather than local time
	            //     Bit 8: if set, implies the VM will not upscale the display on high DPI monitors; older VMs did this by default.
	            // 49   the size of the external semaphore table (read-write; Cog VMs only)
	            // 50-51 reserved for VM parameters that persist in the image (such as eden above)
	            // 52   root (remembered) table maximum size (read-only)
	            // 53   the number of oldSpace segments (Spur only, otherwise nil)
	            case 54: return this.vm.image.bytesLeft();  // total size of free old space (Spur only, otherwise nil)
	            // 55   ratio of growth and image size at or above which a GC will be performed post scavenge (Spur only, otherwise nil)
	            // 56   number of process switches since startup (read-only)
	            // 57   number of ioProcessEvents calls since startup (read-only)
	            // 58   number of forceInterruptCheck (Cog VMs) or quickCheckInterruptCalls (non-Cog VMs) calls since startup (read-only)
	            // 59   number of check event calls since startup (read-only)
	            // 60   number of stack page overflows since startup (read-only; Cog VMs only)
	            // 61   number of stack page divorces since startup (read-only; Cog VMs only)
	            // 62   number of machine code zone compactions since startup (read-only; Cog VMs only)
	            // 63   milliseconds taken by machine code zone compactions since startup (read-only; Cog VMs only)
	            // 64   current number of machine code methods (read-only; Cog VMs only)
	            // 65   In newer Cog VMs a set of flags describing VM features,
	            //      if non-zero bit 0 implies multiple bytecode set support;
	            //      if non-zero bit 1 implies read-only object support;
	            //      if non-zero bit 2 implies the VM suffers from using an ITIMER heartbeat (if 0 it has a thread that provides the heartbeat)
	            //      if non-zero bit 3 implies the VM supports cross-platform BIT_IDENTICAL_FLOATING_POINT arithmetic
	            //      if non-zero bit 4 implies the VM can catch exceptions in FFI calls and answer them as primitive failures
	            //      if non-zero bit 5 implies the VM's suspend primitive backs up the process to before the wait if it was waiting on a condition variable
	            //      (read-only; Cog VMs only; nil in older Cog VMs, a boolean answering multiple bytecode support in not so old Cog VMs)
	            case 65: return 0;
	            // 66   the byte size of a stack page in the stack zone  (read-only; Cog VMs only)
	            // 67   the maximum allowed size of old space in bytes, 0 implies no internal limit (Spur VMs only).
	            case 67: return this.vm.image.totalMemory;
	            // 68 - 69 reserved for more Cog-related info
	            // 70   the value of VM_PROXY_MAJOR (the interpreterProxy major version number)
	            // 71   the value of VM_PROXY_MINOR (the interpreterProxy minor version number)
	            // 72   total milliseconds in full GCs Mark phase since startup (read-only)
	            // 73   total milliseconds in full GCs Sweep phase since startup (read-only, can be 0 depending on compactors)
	            // 74   maximum pause time due to segment allocation
	            // 75   whether arithmetic primitives will do mixed type arithmetic; if false they fail for different receiver and argument types
	            // 76   the minimum unused headroom in all stack pages; Cog VMs only
	        }
	        return null;
	    },
	    primitiveImageName: function(argCount) {
	        if (argCount == 0)
	            return this.popNandPushIfOK(1, this.makeStString(this.filenameToSqueak(this.vm.image.name)));
	        this.vm.image.name = this.filenameFromSqueak(this.vm.top().bytesAsString());
	        Squeak.Settings['squeakImageName'] = this.vm.image.name;
	        this.vm.popN(argCount);
	        return true;
	    },
	    primitiveSnapshot: function(argCount) {
	        this.vm.popNandPush(1, this.vm.trueObj);        // put true on stack for saved snapshot
	        this.vm.storeContextRegisters();                // store current state for snapshot
	        this.activeProcess().pointers[Squeak.Proc_suspendedContext] = this.vm.activeContext; // store initial context
	        this.vm.image.fullGC("snapshot");               // before cleanup so traversal works
	        var buffer = this.vm.image.writeToBuffer();
	        // Write snapshot if files are supported
	        if (Squeak.flushAllFiles) {
	            Squeak.flushAllFiles();                         // so there are no more writes pending
	            Squeak.filePut(this.vm.image.name + ".image", buffer);
	        }
	        this.vm.popNandPush(1, this.vm.falseObj);       // put false on stack for continuing
	        return true;
	    },
	    primitiveQuit: function(argCount) {
	        // Flush any files if files are supported
	        if (Squeak.flushAllFiles)
	            Squeak.flushAllFiles();
	        this.display.quitFlag = true;
	        this.vm.breakNow("quit");
	        return true;
	    },
	    primitiveExitToDebugger: function(argCount) {
	        this.vm.breakNow("debugger primitive");
	        //console.error(this.vm.printStack(null));
	        debugger;
	        return true;
	    },
	    primitiveSetGCBiasToGrow: function(argCount) {
	        return this.fakePrimitive(".primitiveSetGCBiasToGrow", 0, argCount);
	    },
	    primitiveSetGCBiasToGrowGCLimit: function(argCount) {
	        return this.fakePrimitive(".primitiveSetGCBiasToGrowGCLimit", 0, argCount);
	    },
	},
	'time', {
	    primitiveRelinquishProcessorForMicroseconds: function(argCount) {
	        // we ignore the optional arg
	        this.vm.popN(argCount);
	        this.vm.goIdle();        // might switch process, so must be after pop
	        return true;
	    },
	    millisecondClockValue: function() {
	        //Return the value of the millisecond clock as an integer.
	        //Note that the millisecond clock wraps around periodically.
	        //The range is limited to SmallInteger maxVal / 2 to allow
	        //delays of up to that length without overflowing a SmallInteger.
	        return (Date.now() - this.vm.startupTime) & Squeak.MillisecondClockMask;
	    },
	    millisecondClockValueSet: function(clock) {
	        // set millisecondClock to the (previously saved) clock value
	        // to allow "stopping" the VM clock while debugging
	        this.vm.startupTime = Date.now() - clock;
	    },
	    secondClock: function() {
	        return this.pos32BitIntFor(Squeak.totalSeconds()); // will overflow 32 bits in 2037
	    },
	    microsecondClock: function(state) {
	        var millis = Date.now() - state.epoch;
	        if (typeof performance !== "object")
	            return this.pos53BitIntFor(millis * 1000);
	        // use high-res clock, adjust for roll-over
	        var micros = performance.now() * 1000 % 1000 | 0,
	            oldMillis = state.millis,
	            oldMicros = state.micros;
	        if (oldMillis > millis) millis = oldMillis;                 // rolled over previously
	        if (millis === oldMillis && micros < oldMicros) millis++;   // roll over now
	        state.millis = millis;
	        state.micros = micros;
	        return this.pos53BitIntFor(millis * 1000 + micros);
	    },
	    microsecondClockUTC: function() {
	        if (!this.microsecondClockUTCState)
	            this.microsecondClockUTCState = {epoch: Squeak.EpochUTC, millis: 0, micros: 0};
	        return this.microsecondClock(this.microsecondClockUTCState);
	    },
	    microsecondClockLocal: function() {
	        if (!this.microsecondClockLocalState)
	            this.microsecondClockLocalState = {epoch: Squeak.Epoch, millis: 0, micros: 0};
	        return this.microsecondClock(this.microsecondClockLocalState);
	    },
	    primitiveUtcWithOffset: function(argCount) {
	        var d = new Date();
	        var posixMicroseconds = this.pos53BitIntFor(d.getTime() * 1000);
	        var offset = -60 * d.getTimezoneOffset();
	        if (argCount > 0) {
	            // either an Array or a DateAndTime in new UTC format with two ivars
	            var stWordIndexableObject = this.vm.stackValue(0);
	            stWordIndexableObject.pointers[0] = posixMicroseconds;
	            stWordIndexableObject.pointers[1] = offset;
	            this.popNandPushIfOK(argCount + 1, stWordIndexableObject);
	            return true;
	        }
	        var timeAndOffset = [
	            posixMicroseconds,
	            offset,
	        ];
	        this.popNandPushIfOK(argCount + 1, this.makeStArray(timeAndOffset));
	        return true;
	    },
	});
	return vm_primitives;
}

var jit = {};

var hasRequiredJit;

function requireJit () {
	if (hasRequiredJit) return jit;
	hasRequiredJit = 1;
	/*
	 * Copyright (c) 2014-2024 Vanessa Freudenberg
	 *
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:
	 *
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 *
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 */

	Object.subclass('Squeak.Compiler',

	/****************************************************************************

	VM and Compiler
	===============

	The VM has an interpreter, it will work fine (and much more memory-efficient)
	without loading a compiler. The compiler plugs into the VM by providing the
	Squeak.Compiler global. It can be easily replaced by just loading a different
	script providing Squeak.Compiler.

	The VM creates the compiler instance after an image has been loaded and the VM
	been initialized. Whenever a method is activated that was not compiled yet, the
	compiler gets a chance to compile it. The compiler may decide to wait for a couple
	of activations before actually compiling it. This might prevent do-its from ever
	getting compiled, because they are only activated once. Therefore, the compiler
	is also called when a long-running non-optimized loop calls checkForInterrupts.
	Finally, whenever the interpreter is about to execute a bytecode, it calls the
	compiled method instead (which typically will execute many bytecodes):

	    initialize:
	        compiler = new Squeak.Compiler(vm);

	    executeNewMethod, checkForInterrupts:
	        if (!method.compiled && compiler)
	            compiler.compile(method);

	    interpret:
	        if (method.compiled) method.compiled(vm);

	Note that a compiler could hook itself into a compiled method by dispatching
	to vm.compiler in the generated code. This would allow gathering statistics,
	recompiling with optimized code etc.


	About This Compiler
	===================

	The compiler in this file is meant to be simple, fast-compiling, and general.
	It transcribes bytecodes 1-to-1 into equivalent JavaScript code using
	templates (and thus can even support single-stepping). It uses the
	interpreter's stack pointer (SP) and program counter (PC), actual context
	objects just like the interpreter, no register mapping, it does not optimize
	sends, etc.

	Jumps are handled by wrapping the whole method in a loop and switch. This also
	enables continuing in the middle of a compiled method: whenever another context
	is activated, the method returns to the main loop, and is entered again later
	with a different PC. Here is an example method, its bytecodes, and a simplified
	version of the generated JavaScript code:

	    method
	        [value selector] whileFalse.
	        ^ 42

	    0 <00> pushInstVar: 0
	    1 <D0> send: #selector
	    2 <A8 02> jumpIfTrue: 6
	    4 <A3 FA> jumpTo: 0
	    6 <21> pushConst: 42
	    7 <7C> return: topOfStack

	    context = vm.activeContext
	    while (true) switch (vm.pc) {
	    case 0:
	        stack[++vm.sp] = inst[0];
	        vm.pc = 2; vm.send(#selector); // activate new method
	        return; // return to main loop
	        // Main loop will execute the activated method. When
	        // that method returns, this method will be called
	        // again with vm.pc == 2 and jump directly to case 2
	    case 2:
	        if (stack[vm.sp--] === vm.trueObj) {
	            vm.pc = 6;
	            continue; // jump to case 6
	        }
	        // otherwise fall through to next case
	    case 4:
	        vm.pc = 0;
	        continue; // jump to case 0
	    case 6:
	        stack[++vm.sp] = 42;
	        vm.pc = 7; vm.doReturn(stack[vm.sp]);
	        return;
	    }

	Debugging support
	=================

	This compiler supports generating single-stepping code and comments, which are
	rather helpful during debugging.

	Normally, only bytecodes that can be a jump target are given a label. Also,
	bytecodes following a send operation need a label, to enable returning to that
	spot after the context switch. All other bytecodes are executed continuously.

	When compiling for single-stepping, each bytecode gets a label, and after each
	bytecode a flag is checked and the method returns if needed. Because this is
	a performance penalty, methods are first compiled without single-step support,
	and recompiled for single-stepping on demand.

	This is optional, another compiler can answer false from enableSingleStepping().
	In that case the VM will delete the compiled method and invoke the interpreter
	to single-step.

	*****************************************************************************/

	'initialization', {
	    initialize: function(vm) {
	        this.vm = vm;
	        this.comments = !!Squeak.Compiler.comments, // generate comments
	        // for debug-printing only
	        this.specialSelectors = ['+', '-', '<', '>', '<=', '>=', '=', '~=', '*', '/', '\\\\', '@',
	            'bitShift:', '//', 'bitAnd:', 'bitOr:', 'at:', 'at:put:', 'size', 'next', 'nextPut:',
	            'atEnd', '==', 'class', 'blockCopy:', 'value', 'value:', 'do:', 'new', 'new:', 'x', 'y'];
	        this.doitCounter = 0;
	        this.blockCounter = 0;
	    },
	},
	'accessing', {
	    compile: function(method, optClassObj, optSelObj) {
	        if (method.compiled === undefined) {
	            // 1st time
	            method.compiled = false;
	        } else {
	            // 2nd time
	            this.singleStep = false;
	            this.debug = this.comments;
	            var clsName, sel, instVars;
	            if (this.debug && !optClassObj) {
	                // this is expensive, so only do it when debugging
	                var isMethod = method.sqClass === this.vm.specialObjects[Squeak.splOb_ClassCompiledMethod];
	                this.vm.allMethodsDo(function(classObj, methodObj, selectorObj) {
	                    if (isMethod ? methodObj === method : methodObj.pointers.includes(method)) {
	                        optClassObj = classObj;
	                        optSelObj = selectorObj;
	                        return true;
	                    }
	                });
	            }
	            if (optClassObj) {
	                clsName = optClassObj.className();
	                sel = optSelObj.bytesAsString();
	                if (this.debug) {
	                    // only when debugging
	                    var isMethod = method.sqClass === this.vm.specialObjects[Squeak.splOb_ClassCompiledMethod];
	                    if (!isMethod) {
	                        clsName = "[] in " + clsName;
	                    }
	                    instVars = optClassObj.allInstVarNames();
	                }
	            }
	            method.compiled = this.generate(method, clsName, sel, instVars);
	        }
	    },
	    enableSingleStepping: function(method, optClass, optSel) {
	        // recompile method for single-stepping
	        if (!method.compiled || !method.compiled.canSingleStep) {
	            this.singleStep = true; // generate breakpoint support
	            this.debug = true;
	            if (!optClass) {
	                this.vm.allMethodsDo(function(classObj, methodObj, selectorObj) {
	                    if (methodObj === method) {
	                        optClass = classObj;
	                        optSel = selectorObj;
	                        return true;
	                    }
	                });
	            }
	            var cls = optClass && optClass.className();
	            var sel = optSel && optSel.bytesAsString();
	            var instVars = optClass && optClass.allInstVarNames();
	            method.compiled = this.generate(method, cls, sel, instVars);
	            method.compiled.canSingleStep = true;
	        }
	        // if a compiler does not support single-stepping, return false
	        return true;
	    },
	    functionNameFor: function(cls, sel) {
	        if (cls === undefined || cls === '?') {
	            var isMethod = this.method.sqClass === this.vm.specialObjects[Squeak.splOb_ClassCompiledMethod];
	            return isMethod ? "DOIT_" + ++this.doitCounter : "BLOCK_" + ++this.blockCounter;
	        }
	        cls = cls.replace(/ /g, "_").replace("[]", "Block");
	        if (!/[^a-zA-Z0-9:_]/.test(sel))
	            return cls + "_" + sel.replace(/:/g, "ː"); // unicode colon is valid in JS identifiers
	        var op = sel.replace(/./g, function(char) {
	            var repl = {'|': "OR", '~': "NOT", '<': "LT", '=': "EQ", '>': "GT",
	                    '&': "AND", '@': "AT", '*': "TIMES", '+': "PLUS", '\\': "MOD",
	                    '-': "MINUS", ',': "COMMA", '/': "DIV", '?': "IF"}[char];
	            return repl || 'OPERATOR';
	        });
	        return cls + "__" + op + "__";
	    },
	},
	'generating', {
	    generate: function(method, optClass, optSel, optInstVarNames) {
	        this.method = method;
	        this.sista = method.methodSignFlag();
	        this.pc = 0;                // next bytecode
	        this.endPC = 0;             // pc of furthest jump target
	        this.prevPC = 0;            // pc at start of current instruction
	        this.source = [];           // snippets will be joined in the end
	        this.sourceLabels = {};     // source pos of generated jump labels
	        this.needsLabel = {};       // jump targets
	        this.sourcePos = {};        // source pos of optional vars / statements
	        this.needsVar = {};         // true if var was used
	        this.needsBreak = false;    // insert break check for previous bytecode
	        if (optClass && optSel)
	            this.source.push("// ", optClass, ">>", optSel, "\n");
	        this.instVarNames = optInstVarNames;
	        this.allVars = ['context', 'stack', 'rcvr', 'inst[', 'temp[', 'lit['];
	        this.sourcePos['context']    = this.source.length; this.source.push("var context = vm.activeContext;\n");
	        this.sourcePos['stack']      = this.source.length; this.source.push("var stack = context.pointers;\n");
	        this.sourcePos['rcvr']       = this.source.length; this.source.push("var rcvr = vm.receiver;\n");
	        this.sourcePos['inst[']      = this.source.length; this.source.push("var inst = rcvr.pointers;\n");
	        this.sourcePos['temp[']      = this.source.length; this.source.push("var temp = vm.homeContext.pointers;\n");
	        this.sourcePos['lit[']       = this.source.length; this.source.push("var lit = vm.method.pointers;\n");
	        this.sourcePos['loop-start'] = this.source.length; this.source.push("while (true) switch (vm.pc) {\ncase 0:\n");
	        if (this.sista) this.generateSista(method);
	        else this.generateV3(method);
	        var funcName = this.functionNameFor(optClass, optSel);
	        if (this.singleStep) {
	            if (this.debug) this.source.push("// all valid PCs have a label;\n");
	            this.source.push("default: throw Error('invalid PC');\n}"); // all PCs handled
	        } else {
	            this.sourcePos['loop-end'] = this.source.length; this.source.push("default: vm.interpretOne(true); return;\n}");
	            this.deleteUnneededLabels();
	        }
	        this.deleteUnneededVariables();
	        var source = "'use strict';\nreturn function " + funcName + "(vm) {\n" + this.source.join("") + "}";
	        return new Function(source)();
	    },
	    generateV3: function(method) {
	        this.done = false;
	        while (!this.done) {
	            var byte = method.bytes[this.pc++],
	                byte2 = 0;
	            switch (byte & 0xF8) {
	                // load inst var
	                case 0x00: case 0x08:
	                    this.generatePush("inst[", byte & 0x0F, "]");
	                    break;
	                // load temp var
	                case 0x10: case 0x18:
	                    this.generatePush("temp[", 6 + (byte & 0xF), "]");
	                    break;
	                // loadLiteral
	                case 0x20: case 0x28: case 0x30: case 0x38:
	                    this.generatePush("lit[", 1 + (byte & 0x1F), "]");
	                    break;
	                // loadLiteralIndirect
	                case 0x40: case 0x48: case 0x50: case 0x58:
	                    this.generatePush("lit[", 1 + (byte & 0x1F), "].pointers[1]");
	                    break;
	                // storeAndPop inst var
	                case 0x60:
	                    this.generatePopInto("inst[", byte & 0x07, "]");
	                    break;
	                // storeAndPop temp var
	                case 0x68:
	                    this.generatePopInto("temp[", 6 + (byte & 0x07), "]");
	                    break;
	                // Quick push
	                case 0x70:
	                    switch (byte) {
	                        case 0x70: this.generatePush("rcvr"); break;
	                        case 0x71: this.generatePush("vm.trueObj"); break;
	                        case 0x72: this.generatePush("vm.falseObj"); break;
	                        case 0x73: this.generatePush("vm.nilObj"); break;
	                        case 0x74: this.generatePush("-1"); break;
	                        case 0x75: this.generatePush("0"); break;
	                        case 0x76: this.generatePush("1"); break;
	                        case 0x77: this.generatePush("2"); break;
	                    }
	                    break;
	                // Quick return
	                case 0x78:
	                    switch (byte) {
	                        case 0x78: this.generateReturn("rcvr"); break;
	                        case 0x79: this.generateReturn("vm.trueObj"); break;
	                        case 0x7A: this.generateReturn("vm.falseObj"); break;
	                        case 0x7B: this.generateReturn("vm.nilObj"); break;
	                        case 0x7C: this.generateReturn("stack[vm.sp]"); break;
	                        case 0x7D: this.generateBlockReturn(); break;
	                        default: throw Error("unusedBytecode " + byte);
	                    }
	                    break;
	                // Extended bytecodes
	                case 0x80: case 0x88:
	                    this.generateV3Extended(byte);
	                    break;
	                // short jump
	                case 0x90:
	                    this.generateJump((byte & 0x07) + 1);
	                    break;
	                // short conditional jump
	                case 0x98:
	                    this.generateJumpIf(false, (byte & 0x07) + 1);
	                    break;
	                // long jump, forward and back
	                case 0xA0:
	                    byte2 = method.bytes[this.pc++];
	                    this.generateJump(((byte&7)-4) * 256 + byte2);
	                    break;
	                // long conditional jump
	                case 0xA8:
	                    byte2 = method.bytes[this.pc++];
	                    this.generateJumpIf(byte < 0xAC, (byte & 3) * 256 + byte2);
	                    break;
	                // SmallInteger ops: + - < > <= >= = ~= * /  @ lshift: lxor: land: lor:
	                case 0xB0: case 0xB8:
	                    this.generateNumericOp(byte);
	                    break;
	                // quick primitives: // at:, at:put:, size, next, nextPut:, ...
	                case 0xC0: case 0xC8:
	                    this.generateQuickPrim(byte);
	                    break;
	                // send literal selector
	                case 0xD0: case 0xD8:
	                    this.generateSend("lit[", 1 + (byte & 0x0F), "]", 0, false);
	                    break;
	                case 0xE0: case 0xE8:
	                    this.generateSend("lit[", 1 + (byte & 0x0F), "]", 1, false);
	                    break;
	                case 0xF0: case 0xF8:
	                    this.generateSend("lit[", 1 + (byte & 0x0F), "]", 2, false);
	                    break;
	            }
	        }
	    },
	    generateV3Extended: function(bytecode) {
	        var byte2, byte3;
	        switch (bytecode) {
	            // extended push
	            case 0x80:
	                byte2 = this.method.bytes[this.pc++];
	                switch (byte2 >> 6) {
	                    case 0: this.generatePush("inst[", byte2 & 0x3F, "]"); return;
	                    case 1: this.generatePush("temp[", 6 + (byte2 & 0x3F), "]"); return;
	                    case 2: this.generatePush("lit[", 1 + (byte2 & 0x3F), "]"); return;
	                    case 3: this.generatePush("lit[", 1 + (byte2 & 0x3F), "].pointers[1]"); return;
	                }
	                return;
	            // extended store
	            case 0x81:
	                byte2 = this.method.bytes[this.pc++];
	                switch (byte2 >> 6) {
	                    case 0: this.generateStoreInto("inst[", byte2 & 0x3F, "]"); return;
	                    case 1: this.generateStoreInto("temp[", 6 + (byte2 & 0x3F), "]"); return;
	                    case 2: throw Error("illegal store into literal");
	                    case 3: this.generateStoreInto("lit[", 1 + (byte2 & 0x3F), "].pointers[1]"); return;
	                }
	                return;
	            // extended pop into
	            case 0x82:
	                byte2 = this.method.bytes[this.pc++];
	                switch (byte2 >> 6) {
	                    case 0: this.generatePopInto("inst[", byte2 & 0x3F, "]"); return;
	                    case 1: this.generatePopInto("temp[", 6 + (byte2 & 0x3F), "]"); return;
	                    case 2: throw Error("illegal pop into literal");
	                    case 3: this.generatePopInto("lit[", 1 + (byte2 & 0x3F), "].pointers[1]"); return;
	                }
	                return;
	            // Single extended send
	            case 0x83:
	                byte2 = this.method.bytes[this.pc++];
	                this.generateSend("lit[", 1 + (byte2 & 0x1F), "]", byte2 >> 5, false);
	                return;
	            // Double extended do-anything
	            case 0x84:
	                byte2 = this.method.bytes[this.pc++];
	                byte3 = this.method.bytes[this.pc++];
	                switch (byte2 >> 5) {
	                    case 0: this.generateSend("lit[", 1 + byte3, "]", byte2 & 31, false); return;
	                    case 1: this.generateSend("lit[", 1 + byte3, "]", byte2 & 31, true); return;
	                    case 2: this.generatePush("inst[", byte3, "]"); return;
	                    case 3: this.generatePush("lit[", 1 + byte3, "]"); return;
	                    case 4: this.generatePush("lit[", 1 + byte3, "].pointers[1]"); return;
	                    case 5: this.generateStoreInto("inst[", byte3, "]"); return;
	                    case 6: this.generatePopInto("inst[", byte3, "]"); return;
	                    case 7: this.generateStoreInto("lit[", 1 + byte3, "].pointers[1]"); return;
	                }
	                return;
	            // Single extended send to super
	            case 0x85:
	                byte2 = this.method.bytes[this.pc++];
	                this.generateSend("lit[", 1 + (byte2 & 0x1F), "]", byte2 >> 5, true);
	                return;
	            // Second extended send
	            case 0x86:
	                 byte2 = this.method.bytes[this.pc++];
	                 this.generateSend("lit[", 1 + (byte2 & 0x3F), "]", byte2 >> 6, false);
	                 return;
	            // pop
	            case 0x87:
	                this.generateInstruction("pop", "vm.sp--");
	                return;
	            // dup
	            case 0x88:
	                this.needsVar['stack'] = true;
	                this.generateInstruction("dup", "var dup = stack[vm.sp]; stack[++vm.sp] = dup");
	                return;
	            // thisContext
	            case 0x89:
	                this.needsVar['stack'] = true;
	                this.generateInstruction("push thisContext", "stack[++vm.sp] = vm.exportThisContext()");
	                return;
	            // closures
	            case 0x8A:
	                byte2 = this.method.bytes[this.pc++];
	                var popValues = byte2 > 127,
	                    count = byte2 & 127;
	                this.generateClosureTemps(count, popValues);
	                return;
	            // call primitive
	            case 0x8B:
	                byte2 = this.method.bytes[this.pc++];
	                byte3 = this.method.bytes[this.pc++];
	                this.generateCallPrimitive(byte2 + 256 * byte3, 0x81);
	                return
	            // remote push from temp vector
	            case 0x8C:
	                byte2 = this.method.bytes[this.pc++];
	                byte3 = this.method.bytes[this.pc++];
	                this.generatePush("temp[", 6 + byte3, "].pointers[", byte2, "]");
	                return;
	            // remote store into temp vector
	            case 0x8D:
	                byte2 = this.method.bytes[this.pc++];
	                byte3 = this.method.bytes[this.pc++];
	                this.generateStoreInto("temp[", 6 + byte3, "].pointers[", byte2, "]");
	                return;
	            // remote store and pop into temp vector
	            case 0x8E:
	                byte2 = this.method.bytes[this.pc++];
	                byte3 = this.method.bytes[this.pc++];
	                this.generatePopInto("temp[", 6 + byte3, "].pointers[", byte2, "]");
	                return;
	            // pushClosureCopy
	            case 0x8F:
	                byte2 = this.method.bytes[this.pc++];
	                byte3 = this.method.bytes[this.pc++];
	                var byte4 = this.method.bytes[this.pc++];
	                var numArgs = byte2 & 0xF,
	                    numCopied = byte2 >> 4,
	                    blockSize = byte3 << 8 | byte4;
	                this.generateClosureCopy(numArgs, numCopied, blockSize);
	                return;
	        }
	    },
	    generateSista: function() {
	        var bytes = this.method.bytes,
	            b,
	            b2,
	            b3,
	            extA = 0,
	            extB = 0;
	        this.done = false;
	        while (!this.done) {
	            b = bytes[this.pc++];
	            switch (b) {
	                // 1 Byte Bytecodes

	                // load receiver variable
	                case 0x00: case 0x01: case 0x02: case 0x03: case 0x04: case 0x05: case 0x06: case 0x07:
	                case 0x08: case 0x09: case 0x0A: case 0x0B: case 0x0C: case 0x0D: case 0x0E: case 0x0F:
	                    this.generatePush("inst[", b & 0x0F, "]");
	                    break;
	                // load literal variable
	                case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15: case 0x16: case 0x17:
	                case 0x18: case 0x19: case 0x1A: case 0x1B: case 0x1C: case 0x1D: case 0x1E: case 0x1F:
	                    this.generatePush("lit[", 1 + (b & 0x0F), "].pointers[1]");
	                    break;
	                // load literal constant
	                case 0x20: case 0x21: case 0x22: case 0x23: case 0x24: case 0x25: case 0x26: case 0x27:
	                case 0x28: case 0x29: case 0x2A: case 0x2B: case 0x2C: case 0x2D: case 0x2E: case 0x2F:
	                case 0x30: case 0x31: case 0x32: case 0x33: case 0x34: case 0x35: case 0x36: case 0x37:
	                case 0x38: case 0x39: case 0x3A: case 0x3B: case 0x3C: case 0x3D: case 0x3E: case 0x3F:
	                    this.generatePush("lit[", 1 + (b & 0x1F), "]");
	                    break;
	                // load temporary variable
	                case 0x40: case 0x41: case 0x42: case 0x43: case 0x44: case 0x45: case 0x46: case 0x47:
	                    this.generatePush("temp[", 6 + (b & 0x07), "]");
	                    break;
	                case 0x48: case 0x49: case 0x4A: case 0x4B:
	                    this.generatePush("temp[", 6 + (b & 0x03) + 8, "]");
	                    break;
	                case 0x4C: this.generatePush("rcvr");
	                    break;
	                case 0x4D: this.generatePush("vm.trueObj");
	                    break;
	                case 0x4E: this.generatePush("vm.falseObj");
	                    break;
	                case 0x4F: this.generatePush("vm.nilObj");
	                    break;
	                case 0x50: this.generatePush(0);
	                    break;
	                case 0x51: this.generatePush(1);
	                    break;
	                case 0x52:
	                    this.needsVar['stack'] = true;
	                    this.generateInstruction("push thisContext", "stack[++vm.sp] = vm.exportThisContext()");
	                    break;
	                case 0x53:
	                    this.needsVar['stack'] = true;
	                    this.generateInstruction("dup", "var dup = stack[vm.sp]; stack[++vm.sp] = dup");
	                    break;
	                case 0x54: case 0x55: case 0x56: case 0x57:
	                    throw Error("unusedBytecode " + b);
	                case 0x58: this.generateReturn("rcvr");
	                    break;
	                case 0x59: this.generateReturn("vm.trueObj");
	                    break;
	                case 0x5A: this.generateReturn("vm.falseObj");
	                    break;
	                case 0x5B: this.generateReturn("vm.nilObj");
	                    break;
	                case 0x5C: this.generateReturn("stack[vm.sp]");
	                    break;
	                case 0x5D: this.generateBlockReturn("vm.nilObj");
	                    break;
	                case 0x5E: this.generateBlockReturn();
	                    break;
	                case 0x5F: break; // nop
	                case 0x60: case 0x61: case 0x62: case 0x63: case 0x64: case 0x65: case 0x66: case 0x67:
	                case 0x68: case 0x69: case 0x6A: case 0x6B: case 0x6C: case 0x6D: case 0x6E: case 0x6F:
	                    this.generateNumericOp(b);
	                    break;
	                case 0x70: case 0x71: case 0x72: case 0x73: case 0x74: case 0x75: case 0x76: case 0x77:
	                case 0x78: case 0x79: case 0x7A: case 0x7B: case 0x7C: case 0x7D: case 0x7E: case 0x7F:
	                    this.generateQuickPrim(b);
	                    break;
	                case 0x80: case 0x81: case 0x82: case 0x83: case 0x84: case 0x85: case 0x86: case 0x87:
	                case 0x88: case 0x89: case 0x8A: case 0x8B: case 0x8C: case 0x8D: case 0x8E: case 0x8F:
	                    this.generateSend("lit[", 1 + (b & 0x0F), "]", 0, false);
	                    break;
	                case 0x90: case 0x91: case 0x92: case 0x93: case 0x94: case 0x95: case 0x96: case 0x97:
	                case 0x98: case 0x99: case 0x9A: case 0x9B: case 0x9C: case 0x9D: case 0x9E: case 0x9F:
	                    this.generateSend("lit[", 1 + (b & 0x0F), "]", 1, false);
	                    break;
	                case 0xA0: case 0xA1: case 0xA2: case 0xA3: case 0xA4: case 0xA5: case 0xA6: case 0xA7:
	                case 0xA8: case 0xA9: case 0xAA: case 0xAB: case 0xAC: case 0xAD: case 0xAE: case 0xAF:
	                    this.generateSend("lit[", 1 + (b & 0x0F), "]", 2, false);
	                    break;
	                case 0xB0: case 0xB1: case 0xB2: case 0xB3: case 0xB4: case 0xB5: case 0xB6: case 0xB7:
	                    this.generateJump((b & 0x07) + 1);
	                    break;
	                case 0xB8: case 0xB9: case 0xBA: case 0xBB: case 0xBC: case 0xBD: case 0xBE: case 0xBF:
	                    this.generateJumpIf(true, (b & 0x07) + 1);
	                    break;
	                case 0xC0: case 0xC1: case 0xC2: case 0xC3: case 0xC4: case 0xC5: case 0xC6: case 0xC7:
	                    this.generateJumpIf(false, (b & 0x07) + 1);
	                    break;
	                case 0xC8: case 0xC9: case 0xCA: case 0xCB: case 0xCC: case 0xCD: case 0xCE: case 0xCF:
	                    this.generatePopInto("inst[", b & 0x07, "]");
	                    break;
	                case 0xD0: case 0xD1: case 0xD2: case 0xD3: case 0xD4: case 0xD5: case 0xD6: case 0xD7:
	                    this.generatePopInto("temp[", 6 + (b & 0x07), "]");
	                    break;
	                case 0xD8: this.generateInstruction("pop", "vm.sp--");
	                    break;
	                case 0xD9:
	                    throw Error("unumplementedBytecode: 0xD9 (unconditional trap)");
	                case 0xDA: case 0xDB: case 0xDC: case 0xDD: case 0xDE: case 0xDF:
	                    throw Error("unusedBytecode " + b);

	                // 2 Byte Bytecodes
	                case 0xE0:
	                    b2 = bytes[this.pc++];
	                    extA = extA * 256 + b2;
	                    continue;
	                case 0xE1:
	                    b2 = bytes[this.pc++];
	                    extB = extB * 256 + (b2 < 128 ? b2 : b2 - 256);
	                    continue;
	                case 0xE2:
	                    b2 = bytes[this.pc++];
	                    this.generatePush("inst[", b2 + extA * 256, "]");
	                    break;
	                case 0xE3:
	                    b2 = bytes[this.pc++];
	                    this.generatePush("lit[", 1 + b2 + extA * 256, "].pointers[1]");
	                    break;
	                case 0xE4:
	                    b2 = bytes[this.pc++];
	                    this.generatePush("lit[", 1 + b2 + extA * 256, "]");
	                    break;
	                case 0xE5:
	                    b2 = bytes[this.pc++];
	                    this.generatePush("temp[", 6 + b2, "]");
	                    break;
	                case 0xE6:
	                    throw Error("unusedBytecode 0xE6");
	                case 0xE7:
	                    b2 = bytes[this.pc++];
	                    var popValues = b2 > 127,
	                        count = b2 & 127;
	                    this.generateClosureTemps(count, popValues);
	                    break;
	                case 0xE8:
	                    b2 = bytes[this.pc++];
	                    this.generatePush(b2 + extB * 256);
	                    break;
	                case 0xE9:
	                    b2 = bytes[this.pc++];
	                    this.generatePush("vm.image.getCharacter(", b2 + extB * 256, ")");
	                    break;
	                case 0xEA:
	                    b2 = bytes[this.pc++];
	                    this.generateSend("lit[", 1 + (b2 >> 3) + (extA << 5), "]", (b2 & 7) + (extB << 3), false);
	                    break;
	                case 0xEB:
	                    b2 = bytes[this.pc++];
	                    var lit = (b2 >> 3) + (extA << 5),
	                        numArgs = (b2 & 7) + ((extB & 63) << 3),
	                        directed = extB >= 64;
	                        this.generateSend("lit[", 1 + lit, "]", numArgs, directed ? "directed" : true);
	                    break;
	                case 0xEC:
	                    throw Error("unimplemented bytecode: 0xEC (class trap)");
	                case 0xED:
	                    b2 = bytes[this.pc++];
	                    this.generateJump(b2 + extB * 256);
	                    break;
	                case 0xEE:
	                    b2 = bytes[this.pc++];
	                    this.generateJumpIf(true, b2 + extB * 256);
	                    break;
	                case 0xEF:
	                    b2 = bytes[this.pc++];
	                    this.generateJumpIf(false, b2 + extB * 256);
	                    break;
	                case 0xF0:
	                    b2 = bytes[this.pc++];
	                    this.generatePopInto("inst[", b2 + extA * 256, "]");
	                    break;
	                case 0xF1:
	                    b2 = bytes[this.pc++];
	                    this.generatePopInto("lit[", 1 + b2 + extA * 256, "].pointers[1]");
	                    break;
	                case 0xF2:
	                    b2 = bytes[this.pc++];
	                    this.generatePopInto("temp[", 6 + b2, "]");
	                    break;
	                case 0xF3:
	                    b2 = bytes[this.pc++];
	                    this.generateStoreInto("inst[", b2 + extA * 256, "]");
	                    break;
	                case 0xF4:
	                    b2 = bytes[this.pc++];
	                    this.generateStoreInto("lit[", 1 + b2 + extA * 256, "].pointers[1]");
	                    break;
	                case 0xF5:
	                    b2 = bytes[this.pc++];
	                    this.generateStoreInto("temp[", 6 + b2, "]");
	                    break;
	                case 0xF6: case 0xF7:
	                    throw Error("unusedBytecode " + b);

	                // 3 Byte Bytecodes

	                case 0xF8:
	                    b2 = bytes[this.pc++];
	                    b3 = bytes[this.pc++];
	                    this.generateCallPrimitive(b2 + b3 * 256, 0xF5);
	                    break;
	                case 0xF9:
	                    b2 = bytes[this.pc++];
	                    b3 = bytes[this.pc++];
	                    this.generatePushFullClosure(b2 + extA * 255, b3);
	                    break;
	                case 0xFA:
	                    b2 = bytes[this.pc++];
	                    b3 = bytes[this.pc++];
	                    var numArgs = (b2 & 0x07) + (extA & 0x0F) * 8,
	                        numCopied = (b2 >> 3 & 0x7) + (extA >> 4) * 8,
	                        blockSize = b3 + (extB << 8);
	                    this.generateClosureCopy(numArgs, numCopied, blockSize);
	                    break;
	                case 0xFB:
	                    b2 = bytes[this.pc++];
	                    b3 = bytes[this.pc++];
	                    this.generatePush("temp[", 6 + b3, "].pointers[", b2, "]");
	                    break;
	                case 0xFC:
	                    b2 = bytes[this.pc++];
	                    b3 = bytes[this.pc++];
	                    this.generateStoreInto("temp[", 6 + b3, "].pointers[", b2, "]");
	                    break;
	                case 0xFD:
	                    b2 = bytes[this.pc++];
	                    b3 = bytes[this.pc++];
	                    this.generatePopInto("temp[", 6 + b3, "].pointers[", b2, "]");
	                    break;
	                case 0xFE: case 0xFF:
	                    throw Error("unusedBytecode " + b);
	                default:
	                    throw Error("illegal bytecode: " + b);
	            }
	            extA = 0;
	            extB = 0;
	        }
	    },
	    generatePush: function(target, arg1, suffix1, arg2, suffix2) {
	        if (this.debug) this.generateDebugCode("push", target, arg1, suffix1, arg2, suffix2);
	        this.generateLabel();
	        this.needsVar[target] = true;
	        this.needsVar['stack'] = true;
	        this.source.push("stack[++vm.sp] = ", target);
	        if (arg1 !== undefined) {
	            this.source.push(arg1, suffix1);
	            if (arg2 !== undefined) {
	                this.source.push(arg2, suffix2);
	            }
	        }
	        this.source.push(";\n");
	    },
	    generateStoreInto: function(target, arg1, suffix1, arg2, suffix2) {
	        if (this.debug) this.generateDebugCode("store into", target, arg1, suffix1, arg2, suffix2);
	        this.generateLabel();
	        this.needsVar[target] = true;
	        this.needsVar['stack'] = true;
	        this.source.push(target);
	        if (arg1 !== undefined) {
	            this.source.push(arg1, suffix1);
	            if (arg2 !== undefined) {
	                this.source.push(arg2, suffix2);
	            }
	        }
	        this.source.push(" = stack[vm.sp];\n");
	        this.generateDirty(target, arg1, suffix1);
	    },
	    generatePopInto: function(target, arg1, suffix1, arg2, suffix2) {
	        if (this.debug) this.generateDebugCode("pop into", target, arg1, suffix1, arg2, suffix2);
	        this.generateLabel();
	        this.needsVar[target] = true;
	        this.needsVar['stack'] = true;
	        this.source.push(target);
	        if (arg1 !== undefined) {
	            this.source.push(arg1, suffix1);
	            if (arg2 !== undefined) {
	                this.source.push(arg2, suffix2);
	            }
	        }
	        this.source.push(" = stack[vm.sp--];\n");
	        this.generateDirty(target, arg1, suffix1);
	    },
	    generateReturn: function(what) {
	        if (this.debug) this.generateDebugCode("return", what);
	        this.generateLabel();
	        this.needsVar[what] = true;
	        this.source.push(
	            "vm.pc = ", this.pc, "; vm.doReturn(", what, "); return;\n");
	        this.needsBreak = false; // returning anyway
	        this.done = this.pc > this.endPC;
	    },
	    generateBlockReturn: function(retVal) {
	        if (this.debug) this.generateDebugCode("block return");
	        this.generateLabel();
	        if (!retVal) {
	            this.needsVar['stack'] = true;
	            retVal = "stack[vm.sp--]";
	        }
	        // actually stack === context.pointers but that would look weird
	        this.needsVar['context'] = true;
	        this.source.push(
	            "vm.pc = ", this.pc, "; vm.doReturn(", retVal, ", context.pointers[0]); return;\n");
	        this.needsBreak = false; // returning anyway
	        this.done = this.pc > this.endPC;
	    },
	    generateJump: function(distance) {
	        var destination = this.pc + distance;
	        if (this.debug) this.generateDebugCode("jump to " + destination);
	        this.generateLabel();
	        this.needsVar['context'] = true;
	        this.source.push("vm.pc = ", destination, "; ");
	        if (distance < 0) this.source.push(
	            "\nif (vm.interruptCheckCounter-- <= 0) {\n",
	            "   vm.checkForInterrupts();\n",
	            "   if (context !== vm.activeContext || vm.breakOutOfInterpreter !== false) return;\n",
	            "}\n");
	        if (this.singleStep) this.source.push("\nif (vm.breakOutOfInterpreter) return;\n");
	        this.source.push("continue;\n");
	        this.needsBreak = false; // already checked
	        this.needsLabel[destination] = true;
	        if (destination > this.endPC) this.endPC = destination;
	    },
	    generateJumpIf: function(condition, distance) {
	        var destination = this.pc + distance;
	        if (this.debug) this.generateDebugCode("jump if " + condition + " to " + destination);
	        this.generateLabel();
	        this.needsVar['stack'] = true;
	        this.source.push(
	            "var cond = stack[vm.sp--]; if (cond === vm.", condition, "Obj) {vm.pc = ", destination, "; ");
	        if (this.singleStep) this.source.push("if (vm.breakOutOfInterpreter) return; else ");
	        this.source.push("continue}\n",
	            "else if (cond !== vm.", !condition, "Obj) {vm.sp++; vm.pc = ", this.pc, "; vm.send(vm.specialObjects[25], 0, false); return}\n");
	        this.needsLabel[this.pc] = true; // for coming back after #mustBeBoolean send
	        this.needsLabel[destination] = true; // obviously
	        if (destination > this.endPC) this.endPC = destination;
	    },
	    generateQuickPrim: function(byte) {
	        if (this.debug) this.generateDebugCode("quick send #" + this.specialSelectors[(byte & 0x0F) + 16]);
	        this.generateLabel();
	        switch (byte & 0x0F) {
	            case 0x0: // at:
	                this.needsVar['stack'] = true;
	                this.source.push(
	                    "var a, b; if ((a=stack[vm.sp-1]).sqClass === vm.specialObjects[7] && typeof (b=stack[vm.sp]) === 'number' && b>0 && b<=a.pointers.length) {\n",
	                    "  stack[--vm.sp] = a.pointers[b-1];",
	                    "} else { var c = vm.primHandler.objectAt(true,true,false); if (vm.primHandler.success) stack[--vm.sp] = c; else {\n",
	                    "  vm.pc = ", this.pc, "; vm.sendSpecial(16); if (context !== vm.activeContext || vm.breakOutOfInterpreter !== false) return; }}\n");
	                this.needsLabel[this.pc] = true;
	                return;
	            case 0x1: // at:put:
	                this.needsVar['stack'] = true;
	                this.source.push(
	                    "var a, b; if ((a=stack[vm.sp-2]).sqClass === vm.specialObjects[7] && typeof (b=stack[vm.sp-1]) === 'number' && b>0 && b<=a.pointers.length) {\n",
	                    "  var c = stack[vm.sp]; stack[vm.sp-=2] = a.pointers[b-1] = c; a.dirty = true;",
	                    "} else { vm.primHandler.objectAtPut(true,true,false); if (vm.primHandler.success) stack[vm.sp-=2] = c; else {\n",
	                    "  vm.pc = ", this.pc, "; vm.sendSpecial(17); if (context !== vm.activeContext || vm.breakOutOfInterpreter !== false) return; }}\n");
	                this.needsLabel[this.pc] = true;
	                return;
	            case 0x2: // size
	                this.needsVar['stack'] = true;
	                this.source.push(
	                    "if (stack[vm.sp].sqClass === vm.specialObjects[7]) stack[vm.sp] = stack[vm.sp].pointersSize();\n",     // Array
	                    "else if (stack[vm.sp].sqClass === vm.specialObjects[6]) stack[vm.sp] = stack[vm.sp].bytesSize();\n",   // ByteString
	                    "else { vm.pc = ", this.pc, "; vm.sendSpecial(18); if (context !== vm.activeContext || vm.breakOutOfInterpreter !== false) return; }\n");
	                this.needsLabel[this.pc] = true;
	                return;
	            //case 0x3: return false; // next
	            //case 0x4: return false; // nextPut:
	            //case 0x5: return false; // atEnd
	            case 0x6: // ==
	                this.needsVar['stack'] = true;
	                this.source.push("var cond = stack[vm.sp-1] === stack[vm.sp];\nstack[--vm.sp] = cond ? vm.trueObj : vm.falseObj;\n");
	                return;
	            case 0x7: // class
	                this.needsVar['stack'] = true;
	                this.source.push("stack[vm.sp] = typeof stack[vm.sp] === 'number' ? vm.specialObjects[5] : stack[vm.sp].sqClass;\n");
	                return;
	            case 0x8: // blockCopy:
	                this.needsVar['rcvr'] = true;
	                this.source.push(
	                    "vm.pc = ", this.pc, "; if (!vm.primHandler.quickSendOther(rcvr, ", (byte & 0x0F), ")) ",
	                    "{vm.sendSpecial(", ((byte & 0x0F) + 16), "); return}\n");
	                this.needsLabel[this.pc] = true;        // for send
	                this.needsLabel[this.pc + 2] = true;    // for start of block
	                return;
	            case 0x9: // value
	            case 0xA: // value:
	            case 0xB: // do:
	                this.needsVar['rcvr'] = true;
	                this.source.push(
	                    "vm.pc = ", this.pc, "; if (!vm.primHandler.quickSendOther(rcvr, ", (byte & 0x0F), ")) vm.sendSpecial(", ((byte & 0x0F) + 16), "); return;\n");
	                this.needsLabel[this.pc] = true;
	                return;
	            //case 0xC: return false; // new
	            //case 0xD: return false; // new:
	            //case 0xE: return false; // x
	            //case 0xF: return false; // y
	        }
	        // generic version for the bytecodes not yet handled above
	        this.needsVar['rcvr'] = true;
	        this.needsVar['context'] = true;
	        this.source.push(
	            "vm.pc = ", this.pc, "; if (!vm.primHandler.quickSendOther(rcvr, ", (byte & 0x0F), "))",
	            " vm.sendSpecial(", ((byte & 0x0F) + 16), ");\n",
	            "if (context !== vm.activeContext || vm.breakOutOfInterpreter !== false) return;\n");
	        this.needsBreak = false; // already checked
	        // if falling back to a full send we need a label for coming back
	        this.needsLabel[this.pc] = true;
	    },
	    generateNumericOp: function(byte) {
	        if (this.debug) this.generateDebugCode("quick send #" + this.specialSelectors[byte & 0x0F]);
	        this.generateLabel();
	        // if the op cannot be executed here, do a full send and return to main loop
	        // we need a label for coming back
	        this.needsLabel[this.pc] = true;
	        switch (byte & 0x0F) {
	            case 0x0: // PLUS +
	                this.needsVar['stack'] = true;
	                this.source.push("var a = stack[vm.sp - 1], b = stack[vm.sp];\n",
	                "if (typeof a === 'number' && typeof b === 'number') {\n",
	                "   stack[--vm.sp] = vm.primHandler.signed32BitIntegerFor(a + b);\n",
	                "} else { vm.pc = ", this.pc, "; vm.sendSpecial(0); if (context !== vm.activeContext || vm.breakOutOfInterpreter !== false) return}\n");
	                return;
	            case 0x1: // MINUS -
	                this.needsVar['stack'] = true;
	                this.source.push("var a = stack[vm.sp - 1], b = stack[vm.sp];\n",
	                "if (typeof a === 'number' && typeof b === 'number') {\n",
	                "   stack[--vm.sp] = vm.primHandler.signed32BitIntegerFor(a - b);\n",
	                "} else { vm.pc = ", this.pc, "; vm.sendSpecial(1); if (context !== vm.activeContext || vm.breakOutOfInterpreter !== false) return}\n");
	                return;
	            case 0x2: // LESS <
	                this.needsVar['stack'] = true;
	                this.source.push("var a = stack[vm.sp - 1], b = stack[vm.sp];\n",
	                "if (typeof a === 'number' && typeof b === 'number') {\n",
	                "   stack[--vm.sp] = a < b ? vm.trueObj : vm.falseObj;\n",
	                "} else { vm.pc = ", this.pc, "; vm.sendSpecial(2); if (context !== vm.activeContext || vm.breakOutOfInterpreter !== false) return}\n");
	                return;
	            case 0x3: // GRTR >
	                this.needsVar['stack'] = true;
	                this.source.push("var a = stack[vm.sp - 1], b = stack[vm.sp];\n",
	                "if (typeof a === 'number' && typeof b === 'number') {\n",
	                "   stack[--vm.sp] = a > b ? vm.trueObj : vm.falseObj;\n",
	                "} else { vm.pc = ", this.pc, "; vm.sendSpecial(3); if (context !== vm.activeContext || vm.breakOutOfInterpreter !== false) return}\n");
	                return;
	            case 0x4: // LEQ <=
	                this.needsVar['stack'] = true;
	                this.source.push("var a = stack[vm.sp - 1], b = stack[vm.sp];\n",
	                "if (typeof a === 'number' && typeof b === 'number') {\n",
	                "   stack[--vm.sp] = a <= b ? vm.trueObj : vm.falseObj;\n",
	                "} else { vm.pc = ", this.pc, "; vm.sendSpecial(4); if (context !== vm.activeContext || vm.breakOutOfInterpreter !== false) return}\n");
	                return;
	            case 0x5: // GEQ >=
	                this.needsVar['stack'] = true;
	                this.source.push("var a = stack[vm.sp - 1], b = stack[vm.sp];\n",
	                "if (typeof a === 'number' && typeof b === 'number') {\n",
	                "   stack[--vm.sp] = a >= b ? vm.trueObj : vm.falseObj;\n",
	                "} else { vm.pc = ", this.pc, "; vm.sendSpecial(5); if (context !== vm.activeContext || vm.breakOutOfInterpreter !== false) return}\n");
	                return;
	            case 0x6: // EQU =
	                this.needsVar['stack'] = true;
	                this.source.push("var a = stack[vm.sp - 1], b = stack[vm.sp];\n",
	                "if (typeof a === 'number' && typeof b === 'number') {\n",
	                "   stack[--vm.sp] = a === b ? vm.trueObj : vm.falseObj;\n",
	                "} else if (a === b && a.float === a.float) {\n",   // NaN check
	                "   stack[--vm.sp] = vm.trueObj;\n",
	                "} else { vm.pc = ", this.pc, "; vm.sendSpecial(6); if (context !== vm.activeContext || vm.breakOutOfInterpreter !== false) return}\n");
	                return;
	            case 0x7: // NEQ ~=
	                this.needsVar['stack'] = true;
	                this.source.push("var a = stack[vm.sp - 1], b = stack[vm.sp];\n",
	                "if (typeof a === 'number' && typeof b === 'number') {\n",
	                "   stack[--vm.sp] = a !== b ? vm.trueObj : vm.falseObj;\n",
	                "} else if (a === b && a.float === a.float) {\n",   // NaN check
	                "   stack[--vm.sp] = vm.falseObj;\n",
	                "} else { vm.pc = ", this.pc, "; vm.sendSpecial(7); if (context !== vm.activeContext || vm.breakOutOfInterpreter !== false) return}\n");
	                return;
	            case 0x8: // TIMES *
	                this.source.push("vm.success = true; vm.resultIsFloat = false; if(!vm.pop2AndPushNumResult(vm.stackIntOrFloat(1) * vm.stackIntOrFloat(0))) { vm.pc = ", this.pc, "; vm.sendSpecial(8); return}\n");
	                return;
	            case 0x9: // DIV /
	                this.source.push("vm.success = true; if(!vm.pop2AndPushIntResult(vm.quickDivide(vm.stackInteger(1),vm.stackInteger(0)))) { vm.pc = ", this.pc, "; vm.sendSpecial(9); return}\n");
	                return;
	            case 0xA: // MOD \
	                this.source.push("vm.success = true; if(!vm.pop2AndPushIntResult(vm.mod(vm.stackInteger(1),vm.stackInteger(0)))) { vm.pc = ", this.pc, "; vm.sendSpecial(10); return}\n");
	                return;
	            case 0xB:  // MakePt int@int
	                this.source.push("vm.success = true; if(!vm.primHandler.primitiveMakePoint(1, true)) { vm.pc = ", this.pc, "; vm.sendSpecial(11); return}\n");
	                return;
	            case 0xC: // bitShift:
	                this.source.push("vm.success = true; if(!vm.pop2AndPushIntResult(vm.safeShift(vm.stackInteger(1),vm.stackInteger(0)))) { vm.pc = ", this.pc, "; vm.sendSpecial(12); return}\n");
	                return;
	            case 0xD: // Divide //
	                this.source.push("vm.success = true; if(!vm.pop2AndPushIntResult(vm.div(vm.stackInteger(1),vm.stackInteger(0)))) { vm.pc = ", this.pc, "; vm.sendSpecial(13); return}\n");
	                return;
	            case 0xE: // bitAnd:
	                this.source.push("vm.success = true; if(!vm.pop2AndPushIntResult(vm.stackInteger(1) & vm.stackInteger(0))) { vm.pc = ", this.pc, "; vm.sendSpecial(14); return}\n");
	                return;
	            case 0xF: // bitOr:
	                this.source.push("vm.success = true; if(!vm.pop2AndPushIntResult(vm.stackInteger(1) | vm.stackInteger(0))) { vm.pc = ", this.pc, "; vm.sendSpecial(15); return}\n");
	                return;
	        }
	    },
	    generateSend: function(prefix, num, suffix, numArgs, superSend) {
	        if (this.debug) this.generateDebugCode(
	            (superSend === "directed" ? "directed super send " : superSend ? "super send " : "send ")
	            + (prefix === "lit[" ? this.method.pointers[num].bytesAsString() : "..."));
	        this.generateLabel();
	        this.needsVar[prefix] = true;
	        this.needsVar['context'] = true;
	        // set pc, activate new method, and return to main loop
	        // unless the method was a successfull primitive call (no context change)
	        this.source.push("vm.pc = ", this.pc);
	        if (superSend === "directed") {
	            this.source.push("; vm.sendSuperDirected(", prefix, num, suffix, ", ", numArgs, "); ");
	        } else {
	            this.source.push("; vm.send(", prefix, num, suffix, ", ", numArgs, ", ", superSend, "); ");
	        }
	        this.source.push("if (context !== vm.activeContext || vm.breakOutOfInterpreter !== false) return;\n");
	        this.needsBreak = false; // already checked
	        // need a label for coming back after send
	        this.needsLabel[this.pc] = true;
	    },
	    generateClosureTemps: function(count, popValues) {
	        if (this.debug) this.generateDebugCode("closure temps");
	        this.generateLabel();
	        this.needsVar['stack'] = true;
	        this.source.push("var array = vm.instantiateClass(vm.specialObjects[7], ", count, ");\n");
	        if (popValues) {
	            for (var i = 0; i < count; i++)
	                this.source.push("array.pointers[", i, "] = stack[vm.sp - ", count - i - 1, "];\n");
	            this.source.push("stack[vm.sp -= ", count - 1, "] = array;\n");
	        } else {
	            this.source.push("stack[++vm.sp] = array;\n");
	        }
	    },
	    generateClosureCopy: function(numArgs, numCopied, blockSize) {
	        var from = this.pc,
	            to = from + blockSize;
	        if (this.debug) this.generateDebugCode("push closure(" + from + "-" + (to-1) + "): " + numCopied + " copied, " + numArgs + " args");
	        this.generateLabel();
	        this.needsVar['stack'] = true;
	        this.source.push(
	            "var closure = vm.instantiateClass(vm.specialObjects[36], ", numCopied, ");\n",
	            "closure.pointers[0] = context; vm.reclaimableContextCount = 0;\n",
	            "closure.pointers[1] = ", from + this.method.pointers.length * 4 + 1, ";\n",  // encodeSqueakPC
	            "closure.pointers[2] = ", numArgs, ";\n");
	        if (numCopied > 0) {
	            for (var i = 0; i < numCopied; i++)
	                this.source.push("closure.pointers[", i + 3, "] = stack[vm.sp - ", numCopied - i - 1,"];\n");
	            this.source.push("stack[vm.sp -= ", numCopied - 1,"] = closure;\n");
	        } else {
	            this.source.push("stack[++vm.sp] = closure;\n");
	        }
	        this.source.push("vm.pc = ", to, ";\n");
	        if (this.singleStep) this.source.push("if (vm.breakOutOfInterpreter) return;\n");
	        this.source.push("continue;\n");
	        this.needsBreak = false; // already checked
	        this.needsLabel[from] = true;   // initial pc when activated
	        this.needsLabel[to] = true;     // for jump over closure
	        if (to > this.endPC) this.endPC = to;
	    },
	    generatePushFullClosure: function(index, b3) {
	        if (this.debug) this.generateDebugCode("push full closure " + (index + 1));
	        this.generateLabel();
	        this.needsVar['lit['] = true;
	        this.needsVar['rcvr'] = true;
	        this.needsVar['stack'] = true;
	        var numCopied = b3 & 63;
	        var outer;
	        if ((b3 >> 6 & 1) === 1) {
	            outer = "vm.nilObj";
	        } else {
	            outer = "context";
	        }
	        if ((b3 >> 7 & 1) === 1) {
	            throw Error("on-stack receiver not yet supported");
	        }
	        this.source.push("var closure = vm.newFullClosure(", outer, ", ", numCopied, ", lit[", 1 + index, "]);\n");
	        this.source.push("closure.pointers[", Squeak.ClosureFull_receiver, "] = rcvr;\n");
	        if (outer === "context") this.source.push("vm.reclaimableContextCount = 0;\n");
	        if (numCopied > 0) {
	            for (var i = 0; i < numCopied; i++)
	                this.source.push("closure.pointers[", i + Squeak.ClosureFull_firstCopiedValue, "] = stack[vm.sp - ", numCopied - i - 1,"];\n");
	            this.source.push("stack[vm.sp -= ", numCopied - 1,"] = closure;\n");
	        } else {
	            this.source.push("stack[++vm.sp] = closure;\n");
	        }
	    },
	    generateCallPrimitive: function(index, extendedStoreBytecode) {
	        if (this.debug) this.generateDebugCode("call primitive " + index);
	        this.generateLabel();
	        if (this.method.bytes[this.pc] === extendedStoreBytecode)  {
	            this.needsVar['stack'] = true;
	            this.source.push("if (vm.primFailCode) {stack[vm.sp] = vm.getErrorObjectFromPrimFailCode(); vm.primFailCode = 0;}\n");
	        }
	    },
	    generateDirty: function(target, arg, suffix) {
	        switch(target) {
	            case "inst[": this.source.push("rcvr.dirty = true;\n"); break;
	            case "lit[": this.source.push(target, arg, "].dirty = true;\n"); break;
	            case "temp[": if (suffix !== "]") this.source.push(target, arg, "].dirty = true;\n"); break;
	            default:
	                throw Error("unexpected target " + target);
	        }
	    },
	    generateLabel: function() {
	        // remember label position for deleteUnneededLabels()
	        if (this.prevPC) {
	            this.sourceLabels[this.prevPC] = this.source.length;
	            this.source.push("case ", this.prevPC, ":\n");           // must match deleteUnneededLabels
	        }
	        this.prevPC = this.pc;
	    },
	    generateDebugCode: function(command, what, arg1, suffix1, arg2, suffix2) {
	        // single-step for previous instructiuon
	        if (this.needsBreak) {
	             this.source.push("if (vm.breakOutOfInterpreter) {vm.pc = ", this.prevPC, "; return}\n");
	             this.needsLabel[this.prevPC] = true;
	        }
	        // comment for this instruction
	        var bytecodes = [];
	        for (var i = this.prevPC; i < this.pc; i++)
	            bytecodes.push((this.method.bytes[i] + 0x100).toString(16).slice(-2).toUpperCase());
	        this.source.push("// ", this.prevPC, " <", bytecodes.join(" "), "> ", command);
	        // append argument to comment
	        if (what !== undefined) {
	            this.source.push(" ");
	            switch (what) {
	                case 'vm.nilObj':    this.source.push('nil'); break;
	                case 'vm.trueObj':   this.source.push('true'); break;
	                case 'vm.falseObj':  this.source.push('false'); break;
	                case 'rcvr':         this.source.push('self'); break;
	                case 'stack[vm.sp]': this.source.push('top of stack'); break;
	                case 'inst[':
	                    if (!this.instVarNames) this.source.push('inst var ', arg1);
	                    else this.source.push(this.instVarNames[arg1]);
	                    break;
	                case 'temp[':
	                    this.source.push('tmp', arg1 - 6);
	                    if (suffix1 !== ']') this.source.push('[', arg2, ']');
	                    break;
	                case 'lit[':
	                    var lit = this.method.pointers[arg1];
	                    if (suffix1 === ']') this.source.push(lit);
	                    else this.source.push(lit.pointers[0].bytesAsString());
	                    break;
	                default:
	                    this.source.push(what);
	            }
	        }
	        this.source.push("\n");
	        // enable single-step for next instruction
	        this.needsBreak = this.singleStep;
	    },
	    generateInstruction: function(comment, instr) {
	        if (this.debug) this.generateDebugCode(comment);
	        this.generateLabel();
	        this.source.push(instr, ";\n");
	    },
	    deleteUnneededLabels: function() {
	        // switch statement is more efficient with fewer labels
	        var hasAnyLabel = false;
	        for (var i in this.sourceLabels)
	            if (this.needsLabel[i])
	                hasAnyLabel = true;
	            else for (var j = 0; j < 3; j++)
	               this.source[this.sourceLabels[i] + j] = "";
	        if (!hasAnyLabel) {
	            this.source[this.sourcePos['loop-start']] = "";
	            this.source[this.sourcePos['loop-end']] = "";
	        }
	    },
	    deleteUnneededVariables: function() {
	        if (this.needsVar['stack']) this.needsVar['context'] = true;
	        if (this.needsVar['inst[']) this.needsVar['rcvr'] = true;
	        for (var i = 0; i < this.allVars.length; i++) {
	            var v = this.allVars[i];
	            if (!this.needsVar[v])
	                this.source[this.sourcePos[v]] = "";
	        }
	    },
	});
	return jit;
}

var vm_display = {};

var hasRequiredVm_display;

function requireVm_display () {
	if (hasRequiredVm_display) return vm_display;
	hasRequiredVm_display = 1;
	/*
	 * Copyright (c) 2013-2024 Vanessa Freudenberg
	 *
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:
	 *
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 *
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 */

	Object.extend(Squeak,
	"known classes", {
	    // BitBlt layout:
	    BitBlt_dest: 0,
	    BitBlt_source: 1,
	    BitBlt_halftone: 2,
	    BitBlt_combinationRule: 3,
	    BitBlt_destX: 4,
	    BitBlt_destY: 5,
	    BitBlt_width: 6,
	    BitBlt_height: 7,
	    BitBlt_sourceX: 8,
	    BitBlt_sourceY: 9,
	    BitBlt_clipX: 10,
	    BitBlt_clipY: 11,
	    BitBlt_clipW: 12,
	    BitBlt_clipH: 13,
	    BitBlt_colorMap: 14,
	    BitBlt_warpBase: 15,
	    // Form layout:
	    Form_bits: 0,
	    Form_width: 1,
	    Form_height: 2,
	    Form_depth: 3,
	    Form_offset: 4,
	});

	Object.extend(Squeak.Primitives.prototype,
	'display', {
	    displayDirty: function() {},
	});
	return vm_display;
}

var vm_display_headless = {};

var hasRequiredVm_display_headless;

function requireVm_display_headless () {
	if (hasRequiredVm_display_headless) return vm_display_headless;
	hasRequiredVm_display_headless = 1;
	/*
	 * Copyright (c) 2013-2024 Vanessa Freudenberg
	 *
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:
	 *
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 *
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 */

	// Fake display primitives for headless usage in node
	// Most primitives simply fail, some require answering a value to keep images working
	Object.extend(Squeak.Primitives.prototype,
	'display', {
		primitiveScreenSize: function() { return false; },
		primitiveScreenDepth: function() { return false; },
		primitiveTestDisplayDepth: function() { return false; },
		primitiveBeDisplay: function(argCount) {
			this.vm.popN(argCount);	// Answer self
			return true;
		},
		primitiveReverseDisplay: function() { return false; },
		primitiveDeferDisplayUpdates: function() { return false; },
		primitiveForceDisplayUpdate: function() { return false; },
		primitiveScanCharacters: function() { return false; },
		primitiveSetFullScreen: function() { return false; },
		primitiveShowDisplayRect: function() { return false; },
		primitiveBeCursor: function(argCount) {
			this.vm.popN(argCount);	// Answer self
			return true;
		},
	});
	return vm_display_headless;
}

var vm_input = {};

var hasRequiredVm_input;

function requireVm_input () {
	if (hasRequiredVm_input) return vm_input;
	hasRequiredVm_input = 1;
	/*
	 * Copyright (c) 2013-2024 Vanessa Freudenberg
	 *
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:
	 *
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 *
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 */

	Object.extend(Squeak,
	"events", {
	    Mouse_Blue: 1,
	    Mouse_Yellow: 2,
	    Mouse_Red: 4,
	    Keyboard_Shift: 8,
	    Keyboard_Ctrl: 16,
	    Keyboard_Alt: 32,
	    Keyboard_Cmd: 64,
	    Mouse_All: 1 + 2 + 4,
	    Keyboard_All: 8 + 16 + 32 + 64,
	    EventTypeNone: 0,
	    EventTypeMouse: 1,
	    EventTypeKeyboard: 2,
	    EventTypeDragDropFiles: 3,
	    EventKeyChar: 0,
	    EventKeyDown: 1,
	    EventKeyUp: 2,
	    EventDragEnter: 1,
	    EventDragMove: 2,
	    EventDragLeave: 3,
	    EventDragDrop: 4,
	    EventTypeWindow: 5,
	    EventTypeComplex: 6,
	    EventTypeMouseWheel: 7,
	    WindowEventMetricChange: 1,
	    WindowEventClose: 2,
	    WindowEventIconise: 3,
	    WindowEventActivated: 4,
	    WindowEventPaint: 5,
	    WindowEventScreenChange: 6,
	    EventTouchDown: 1,
	    EventTouchUp: 2,
	    EventTouchMoved: 3,
	    EventTouchStationary: 4,
	    EventTouchCancelled: 5,
	});
	return vm_input;
}

var vm_input_headless = {};

var hasRequiredVm_input_headless;

function requireVm_input_headless () {
	if (hasRequiredVm_input_headless) return vm_input_headless;
	hasRequiredVm_input_headless = 1;
	/*
	 * Copyright (c) 2013-2024 Vanessa Freudenberg
	 *
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:
	 *
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 *
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 */

	// Fake input primitives for headless usage
	// Most primitives simply fail, some require answering a value to keep images working
	Object.extend(Squeak.Primitives.prototype,
	'input', {
		primitiveMouseButtons: function() { return false; },
		primitiveMousePoint: function() { return false; },
		primitiveKeyboardNext: function() { return false; },
		primitiveKeyboardPeek: function() { return false; },
		primitiveInputSemaphore: function(argCount) {
			this.vm.popNandPush(argCount + 1, this.vm.nilObj);
			return true;
		},
		primitiveInputWord: function() { return false; },
		primitiveGetNextEvent: function() { return false; },
		primitiveBeep: function() { return false; },
		primitiveClipboardText: function() { return false; },
	});
	return vm_input_headless;
}

var vm_plugins = {};

var hasRequiredVm_plugins;

function requireVm_plugins () {
	if (hasRequiredVm_plugins) return vm_plugins;
	hasRequiredVm_plugins = 1;
	/*
	 * Copyright (c) 2013-2024 Vanessa Freudenberg
	 *
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:
	 *
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 *
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 */

	Object.extend(Squeak.Primitives.prototype,
	'initialization', {
	    initPlugins: function() {
	        Object.extend(this.builtinModules, {
	            JavaScriptPlugin:       this.findPluginFunctions("js_"),
	            FilePlugin:             this.findPluginFunctions("", "primitive(Disable)?(File|Directory)"),
	            DropPlugin:             this.findPluginFunctions("", "primitiveDropRequest"),
	            SoundPlugin:            this.findPluginFunctions("snd_"),
	            JPEGReadWriter2Plugin:  this.findPluginFunctions("jpeg2_"),
	            SqueakFFIPrims:         this.findPluginFunctions("ffi_", "", true),
	            HostWindowPlugin:       this.findPluginFunctions("hostWindow_"),
	            SecurityPlugin: {
	                primitiveDisableImageWrite: this.fakePrimitive.bind(this, "SecurityPlugin.primitiveDisableImageWrite", 0),
	                primitiveGetUntrustedUserDirectory: this.fakePrimitive.bind(this, "SecurityPlugin.primitiveGetUntrustedUserDirectory", "/SqueakJS"),
	            },
	            LocalePlugin: {
	                primitiveTimezoneOffset: this.fakePrimitive.bind(this, "LocalePlugin.primitiveTimezoneOffset", 0),
	            },
	        });
	        Object.extend(this.patchModules, {
	            ScratchPlugin:          this.findPluginFunctions("scratch_"),
	        });
	    },
	    findPluginFunctions: function(prefix, match, bindLate) {
	        match = match || "(initialise|shutdown|prim)";
	        var plugin = {},
	            regex = new RegExp("^" + prefix + match, "i");
	        for (var funcName in this)
	            if (regex.test(funcName) && typeof this[funcName] == "function") {
	                var primName = funcName;
	                if (prefix) primName = funcName[prefix.length].toLowerCase() + funcName.slice(prefix.length + 1);
	                plugin[primName] = bindLate ? funcName : this[funcName].bind(this);
	            }
	        return plugin;
	    },
	});
	return vm_plugins;
}

var vm_plugins_file_node = {};

var hasRequiredVm_plugins_file_node;

function requireVm_plugins_file_node () {
	if (hasRequiredVm_plugins_file_node) return vm_plugins_file_node;
	hasRequiredVm_plugins_file_node = 1;
	/*
	 * Copyright (c) 2013-2024 Vanessa Freudenberg
	 *
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:
	 *
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 *
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 */

	var fs = require$$0$3;
	var path = require$$1$1;

	var previousWriteBuffers = [
	    "", // stdin, unused
	    "", // stdout
	    "", // stderr
	];

	var openFileDescriptors = [];

	Object.extend(Squeak.Primitives.prototype,
	'FilePlugin', {
	    primitiveDirectoryCreate: function(argCount) {
	        var dirNameObj = this.stackNonInteger(0);
	        if (!this.success) return false;
	        var dirName = dirNameObj.bytesAsString();
	        try {
	            fs.mkdirSync(dirName);
	        } catch(e) {
	            console.error("Failed to create directory: " + dirName);
	            return false;
	        }
	        return this.popNIfOK(argCount);	// Answer self
	    },
	    primitiveDirectoryDelete: function(argCount) {
	        this.stackNonInteger(0);
	        if (!this.success) return false;
	        var dirName = dirName.bytesAsString();
	        try {
	            fs.rmdirSync(dirName);
	        } catch(e) {
	            console.error("Failed to delete directory: " + dirName);
	            return false;
	        }
	        return this.popNIfOK(argCount);	// Answer self
	    },
	    primitiveDirectoryDelimitor: function(argCount) {
	        var delimitor = this.emulateMac ? ':' : path.sep;
	        return this.popNandPushIfOK(argCount + 1, this.charFromInt(delimitor.charCodeAt(0)));
	    },
	    primitiveDirectoryLookup: function(argCount) {
	        var index = this.stackInteger(0),
	            dirNameObj = this.stackNonInteger(1);
	        if (!this.success) return false;
	        var dirName = dirNameObj.bytesAsString();
	        var entry = null;
	        try {
	            var dirEntries = fs.readdirSync(dirName);
	            if (index < 1 || index > dirEntries.length) return false;
	            var dirEntry = dirEntries[index - 1];
	            var stats = fs.statSync(dirName + path.sep + dirEntry);
	            entry = [
	                dirEntry,                                           // Name
	                Math.floor((stats.ctimeMs - Squeak.Epoch) / 1000),  // Creation time (seconds sinds Smalltalk epoch)
	                Math.floor((stats.mtimeMs - Squeak.Epoch) / 1000),  // Modification time (seconds sinds Smalltalk epoch)
	                stats.isDirectory(),                                // Directory flag
	                stats.isFile() ? stats.size : 0                     // File size
	            ];
	        } catch(e) {
	            if (e.errno !== -20) {
	                console.error("Failed to read directory: " + dirName);
	            }
	            return false;
	        }
	        this.popNandPushIfOK(argCount + 1, this.makeStObject(entry));  // entry or nil
	        return true;
	    },
	    primitiveFileStdioHandles: function(argCount) {
	        var handles = [
	            this.makeFileHandle('/dev/stdin', 0, false),
	            this.makeFileHandle('/dev/stdout', 1, true),
	            this.makeFileHandle('/dev/stderr', 2, true),
	        ];
	        this.popNandPushIfOK(argCount + 1, this.makeStArray(handles));
	        return true;
	    },
	    primitiveFileOpen: function(argCount) {
	        var writeFlag = this.stackBoolean(0),
	            fileNameObj = this.stackNonInteger(1);
	        if (!this.success) return false;
	        var fileName = fileNameObj.bytesAsString();
	        var fd;
	        try {
	            fd = fs.openSync(fileName, writeFlag ? "a+" : "r");
	            if (fd < 0) return false;
	        } catch(e) {
	            console.error("Failed to open file: " + fileName);
	            return false;
	        }
	        var handle = this.makeFileHandle(fileName, fd, writeFlag);
	        openFileDescriptors.push(fd);
	        this.popNandPushIfOK(argCount + 1, handle);
	        return true;
	    },
	    primitiveFileSize: function(argCount) {
	        var handle = this.stackNonInteger(0);
	        if (!this.success) return false;
	        var fileSize;
	        try {
	            fileSize = fs.fstatSync(handle.fd).size;
	        } catch(e) {
	            console.error("Failed to get file size");
	            return false;
	        }
	        this.popNandPushIfOK(argCount + 1, this.makeLargeIfNeeded(fileSize));
	        return true;
	    },
	    primitiveFileGetPosition: function(argCount) {
	        var handle = this.stackNonInteger(0);
	        if (!this.success) return false;
	        this.popNandPushIfOK(argCount + 1, this.makeLargeIfNeeded(handle.filePos));
	        return true;
	    },
	    primitiveFileSetPosition: function(argCount) {
	        var pos = this.stackPos32BitInt(0),
	            handle = this.stackNonInteger(1);
	        if (!this.success) return false;
	        handle.filePos = pos;
	        return this.popNIfOK(argCount);	// Answer self
	    },
	    primitiveFileAtEnd: function(argCount) {
	        var handle = this.stackNonInteger(0);
	        if (!this.success) return false;
	        var fileAtEnd;
	        try {
	            fileAtEnd = handle.filePos >= fs.fstatSync(handle.fd).size;
	        } catch(e) {
	            console.error("Failed to decide if at end of file");
	            return false;
	        }
	        this.popNandPushIfOK(argCount + 1, this.makeStObject(fileAtEnd));
	        return true;
	    },
	    primitiveDirectorySetMacTypeAndCreator: function(argCount) {
	        return this.popNIfOK(argCount);	// Answer self
	    },
	    primitiveFileRead: function(argCount) {
	        var count = this.stackInteger(0),
	            startIndex = this.stackInteger(1) - 1, // make zero based
	            arrayObj = this.stackNonInteger(2),
	            handle = this.stackNonInteger(3);
	        if (!this.success || !arrayObj.isWordsOrBytes()) return false;
	        if (!count) return this.popNandPushIfOK(argCount + 1, 0);
	        var array = arrayObj.bytes;
	        if (!array) {
	            array = arrayObj.wordsAsUint8Array();
	            startIndex *= 4;
	            count *= 4;
	        }
	        if (startIndex < 0 || startIndex + count > array.length)
	            return false;
	        if (handle.fd === 0) {
	            console.warn("File reading on stdin not implemented yet");
	            return false;
	        }
	        var bytesRead;
	        try {
	            bytesRead = fs.readSync(handle.fd, array, startIndex, count, handle.filePos);
	            handle.filePos += bytesRead;
	        } catch(e) {
	            console.error("Failed to read from file");
	            return false;
	        }
	        count = arrayObj.bytes ? bytesRead : bytesRead >> 2;  // words
	        this.popNandPushIfOK(argCount + 1, count);
	        return true;
	    },
	    primitiveFileWrite: function(argCount) {
	        var count = this.stackInteger(0),
	            startIndex = this.stackInteger(1) - 1, // make zero based
	            arrayObj = this.stackNonInteger(2),
	            handle = this.stackNonInteger(3);
	        if (!this.success || !handle.fileWrite) return false;
	        if (!count) return this.popNandPushIfOK(argCount + 1, 0);
	        var array = arrayObj.bytes;
	        if (!array) {
	            array = arrayObj.wordsAsUint8Array();
	            startIndex *= 4;
	            count *= 4;
	        }
	        if (!array) return false;
	        if (startIndex < 0 || startIndex + count > array.length)
	            return false;
	        var bytesWritten;
	        if (handle.fd === 1 || handle.fd === 2) {
	            var logger = handle.fd === 1 ? console.log : console.error;
	            var buffer = array.slice(startIndex, startIndex + count);
	            while (count > 0 && buffer.length > 0) {
	                var linefeedIndex = buffer.indexOf(10);
	                if (linefeedIndex >= 0) {
	                    logger(previousWriteBuffers[handle.fd] + String.fromCharCode.apply(null, buffer.slice(0, linefeedIndex)));
	                    previousWriteBuffers[handle.fd] = "";
	                    buffer = buffer.slice(linefeedIndex + 1);
	                    bytesWritten += linefeedIndex + 1;  // incl. the linefeed character
	                    count -= linefeedIndex + 1;
	                    handle.filePos += linefeedIndex + 1;
	                } else {
	                    previousWriteBuffers[handle.fd] += String.fromCharCode.apply(null, buffer);
	                    bytesWritten += buffer.length;
	                    count -= buffer.length;
	                    handle.filePos += buffer.length;
	                }
	            }
	        } else {
	            try {
	                bytesWritten = fs.writeSync(handle.fd, array, startIndex, count, handle.filePos);
	                handle.filePos += bytesWritten;
	            } catch(e) {
	                console.error("Failed to write to file");
	                return false;
	            }
	        }
	        if (!arrayObj.bytes) bytesWritten = bytesWritten >> 2;  // words
	        this.popNandPushIfOK(argCount + 1, bytesWritten);
	        return true;
	    },
	    primitiveFileFlush: function(argCount) {
	        var handle = this.stackNonInteger(0);
	        if (!this.success) return false;
	        if (handle.fd === 1 || handle.fd === 2) {
	            var logger = handle.fd === 1 ? console.log : console.error;
	            logger(previousWriteBuffers[handle.fd]);
	            previousWriteBuffers[handle.fd] = "";
	        } else {
	            try {
	                fs.fsyncSync(handle.fd);
	            } catch(e) {
	                console.error("Failed to flush file");
	                return false;
	            }
	        }
	        return this.popNIfOK(argCount);	// Answer self
	    },
	    primitiveFileTruncate: function(argCount) {
	        var pos = this.stackPos32BitInt(0),
	            handle = this.stackNonInteger(1);
	        if (!this.success || !handle.fileWrite) return false;
	        try {
	            var fileSize = fs.fstatSync(handle.fd).size;
	            if (fileSize > pos) {
	                fs.ftruncateSync(handle.fd, pos);
	                if (handle.filePos > pos) handle.filePos = pos;
	            }
	        } catch(e) {
	            console.error("Failed to truncate file");
	            return false;
	        }
	        return this.popNIfOK(argCount);	// Answer self
	    },
	    primitiveFileClose: function(argCount) {
	        var handle = this.stackNonInteger(0);
	        if (!this.success) return false;
	        try {
	            fs.closeSync(handle.fd);
	            openFileDescriptors = openFileDescriptors.filter(function(fd) { return fd !== handle.fd; });
	        } catch(e) {
	            console.error("Failed to close file");
	            return false;
	        }
	        return this.popNIfOK(argCount);	// Answer self
	    },
	    primitiveFileRename: function(argCount) {
	        var oldNameObj = this.stackNonInteger(1),
	            newNameObj = this.stackNonInteger(0);
	        if (!this.success) return false;
	        var oldName = oldNameObj.bytesAsString(),
	            newName = newNameObj.bytesAsString();
	        try {
	            fs.renameSync(oldName, newName);
	        } catch(e) {
	            console.error("Failed to rename file from: " + oldName + " to: " + newName);
	            return false;
	        }
	        return this.popNIfOK(argCount);	// Answer self
	    },
	    primitiveFileDelete: function(argCount) {
	        var fileNameObj = this.stackNonInteger(0);
	        if (!this.success) return false;
	        var fileName = fileNameObj.bytesAsString();
	        try {
	            fs.unlinkSync(fileName);
	        } catch(e) {
	            console.error("Failed to delete file: " + fileName);
	            return false;
	        }
	        return this.popNIfOK(argCount);	// Answer self
	    },
	    makeFileHandle: function(filename, fd, writeFlag) {
	        var handle = this.makeStString(filename);
	        handle.fd = fd;                 // shared between handles
	        handle.fileWrite = writeFlag;   // specific to this handle
	        handle.filePos = 0;             // specific to this handle
	        return handle;
	    },
	    filenameToSqueak: function(unixpath) {
	        return unixpath;
	    },
	    filenameFromSqueak: function(filepath) {
	        return filepath;
	    },
	});

	Object.extend(Squeak, {
	    flushAllFiles: function() {
	        openFileDescriptors.forEach(function(fd) {
	            try {
	                fs.fsyncSync(fd);
	            } catch(e) {
	                console.error("Failed to flush one of the files");
	            }
	        });
	    },
	    filePut: function(fileName, buffer) {
	        try {
	            // Node does not support ArrayBuffer and Bun does not support DataView,
	            // use a TypedArray as argument to writeFileSync.
	            fs.writeFileSync(fileName, new Uint8Array(buffer));
	        } catch(e) {
	            console.error("Failed to create file with content: " + fileName);
	        }
	    },
	});
	return vm_plugins_file_node;
}

// This is a SqueakJS VM for use with node
//
// To start an image use: node squeak_node.js [-ignoreQuit] <image filename>
//
// To start the minimal headless image present in the folder "headless" use:
//    node squeak_node.js headless/headless.image
//
// Option "-ignoreQuit" is present to prevent some images from quiting when
// no GUI (support) is found. The image will not be able to quit from within
// the image and needs to be quit by stopping the process itself.
// In some situations adding "-ignoreQuit" can make some minimal images crash
// when no more processes are running (ie when no bytecode is left to execute).
//
// A special ConsolePlugin is loaded which allows sending messages to the console.
// Add the following method to the Smalltalk image (to Object for example):
//
// primLog: messageString level: levelString
//
//	"Log messageString to the console. The specified level should be one of:
//		'log'
//		'info'
//		'warn'
//		'error'
//	"
//
// 	<primitive: 'primitiveLog:level:' module: 'ConsolePlugin'>
//	^ self
//
// The VM will try to load plugins when named primitives are used for the first time.
// These plugins do not need to be imported up front.

var os = require$$0$4;
var fs = require$$0$3;
var process$1 = require$$2$1;
var path = require$$1$1;

// Retrieve image name and parameters from command line
var processArgs = process$1.argv.slice(2);
var ignoreQuit = processArgs[0] === "-ignoreQuit";
if (ignoreQuit) {
    processArgs = processArgs.slice(1);
}
var fullName = processArgs[0];
if (!fullName) {
    console.error("No image name specified.");
    console.log("Usage (simplified): " + path.basename(process$1.argv0) + path.basename(process$1.argv[1]) + " [-ignoreQuit] <image filename>");
    process$1.exit(1);
}
var root = path.dirname(fullName) + path.sep;
var imageName = path.basename(fullName, ".image");

// Create global 'self' resembling the global scope in the browser DOM
Object.assign(commonjsGlobal, {

    // Add browser element 'self' for platform consistency
    self: new Proxy({}, {
        get: function(obj, prop) {
            return commonjsGlobal[prop];
        },
        set: function(obj, prop, value) {
            commonjsGlobal[prop] = value;
            return true;
        }
    })
});

// Add a sessionStorage class
class SessionStorage {
	storage = {}

	constructor() {
		var self = this;
		Object.keys(process$1.env).forEach(function(key) {
			self.storage[key] = process$1.env[key];
		});
		self.storage["CLIENT_VERSION"] = "2";
	}
	getItem(name) {
		return this.storage[name];
	}
	setItem(name, value) {
		this.storage[name] = value;
	}
	removeItem(name) {
		delete this.storage[name];
	}
	get length() {
		return Object.keys(this.storage).length;
	}
	key(index) {
		return Object.keys(this.storage)[index];
	}
}

// Extend the new global scope with a few browser/DOM classes and methods
Object.assign(self, {
    localStorage: {},
    sessionStorage: new SessionStorage(),
    WebSocket: typeof WebSocket === "undefined" ? requireWebSocket() : WebSocket,
    sha1: requireSha1(),
    btoa: function(string) {
        return Buffer.from(string, 'ascii').toString('base64');
    },
    atob: function(string) {
        return Buffer.from(string, 'base64').toString('ascii');
    }
});

// Load VM and the internal plugins
requireGlobals();
requireVm();
requireVm_object();
requireVm_object_spur();
requireVm_image();
requireVm_interpreter();
requireVm_interpreter_proxy();
requireVm_instruction_stream();
requireVm_instruction_stream_sista();
requireVm_instruction_printer();
requireVm_primitives();
requireJit();
requireVm_display();
requireVm_display_headless();    // use headless display to prevent image crashing/becoming unresponsive
requireVm_input();
requireVm_input_headless();    // use headless input to prevent image crashing/becoming unresponsive
requireVm_plugins();
requireVm_plugins_file_node();

// Set the appropriate VM and platform values
Object.extend(Squeak, {
    vmPath: process$1.cwd() + path.sep,
    platformSubtype: "Node.js",
    osVersion: process$1.version + " " + os.platform() + " " + os.release() + " " + os.arch(),
    windowSystem: "none",
});

// Extend the Squeak primitives with ability to load modules dynamically
Object.extend(Squeak.Primitives.prototype, {
    loadModuleDynamically: function(modName) {
        try {
            require("./plugins/" + modName);

            // Modules register themselves, should be available now
            return Squeak.externalModules[modName];
        } catch(e) {
            console.error("Plugin " + modName + " could not be loaded");
        }
        return undefined;
    }
});

// Read raw image
fs.readFile(root + imageName + ".image", function(error, data) {
    if (error) {
        console.error("Failed to read image", error);
        return;
    }

    // Create Squeak image from raw data
    var image = new Squeak.Image(root + imageName);
    image.readFromBuffer(data.buffer, function startRunning() {

        // Create fake display and create interpreter
        var display = { vmOptions: [ "-vm-display-null", "-nodisplay" ] };
        var vm = new Squeak.Interpreter(image, display);
        vm.processLoopCounter = 0;
        vm.runProcessLoop = function(restart) {
            if(restart === true) {
                // Don't restart if process loop wasn't stopped before
                if(!vm.stoppedProcessLoop) {
                    return;
                }
                // Don't restart if there is no active Process
                var activeProcess = vm.primHandler.getScheduler().pointers[Squeak.ProcSched_activeProcess];
                if(!activeProcess || activeProcess.isNil) {
                    return;
                }
                vm.stoppedProcessLoop = false;
                vm.processLoopCounter = 0;
            }
            try {
                vm.interpret(50, function runAgain(ms) {
                    if(ms === "sleep") {
                        if(vm.stoppedProcessLoop) {
                            return;
                        }

                        // If we encounter a sleep for 8 consecutive times, stop process loop
                        if(++vm.processLoopCounter > 7) {
                            vm.stoppedProcessLoop = true;
                        }
                    } else {
                        vm.processLoopCounter = 0;
                    }

                    // Ignore display.quitFlag when requested.
                    // Some Smalltalk images quit when no display is found.
                    if (ignoreQuit || !display.quitFlag) {
                        setTimeout(vm.runProcessLoop, ms === "sleep" ? 10 : ms);
                    }
                });
            } catch(e) {
                console.error("Failure during Squeak run: ", e);
            }
        };

        // Start the interpreter
        vm.runProcessLoop();
    });
});

/* Smalltalk from Squeak4.5 with VMMaker 4.13.6 translated as JS source on 3 November 2014 1:52:21 pm */

/* Automatically generated by
	JSSmartSyntaxPluginCodeGenerator VMMakerJS-bf.15 uuid: fd4e10f2-3773-4e80-8bb5-c4b471a014e5
   from
	LargeIntegersPlugin VMMaker-bf.353 uuid: 8ae25e7e-8d2c-451e-8277-598b30e9c002
 */

(function LargeIntegers() {

var VM_PROXY_MAJOR = 1;
var VM_PROXY_MINOR = 11;

/*** Functions ***/
function CLASSOF(obj) { return typeof obj === "number" ? interpreterProxy.classSmallInteger() : obj.sqClass }
function BYTESIZEOF(obj) { return obj.bytes ? obj.bytes.length : obj.words ? obj.words.length * 4 : 0 }
function DIV(a, b) { return Math.floor(a / b) | 0; }   // integer division
function MOD(a, b) { return a - DIV(a, b) * b | 0; }   // signed modulus
function SHL(a, b) { return b > 31 ? 0 : a << b; }     // fix JS shift
function SHR(a, b) { return b > 31 ? 0 : a >>> b; }    // fix JS shift

/*** Variables ***/
var andOpIndex = 0;
var interpreterProxy = null;
var moduleName = "LargeIntegers v1.5 (e)";
var orOpIndex = 1;
var xorOpIndex = 2;



/*	Argument has to be aBytesOop! */
/*	Tests for any magnitude bits in the interval from start to stopArg. */

function anyBitOfBytesfromto(aBytesOop, start, stopArg) {
	var lastByteIx;
	var digit;
	var magnitude;
	var leftShift;
	var rightShift;
	var firstByteIx;
	var stop;
	var mask;
	var ix;

	// missing DebugCode;
	if ((start < 1) || (stopArg < 1)) {
		return interpreterProxy.primitiveFail();
	}
	magnitude = aBytesOop;
	stop = Math.min(stopArg, highBitOfBytes(magnitude));
	if (start > stop) {
		return false;
	}
	firstByteIx = ((start - 1) >> 3) + 1;
	lastByteIx = ((stop - 1) >> 3) + 1;
	rightShift = MOD((start - 1), 8);
	leftShift = 7 - (MOD((stop - 1), 8));
	if (firstByteIx === lastByteIx) {
		mask = (SHL(255, rightShift)) & (SHR(255, leftShift));
		digit = digitOfBytesat(magnitude, firstByteIx);
		return (digit & mask) !== 0;
	}
	if ((SHR(digitOfBytesat(magnitude, firstByteIx), rightShift)) !== 0) {
		return true;
	}
	for (ix = (firstByteIx + 1); ix <= (lastByteIx - 1); ix++) {
		if (digitOfBytesat(magnitude, ix) !== 0) {
			return true;
		}
	}
	if (((SHL(digitOfBytesat(magnitude, lastByteIx), leftShift)) & 255) !== 0) {
		return true;
	}
	return false;
}


/*	Attention: this method invalidates all oop's! Only newBytes is valid at return. */
/*	Does not normalize. */

function bytesgrowTo(aBytesObject, newLen) {
	var oldLen;
	var copyLen;
	var newBytes;

	newBytes = interpreterProxy.instantiateClassindexableSize(CLASSOF(aBytesObject), newLen);
	oldLen = BYTESIZEOF(aBytesObject);
	if (oldLen < newLen) {
		copyLen = oldLen;
	} else {
		copyLen = newLen;
	}
	cDigitCopyFromtolen(aBytesObject.bytes, newBytes.bytes, copyLen);
	return newBytes;
}


/*	Attention: this method invalidates all oop's! Only newBytes is valid at return. */

function bytesOrIntgrowTo(oop, len) {
	var sq_class;
	var val;
	var newBytes;

	if (typeof oop === "number") {
		val = oop;
		if (val < 0) {
			sq_class = interpreterProxy.classLargeNegativeInteger();
		} else {
			sq_class = interpreterProxy.classLargePositiveInteger();
		}
		newBytes = interpreterProxy.instantiateClassindexableSize(sq_class, len);
		cCopyIntValtoBytes(val, newBytes);
	} else {
		newBytes = bytesgrowTo(oop, len);
	}
	return newBytes;
}

function cCopyIntValtoBytes(val, bytes) {
	var pByte;
	var ix;
	var ixLimiT;

	pByte = bytes.bytes;
	for (ix = 1, ixLimiT = cDigitLengthOfCSI(val); ix <= ixLimiT; ix++) {
		pByte[ix - 1] = cDigitOfCSIat(val, ix);
	}
}


/*	pByteRes len = longLen; returns over.. */

function cDigitAddlenwithleninto(pByteShort, shortLen, pByteLong, longLen, pByteRes) {
	var i;
	var limit;
	var accum;

	accum = 0;
	limit = shortLen - 1;
	for (i = 0; i <= limit; i++) {
		accum = ((accum >>> 8) + pByteShort[i]) + pByteLong[i];
		pByteRes[i] = (accum & 255);
	}
	limit = longLen - 1;
	for (i = shortLen; i <= limit; i++) {
		accum = (accum >>> 8) + pByteLong[i];
		pByteRes[i] = (accum & 255);
	}
	return accum >>> 8;
}


/*	Precondition: pFirst len = pSecond len. */

function cDigitComparewithlen(pFirst, pSecond, len) {
	var firstDigit;
	var secondDigit;
	var ix;

	ix = len - 1;
	while (ix >= 0) {
		if (((secondDigit = pSecond[ix])) !== ((firstDigit = pFirst[ix]))) {
			if (secondDigit < firstDigit) {
				return 1;
			} else {
				return -1;
			}
		}
		--ix;
	}
	return 0;
}

function cDigitCopyFromtolen(pFrom, pTo, len) {
	var limit;
	var i;
	limit = len - 1;
	for (i = 0; i <= limit; i++) {
		pTo[i] = pFrom[i];
	}
	return 0;
}

function cDigitDivlenremlenquolen(pDiv, divLen, pRem, remLen, pQuo, quoLen) {
	var b;
	var q;
	var a;
	var dnh;
	var lo;
	var hi;
	var r3;
	var mul;
	var cond;
	var l;
	var k;
	var j;
	var i;
	var dl;
	var ql;
	var r1r2;
	var dh;
	var t;


	/* Last actual byte of data (ST ix) */

	dl = divLen - 1;
	ql = quoLen;
	dh = pDiv[dl - 1];
	if (dl === 1) {
		dnh = 0;
	} else {
		dnh = pDiv[dl - 2];
	}
	for (k = 1; k <= ql; k++) {

		/* maintain quo*arg+rem=self */
		/* Estimate rem/div by dividing the leading two digits of rem by dh. */
		/* The estimate is q = qhi*16r100+qlo, where qhi and qlo are unsigned char. */


		/* r1 := rem digitAt: j. */

		j = (remLen + 1) - k;
		if (pRem[j - 1] === dh) {
			q = 255;
		} else {

			/* Compute q = (r1,r2)//dh, t = (r1,r2)\\dh. */
			/* r2 := (rem digitAt: j - 2). */

			r1r2 = pRem[j - 1];
			r1r2 = (r1r2 << 8) + pRem[j - 2];
			t = MOD(r1r2, dh);

			/* Next compute (hi,lo) := q*dnh */

			q = DIV(r1r2, dh);
			mul = q * dnh;
			hi = mul >>> 8;

			/* Correct overestimate of q.                
				Max of 2 iterations through loop -- see Knuth vol. 2 */

			lo = mul & 255;
			if (j < 3) {
				r3 = 0;
			} else {
				r3 = pRem[j - 3];
			}
					while (true) {
				if ((t < hi) || ((t === hi) && (r3 < lo))) {

					/* i.e. (t,r3) < (hi,lo) */

					--q;
					if (lo < dnh) {
						--hi;
						lo = (lo + 256) - dnh;
					} else {
						lo -= dnh;
					}
					cond = hi >= dh;
				} else {
					cond = false;
				}
				if (!(cond)) break;
				hi -= dh;
			}
		}
		l = j - dl;
		a = 0;
		for (i = 1; i <= divLen; i++) {
			hi = pDiv[i - 1] * (q >>> 8);
			lo = pDiv[i - 1] * (q & 255);
			b = (pRem[l - 1] - a) - (lo & 255);
			pRem[l - 1] = (b & 255);

			/* This is a possible replacement to simulate arithmetic shift (preserving sign of b) */
			/* b := b >> 8 bitOr: (0 - (b >> ((interpreterProxy sizeof: b)*8 */
			/* CHAR_BIT */
			/* -1)) << 8). */

			b = b >> 8;
			a = (hi + (lo >>> 8)) - b;
			++l;
		}
		if (a > 0) {

			/* Add div back into rem, decrease q by 1 */

			--q;
			l = j - dl;
			a = 0;
			for (i = 1; i <= divLen; i++) {
				a = ((a >>> 8) + pRem[l - 1]) + pDiv[i - 1];
				pRem[l - 1] = (a & 255);
				++l;
			}
		}
		pQuo[quoLen - k] = q;
	}
	return 0;
}


/*	Answer the index (in bits) of the high order bit of the receiver, or zero if the    
	 receiver is zero. This method is allowed (and needed) for     
	LargeNegativeIntegers as well, since Squeak's LargeIntegers are     
	sign/magnitude. */

function cDigitHighBitlen(pByte, len) {
	var lastDigit;
	var realLength;

	realLength = len;
	while (((lastDigit = pByte[realLength - 1])) === 0) {
		if (((--realLength)) === 0) {
			return 0;
		}
	}
	return cHighBit(lastDigit) + (8 * (realLength - 1));
}


/*	Answer the number of indexable fields of a CSmallInteger. This value is 
	   the same as the largest legal subscript. */

function cDigitLengthOfCSI(csi) {
	if ((csi < 256) && (csi > -256)) {
		return 1;
	}
	if ((csi < 65536) && (csi > -65536)) {
		return 2;
	}
	if ((csi < 16777216) && (csi > -16777216)) {
		return 3;
	}
	return 4;
}


/*	C indexed! */

function cDigitLshiftfromlentolen(shiftCount, pFrom, lenFrom, pTo, lenTo) {
	var digitShift;
	var carry;
	var digit;
	var i;
	var bitShift;
	var rshift;
	var limit;

	digitShift = shiftCount >> 3;
	bitShift = MOD(shiftCount, 8);
	limit = digitShift - 1;
	for (i = 0; i <= limit; i++) {
		pTo[i] = 0;
	}
	if (bitShift === 0) {

		/* Fast version for digit-aligned shifts */
		/* C indexed! */

		return cDigitReplacefromtowithstartingAt(pTo, digitShift, lenTo - 1, pFrom, 0);
	}
	rshift = 8 - bitShift;
	carry = 0;
	limit = lenFrom - 1;
	for (i = 0; i <= limit; i++) {
		digit = pFrom[i];
		pTo[i + digitShift] = ((carry | (SHL(digit, bitShift))) & 255);
		carry = SHR(digit, rshift);
	}
	if (carry !== 0) {
		pTo[lenTo - 1] = carry;
	}
	return 0;
}

function cDigitMontgomerylentimeslenmodulolenmInvModBinto(pBytesFirst, firstLen, pBytesSecond, secondLen, pBytesThird, thirdLen, mInv, pBytesRes) {
	var k;
	var i;
	var lastByte;
	var limit3;
	var limit2;
	var limit1;
	var u;
	var accum;

	limit1 = firstLen - 1;
	limit2 = secondLen - 1;
	limit3 = thirdLen - 1;
	lastByte = 0;
	for (i = 0; i <= limit1; i++) {
		accum = pBytesRes[0] + (pBytesFirst[i] * pBytesSecond[0]);
		u = (accum * mInv) & 255;
		accum += u * pBytesThird[0];
		for (k = 1; k <= limit2; k++) {
			accum = (((accum >>> 8) + pBytesRes[k]) + (pBytesFirst[i] * pBytesSecond[k])) + (u * pBytesThird[k]);
			pBytesRes[k - 1] = (accum & 255);
		}
		for (k = secondLen; k <= limit3; k++) {
			accum = ((accum >>> 8) + pBytesRes[k]) + (u * pBytesThird[k]);
			pBytesRes[k - 1] = (accum & 255);
		}
		accum = (accum >>> 8) + lastByte;
		pBytesRes[limit3] = (accum & 255);
		lastByte = accum >>> 8;
	}
	for (i = firstLen; i <= limit3; i++) {
		accum = pBytesRes[0];
		u = (accum * mInv) & 255;
		accum += u * pBytesThird[0];
		for (k = 1; k <= limit3; k++) {
			accum = ((accum >>> 8) + pBytesRes[k]) + (u * pBytesThird[k]);
			pBytesRes[k - 1] = (accum & 255);
		}
		accum = (accum >>> 8) + lastByte;
		pBytesRes[limit3] = (accum & 255);
		lastByte = accum >>> 8;
	}
	if (!((lastByte === 0) && (cDigitComparewithlen(pBytesThird, pBytesRes, thirdLen) === 1))) {

		/* self cDigitSub: pBytesThird len: thirdLen with: pBytesRes len: thirdLen into: pBytesRes */

		accum = 0;
		for (i = 0; i <= limit3; i++) {
			accum = (accum + pBytesRes[i]) - pBytesThird[i];
			pBytesRes[i] = (accum & 255);
			accum = accum >> 8;
		}
	}
}

function cDigitMultiplylenwithleninto(pByteShort, shortLen, pByteLong, longLen, pByteRes) {
	var ab;
	var j;
	var digit;
	var carry;
	var i;
	var limitLong;
	var k;
	var limitShort;

	if ((shortLen === 1) && (pByteShort[0] === 0)) {
		return 0;
	}
	if ((longLen === 1) && (pByteLong[0] === 0)) {
		return 0;
	}
	limitShort = shortLen - 1;
	limitLong = longLen - 1;
	for (i = 0; i <= limitShort; i++) {
		if (((digit = pByteShort[i])) !== 0) {
			k = i;

			/* Loop invariant: 0<=carry<=0377, k=i+j-1 (ST) */
			/* -> Loop invariant: 0<=carry<=0377, k=i+j (C) (?) */

			carry = 0;
			for (j = 0; j <= limitLong; j++) {
				ab = pByteLong[j];
				ab = ((ab * digit) + carry) + pByteRes[k];
				carry = ab >>> 8;
				pByteRes[k] = (ab & 255);
				++k;
			}
			pByteRes[k] = carry;
		}
	}
	return 0;
}


/*	Answer the value of an indexable field in the receiver.              
	LargePositiveInteger uses bytes of base two number, and each is a       
	      'digit' base 256. */
/*	ST indexed! */

function cDigitOfCSIat(csi, ix) {
	if (ix < 1) {
		interpreterProxy.primitiveFail();
	}
	if (ix > 4) {
		return 0;
	}
	if (csi < 0) {
		return (SHR((0 - csi), ((ix - 1) * 8))) & 255;
	} else {
		return (SHR(csi, ((ix - 1) * 8))) & 255;
	}
}


/*	pByteRes len = longLen. */

function cDigitOpshortlenlongleninto(opIndex, pByteShort, shortLen, pByteLong, longLen, pByteRes) {
	var i;
	var limit;

	limit = shortLen - 1;
	if (opIndex === andOpIndex) {
		for (i = 0; i <= limit; i++) {
			pByteRes[i] = (pByteShort[i] & pByteLong[i]);
		}
		limit = longLen - 1;
		for (i = shortLen; i <= limit; i++) {
			pByteRes[i] = 0;
		}
		return 0;
	}
	if (opIndex === orOpIndex) {
		for (i = 0; i <= limit; i++) {
			pByteRes[i] = (pByteShort[i] | pByteLong[i]);
		}
		limit = longLen - 1;
		for (i = shortLen; i <= limit; i++) {
			pByteRes[i] = pByteLong[i];
		}
		return 0;
	}
	if (opIndex === xorOpIndex) {
		for (i = 0; i <= limit; i++) {
			pByteRes[i] = (pByteShort[i] ^ pByteLong[i]);
		}
		limit = longLen - 1;
		for (i = shortLen; i <= limit; i++) {
			pByteRes[i] = pByteLong[i];
		}
		return 0;
	}
	return interpreterProxy.primitiveFail();
}


/*	C indexed! */

function cDigitReplacefromtowithstartingAt(pTo, start, stop, pFrom, repStart) {
	return function() {
		// inlining self cDigitCopyFrom: pFrom + repStart to: pTo + start len: stop - start + 1
		var len = stop - start + 1;
		for (var i = 0; i < len; i++) {
			pTo[i + start] = pFrom[i + repStart];
		}
		return 0;
	}();
}

function cDigitRshiftfromlentolen(shiftCount, pFrom, fromLen, pTo, toLen) {
	var j;
	var digitShift;
	var carry;
	var digit;
	var bitShift;
	var leftShift;
	var limit;
	var start;

	digitShift = shiftCount >> 3;
	bitShift = MOD(shiftCount, 8);
	if (bitShift === 0) {

		/* Fast version for byte-aligned shifts */
		/* C indexed! */

		return cDigitReplacefromtowithstartingAt(pTo, 0, toLen - 1, pFrom, digitShift);
	}
	leftShift = 8 - bitShift;
	carry = SHR(pFrom[digitShift], bitShift);
	start = digitShift + 1;
	limit = fromLen - 1;
	for (j = start; j <= limit; j++) {
		digit = pFrom[j];
		pTo[j - start] = ((carry | (SHL(digit, leftShift))) & 255);
		carry = SHR(digit, bitShift);
	}
	if (carry !== 0) {
		pTo[toLen - 1] = carry;
	}
	return 0;
}

function cDigitSublenwithleninto(pByteSmall, smallLen, pByteLarge, largeLen, pByteRes) {
	var i;
	var z;


	/* Loop invariant is -1<=z<=0 */

	z = 0;
	for (i = 0; i <= (smallLen - 1); i++) {
		z = (z + pByteLarge[i]) - pByteSmall[i];
		pByteRes[i] = (z & 255);
		z = z >> 8;
	}
	for (i = smallLen; i <= (largeLen - 1); i++) {
		z += pByteLarge[i];
		pByteRes[i] = (z & 255);
		z = z >> 8;
	}
}


/*	Answer the index of the high order bit of the argument, or zero if the  
	argument is zero. */
/*	For 64 bit uints there could be added a 32-shift. */

function cHighBit(uint) {
	var shifted;
	var bitNo;

	shifted = uint;
	bitNo = 0;
	if (!(shifted < (1 << 16))) {
		shifted = shifted >>> 16;
		bitNo += 16;
	}
	if (!(shifted < (1 << 8))) {
		shifted = shifted >>> 8;
		bitNo += 8;
	}
	if (!(shifted < (1 << 4))) {
		shifted = shifted >>> 4;
		bitNo += 4;
	}
	if (!(shifted < (1 << 2))) {
		shifted = shifted >>> 2;
		bitNo += 2;
	}
	if (!(shifted < (1 << 1))) {
		shifted = shifted >>> 1;
		++bitNo;
	}
	return bitNo + shifted;
}


/*	anOop has to be a SmallInteger! */

function createLargeFromSmallInteger(anOop) {
	var size;
	var res;
	var pByte;
	var ix;
	var sq_class;
	var val;

	val = anOop;
	if (val < 0) {
		sq_class = interpreterProxy.classLargeNegativeInteger();
	} else {
		sq_class = interpreterProxy.classLargePositiveInteger();
	}
	size = cDigitLengthOfCSI(val);
	res = interpreterProxy.instantiateClassindexableSize(sq_class, size);
	pByte = res.bytes;
	for (ix = 1; ix <= size; ix++) {
		pByte[ix - 1] = cDigitOfCSIat(val, ix);
	}
	return res;
}


/*	Attention: this method invalidates all oop's! Only newBytes is valid at return. */
/*	Does not normalize. */

function digitLshift(aBytesOop, shiftCount) {
	var newLen;
	var oldLen;
	var newBytes;
	var highBit;

	oldLen = BYTESIZEOF(aBytesOop);
	if (((highBit = cDigitHighBitlen(aBytesOop.bytes, oldLen))) === 0) {
		return 0;
	}
	newLen = ((highBit + shiftCount) + 7) >> 3;
	newBytes = interpreterProxy.instantiateClassindexableSize(CLASSOF(aBytesOop), newLen);
	cDigitLshiftfromlentolen(shiftCount, aBytesOop.bytes, oldLen, newBytes.bytes, newLen);
	return newBytes;
}


/*	Attention: this method invalidates all oop's! Only newBytes is valid at return. */
/*	Shift right shiftCount bits, 0<=shiftCount.         
	Discard all digits beyond a, and all zeroes at or below a. */
/*	Does not normalize. */

function digitRshiftlookfirst(aBytesOop, shiftCount, a) {
	var newOop;
	var oldDigitLen;
	var newByteLen;
	var newBitLen;
	var oldBitLen;

	oldBitLen = cDigitHighBitlen(aBytesOop.bytes, a);
	oldDigitLen = (oldBitLen + 7) >> 3;
	newBitLen = oldBitLen - shiftCount;
	if (newBitLen <= 0) {

		/* All bits lost */

		return interpreterProxy.instantiateClassindexableSize(CLASSOF(aBytesOop), 0);
	}
	newByteLen = (newBitLen + 7) >> 3;
	newOop = interpreterProxy.instantiateClassindexableSize(CLASSOF(aBytesOop), newByteLen);
	cDigitRshiftfromlentolen(shiftCount, aBytesOop.bytes, oldDigitLen, newOop.bytes, newByteLen);
	return newOop;
}


/*	Does not need to normalize! */

function digitAddLargewith(firstInteger, secondInteger) {
	var sum;
	var shortLen;
	var over;
	var shortInt;
	var resClass;
	var newSum;
	var longLen;
	var firstLen;
	var secondLen;
	var longInt;

	firstLen = BYTESIZEOF(firstInteger);
	secondLen = BYTESIZEOF(secondInteger);
	resClass = CLASSOF(firstInteger);
	if (firstLen <= secondLen) {
		shortInt = firstInteger;
		shortLen = firstLen;
		longInt = secondInteger;
		longLen = secondLen;
	} else {
		shortInt = secondInteger;
		shortLen = secondLen;
		longInt = firstInteger;
		longLen = firstLen;
	}
	sum = interpreterProxy.instantiateClassindexableSize(resClass, longLen);
	over = cDigitAddlenwithleninto(shortInt.bytes, shortLen, longInt.bytes, longLen, sum.bytes);
	if (over > 0) {

		/* sum := sum growby: 1. */

			newSum = interpreterProxy.instantiateClassindexableSize(resClass, longLen + 1);
		cDigitCopyFromtolen(sum.bytes, newSum.bytes, longLen);

		/* C index! */

		sum = newSum;
		sum.bytes[longLen] = over;
	}
	return sum;
}


/*	Bit logic here is only implemented for positive integers or Zero;
	if rec or arg is negative, it fails. */

function digitBitLogicwithopIndex(firstInteger, secondInteger, opIx) {
	var shortLen;
	var shortLarge;
	var firstLarge;
	var secondLarge;
	var longLen;
	var longLarge;
	var firstLen;
	var secondLen;
	var result;

	if (typeof firstInteger === "number") {
		if (firstInteger < 0) {
			return interpreterProxy.primitiveFail();
		}
			firstLarge = createLargeFromSmallInteger(firstInteger);
	} else {
		if (CLASSOF(firstInteger) === interpreterProxy.classLargeNegativeInteger()) {
			return interpreterProxy.primitiveFail();
		}
		firstLarge = firstInteger;
	}
	if (typeof secondInteger === "number") {
		if (secondInteger < 0) {
			return interpreterProxy.primitiveFail();
		}
			secondLarge = createLargeFromSmallInteger(secondInteger);
	} else {
		if (CLASSOF(secondInteger) === interpreterProxy.classLargeNegativeInteger()) {
			return interpreterProxy.primitiveFail();
		}
		secondLarge = secondInteger;
	}
	firstLen = BYTESIZEOF(firstLarge);
	secondLen = BYTESIZEOF(secondLarge);
	if (firstLen < secondLen) {
		shortLen = firstLen;
		shortLarge = firstLarge;
		longLen = secondLen;
		longLarge = secondLarge;
	} else {
		shortLen = secondLen;
		shortLarge = secondLarge;
		longLen = firstLen;
		longLarge = firstLarge;
	}
	result = interpreterProxy.instantiateClassindexableSize(interpreterProxy.classLargePositiveInteger(), longLen);
	cDigitOpshortlenlongleninto(opIx, shortLarge.bytes, shortLen, longLarge.bytes, longLen, result.bytes);
	if (interpreterProxy.failed()) {
		return 0;
	}
	return normalizePositive(result);
}


/*	Compare the magnitude of firstInteger with that of secondInteger.      
	Return a code of 1, 0, -1 for firstInteger >, = , < secondInteger */

function digitCompareLargewith(firstInteger, secondInteger) {
	var secondLen;
	var firstLen;

	firstLen = BYTESIZEOF(firstInteger);
	secondLen = BYTESIZEOF(secondInteger);
	if (secondLen !== firstLen) {
		if (secondLen > firstLen) {
			return -1;
		} else {
			return 1;
		}
	}
	return cDigitComparewithlen(firstInteger.bytes, secondInteger.bytes, firstLen);
}


/*	Does not normalize. */
/*	Division by zero has to be checked in caller. */

function digitDivLargewithnegative(firstInteger, secondInteger, neg) {
	var resultClass;
	var result;
	var rem;
	var div;
	var quo;
	var d;
	var l;
	var secondLen;
	var firstLen;

	firstLen = BYTESIZEOF(firstInteger);
	secondLen = BYTESIZEOF(secondInteger);
	if (neg) {
		resultClass = interpreterProxy.classLargeNegativeInteger();
	} else {
		resultClass = interpreterProxy.classLargePositiveInteger();
	}
	l = (firstLen - secondLen) + 1;
	if (l <= 0) {
			result = interpreterProxy.instantiateClassindexableSize(interpreterProxy.classArray(), 2);
		interpreterProxy.stObjectatput(result,1,0);
		interpreterProxy.stObjectatput(result,2,firstInteger);
		return result;
	}
	d = 8 - cHighBit(unsafeByteOfat(secondInteger, secondLen));
	div = digitLshift(secondInteger, d);
div = bytesOrIntgrowTo(div, digitLength(div) + 1);
	rem = digitLshift(firstInteger, d);
if (digitLength(rem) === firstLen) {
	rem = bytesOrIntgrowTo(rem, firstLen + 1);
}
	quo = interpreterProxy.instantiateClassindexableSize(resultClass, l);
	cDigitDivlenremlenquolen(div.bytes, digitLength(div), rem.bytes, digitLength(rem), quo.bytes, digitLength(quo));
	rem = digitRshiftlookfirst(rem, d, digitLength(div) - 1);
	result = interpreterProxy.instantiateClassindexableSize(interpreterProxy.classArray(), 2);
	interpreterProxy.stObjectatput(result,1,quo);
	interpreterProxy.stObjectatput(result,2,rem);
	return result;
}

function digitLength(oop) {
	if (typeof oop === "number") {
		return cDigitLengthOfCSI(oop);
	} else {
		return BYTESIZEOF(oop);
	}
}

function digitMontgomerytimesmodulomInvModB(firstLarge, secondLarge, thirdLarge, mInv) {
	var prod;
	var thirdLen;
	var firstLen;
	var secondLen;

	firstLen = BYTESIZEOF(firstLarge);
	secondLen = BYTESIZEOF(secondLarge);
	thirdLen = BYTESIZEOF(thirdLarge);
	if (!(firstLen <= thirdLen)) {
		return interpreterProxy.primitiveFail();
	}
	if (!(secondLen <= thirdLen)) {
		return interpreterProxy.primitiveFail();
	}
	if (!((mInv >= 0) && (mInv <= 255))) {
		return interpreterProxy.primitiveFail();
	}
	prod = interpreterProxy.instantiateClassindexableSize(interpreterProxy.classLargePositiveInteger(), thirdLen);
	cDigitMontgomerylentimeslenmodulolenmInvModBinto(firstLarge.bytes, firstLen, secondLarge.bytes, secondLen, thirdLarge.bytes, thirdLen, mInv, prod.bytes);
	return normalizePositive(prod);
}


/*	Normalizes. */

function digitMultiplyLargewithnegative(firstInteger, secondInteger, neg) {
	var longInt;
	var resultClass;
	var shortLen;
	var shortInt;
	var longLen;
	var prod;
	var secondLen;
	var firstLen;

	firstLen = BYTESIZEOF(firstInteger);
	secondLen = BYTESIZEOF(secondInteger);
	if (firstLen <= secondLen) {
		shortInt = firstInteger;
		shortLen = firstLen;
		longInt = secondInteger;
		longLen = secondLen;
	} else {
		shortInt = secondInteger;
		shortLen = secondLen;
		longInt = firstInteger;
		longLen = firstLen;
	}
	if (neg) {
		resultClass = interpreterProxy.classLargeNegativeInteger();
	} else {
		resultClass = interpreterProxy.classLargePositiveInteger();
	}
	prod = interpreterProxy.instantiateClassindexableSize(resultClass, longLen + shortLen);
	cDigitMultiplylenwithleninto(shortInt.bytes, shortLen, longInt.bytes, longLen, prod.bytes);
	return normalize(prod);
}


/*	Argument has to be aLargeInteger! */

function digitOfBytesat(aBytesOop, ix) {
	if (ix > BYTESIZEOF(aBytesOop)) {
		return 0;
	} else {
		return unsafeByteOfat(aBytesOop, ix);
	}
}


/*	Normalizes. */

function digitSubLargewith(firstInteger, secondInteger) {
	var smallerLen;
	var larger;
	var res;
	var smaller;
	var resLen;
	var largerLen;
	var firstNeg;
	var firstLen;
	var secondLen;
	var neg;

	firstNeg = CLASSOF(firstInteger) === interpreterProxy.classLargeNegativeInteger();
	firstLen = BYTESIZEOF(firstInteger);
	secondLen = BYTESIZEOF(secondInteger);
	if (firstLen === secondLen) {
		while ((firstLen > 1) && (digitOfBytesat(firstInteger, firstLen) === digitOfBytesat(secondInteger, firstLen))) {
			--firstLen;
		}
		secondLen = firstLen;
	}
	if ((firstLen < secondLen) || ((firstLen === secondLen) && (digitOfBytesat(firstInteger, firstLen) < digitOfBytesat(secondInteger, firstLen)))) {
		larger = secondInteger;
		largerLen = secondLen;
		smaller = firstInteger;
		smallerLen = firstLen;
		neg = firstNeg === false;
	} else {
		larger = firstInteger;
		largerLen = firstLen;
		smaller = secondInteger;
		smallerLen = secondLen;
		neg = firstNeg;
	}
	resLen = largerLen;
	res = interpreterProxy.instantiateClassindexableSize((neg
	? interpreterProxy.classLargeNegativeInteger()
	: interpreterProxy.classLargePositiveInteger()), resLen);
	cDigitSublenwithleninto(smaller.bytes, smallerLen, larger.bytes, largerLen, res.bytes);
	return (neg
		? normalizeNegative(res)
		: normalizePositive(res));
}


/*	Note: This is hardcoded so it can be run from Squeak.
	The module name is used for validating a module *after*
	it is loaded to check if it does really contain the module
	we're thinking it contains. This is important! */

function getModuleName() {
	return moduleName;
}

function highBitOfBytes(aBytesOop) {
	return cDigitHighBitlen(aBytesOop.bytes, BYTESIZEOF(aBytesOop));
}

function isNormalized(anInteger) {
	var ix;
	var len;
	var sLen;
	var minVal;
	var maxVal;

	if (typeof anInteger === "number") {
		return true;
	}
	len = digitLength(anInteger);
	if (len === 0) {
		return false;
	}
	if (unsafeByteOfat(anInteger, len) === 0) {
		return false;
	}

	/* maximal digitLength of aSmallInteger */

	sLen = 4;
	if (len > sLen) {
		return true;
	}
	if (len < sLen) {
		return false;
	}
	if (CLASSOF(anInteger) === interpreterProxy.classLargePositiveInteger()) {

		/* SmallInteger maxVal */
		/* all bytes of maxVal but the highest one are just FF's */

		maxVal = 1073741823;
		return unsafeByteOfat(anInteger, sLen) > cDigitOfCSIat(maxVal, sLen);
	} else {

		/* SmallInteger minVal */
		/* all bytes of minVal but the highest one are just 00's */

		minVal = -1073741824;
		if (unsafeByteOfat(anInteger, sLen) < cDigitOfCSIat(minVal, sLen)) {
			return false;
		} else {

			/* if just one digit differs, then anInteger < minval (the corresponding digit byte is greater!)
						and therefore a LargeNegativeInteger */

			for (ix = 1; ix <= sLen; ix++) {
				if (unsafeByteOfat(anInteger, ix) !== cDigitOfCSIat(minVal, ix)) {
					return true;
				}
			}
		}
	}
	return false;
}


/*	Check for leading zeroes and return shortened copy if so. */

function normalize(aLargeInteger) {
	// missing DebugCode;
	if (CLASSOF(aLargeInteger) === interpreterProxy.classLargePositiveInteger()) {
		return normalizePositive(aLargeInteger);
	} else {
		return normalizeNegative(aLargeInteger);
	}
}


/*	Check for leading zeroes and return shortened copy if so. */
/*	First establish len = significant length. */

function normalizeNegative(aLargeNegativeInteger) {
	var i;
	var len;
	var sLen;
	var minVal;
	var oldLen;
	var val;

	len = (oldLen = digitLength(aLargeNegativeInteger));
	while ((len !== 0) && (unsafeByteOfat(aLargeNegativeInteger, len) === 0)) {
		--len;
	}
	if (len === 0) {
		return 0;
	}

	/* SmallInteger minVal digitLength */

	sLen = 4;
	if (len <= sLen) {

		/* SmallInteger minVal */

		minVal = -1073741824;
		if ((len < sLen) || (digitOfBytesat(aLargeNegativeInteger, sLen) < cDigitOfCSIat(minVal, sLen))) {

			/* If high digit less, then can be small */

			val = 0;
			for (i = len; i >= 1; i += -1) {
				val = (val * 256) - unsafeByteOfat(aLargeNegativeInteger, i);
			}
			return val;
		}
		for (i = 1; i <= sLen; i++) {

			/* If all digits same, then = minVal (sr: minVal digits 1 to 3 are 
				          0) */

			if (digitOfBytesat(aLargeNegativeInteger, i) !== cDigitOfCSIat(minVal, i)) {

				/* Not so; return self shortened */

				if (len < oldLen) {

					/* ^ self growto: len */

					return bytesgrowTo(aLargeNegativeInteger, len);
				} else {
					return aLargeNegativeInteger;
				}
			}
		}
		return minVal;
	}
	if (len < oldLen) {

		/* ^ self growto: len */

		return bytesgrowTo(aLargeNegativeInteger, len);
	} else {
		return aLargeNegativeInteger;
	}
}


/*	Check for leading zeroes and return shortened copy if so. */
/*	First establish len = significant length. */

function normalizePositive(aLargePositiveInteger) {
	var i;
	var len;
	var sLen;
	var val;
	var oldLen;

	len = (oldLen = digitLength(aLargePositiveInteger));
	while ((len !== 0) && (unsafeByteOfat(aLargePositiveInteger, len) === 0)) {
		--len;
	}
	if (len === 0) {
		return 0;
	}

	/* SmallInteger maxVal digitLength. */

	sLen = 4;
	if ((len <= sLen) && (digitOfBytesat(aLargePositiveInteger, sLen) <= cDigitOfCSIat(1073741823, sLen))) {

		/* If so, return its SmallInt value */

		val = 0;
		for (i = len; i >= 1; i += -1) {
			val = (val * 256) + unsafeByteOfat(aLargePositiveInteger, i);
		}
		return val;
	}
	if (len < oldLen) {

		/* ^ self growto: len */

		return bytesgrowTo(aLargePositiveInteger, len);
	} else {
		return aLargePositiveInteger;
	}
}

function primAnyBitFromTo() {
	var integer;
	var large;
	var from;
	var to;
	var _return_value;

	from = interpreterProxy.stackIntegerValue(1);
	to = interpreterProxy.stackIntegerValue(0);
	// missing DebugCode;
	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(2)));
	integer = interpreterProxy.stackValue(2);
	if (interpreterProxy.failed()) {
		return null;
	}
	if (typeof integer === "number") {

		/* convert it to a not normalized LargeInteger */

		large = createLargeFromSmallInteger(integer);
	} else {
		large = integer;
	}
	_return_value = (anyBitOfBytesfromto(large, from, to)? interpreterProxy.trueObject() : interpreterProxy.falseObject());
	if (interpreterProxy.failed()) {
		return null;
	}
	interpreterProxy.popthenPush(3, _return_value);
	return null;
}


/*	Converts a SmallInteger into a - non normalized! - LargeInteger;          
	 aLargeInteger will be returned unchanged. */
/*	Do not check for forced fail, because we need this conversion to test the 
	plugin in ST during forced fail, too. */

function primAsLargeInteger() {
	var anInteger;
	var _return_value;

	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(0)));
	anInteger = interpreterProxy.stackValue(0);
	// missing DebugCode;
	if (interpreterProxy.failed()) {
		return null;
	}
	if (typeof anInteger === "number") {
		_return_value = createLargeFromSmallInteger(anInteger);
		if (interpreterProxy.failed()) {
			return null;
		}
		interpreterProxy.popthenPush(2, _return_value);
		return null;
	} else {
		if (interpreterProxy.failed()) {
			return null;
		}
		interpreterProxy.popthenPush(2, anInteger);
		return null;
	}
}


/*	If calling this primitive fails, then C module does not exist. Do not check for forced fail, because we want to know if module exists during forced fail, too. */

function primCheckIfCModuleExists() {
	var _return_value;

	_return_value = (interpreterProxy.trueObject() );
	if (interpreterProxy.failed()) {
		return null;
	}
	interpreterProxy.popthenPush(1, _return_value);
	return null;
}

function _primDigitBitShift() {
	var rShift;
	var aLarge;
	var anInteger;
	var shiftCount;
	var _return_value;

	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(1)));
	anInteger = interpreterProxy.stackValue(1);
	shiftCount = interpreterProxy.stackIntegerValue(0);
	// missing DebugCode;
	if (interpreterProxy.failed()) {
		return null;
	}
	if (typeof anInteger === "number") {

		/* convert it to a not normalized LargeInteger */

		aLarge = createLargeFromSmallInteger(anInteger);
	} else {
		aLarge = anInteger;
	}
	if (shiftCount >= 0) {
		_return_value = digitLshift(aLarge, shiftCount);
		if (interpreterProxy.failed()) {
			return null;
		}
		interpreterProxy.popthenPush(3, _return_value);
		return null;
	} else {
		rShift = 0 - shiftCount;
		_return_value = normalize(digitRshiftlookfirst(aLarge, rShift, BYTESIZEOF(aLarge)));
		if (interpreterProxy.failed()) {
			return null;
		}
		interpreterProxy.popthenPush(3, _return_value);
		return null;
	}
}

function primDigitAdd() {
	var firstLarge;
	var firstInteger;
	var secondLarge;
	var secondInteger;
	var _return_value;

	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(0)));
	secondInteger = interpreterProxy.stackValue(0);
	// missing DebugCode;
	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(1)));
	firstInteger = interpreterProxy.stackValue(1);
	if (interpreterProxy.failed()) {
		return null;
	}
	if (typeof firstInteger === "number") {

		/* convert it to a not normalized LargeInteger */

			firstLarge = createLargeFromSmallInteger(firstInteger);
	} else {
		firstLarge = firstInteger;
	}
	if (typeof secondInteger === "number") {

		/* convert it to a not normalized LargeInteger */

			secondLarge = createLargeFromSmallInteger(secondInteger);
	} else {
		secondLarge = secondInteger;
	}
	_return_value = digitAddLargewith(firstLarge, secondLarge);
	if (interpreterProxy.failed()) {
		return null;
	}
	interpreterProxy.popthenPush(2, _return_value);
	return null;
}

function primDigitAddWith() {
	var firstLarge;
	var secondLarge;
	var firstInteger;
	var secondInteger;
	var _return_value;

	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(1)));
	firstInteger = interpreterProxy.stackValue(1);
	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(0)));
	secondInteger = interpreterProxy.stackValue(0);
	// missing DebugCode;
	if (interpreterProxy.failed()) {
		return null;
	}
	if (typeof firstInteger === "number") {

		/* convert it to a not normalized LargeInteger */

			firstLarge = createLargeFromSmallInteger(firstInteger);
	} else {
		firstLarge = firstInteger;
	}
	if (typeof secondInteger === "number") {

		/* convert it to a not normalized LargeInteger */

			secondLarge = createLargeFromSmallInteger(secondInteger);
	} else {
		secondLarge = secondInteger;
	}
	_return_value = digitAddLargewith(firstLarge, secondLarge);
	if (interpreterProxy.failed()) {
		return null;
	}
	interpreterProxy.popthenPush(3, _return_value);
	return null;
}


/*	Bit logic here is only implemented for positive integers or Zero; if rec 
	or arg is negative, it fails. */

function primDigitBitAnd() {
	var firstInteger;
	var secondInteger;
	var _return_value;

	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(0)));
	secondInteger = interpreterProxy.stackValue(0);
	// missing DebugCode;
	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(1)));
	firstInteger = interpreterProxy.stackValue(1);
	if (interpreterProxy.failed()) {
		return null;
	}
	_return_value = digitBitLogicwithopIndex(firstInteger, secondInteger, andOpIndex);
	if (interpreterProxy.failed()) {
		return null;
	}
	interpreterProxy.popthenPush(2, _return_value);
	return null;
}


/*	Bit logic here is only implemented for positive integers or Zero; if any arg is negative, it fails. */

function primDigitBitLogicWithOp() {
	var firstInteger;
	var secondInteger;
	var opIndex;
	var _return_value;

	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(2)));
	firstInteger = interpreterProxy.stackValue(2);
	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(1)));
	secondInteger = interpreterProxy.stackValue(1);
	opIndex = interpreterProxy.stackIntegerValue(0);
	// missing DebugCode;
	if (interpreterProxy.failed()) {
		return null;
	}
	_return_value = digitBitLogicwithopIndex(firstInteger, secondInteger, opIndex);
	if (interpreterProxy.failed()) {
		return null;
	}
	interpreterProxy.popthenPush(4, _return_value);
	return null;
}


/*	Bit logic here is only implemented for positive integers or Zero; if rec 
	or arg is negative, it fails. */

function primDigitBitOr() {
	var firstInteger;
	var secondInteger;
	var _return_value;

	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(0)));
	secondInteger = interpreterProxy.stackValue(0);
	// missing DebugCode;
	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(1)));
	firstInteger = interpreterProxy.stackValue(1);
	if (interpreterProxy.failed()) {
		return null;
	}
	_return_value = digitBitLogicwithopIndex(firstInteger, secondInteger, orOpIndex);
	if (interpreterProxy.failed()) {
		return null;
	}
	interpreterProxy.popthenPush(2, _return_value);
	return null;
}

function primDigitBitShift() {
	var aLarge;
	var rShift;
	var anInteger;
	var shiftCount;
	var _return_value;

	shiftCount = interpreterProxy.stackIntegerValue(0);
	// missing DebugCode;
	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(1)));
	anInteger = interpreterProxy.stackValue(1);
	if (interpreterProxy.failed()) {
		return null;
	}
	if (typeof anInteger === "number") {

		/* convert it to a not normalized LargeInteger */

		aLarge = createLargeFromSmallInteger(anInteger);
	} else {
		aLarge = anInteger;
	}
	if (shiftCount >= 0) {
		_return_value = digitLshift(aLarge, shiftCount);
		if (interpreterProxy.failed()) {
			return null;
		}
		interpreterProxy.popthenPush(2, _return_value);
		return null;
	} else {
		rShift = 0 - shiftCount;
		_return_value = normalize(digitRshiftlookfirst(aLarge, rShift, BYTESIZEOF(aLarge)));
		if (interpreterProxy.failed()) {
			return null;
		}
		interpreterProxy.popthenPush(2, _return_value);
		return null;
	}
}

function primDigitBitShiftMagnitude() {
	var aLarge;
	var rShift;
	var anInteger;
	var shiftCount;
	var _return_value;

	shiftCount = interpreterProxy.stackIntegerValue(0);
	// missing DebugCode;
	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(1)));
	anInteger = interpreterProxy.stackValue(1);
	if (interpreterProxy.failed()) {
		return null;
	}
	if (typeof anInteger === "number") {

		/* convert it to a not normalized LargeInteger */

		aLarge = createLargeFromSmallInteger(anInteger);
	} else {
		aLarge = anInteger;
	}
	if (shiftCount >= 0) {
		_return_value = digitLshift(aLarge, shiftCount);
		if (interpreterProxy.failed()) {
			return null;
		}
		interpreterProxy.popthenPush(2, _return_value);
		return null;
	} else {
		rShift = 0 - shiftCount;
		_return_value = normalize(digitRshiftlookfirst(aLarge, rShift, BYTESIZEOF(aLarge)));
		if (interpreterProxy.failed()) {
			return null;
		}
		interpreterProxy.popthenPush(2, _return_value);
		return null;
	}
}


/*	Bit logic here is only implemented for positive integers or Zero; if rec 
	or arg is negative, it fails. */

function primDigitBitXor() {
	var firstInteger;
	var secondInteger;
	var _return_value;

	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(0)));
	secondInteger = interpreterProxy.stackValue(0);
	// missing DebugCode;
	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(1)));
	firstInteger = interpreterProxy.stackValue(1);
	if (interpreterProxy.failed()) {
		return null;
	}
	_return_value = digitBitLogicwithopIndex(firstInteger, secondInteger, xorOpIndex);
	if (interpreterProxy.failed()) {
		return null;
	}
	interpreterProxy.popthenPush(2, _return_value);
	return null;
}

function primDigitCompare() {
	var firstVal;
	var firstInteger;
	var secondVal;
	var secondInteger;
	var _return_value;

	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(0)));
	secondInteger = interpreterProxy.stackValue(0);
	// missing DebugCode;
	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(1)));
	firstInteger = interpreterProxy.stackValue(1);
	if (interpreterProxy.failed()) {
		return null;
	}
	if (typeof firstInteger === "number") {

		/* first */

		if (typeof secondInteger === "number") {

			/* second */

			if (((firstVal = firstInteger)) > ((secondVal = secondInteger))) {
				_return_value = 1;
				if (interpreterProxy.failed()) {
					return null;
				}
				interpreterProxy.popthenPush(2, _return_value);
				return null;
			} else {
				if (firstVal < secondVal) {
					_return_value = -1;
					if (interpreterProxy.failed()) {
						return null;
					}
					interpreterProxy.popthenPush(2, _return_value);
					return null;
				} else {
					_return_value = 0;
					if (interpreterProxy.failed()) {
						return null;
					}
					interpreterProxy.popthenPush(2, _return_value);
					return null;
				}
			}
		} else {

			/* SECOND */

			_return_value = -1;
			if (interpreterProxy.failed()) {
				return null;
			}
			interpreterProxy.popthenPush(2, _return_value);
			return null;
		}
	} else {

		/* FIRST */

		if (typeof secondInteger === "number") {

			/* second */

			_return_value = 1;
			if (interpreterProxy.failed()) {
				return null;
			}
			interpreterProxy.popthenPush(2, _return_value);
			return null;
		} else {

			/* SECOND */

			_return_value = digitCompareLargewith(firstInteger, secondInteger);
			if (interpreterProxy.failed()) {
				return null;
			}
			interpreterProxy.popthenPush(2, _return_value);
			return null;
		}
	}
}

function primDigitCompareWith() {
	var firstVal;
	var secondVal;
	var firstInteger;
	var secondInteger;
	var _return_value;

	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(1)));
	firstInteger = interpreterProxy.stackValue(1);
	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(0)));
	secondInteger = interpreterProxy.stackValue(0);
	// missing DebugCode;
	if (interpreterProxy.failed()) {
		return null;
	}
	if (typeof firstInteger === "number") {

		/* first */

		if (typeof secondInteger === "number") {

			/* second */

			if (((firstVal = firstInteger)) > ((secondVal = secondInteger))) {
				_return_value = 1;
				if (interpreterProxy.failed()) {
					return null;
				}
				interpreterProxy.popthenPush(3, _return_value);
				return null;
			} else {
				if (firstVal < secondVal) {
					_return_value = -1;
					if (interpreterProxy.failed()) {
						return null;
					}
					interpreterProxy.popthenPush(3, _return_value);
					return null;
				} else {
					_return_value = 0;
					if (interpreterProxy.failed()) {
						return null;
					}
					interpreterProxy.popthenPush(3, _return_value);
					return null;
				}
			}
		} else {

			/* SECOND */

			_return_value = -1;
			if (interpreterProxy.failed()) {
				return null;
			}
			interpreterProxy.popthenPush(3, _return_value);
			return null;
		}
	} else {

		/* FIRST */

		if (typeof secondInteger === "number") {

			/* second */

			_return_value = 1;
			if (interpreterProxy.failed()) {
				return null;
			}
			interpreterProxy.popthenPush(3, _return_value);
			return null;
		} else {

			/* SECOND */

			_return_value = digitCompareLargewith(firstInteger, secondInteger);
			if (interpreterProxy.failed()) {
				return null;
			}
			interpreterProxy.popthenPush(3, _return_value);
			return null;
		}
	}
}


/*	Answer the result of dividing firstInteger by secondInteger. 
	Fail if parameters are not integers, not normalized or secondInteger is 
	zero.  */

function primDigitDivNegative() {
	var firstAsLargeInteger;
	var firstInteger;
	var secondAsLargeInteger;
	var secondInteger;
	var neg;
	var _return_value;

	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(1)));
	secondInteger = interpreterProxy.stackValue(1);
	neg = interpreterProxy.booleanValueOf(interpreterProxy.stackValue(0));
	// missing DebugCode;
	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(2)));
	firstInteger = interpreterProxy.stackValue(2);
	if (interpreterProxy.failed()) {
		return null;
	}
	if (!isNormalized(firstInteger)) {
		// missing DebugCode;
		interpreterProxy.primitiveFail();
		return null;
	}
	if (!isNormalized(secondInteger)) {
		// missing DebugCode;
		interpreterProxy.primitiveFail();
		return null;
	}
	if (typeof firstInteger === "number") {

		/* convert to LargeInteger */

			firstAsLargeInteger = createLargeFromSmallInteger(firstInteger);
	} else {
		firstAsLargeInteger = firstInteger;
	}
	if (typeof secondInteger === "number") {

		/* check for zerodivide and convert to LargeInteger */

		if (secondInteger === 0) {
			interpreterProxy.primitiveFail();
			return null;
		}
			secondAsLargeInteger = createLargeFromSmallInteger(secondInteger);
	} else {
		secondAsLargeInteger = secondInteger;
	}
	_return_value = digitDivLargewithnegative(firstAsLargeInteger, secondAsLargeInteger, neg);
	if (interpreterProxy.failed()) {
		return null;
	}
	interpreterProxy.popthenPush(3, _return_value);
	return null;
}


/*	Answer the result of dividing firstInteger by secondInteger.
	Fail if parameters are not integers or secondInteger is zero. */

function primDigitDivWithNegative() {
	var firstAsLargeInteger;
	var secondAsLargeInteger;
	var firstInteger;
	var secondInteger;
	var neg;
	var _return_value;

	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(2)));
	firstInteger = interpreterProxy.stackValue(2);
	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(1)));
	secondInteger = interpreterProxy.stackValue(1);
	neg = interpreterProxy.booleanValueOf(interpreterProxy.stackValue(0));
	// missing DebugCode;
	if (interpreterProxy.failed()) {
		return null;
	}
	if (typeof firstInteger === "number") {

		/* convert to LargeInteger */

			firstAsLargeInteger = createLargeFromSmallInteger(firstInteger);
	} else {
		firstAsLargeInteger = firstInteger;
	}
	if (typeof secondInteger === "number") {

		/* check for zerodivide and convert to LargeInteger */

		if (secondInteger === 0) {
			interpreterProxy.primitiveFail();
			return null;
		}
			secondAsLargeInteger = createLargeFromSmallInteger(secondInteger);
	} else {
		secondAsLargeInteger = secondInteger;
	}
	_return_value = digitDivLargewithnegative(firstAsLargeInteger, secondAsLargeInteger, neg);
	if (interpreterProxy.failed()) {
		return null;
	}
	interpreterProxy.popthenPush(4, _return_value);
	return null;
}

function primDigitMultiplyNegative() {
	var firstLarge;
	var firstInteger;
	var secondLarge;
	var secondInteger;
	var neg;
	var _return_value;

	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(1)));
	secondInteger = interpreterProxy.stackValue(1);
	neg = interpreterProxy.booleanValueOf(interpreterProxy.stackValue(0));
	// missing DebugCode;
	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(2)));
	firstInteger = interpreterProxy.stackValue(2);
	if (interpreterProxy.failed()) {
		return null;
	}
	if (typeof firstInteger === "number") {

		/* convert it to a not normalized LargeInteger */

			firstLarge = createLargeFromSmallInteger(firstInteger);
	} else {
		firstLarge = firstInteger;
	}
	if (typeof secondInteger === "number") {

		/* convert it to a not normalized LargeInteger */

			secondLarge = createLargeFromSmallInteger(secondInteger);
	} else {
		secondLarge = secondInteger;
	}
	_return_value = digitMultiplyLargewithnegative(firstLarge, secondLarge, neg);
	if (interpreterProxy.failed()) {
		return null;
	}
	interpreterProxy.popthenPush(3, _return_value);
	return null;
}

function primDigitMultiplyWithNegative() {
	var firstLarge;
	var secondLarge;
	var firstInteger;
	var secondInteger;
	var neg;
	var _return_value;

	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(2)));
	firstInteger = interpreterProxy.stackValue(2);
	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(1)));
	secondInteger = interpreterProxy.stackValue(1);
	neg = interpreterProxy.booleanValueOf(interpreterProxy.stackValue(0));
	// missing DebugCode;
	if (interpreterProxy.failed()) {
		return null;
	}
	if (typeof firstInteger === "number") {

		/* convert it to a not normalized LargeInteger */

			firstLarge = createLargeFromSmallInteger(firstInteger);
	} else {
		firstLarge = firstInteger;
	}
	if (typeof secondInteger === "number") {

		/* convert it to a not normalized LargeInteger */

			secondLarge = createLargeFromSmallInteger(secondInteger);
	} else {
		secondLarge = secondInteger;
	}
	_return_value = digitMultiplyLargewithnegative(firstLarge, secondLarge, neg);
	if (interpreterProxy.failed()) {
		return null;
	}
	interpreterProxy.popthenPush(4, _return_value);
	return null;
}

function primDigitSubtract() {
	var firstLarge;
	var firstInteger;
	var secondLarge;
	var secondInteger;
	var _return_value;

	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(0)));
	secondInteger = interpreterProxy.stackValue(0);
	// missing DebugCode;
	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(1)));
	firstInteger = interpreterProxy.stackValue(1);
	if (interpreterProxy.failed()) {
		return null;
	}
	if (typeof firstInteger === "number") {

		/* convert it to a not normalized LargeInteger */

			firstLarge = createLargeFromSmallInteger(firstInteger);
	} else {
		firstLarge = firstInteger;
	}
	if (typeof secondInteger === "number") {

		/* convert it to a not normalized LargeInteger */

			secondLarge = createLargeFromSmallInteger(secondInteger);
	} else {
		secondLarge = secondInteger;
	}
	_return_value = digitSubLargewith(firstLarge, secondLarge);
	if (interpreterProxy.failed()) {
		return null;
	}
	interpreterProxy.popthenPush(2, _return_value);
	return null;
}

function primDigitSubtractWith() {
	var firstLarge;
	var secondLarge;
	var firstInteger;
	var secondInteger;
	var _return_value;

	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(1)));
	firstInteger = interpreterProxy.stackValue(1);
	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(0)));
	secondInteger = interpreterProxy.stackValue(0);
	// missing DebugCode;
	if (interpreterProxy.failed()) {
		return null;
	}
	if (typeof firstInteger === "number") {

		/* convert it to a not normalized LargeInteger */

			firstLarge = createLargeFromSmallInteger(firstInteger);
	} else {
		firstLarge = firstInteger;
	}
	if (typeof secondInteger === "number") {

		/* convert it to a not normalized LargeInteger */

			secondLarge = createLargeFromSmallInteger(secondInteger);
	} else {
		secondLarge = secondInteger;
	}
	_return_value = digitSubLargewith(firstLarge, secondLarge);
	if (interpreterProxy.failed()) {
		return null;
	}
	interpreterProxy.popthenPush(3, _return_value);
	return null;
}


/*	If calling this primitive fails, then C module does not exist. */

function primGetModuleName() {
	var strPtr;
	var strLen;
	var i;
	var strOop;

	// missing DebugCode;
	strLen = getModuleName().length;
	strOop = interpreterProxy.instantiateClassindexableSize(interpreterProxy.classString(), strLen);
	strPtr = strOop.bytes;
	for (i = 0; i <= (strLen - 1); i++) {
		strPtr[i] = getModuleName()[i];
	}
	if (interpreterProxy.failed()) {
		return null;
	}
	interpreterProxy.popthenPush(1, strOop);
	return null;
}

function primMontgomeryTimesModulo() {
	var firstLarge;
	var secondLarge;
	var firstInteger;
	var thirdLarge;
	var secondOperandInteger;
	var thirdModuloInteger;
	var smallInverseInteger;
	var _return_value;

	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(2)));
	secondOperandInteger = interpreterProxy.stackValue(2);
	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(1)));
	thirdModuloInteger = interpreterProxy.stackValue(1);
	smallInverseInteger = interpreterProxy.stackIntegerValue(0);
	// missing DebugCode;
	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(3)));
	firstInteger = interpreterProxy.stackValue(3);
	if (interpreterProxy.failed()) {
		return null;
	}
	if (typeof firstInteger === "number") {

		/* convert it to a not normalized LargeInteger */

			firstLarge = createLargeFromSmallInteger(firstInteger);
	} else {
		firstLarge = firstInteger;
	}
	if (typeof secondOperandInteger === "number") {

		/* convert it to a not normalized LargeInteger */

			secondLarge = createLargeFromSmallInteger(secondOperandInteger);
	} else {
		secondLarge = secondOperandInteger;
	}
	if (typeof thirdModuloInteger === "number") {

		/* convert it to a not normalized LargeInteger */

			thirdLarge = createLargeFromSmallInteger(thirdModuloInteger);
	} else {
		thirdLarge = thirdModuloInteger;
	}
	_return_value = digitMontgomerytimesmodulomInvModB(firstLarge, secondLarge, thirdLarge, smallInverseInteger);
	if (interpreterProxy.failed()) {
		return null;
	}
	interpreterProxy.popthenPush(4, _return_value);
	return null;
}


/*	Parameter specification #(Integer) doesn't convert! */

function primNormalize() {
	var anInteger;
	var _return_value;

	interpreterProxy.success(interpreterProxy.isKindOfInteger(interpreterProxy.stackValue(0)));
	anInteger = interpreterProxy.stackValue(0);
	// missing DebugCode;
	if (interpreterProxy.failed()) {
		return null;
	}
	if (typeof anInteger === "number") {
		if (interpreterProxy.failed()) {
			return null;
		}
		interpreterProxy.popthenPush(2, anInteger);
		return null;
	}
	_return_value = normalize(anInteger);
	if (interpreterProxy.failed()) {
		return null;
	}
	interpreterProxy.popthenPush(2, _return_value);
	return null;
}

function primNormalizeNegative() {
	var rcvr;
	var _return_value;

	// missing DebugCode;
	interpreterProxy.success(interpreterProxy.stackValue(0).sqClass === interpreterProxy.classLargeNegativeInteger());
	rcvr = interpreterProxy.stackValue(0);
	if (interpreterProxy.failed()) {
		return null;
	}
	_return_value = normalizeNegative(rcvr);
	if (interpreterProxy.failed()) {
		return null;
	}
	interpreterProxy.popthenPush(1, _return_value);
	return null;
}

function primNormalizePositive() {
	var rcvr;
	var _return_value;

	// missing DebugCode;
	interpreterProxy.success(interpreterProxy.stackValue(0).sqClass === interpreterProxy.classLargePositiveInteger());
	rcvr = interpreterProxy.stackValue(0);
	if (interpreterProxy.failed()) {
		return null;
	}
	_return_value = normalizePositive(rcvr);
	if (interpreterProxy.failed()) {
		return null;
	}
	interpreterProxy.popthenPush(1, _return_value);
	return null;
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


/*	Argument bytesOop must not be aSmallInteger! */

function unsafeByteOfat(bytesOop, ix) {

	return ((bytesOop.bytes))[ix - 1];
}


function registerPlugin() {
	if (typeof Squeak === "object" && Squeak.registerExternalModule) {
		Squeak.registerExternalModule("LargeIntegers", {
			primDigitAddWith: primDigitAddWith,
			primDigitBitShiftMagnitude: primDigitBitShiftMagnitude,
			primGetModuleName: primGetModuleName,
			primDigitBitLogicWithOp: primDigitBitLogicWithOp,
			primCheckIfCModuleExists: primCheckIfCModuleExists,
			primDigitCompare: primDigitCompare,
			primDigitMultiplyNegative: primDigitMultiplyNegative,
			primDigitBitShift: primDigitBitShift,
			primNormalizePositive: primNormalizePositive,
			primDigitSubtractWith: primDigitSubtractWith,
			_primDigitBitShift: _primDigitBitShift,
			primDigitMultiplyWithNegative: primDigitMultiplyWithNegative,
			primDigitSubtract: primDigitSubtract,
			primDigitDivNegative: primDigitDivNegative,
			primNormalizeNegative: primNormalizeNegative,
			primDigitBitOr: primDigitBitOr,
			primMontgomeryTimesModulo: primMontgomeryTimesModulo,
			primDigitBitAnd: primDigitBitAnd,
			primDigitDivWithNegative: primDigitDivWithNegative,
			setInterpreter: setInterpreter,
			primNormalize: primNormalize,
			primDigitBitXor: primDigitBitXor,
			primDigitCompareWith: primDigitCompareWith,
			primDigitAdd: primDigitAdd,
			getModuleName: getModuleName,
			primAsLargeInteger: primAsLargeInteger,
			primAnyBitFromTo: primAnyBitFromTo,
		});
	} else self.setTimeout(registerPlugin, 100);
}

registerPlugin();

})(); // Register module/plugin

function CpSystemPlugin() {

  return {
    getModuleName: function() { return "CpSystemPlugin"; },
    interpreterProxy: null,
    primHandler: null,

    setInterpreter: function(anInterpreter) {
      this.setupGlobalObject();
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
      this.maxProcessPriority = this.primHandler.getScheduler().pointers[Squeak.ProcSched_processLists].pointersSize();
      this.globalProxyClasses = {};
      this.lastException = null;
      this.updateStringSupport();
      this.updateMakeStObject();
      this.updateMakeStArray();
      return true;
    },

    // Helper method to create a global scope (working similarly in Browser and in NodeJS).
    // Since ES2020 there should be a globalThis we can use. If not present, create one.
    setupGlobalObject: function() {
      if(typeof window !== 'undefined') {
        // For Browser environment create a global object named 'globalThis'.
        if(!window.globalThis) {
          window.globalThis = window;
        }
      } else {
        // For Node.js environment create a global object named 'globalThis'.
        if(!commonjsGlobal.globalThis) {
          commonjsGlobal.globalThis = commonjsGlobal;
        }
        // For Node.js make 'require' an actual global function and replace constructor to prevent
        // it from being characterized as a Dictionary (when processing in makeStObject).
        globalThis.require = function(name) {
          var module = require(name);
          Object.keys(module).forEach(function(key) {
            // Check for classes (not 100% check, okay if we give to many objects an internal property)
            // See also:
            // https://stackoverflow.com/questions/40922531/how-to-check-if-a-javascript-function-is-a-constructor
            // Assume classes have uppercase first character
            if(key[0] >= "A" && key[0] <= "Z") {
              var value = module[key];
              if(value && value.constructor && value.prototype && value === value.prototype.constructor) {
                value.__cp_className = name + "." + key;
              }
            }
          });
          return module;
        };
        globalThis.constructor = function() {};
      }

      // Create global function to let objects 'identify' themselves (used for Proxy-ing JavaScript objects).
      // For undefined or null, answer the global object itself.
      globalThis.identity = function(x) { return x === undefined || x === null ? globalThis : x; };
    },

    // Helper method for running a process uninterrupted
    runUninterrupted: function(process) {
      // Make specified process the new active Process (disregard Process priorities).
      // The current active Process is maintained and restored after the new Process
      // has finished or suspends itself.
      var primHandler = this.primHandler;
      var schedulerPointers = primHandler.getScheduler().pointers;
      var activeProcess = schedulerPointers[Squeak.ProcSched_activeProcess];
      if(activeProcess && !activeProcess.runProcess) {
        primHandler.putToSleep(activeProcess);
      }
      primHandler.transferTo(process);

      // Run the specified process until the process is finished or suspends itself.
      // No other Process will be able to run, except for other uninterruptable Processes.
      // This allows nested JavaScriptFunction (wrappers) to execute JavaScript code
      // synchronously (without being pre-empted).
      // This 'runner' assumes the process runs 'quickly'.
      var vm = this.vm;
      var compiled;
      do {
        if(compiled = vm.method.compiled) {
          compiled(vm);
        } else {
          vm.interpretOneSistaWithExtensions(false, 0, 0);
        }
      } while(process === schedulerPointers[Squeak.ProcSched_activeProcess]);

      // Restore active Process
      if(activeProcess) {
        primHandler.transferTo(activeProcess);
      }

      /*
      activeProcess = schedulerPointers[Squeak.ProcSched_activeProcess];
      if(activeProcess && activeProcess.pointers[Squeak.Proc_priority] < this.maxProcessPriority && vm.stoppedProcessLoop) {
        globalThis.setTimeout(function() {
          vm.runProcessLoop(true);
        }, 0);
      }
      */
    },

    // Add helper method to restart process loop on semaphore update
    signalSemaphoreWithIndex: function(index) {
      this.vm.runProcessLoop(true);
      this.primHandler.signalSemaphoreWithIndex(index);
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
      this.minSmallInteger = this.vm.image.is64Bit ? Number.MIN_SAFE_INTEGER : -0x40000000;
      this.maxSmallInteger = this.vm.image.is64Bit ? Number.MAX_SAFE_INTEGER :  0x3FFFFFFF;
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
      return association;
    },
    makeStOrderedDictionary: function(obj, seen) {
      // Check if obj is already known
      seen = seen || [];
      var stObj = this.findSeenObj(seen, obj);
      if(stObj !== undefined) {
        return stObj;
      }

      // Create OrederedDictionary and add it to seen collection directly, to allow internal references to be mapped correctly
      var orderedDictionary = this.vm.instantiateClass(this.orderedDictionaryClass, 0);
      seen.push({ jsObj: obj, stObj: orderedDictionary });

      // Create dictionary with the content
      var dictionary = this.makeStDictionary(obj, []);  // Do not provide seen values, because a unique needs to be created
      orderedDictionary.pointers[0] = dictionary;

      // Create array with ordered keys
      var orderedKeys = this.primHandler.makeStArray(Object.keys(obj), undefined, seen);
      orderedDictionary.pointers[1] = orderedKeys;

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

        // Create a copy of the Context to allow performing it multiple times.
        var context = thisHandle.vm.image.clone(obj);

        // Add the Context to the function (required for JavaScriptFunction >> #arguments
        // and JavaScriptFunction >> #setResult:)
        func.__cp_context = context;

        // Register the function arguments in the Context.
        // This is used by JavaScriptFunction >> #arguments.
        var funcArgs = Array.from(arguments);
        var blockArgs = funcArgs.map(function(each) {
          return thisHandle.primHandler.makeStObject(each);
        });
        context.__cp_func_arguments = blockArgs;

        // Create a Process for the context
        var process = thisHandle.newProcessForContext(context);

        // Run the process (now it is setup) and keep result
        var processResult = process.runProcess();

        // Throw in case of error
        if(processResult.error) {
          throw processResult.error;
        }

        return processResult.answer;
      };

      return func;
    },
    newProcessForContext: function(context, processName) {
      // Create a new Process to execute the specified Context.
      // Normally this Context is created from a Smalltalk Block
      // through either CpJavaScriptFunction class >> #wrap:
      // or in either CpEvent class >> #registerEventProcess: or
      // CpTransition class >> #registerTransitionProcess:
      // The mechanism of wrapping Blocks in JavaScript functions
      // allows Smalltalk Blocks to be used in callbacks or Promises.
      // It therefore allows Smalltalk to be used inside JavaScript,
      // next to already allowing JavaScript to be used inside Smalltalk.
      var process = this.vm.instantiateClass(this.processClass, 0);
      process.pointers[Squeak.Proc_suspendedContext] = context;
      process.pointers[Squeak.Proc_priority] = this.maxProcessPriority;
      if(processName) {
        process.pointers[Squeak.Proc_name] = processName;
      }
      var thisHandle = this;
      process.runProcess = function() {

        // Execute the Process
        thisHandle.runUninterrupted(process);

        // The result should have been stored by the CpJavaScriptFunction >> #setResult: method for
        // synchronous results.
        // Check if result is an error (recognized by cause, to allow functions to answer Error instances).
        var result = context.__cp_func_result;
        var isError = result instanceof Error && result.cause && result.cause.sqClass;

        // Answer result or error
        return isError ? { error: result } : { answer: result };
      };

      return process;
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
      this.interpreterProxy.stackValue(argCount);
      var src = this.interpreterProxy.stackValue(argCount).asString();
      return this.answer(argCount, src.trim());
    },
    "primitiveStringTrimLeft": function(argCount) {
      if(argCount !== 0) return false;
      this.interpreterProxy.stackValue(argCount);
      var src = this.interpreterProxy.stackValue(argCount).asString();
      return this.answer(argCount, src.trimStart());
    },
    "primitiveStringTrimRight": function(argCount) {
      if(argCount !== 0) return false;
      this.interpreterProxy.stackValue(argCount);
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
    "primitiveJavaScriptFunctionArguments": function(argCount) {
      if(argCount !== 0) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var jsFunc = receiver.jsObj;
      if(!jsFunc) return false;
      var context = receiver.jsObj.__cp_context;
      if(!context) return false;

      // Retrieve arguments from the Context instance
      return this.answer(argCount, context.__cp_func_arguments);
    },
    "primitiveJavaScriptFunctionSetResult:": function(argCount) {
      if(argCount !== 1) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var jsFunc = receiver.jsObj;
      if(!jsFunc) return false;
      var context = receiver.jsObj.__cp_context;
      if(!context) return false;
      var result = this.asJavaScriptObject(this.interpreterProxy.stackValue(0));

      // Store the result in the Context instance
      context.__cp_func_result = result;
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

function registerCpSystemPlugin() {
    if(typeof Squeak === "object" && Squeak.registerExternalModule) {
        Squeak.registerExternalModule("CpSystemPlugin", CpSystemPlugin());
    } else globalThis.setTimeout(registerCpSystemPlugin, 100);
}
registerCpSystemPlugin();

module.exports = node_app;
