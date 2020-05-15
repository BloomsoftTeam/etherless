# Etherless
In this readme there are all the instruction for the final user of our product.

## Pre-requisites
- ```nodejs v12.13.0``` or above installed on your computer.

## Cli Installation and usage
- open a terminal window and type ```sudo npm install -g etherless``` (if you are on Windows you need to don't type ```sudo``` and open the terminal window as administrator);
- type ```etherless get_help``` to see the guide to the use of our platform, enjoy!

### Guide to platform commands
Here we will explain the usage of every command and the general purpose of `Etherless`.
`Etherless` is a platform designed in interaction with `Ethereum` and `AWS Services`, in specific `Etherless` use `Ethereum` for handling payments and parameters transfer from ```client``` to ```server```, and `AWS Services` for the concrete executions of user's requests.

#### Free commands
These are the free commands available in the platform, you don't need an associated ```Ethereum wallet``` to run them:
- ```etherless init```: Allows the user to associate a payment method to the platform by either creating a new ETH wallet or associating an existing one. The wallet will let the user access all paid services;
- ```etherless list [-h]```: Lists all functions available in the platform with their respective description, usage and price. With the ```-h``` flag, the command lists all unavailable functions;
- ```etherless search <keyword>```: Lists all available functions on the platform matching the keyword specified with the description of the functions;
- ```etherless createConfig```: Creates a JSON file in Download folder with empty parameters to configure the deploy of a function:
    - funcName: the name of the function;
    - description: the description of the function;
    - timeout: the maximum execution time of the function;
    - owner: the address of the developer;
    - fee: the amount of money earned for every successful execution;
    - path: the relative path in which the function will be run.

#### Wallet-requiring command
These commands are still free to execute, but they need an associated ```Ethereum wallet``` in order to work:
- ```etherless logout```: Allows the user to remove the previously associated payment method;
- ```etherless delete <functionName>```: Allows the developer to delete a function available on the platform (you need to own that funcion in order to delete it);
- ```etherless list -o```: Lists all functions owned by the user in the platform with their respective description, usage and price.

### Payment commands
These commands require the user to have an associated ```Ethereum wallet```, without a minimum amount of empty balance, in order to work:
- ```etherless deploy <funcName>```: Allows the developer to deploy a function to the platform with its source code and a configuration file for the meta data. You need a `<funcName.zip>` (containing the source code file and extra modules if needed) and a `<funcName.json>` (with the same properties of the ```etherless createConfig``` file) in the same directory you are invoking the command to make it work correctly;
- ```etherless run <funcName> [parameters]```: Allows the user to execute a function available on the platform specifying all needed parameters. 
