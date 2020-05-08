const AWS = require('aws-sdk');
const fs = require('fs');
require('dotenv').config();

AWS.config.update({ accessKeyId: process.env.AWS_ACCESS_KEY, secretAccessKey: process.env.AWS_SECRET_KEY, region: 'eu-west-2'});

var ec2 = new AWS.EC2({apiVersion: '2018-04-02'});

// GET THE DEFAULT VPC
var params = {};

ec2.describeVpcs(params, function(err, data) {
  if (err) console.log(err, err.stack);

  let defaultVpcId = null
  data.Vpcs.forEach(function(item) {
    if (item.IsDefault) defaultVpc = item.VpcId;
  });

  // CREATE A NEW AWS KEY-PAIR

  var params = {
    KeyName: process.env.KEY_PAIR_NAME
  };
  
  ec2.createKeyPair(params, function(err, data) {
    if (err) console.log(err, err.stack);
    
    const homeDir = require('os').homedir();

    fs.writeFileSync(`${homeDir}/.ssh/${data.KeyName}.pem`, data.KeyMaterial, 'utf8');
    fs.chmodSync(`${homeDir}/.ssh/${data.KeyName}.pem`, '400');

    // CREATE A NEW AWS SECURITY GROUP

    var paramsSecurityGroup = {
      Description: 'allow ssh access from anywhere',
      GroupName: process.env.SECURITY_GROUP_NAME,
      VpcId: defaultVpcId
    };
    
    ec2.createSecurityGroup(paramsSecurityGroup, function(err, data) {
      if (err) {
          console.log("Error", err);
      } else {
        var mySecurityGroupId = data.GroupId;

        // ADD INBOUND RULES TO THE SECURITY GROUP

        var paramsIngress = {
          GroupId: mySecurityGroupId,
          IpPermissions:[
            {
              IpProtocol: "tcp",
              FromPort: 80,
              ToPort: 80,
              IpRanges: [{"CidrIp":"0.0.0.0/0"}]
            },
            {
              IpProtocol: "tcp",
              FromPort: 22,
              ToPort: 22,
              IpRanges: [{"CidrIp":"0.0.0.0/0"}]
            }
          ]
        };

        ec2.authorizeSecurityGroupIngress(paramsIngress, function(err, data) {
          if (err) {
            console.log("Error", err);
          } else {

            // CREATE THE EC2 CLONE FROM THE AMI

            var instanceParams = {
              ImageId: process.env.AWS_EC2_AMI,
              InstanceType: 't2.micro',
              KeyName: process.env.KEY_PAIR_NAME,
              MinCount: 1,
              MaxCount: 1,
              SecurityGroupIds: [mySecurityGroupId]
            };

            var instancePromise = new AWS.EC2({apiVersion: '2018-04-02'}).runInstances(instanceParams).promise();

            instancePromise.then(function(data) {

              var instanceId = data.Instances[0].InstanceId;
              console.log("Created instance", instanceId);
              
              let tagParams = {
                Resources: [instanceId], 
                Tags: [
                  {
                    Key: 'Name',
                    Value: 'Etherless ec2 instance with nodeJS'
                  }
                ]
              };
              
              var tagPromise = new AWS.EC2({apiVersion: '2018-04-02'}).createTags(tagParams).promise();
              
              tagPromise.then(function(data) {
                deployServerless();
              }).catch(function(err) {
                console.error(err, err.stack);
              });
            }).catch(
              function(err) {
              console.error(err, err.stack);
            });
          }
        });
      }
    });
  });
});




