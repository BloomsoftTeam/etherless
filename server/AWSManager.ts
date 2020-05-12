import AWS from 'aws-sdk';
import log from './common/Logger';

export interface AWSManagerInterface {
  readonly router: string;
  readonly lambda: AWS.Lambda;
  readonly docClient: AWS.DynamoDB.DocumentClient;
  deployFunction(stream: ArrayBuffer, funcName: string): Promise<void>;
  invokeLambda(funcName: string, payLoad: string): Promise<any>;
  deleteFunction(funcName: string, devAddress: string): Promise<void>;
}

export interface FunctionDataInterface {
  funcPrice: number;
  funcOwner: string;
}

class AWSManager implements AWSManagerInterface {
  readonly config: AWS.Config;

  readonly router: string;

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

  deployFunction(fileStream: ArrayBuffer, funcData: any): Promise<void> {
    return new Promise((resolve, reject) => {
      //  (funcData, sourceCodeStream, callback) => {

      // DEPLOY SU LAMBDA

      const { lambda } = this;

      const lambdaParams = {
        Code: {
          ZipFile: fileStream,
        },
        Description: funcData.description,
        FunctionName: funcData.funcName,
        Handler: `${funcData.indexPath}.handler`, // is of the form of the name of your source file and then name of your function handler
        MemorySize: 128,
        Publish: true,
        Role: this.LambdaRole,
        Runtime: 'nodejs12.x',
        Timeout: funcData.timeout,
        VpcConfig: {
        },
      };

      const devAddress = funcData.owner;
      const { funcName } = funcData;
      const { description } = funcData;
      const { params } = funcData;
      // TODO calcolare in modo giusto il prezzo
      const price = funcData.fee * 5;
      const { usage } = funcData;

      lambda.createFunction(lambdaParams, (err, data) => {
        if (err) {
          log.error(err);
          reject(err);
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
            price,
            unavailable,
            usage,
          },
        };

        log.info('[AWSManager] Adding a new item...');
        this.docClient.put(itemValue, (docErr, docData) => {
          if (docErr) {
            reject(docErr);
          } else {
            log.info(`[AWSManager]\t${docData}`);
            resolve();
          }
        });
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

  getFunctionData(funcName: string): Promise<FunctionDataInterface> {
    return new Promise((resolve, reject) => {
      const dbQuery = {
        TableName: 'etherless',
        ExpressionAttributeValues: {
          ':v1': funcName,
        },
        FilterExpression: 'funcName = :v1',
        ProjectionExpression: 'devAddress, price',
      };
      this.docClient.scan(dbQuery, (err, data) => {
        if (err) {
          log.error('Unable to get item. Error JSON:', JSON.stringify(err, null, 2));
          reject(err);
          return;
        }
        if (data.Count !== 1) {
          log.error('Why are you running?');
          reject(err);
          return;
        }
        resolve(<FunctionDataInterface> {
          funcPrice: data.Items[0].price,
          funcOwner: data.Items[0].devAddress,
        });
      });
    });
  }

  deleteFunction(funcName: string, devAddress: string): Promise<void> {
    // devAddress ottenuto dall'evento smart di deleteContract
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
