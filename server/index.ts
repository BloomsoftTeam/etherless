import { InfuraProvider } from 'ethers/providers';

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
  log.info('[server] Received tokens from blockchain to deploy.');
  tokens[reqToken] = { devAddress, opToken };
  log.info(tokens);
  smartHandler.sendRequestUpload(opToken);
});

smartHandler.listenRunRequest(
  (opToken: string, funcName: string, params: string) => {
    log.info('[server] Received token from blockchain to run.');
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
        const executionPriceInWei = Math.floor(executionPrice * 0.01 * 1000000000000000000);
        // change $ -> ETH del 12 maggio 2020

        aws.getFunctionData(funcName)
          .then((dataFun) => {
            const { devFee } = dataFun;
            const devAddress = dataFun.funcOwner;
            const resultObj = {
              result: lambdaResult,
              duration: billedDuration,
              price: executionPriceInWei + Number(devFee),
            };
            if (billedDuration === aws.getTimemout(funcName)) {
              aws.updateRecord(funcName, devAddress)
                .then(() => {
                  log.error('[server] Function Timeout overflow, set function to hidden');
                  smartHandler.sendRunFailure(funcName, opToken)
                    .catch((err) => {
                      log.error(`[server] Failed sending results ${err}`);
                    });
                }).catch(() => {
                  log.error('[server] Can\'t update DB record');
                });
            } else {
              smartHandler.sendRunResult(JSON.stringify(resultObj),
                executionPriceInWei,
                devFee,
                devAddress,
                opToken)
                .then()
                .catch((err) => {
                  log.error(`[server] Failed sending results ${err}`);
                });
            }
          })
          .catch((err) => {
            log.error(`[server] AWS search query failed with error ${err}`);
          });
      })
      .catch((err) => {
        log.error(`[server] AWS failed with error ${err}`);
      });
  },
).catch(log.error);

smartHandler.listenDeleteRequest(
  (opToken, functionName, devAddress) => {
    log.info('[server] Received token to delete function');
    log.info('Deleting lambda');
    aws.deleteFunction(functionName, devAddress)
      .then(() => {
        smartHandler.sendDeleteSuccess(opToken, functionName);
      })
      .catch((err) => {
        log.info(`[server] Failed to delete function ${err}`);
        smartHandler.sendDeleteFailed(opToken);
      });
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
    const tokenManager = new TokenManager();
    tokenManager.computeProof(token)
      .then((proof) => {
        if (tokens[proof]) {
          try {
            const funcDataObj = JSON.parse(configStream);
            aws.deployFunction(zipStream, funcDataObj)
              .then(() => {
                log.info('Function deployed.');
                const awsTier = 0.0000002083; // for lambda function with 128 MB cpu environment
                const price = (funcDataObj.timeout + 5)
                  * (128 / 1024)
                  * awsTier
                  * 1.1;
                var priceInWei = Math.floor(price * 0.01 * (10**18));
                console.log(priceInWei);
                console.log(funcDataObj.fee);
                priceInWei = Number(priceInWei) + Number(funcDataObj.fee);
                console.log(priceInWei);
                smartHandler.terminateDeploy(funcName,
                  tokens[proof].devAddress,
                  priceInWei,
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
