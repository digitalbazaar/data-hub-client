/*!
 * Copyright (c) 2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

import crypto from '../crypto.js';
import * as base64url from 'base64url-universal';

export class MockHmac {
  constructor({id, algorithm, key}) {
    this.id = id;
    this.algorithm = algorithm;
    this.key = key;
  }

  static async create() {
    // random test data
    const id = 'urn:mockhmac:1';
    const algorithm = 'HS256';
    const data =
      base64url.decode('49JUNpuy7808NoTTbB0q8rgRuPSMyeqSswCnWKr0MF4');
    const extractable = true;
    const key = await crypto.subtle.importKey(
      'raw', data, {name: 'HMAC', hash: {name: 'SHA-256'}}, extractable,
      ['sign', 'verify']);
    const hmac = new MockHmac({id, algorithm, key});
    return hmac;
  }

  async sign({data}) {
    const key = this.key;
    const signature = new Uint8Array(
      await crypto.subtle.sign(key.algorithm, key, data));
    return base64url.encode(signature);
  }

  async verify({data, signature}) {
    const key = this.key;
    signature = base64url.decode(signature);
    return crypto.subtle.verify(key.algorithm, key, signature, data);
  }
}
