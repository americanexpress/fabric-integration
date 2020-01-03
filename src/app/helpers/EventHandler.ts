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
import {
  eventCallback, EventHandler as EventHandlerInterface, EVENTHUBHANDLER_TIMEOUT,
  EVENTHUBHANDLER_VALIDCODE, TxnCustomEvent,
} from '../types';
import util from 'util';
import FabricClient from 'fabric-client';
import FabricClientLegacy from 'fabric-client-legacy';
import { getLogger } from '../utils/logger';
const logger = getLogger('EventHandler');
/**
 * This class provides functionality to listen to chaincode events
 *
 */
export default class EventHandler implements EventHandlerInterface {
  private eventHub: (FabricClient.ChannelEventHub | FabricClientLegacy.ChannelEventHub);

  constructor(eventHub: (FabricClient.ChannelEventHub | FabricClientLegacy.ChannelEventHub)) {
    this.eventHub = eventHub;
  }
  /**
   * Registers chaincode event
   * @async
   * @param {string} chaincodeId - Chaincode id
   * @param {string} eventName - Event Name
   * @param {Function} callback - Callback function
   */
  async registerChaincodeEvent(
    chaincodeId: string,
    eventName: string,
    callback: eventCallback,
  ) : Promise<void> {
    const eventTimeout = setTimeout(() => {
      const message = `REQUEST_TIMEOUT:${this.eventHub.getPeerAddr()}`;
      logger.error(message);
      this.eventHub.disconnect();
      callback(new Error(message));
    },                              EVENTHUBHANDLER_TIMEOUT);
    this.eventHub.registerChaincodeEvent(
      chaincodeId, eventName,
      (event, blockNumber: number, tx: any, code: string) => {
        logger.info(
          'Event executed : %s , Peer Address : %s , event payload : %s ',
          event.event_name, this.eventHub.getPeerAddr(), event.payload.toString('utf-8') ,
        );
        logger.info(
          'Transaction %s has status of %s in blocl %s',
          tx,
          code,
          blockNumber,
        );
        clearTimeout(eventTimeout);

        if (code !== EVENTHUBHANDLER_VALIDCODE) {
          const message = util.format(
            'The invoke chaincode transaction was invalid, code:%s',
            code,
          );
          logger.error(message);
          callback(new Error(message), event, blockNumber, tx, code);
        } else {
          const message = event.payload.toString('utf-8');
          logger.info(message);
          callback(null, event, blockNumber, tx, code);
        }
      },
      (err: Error) => {
        clearTimeout(eventTimeout);
        logger.error(err);
        callback(err);
      },
      {
        unregister: true,
        disconnect: true,
      },
    );
    this.eventHub.connect();
  }
  /**
   * Registers specific transaction event
   * @async
   * @param {string} txIdString - Transaction Id
   * @param {types.TxnCustomEvent[]} txCustomEvents - custom chaincode events
   * @param {string} chaincodeId - chaincode
   */
  async registerTxEvent(
    txIdString: string,
    txCustomEvents: TxnCustomEvent[],
    chaincodeId: string,
  ) {
    const invokeEventPromise = new Promise((resolve, reject) => {
      const eventTimeout = setTimeout(() => {
        const message = `REQUEST_TIMEOUT:${this.eventHub.getPeerAddr()}`;
        logger.error(message);
        this.eventHub.disconnect();
        reject(message);
      },                              EVENTHUBHANDLER_TIMEOUT);
      this.eventHub.registerTxEvent(
        txIdString,
        (tx: any, code: string, blockNumber: number) => {
          logger.info(
            'The chaincode invoke chaincode transaction has been committed on peer %s',
            this.eventHub.getPeerAddr(),
          );
          logger.info(
            'Transaction %s has status of %s in blocl %s',
            tx,
            code,
            blockNumber,
          );
          clearTimeout(eventTimeout);

          if (code !== EVENTHUBHANDLER_VALIDCODE) {
            const message = util.format(
              'The invoke chaincode transaction was invalid, code:%s',
              code,
            );
            logger.error(message);
            reject(new Error(message));
          } else {
            const message = 'The invoke chaincode transaction was valid.';
            logger.info(message);
            if (txCustomEvents) {
              txCustomEvents.forEach((event: TxnCustomEvent) => {
                this.registerChaincodeEvent(
                chaincodeId,
                event.eventName,
                event.callback,
              );
              });
            }
            resolve(message);
          }
        },
        (err: Error) => {
          clearTimeout(eventTimeout);
          logger.error(err);
          reject(err);
        },
        {
          unregister: true,
          disconnect: false,
        },
      );
      this.eventHub.connect(true);
    });
    return invokeEventPromise;
  }
}
