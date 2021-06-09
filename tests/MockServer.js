/*!
 * Copyright (c) 2018-2020 Digital Bazaar, Inc. All rights reserved.
 */
import {httpClient} from '@digitalbazaar/http-client';
import sinon from 'sinon';
import pathToRegexp from 'path-to-regexp';
import routeParams from 'route-params';

/**
 * This is the sinon stub mock server.
 * It lacks some of the functionality of Pretender
 * however it can run alot of tests in node using mocha in less time.
 *
 * @class MockServer
 */
export class MockServer {
  constructor() {
    this.sandbox = sinon.createSandbox();
    this.stubs = new Map();
    this.removeStubs();
    this.stubs.set('post', this.sandbox.stub(httpClient, 'post'));
    this.stubs.set('get', this.sandbox.stub(httpClient, 'get'));
    this.stubs.set('delete', this.sandbox.stub(httpClient, 'delete'));
    this.post = this.route(this.stubs.get('post'));
    this.get = this.route(this.stubs.get('get'));
    this.delete = this.route(this.stubs.get('delete'));
  }
  // this loops through the various HTTP methods
  // and removes any stubs. it makes mocha --watch possible
  removeStubs() {
    const methods = [
      'post', 'get', 'delete', 'put', 'options', 'head', 'patch'];
    methods.forEach(method => {
      if(httpClient[method] && httpClient[method].restore) {
        httpClient[method].restore();
      }
    });
  }
  /**
   * @description This is the core of the sinon mock server.
   * It takes in a stub which is then setup to a regex
   * to match a route and an async function that will handle the mock data.
   *
   * @param {sinon.stub} stub - A sinon stub.
   *
   * @returns {Function} A function that will allow other services
   * should as mock storage and mock kms to setup test data.
   */
  route(stub) {
    /**
     * This is a function curried to a stub.
     *
     * @param {string} path - A valid express route path ex: edvs/:id.
     * @param {Function} callback - A function that accepts the route params
     * and then produces mock data for a test.
     *
     * @returns {object} - The result of the callback.
     */
    return function(path, callback) {
      const pathRegex = pathToRegexp(path);
      return stub
        .withArgs(sinon.match(value => pathRegex.test(value)))
        .callsFake(async function(route, body) {
          const params = routeParams(path, route);
          const queryParams = (body && body.searchParams) ?
            body.searchParams : {};
          const {headers} = body ? body : {headers: {}};
          for(const [key, value] of Object.entries(queryParams)) {
            queryParams[key] = String(value);
          }
          const request = {
            route,
            requestBody: JSON.stringify(body),
            headers,
            params,
            queryParams
          };
          // uncomment to capture test vectors
          // console.log(JSON.stringify({
            //   route,
            //   body,
            //   headers,
            //   params,
            //   queryParams
            // }, null, 2)
          // );
          const result = await callback(request);
          // the first argument from a handler is the statusCode in express.
          const [status] = result;
          if(status > 300) {
            const error = new Error('A HTTP error occurred.');
            error.response = {
              headers: new Map([['content-type', 'application/json']]),
              json: async () => ({}),
              status,
            };
            switch(status) {
              case 404:
                error.name = 'NotFoundError';
                throw error;
              case 409:
                error.name = 'DuplicateError';
                throw error;
              default:
                throw error;
            }
          }

          let [, responseHeaders] = result;
          responseHeaders = responseHeaders || new Map();
          responseHeaders.set('content-type', 'application/json');
          // this might look weird, but express really does
          // reserve the last argument from a handler for the data.
          // this formats that data into a http response
          return {
            headers: responseHeaders,
            json: async () => result[result.length - 1],
            status,
          };
        });
    };
  }
  shutdown() {
    return true;
  }
  prepareHeaders() {
    return true;
  }
  prepareBody() {
    return true;
  }
}
