import {Kek} from 'FIXME/Kek.js';
import {Hmac} from 'FIXME/Hmac.js';
import * as base64url from 'base64url-universal';

class MockMasterKey {
  /**
   * A MockMasterKey for tests.
   *
   * @param {Object} options - Options for the key.
   * @param {string} [options.accountId = 'test'] - The account id for the test.
   * @param {Object} signer - A key used to sign things in this key.
   * @param {Object} kmsService - A mock kmsService for the tests.
   * @param {string} [kmsPlugin = 'mock']
   * - The name of the plugin to use in tests.
   */
  constructor({accountId = 'test', signer, kmsService, kmsPlugin = 'mock'}) {
    this.accountId = accountId;
    this.signer = signer;
    this.kmsService = kmsService;
    this.kmsPlugin = kmsPlugin;
    // babel transpiles the MockKmsService back
    // so far that extends will not work with it
    // so I have to add these methods to MockKmsService here.
    this.kmsService.wrapKey = async function({key, kekId}) {
      const unwrappedKey = base64url.encode(key);
      const operation = {
        type: 'WrapKeyOperation',
        invocationTarget: kekId,
        unwrappedKey
      };
      const {wrappedKey} = await this.plugins
        .get(kmsPlugin).wrapKey({keyId: kekId, operation});
      return wrappedKey;
    };
    this.kmsService.sign = async function({keyId, data}) {
      data = base64url.encode(data);
      const operation = {
        type: 'SignOperation',
        invocationTarget: keyId,
        verifyData: data
      };
      const {signatureValue} = await this.plugins.get(kmsPlugin)
        .sign({keyId, operation});
      return signatureValue;
    };
    this.kmsService.unwrapKey = async function({wrappedKey, kekId}) {
      const operation = {
        type: 'UnwrapKeyOperation',
        invocationTarget: kekId,
        wrappedKey
      };
      const {unwrappedKey} = await this.plugins.get(kmsPlugin)
        .unwrapKey({keyId: kekId, operation});
      return base64url.decode(unwrappedKey);
    };
  }
  /**
   * Takes in a type and uses the plugin to generate a key.
   *
   * @param {Object} options - Options for gen key.
   * @param {'hmac'|'kek'} options.type - The type of key to produce.
   *
   * @returns {Object} A key for the tests.
   */
  async generateKey({type}) {
    let Class;
    if(type === 'hmac') {
      type = 'Sha256HmacKey2019';
      Class = Hmac;
    } else if(type === 'kek') {
      type = 'AesKeyWrappingKey2019';
      Class = Kek;
    } else {
      throw new Error(`Unknown key type "${type}".`);
    }
    const operation = {
      invocationTarget: {type}
    };
    const base = 'http://localhost:9876/kms/mock/';
    const keyId = `${base}${type}`;
    const key = await this.kmsService.plugins
      .get(this.kmsPlugin).generateKey({keyId, operation});
    // disable exporting keys
    const id = key.id;
    const signer = this.signer;
    const kmsService = this.kmsService;
    return new Class({id, signer, kmsService});
  }
}

module.exports = MockMasterKey;
