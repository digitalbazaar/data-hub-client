/*!
 * Copyright (c) 2018-2019 Digital Bazaar, Inc. All rights reserved.
 */
import {DataHubClient, DataHubService} from '..';
import {MockStorage} from 'FIXME';
import {MockKmsService} from 'FIXME';
import {getMockKey} from './generateTestKey';
import {MockServer} from './mockNodeServer';

// FIXME use mock test data

class TestMock {
  constructor(server = new MockServer()) {
    // create mock server
    this.server = server;
    // mock backend for KMS
    this.kms = new MockKmsService({server: this.server});
    const accountId = this.accountId = 'test';
    // mock data hub storage
    this.dataHubStorage = new MockStorage(
      {server: this.server, controller: accountId});
  }
  preparePretender() {
    if(this.server) {
      return null;
    }
    this.server.prepareHeaders = function(headers) {
      if(headers) {
        if(headers.json) {
          headers['content-type'] = 'application/json';
          delete headers.json;
        }
      } else {
        headers = {};
      }
      return headers;
    };
    this.server.prepareBody = function(body, headers) {
      if(headers && headers['content-type'] === 'application/json') {
        return (body && typeof body !== 'string') ?
          JSON.stringify(body) : '{"message": "mock server error"}';
      }
      return body;
    };
  }
  async init() {
    // only init keys once
    if(!this.keys) {
      // create mock keys
      this.keys = {};

      // account master key for using KMS
      this.keys.master = await getMockKey({kmsService: this.kms});
      // create KEK and HMAC keys for creating data hubs
      this.keys.kek = await this.keys.master.generateKey({type: 'kek'});
      this.keys.hmac = await this.keys.master.generateKey({type: 'hmac'});
    }
  }
  async createDataHub(
    {controller = this.accountId, primary = false} = {}) {
    const dhs = new DataHubService();
    const {kek, hmac} = this.keys;
    let config = {
      sequence: 0,
      controller,
      kek: {id: kek.id, algorithm: kek.algorithm},
      hmac: {id: hmac.id, algorithm: hmac.algorithm}
    };
    if(primary) {
      config.primary = true;
    }
    config = await dhs.create({config});
    return new DataHubClient({config, kek, hmac});
  }
}

const singleton = new TestMock();
export default singleton;
