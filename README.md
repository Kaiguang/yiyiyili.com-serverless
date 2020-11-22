# README

## 1. Deployment procedure

### 1.1. Build SAM

```shell
$ sam build
```

### 1.2. Deploy SAM

```shell
$ sam deploy --guided
```

### 1.3. Reset the artworks DynamoDB table if needed

**Note:** This will **delete** the existing DynamoDB table if there is one.

**Note:** This is an expensive Lambda, Timeout was set to 60 seconds, so use it sparingly.

The DynamoDB table for storing artworks data (product inventory) is not described in the `template.yaml` file, so it won't be created by the `sam deploy`. If you already have this DynamoDB table, it's recommended to keep using it without resetting.

If, however, you don't have this table, or the table data structure changes, you can reset the table by using this Lambda function `resetArtworksDb`.

Invoke the function either by the below shell command, or use the AWS-CLI, or use the AWS web console.

```shell
$ sam local invoke resetArtworksDb
```

## 2. Test in the local development environment

### 2.1. Start a local API Gateway server

After build the SAM.

```shell
$ sam local start-api -p PORT_NUMBER
```
