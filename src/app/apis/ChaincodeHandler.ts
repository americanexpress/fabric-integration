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
import decompress from 'decompress';
import FabricClient, { Package } from 'fabric-client';
import fsExtra from 'fs-extra';
import util from 'util';
import * as types from '../types';
import { getLogger } from '../utils/logger';
import TransactionHandler from './TransactionHandler';
const logger = getLogger('ChaincodeHandler');
const FILE_UPLOAD_LOCATION = '/tmp/';
const FILE_EXTENSION = '.compressed';
const CHAINCODE_PACKAGE_FORMAT = 'cds';
const RADIX = 36;
const START = 2;
/**
 * This class provides functionality to read the world state of ledger .
 * It does not change the state of ledger . To change state of ledger
 *  see [[TransactionHandler]]
 */
export default class ChaincodeHandler implements types.ChaincodeHandler {
  private targets: FabricClient.Peer[];

  constructor(peerList: FabricClient.Peer[]) {
    this.targets = peerList;
  }
  /**
   * Installs chaincode on target peers.
   * @async
   * @param {FabricClient} client - Hyperledger fabric client
   * @param {string} chaincodeId - Chaincode id
   * @param {Buffer} chaincode - Chaincode buffer
   * @param {types.ChaincodeSpec} chaincodeSpec - Specification
   * of chaincode , all fields are mandatory
   */
  public async installChaincode(
    client: FabricClient,
    chaincodeId: string,
    chaincode: Buffer,
    chaincodeSpec: Required<types.ChaincodeSpec>,
  ): Promise<types.ApiResponse> {
    const installResponse: types.ApiResponse = {
      payload: null,
      status: types.Response.Failure,
    };
    let chaincodePackage = chaincode;
    if (chaincodeSpec.uploadType !== CHAINCODE_PACKAGE_FORMAT) {
      const outFile = FILE_UPLOAD_LOCATION.concat(chaincodeId).concat(
        FILE_EXTENSION,
      );
      fsExtra.writeFileSync(outFile, chaincode);
      const destinationDir = `${FILE_UPLOAD_LOCATION}${Math.random()
        .toString(RADIX)
        .substring(START)}/`;
      await decompress(
        FILE_UPLOAD_LOCATION.concat(chaincodeId).concat(FILE_EXTENSION),
        destinationDir,
      );
      const outDirName = fsExtra.readdirSync(destinationDir).filter(
        f =>
          fsExtra
            .statSync(destinationDir.concat('/').concat(f))
            .isDirectory() && !f.startsWith('.'), // For .DS_Store and ._ files
      )[0];
      const pkg = await Package.fromDirectory({
        name: chaincodeId,
        version: chaincodeSpec.version,
        path: destinationDir.concat(outDirName),
        type: chaincodeSpec.language,
        metadataPath: null,
      });
      chaincodePackage = await pkg.toBuffer();
      fsExtra.remove(destinationDir);
      fsExtra.remove(outFile);
    }
    const request = {
      chaincodeId,
      chaincodePackage,
      chaincodePath: '',
      targets: this.targets,
      chaincodeVersion: chaincodeSpec.version,
      txId: client.newTransactionID(true),
    };
    const results = await client.installChaincode(request);
    const proposalResponses = results[0];
    let allGood = true;
    const badResponses: any = [];
    proposalResponses.forEach((pr: any) => {
      let oneGood = false;
      if (pr.response && pr.response.status === 200) {
        oneGood = true;
        logger.info('install proposal was good');
      } else {
        logger.info('install proposal was bad');
        badResponses.push(pr);
      }
      allGood = allGood && oneGood;
    });

    if (allGood) {
      const proposalResponse = proposalResponses[0];
      logger.info(
        util.format(
          'Successfully sent install Proposal and received ProposalResponse: Status - %s',
          proposalResponse,
        ),
      );
      installResponse.status = types.Response.Success;
      installResponse.payload = 'Successfully Installed chaincode';
      return installResponse;
    }

    logger.error(
      'Failed to send install Proposal or receive valid response. Response null or status is not 200. exiting...',
    );
    logger.error(badResponses);
    throw new Error(badResponses);
  }
  /**
   * Instantiates or upgrades chaincode
   * @async
   * @param {types.AdminFunctions} functionType - Type of function , e.g instantiate or upgrade
   * @param {FabricClient.Channel} channel -
   *  Hyperledger fabric channel object (module:fabric-client.Channel)
   * @param {TransactionId} txId - TransactionId (module:fabric-client.TransactionId)
   * @param {string} chaincodeId - Chaincode id
   * @param {types.ChaincodeSpec} chaincodeSpec - Specification
   * @param {string} fcn - Initiation function name e.g init
   * @param {...string} [args] Chaincode intantiation arguments.
   */
  public async instantiateOrUpgrade(
    functionType: types.AdminFunctions,
    channel: FabricClient.Channel,
    txId: FabricClient.TransactionId,
    chaincodeId: string,
    chaincodeSpec: types.ChaincodeSpec,
    fcn: string,
    args: string[],
  ): Promise<types.ApiResponse> {
    return new TransactionHandler({
      chaincodeSpec,
      transactionType: functionType,
    }).submit(channel, txId, fcn, chaincodeId, args);
  }
}
