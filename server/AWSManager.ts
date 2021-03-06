import AWS from 'aws-sdk';
import log from './common/Logger';

export interface AWSManagerInterface {
  readonly lambda: AWS.Lambda;
  readonly docClient: AWS.DynamoDB.DocumentClient;
  deployFunction(stream: ArrayBuffer, funcName: string): Promise<void>;
  invokeLambda(funcName: string, payLoad: string): Promise<any>;
  deleteFunction(funcName: string, devAddress: string): Promise<void>;
  getExecutionTimeFrom(funcName: string): number;
  getFunctionData(funcName: string): Promise<FunctionDataInterface>;
  updateRecord(funcName: string, devAddress: string): Promise<void>;
}

export interface FunctionDataInterface {
  devFee: number;
  funcPrice: number;
  funcOwner: string;
}

class AWSManager implements AWSManagerInterface {
  readonly config: AWS.Config;

  readonly lambda: AWS.Lambda;

  readonly docClient: AWS.DynamoDB.DocumentClient;

  readonly LambdaRole: string;

  readonly RunKeyword: string = 'Billed Duration:';

  constructor(accessKeyId: string, secretAccessKey: string, lambdaRole: string) {
    this.config = new AWS.Config({
      accessKeyId, secretAccessKey, region: 'eu-west-2',
    });
    this.lambda = new AWS.Lambda(this.config);
    this.docClient = new AWS.DynamoDB.DocumentClient(this.config);
    this.LambdaRole = lambdaRole;
  }

  getTimemout(funcName: string): number {
    const params = {
      FunctionName: funcName,
    };
    let timeoutResult = -1;
    this.lambda.getFunctionConfiguration(params, (err, data) => {
      if (err) {
        log.error('Funzione inesistente');
      } else {
        timeoutResult = Number(data.Timeout);
      }
    });
    return timeoutResult;
  }

  updateRecord(funcName: string, devAddress: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const params = {
        TableName: 'etherless',
        Key: {
          devAddress,
          funcName,
        },
        UpdateExpression: 'set unavailable = :u',
        ExpressionAttributeValues: {
          ':u': 'true',
        },
        // ReturnValues: 'UPDATED_NEW'
      };

      log.info('Updating the item...');
      this.docClient.update(params, (err) => {
        if (err) {
          reject(new Error('Unable to update item.'));
        } else {
          resolve();
        }
      });
    });
  }

  getFunctionData(funcName: string): Promise<FunctionDataInterface> {
    return new Promise((resolve, reject) => {
      const dbQuery = {
        TableName: 'etherless',
        ExpressionAttributeValues: {
          ':v1': funcName,
        },
        FilterExpression: 'funcName = :v1',
        ProjectionExpression: 'devAddress, price, devFee',
      };
      this.docClient.scan(dbQuery, (err, data) => {
        if (err) {
          log.error('Unable to get item. Error JSON:', JSON.stringify(err, null, 2));
          reject(err);
          return;
        }
        if (data.Count !== 1) {
          reject(err);
          return;
        }

        if (data.Items) {
          console.log(data.Items[0]);
          resolve(<FunctionDataInterface> {
            devFee: data.Items[0].devFee,
            funcPrice: data.Items[0].price,
            funcOwner: data.Items[0].devAddress,
          });
        } else {
          reject(new Error('Questo non lo so fare'));
        }
      });
    });
  }

  deployFunction(fileStream: ArrayBuffer, funcData: any): Promise<void> {
    const internalDeployFunction = (file: ArrayBuffer,
      funData: any): Promise<void> => new Promise((resolveInternal,
      rejectInternal) => {
      const { lambda } = this;

      // Handler is of the form of the name of your source file
      // and then name of your function handler
      const lambdaParams = {
        Code: {
          ZipFile: file,
        },
        Description: funData.description,
        FunctionName: funData.funcName,
        Handler: `${funData.indexPath}.handler`,
        MemorySize: 128,
        Publish: true,
        Role: this.LambdaRole,
        Runtime: 'nodejs12.x',
        Timeout: funData.timeout,
        VpcConfig: {
        },
      };

      const devAddress = funData.owner;
      const { funcName } = funData;
      const { description } = funData;
      const { params } = funData;
      const awsTier = 0.0000002083; // for lambda function with 128 MB cpu environment
      const executionPrice = (funData.timeout + 5)
          * (128 / 1024)
          * awsTier
          * 1.1;
      console.log(executionPrice);
      let priceInWei = Math.floor(executionPrice * 0.01 * 1000000000000000000);
      console.log(priceInWei);
      priceInWei += Number(funData.fee);
      const { usage } = funData;

      lambda.createFunction(lambdaParams, (err, data) => {
        if (err) {
          log.error(err);
          rejectInternal(err);
        }
        log.info(`[AWSManager]\t${data}`);

        const table = 'etherless';
        const unavailable = 'false';

        const itemValue = {
          TableName: table,
          Item: {
            devAddress,
            funcName,
            description,
            params,
            price: priceInWei,
            devFee: funData.fee,
            unavailable,
            usage,
          },
        };

        log.info('[AWSManager] Adding a new item...');
        this.docClient.put(itemValue, (docErr, docData) => {
          if (docErr) {
            rejectInternal(docErr);
          } else {
            log.info(`[AWSManager]\t${docData}`);
            resolveInternal();
          }
        });
      });
    });

    return new Promise((resolve, reject) => {
      this.getFunctionData(funcData.funcName)
        .then((dataFun) => {
          if (funcData.owner !== dataFun.funcOwner) {
            reject(new Error('You are not allowed to overwrite this function (you are not the owner)'));
          } else {
            this.deleteFunction(funcData.funcName, funcData.owner)
              .then(() => {
                internalDeployFunction(fileStream, funcData)
                  .then(resolve)
                  .catch(reject);
              }).catch((reject));
          }
        }).catch(() => { // Quindi non esiste la funzione
          internalDeployFunction(fileStream, funcData)
            .then(resolve)
            .catch(reject);
        });
    });
  }

  invokeLambda(funcName: string, payLoad: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const params = {
        FunctionName: funcName,
        InvocationType: 'RequestResponse',
        LogType: 'Tail',
        Payload: payLoad,
      };
      this.lambda.invoke(params, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });// TODO sistemare il tipo di ritorno
    });
  }

  getExecutionTimeFrom(logResult: string): number {
    const index = logResult.indexOf(this.RunKeyword);
    const duration = parseInt(logResult.substring(index + this.RunKeyword.length), 10);
    return duration;
  }
  
  deleteFunction(funcName: string, devAddress: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const DBparams = {
        TableName: 'etherless',
        Key: {
          devAddress,
          funcName,
        },
      };
      const LambdaParams = {
        FunctionName: funcName,
      };

      this.docClient.delete(DBparams, (err) => {
        if (err) {
          log.error('Unable to delete item. Error JSON:', JSON.stringify(err, null, 2));
          reject(err);
          return;
        }

        this.lambda.deleteFunction(LambdaParams, (delErr, delData) => {
          if (delErr) {
            log.error('Unable to delete lambda. Error JSON:', JSON.stringify(delErr, null, 2)); // an error occurred
            reject(err);
            return;
          }
          log.info('[AWSManager]\tDelete function succeeded:', delData);
          resolve(); // successful response
        });
      });
    });
  }
}

export { AWSManager as default };
