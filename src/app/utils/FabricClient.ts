/**
 * Copyright 2019 American Express Travel Related Services Company, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
import * as types from '../types';
/**
 * This class is responsible for providing the fabric client .
 */
class FabricClient {
  /**
   * This method returns fabric client depending on the version of network you intend to connect .
   * @static
   * @param {string} version - Version of fabric network you want to connect.
   */
  static getClient(version: string) {
    return version === types.Versions.Legacy
      ? require('fabric-client-legacy')
      : require('fabric-client');
  }
}
export const getClient = FabricClient.getClient;
