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

// const awsManager = new AWSManager('');
// const tokenManager = new TokenManager();
const infuraProvider = new InfuraProvider('ropsten', INFURA_PROJECT_ID);
log.info(`[server] Infura API Key: ${INFURA_PROJECT_ID}`);
log.info(`[server] Etherscan API Key: ${ETHERSCAN_API_KEY}`);
const ethersHelper = new EthersHelper(infuraProvider, ETHERSCAN_API_KEY);
// const serverHandler = new ServerHandler('', tokenManager);
const smartHandler = new SmartHandler(ethersHelper, ADMIN_WALLET_PRIVATE_KEY);
//              token : address

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
    // const objParams = JSON.parse(params);
    setTimeout(() => {
      log.info('[server] Executing lambda.');
      aws.invokeLambda(funcName, params)
        .then((result) => {
          log.info('[server] Got result from lambda.');
          const strResult = JSON.stringify(result);
          // TODO fixare
          smartHandler.sendRunResult(strResult,
            0,
            0,
            '0xe710597dE7cd68A8F9938dDfe7140f3fDf39AbB0',
            opToken)
            .catch((err) => {
              log.error(`[server] Failed sending results ${err}`);
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
                  funcDataObj.fee,
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
