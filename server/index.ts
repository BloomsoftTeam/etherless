// import { LambdaManager, LambdaManagerInterface } from './LambdaManager';


import { InfuraProvider } from 'ethers/providers';

// import ServerHandler from './ServerHandler';


// import { ServerHandlerInterface, ServerHandlerInterface } from './ServerHandler';

// import { SmartHanler } from './SmartHandler';
import dotenv from 'dotenv';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import bodyParser from 'body-parser';
import express from 'express';
import AWSManager from './AWSManager';

import log from './common/Logger';
import TokenManager from './common/TokenManager';
import SmartHandler from './SmartHandler';
import EthersHelper from './common/EthersHelper';

dotenv.config();

const {
  ETHERSCAN_API_KEY,
  ADMIN_WALLET_PRIVATE_KEY,
  INFURA_PROJECT_ID,
  AWS_ID,
  AWS_KEY,
  AWS_LAMBDA_ROLE,
} = process.env;

const app = express();
const aws = new AWSManager(AWS_ID, AWS_KEY, AWS_LAMBDA_ROLE);

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload({
  createParentPath: true,
  limits: {
    fileSize: 50 * 1024 * 1024 * 1024,
  },
}));

const infuraProvider = new InfuraProvider('ropsten', INFURA_PROJECT_ID);
log.info(`[server] Infura API Key: ${INFURA_PROJECT_ID}`);
log.info(`[server] Etherscan API Key: ${ETHERSCAN_API_KEY}`);
const ethersHelper = new EthersHelper(infuraProvider, ETHERSCAN_API_KEY);
const smartHandler = new SmartHandler(ethersHelper, ADMIN_WALLET_PRIVATE_KEY);

interface TokenData {
  devAddress: string;
  opToken: string;
}

const tokens: { [id: string]: TokenData } = {};

smartHandler.listenTokenRequests((reqToken: string, opToken: string, devAddress: string) => {
  setTimeout(() => {
    log.info('[server] Received tokens from blockchain to deploy.');
    tokens[reqToken] = { devAddress, opToken };
    log.info(tokens);
    smartHandler.sendRequestUpload(opToken);
  }, 10000);
});

smartHandler.listenRunRequest(
  (opToken: string, funcName: string, params: string) => {
    log.info('[server] Received token from blockchain to run.');
    setTimeout(() => {
      log.info('[server] Executing lambda.');
      aws.invokeLambda(funcName, params)
        .then((result) => {
          log.info('[server] Got result from lambda.');
          const lambdaResult = JSON.parse(result.Payload).body;
          const logResultEncoded = result.LogResult;
          const b = Buffer.from(logResultEncoded, 'base64');
          const logResult = b.toString();
          const billedDuration = aws.getExecutionTimeFrom(logResult);
          const awsTier = 0.0000002083; // for lambda function with 128 MB cpu environment
          const executionPrice = (billedDuration / 1000) * (128 / 1024) * awsTier * 1.1;
          const executionPriceInWei = Math.floor(executionPrice * 0.006 * 1000000000000000000);
          // change $ -> ETH del 12 maggio 2020
          const resultObj = {
            result: lambdaResult,
            duration: billedDuration,
            price: executionPriceInWei,
          };
        
          aws.getFunctionData(funcName)
            .then((dataFun) => {
              const devFee = dataFun.funcPrice;
              const devAddress = dataFun.funcOwner;
              if (billedDuration === aws.getTimemout(funcName)){
                aws.updateRecord(funcName, devAddress)
                  .then(() => {
                    log.error('[server] Function Timeout overflow, set function to hidden');
                    // settare a hidden anche nel mapping di ethereum
                    // controllare per il rimborso dei soldi, vedere se c'è l'evento 'sendRunFailure' (o simili) in modo da non dover usare sendRunResult per l'errore
                    smartHandler.sendRunResult('Error during function execution.',
                    executionPriceInWei,
                    devFee,
                    devAddress,
                    opToken)
                    .catch((err) => {
                      log.error(`[server] Failed sending results ${err}`);
                    });
                  }).catch(() => {
                    log.error('[server] Can\'t update DB record');
                  })
              }
              smartHandler.sendRunResult(JSON.stringify(resultObj),
                executionPriceInWei,
                devFee,
                devAddress,
                opToken)
                .catch((err) => {
                  log.error(`[server] Failed sending results ${err}`);
                });
            })
            .catch((err) => {
              log.error(`[server] AWS search query failed with error ${err}`);
            });
        })
        .catch((err) => {
          log.error(`[server] AWS failed with error ${err}`);
        });
    }, 10000);
  },
).catch(log.error);

smartHandler.listenDeleteRequest(
  (opToken, functionName, devAddress) => {
    log.info('[server] Received token to delete function');
    setTimeout(() => {
      log.info('Deleting lambda');
      aws.deleteFunction(functionName, devAddress)
        .then(() => {
          smartHandler.sendDeleteSuccess(opToken, functionName);
        })
        .catch((err) => {
          log.info(`[server] Failed to delete function ${err}`);
          smartHandler.sendDeleteFailed(opToken);
        });
    }, 10000);
  },
).catch(log.error);

log.info('[server] Setted listeners');

app.post('/deploy', (req, res) => {
  if (!req.files) {
    res.send({
      statusCode: 400,
      message: 'No files uploaded',
    });
  } else {
    log.info('[server] Received file(s)');
    log.info(`[server] Config file: ${req.files.funcConfig}`);
    log.info(`[server] Function file ${req.files.funcZip}`);
    const zipStream = req.files.funcZip.data;
    const configStream = req.files.funcConfig.data;
    const { token, funcName } = req.body;
    // controllare se esiste già, e chi è l'owner
    const tokenManager = new TokenManager();
    tokenManager.computeProof(token)
      .then((proof) => {
        if (tokens[proof]) {
          try {
            const funcDataObj = JSON.parse(configStream);
            aws.deployFunction(zipStream, funcDataObj)
              .then(() => {
                log.info('Function deployed.');
                smartHandler.terminateDeploy(funcName,
                  tokens[proof].devAddress,
                  funcDataObj.fee * 1000,
                  tokens[proof].opToken)
                  .then(() => {
                    log.info(`[server] ${funcDataObj.funcName}`);
                    delete tokens[proof];
                    res.sendStatus(200);
                  })
                  .catch((err) => {
                    log.error(err);
                    res.sendStatus(500);
                    delete tokens[proof];
                  });
              })
              .catch((err) => {
                log.error(`[server] ${err}`);
                smartHandler.refundDeploy(funcName, tokens[proof].opToken)
                  .catch(log.error);
                res.sendStatus(500);
                delete tokens[proof];
              });
          } catch (err) {
            log.error(`[server] ${err}`);
            smartHandler.refundDeploy(funcName, tokens[proof].opToken);
            res.sendStatus(400);
            delete tokens[proof];
          }
        } else {
          res.sendStatus(403);
        }
      })
      .catch(() => {
        res.sendStatus(500);
      });
  }
});

app.listen(3000, () => log.info('[server] Express up.'));
