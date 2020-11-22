const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient();
const sesv2 = new AWS.SESV2();

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

exports.handler = async (event) => {
  const webhookRawBody = event.body;
  const sig = event.headers ? event.headers["stripe-signature"] : null;

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      webhookRawBody,
      sig,
      endpointSecret
    );
  } catch (err) {
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }

  // Reduce qty in DynamoDB for completed checkout session
  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;
    const artworkIds = JSON.parse(session.metadata.artworkIds);
    try {
      await Promise.all(
        artworkIds.map(async (id) => await reduceQtyInDynamoDb(id))
      );
    } catch (err) {
      return {
        statusCode: 500,
        body: `DynamoDB error: ${err}`,
      };
    }
  }

  // TODO: send emails to client for order confirmation

  // Send notification to seller for order fulfillment
  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;
    try {
      await sendEmailToAdmin(session);
    } catch (err) {
      return {
        statusCode: 500,
        body: `AWS SES error: ${err}`,
      };
    }
  }

  return { statusCode: 200 };
};

const reduceQtyInDynamoDb = (artworkId) => {
  return new Promise((resolve, reject) => {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME_ARTWORKS,
      Key: {
        id: artworkId,
      },
      UpdateExpression: "set qty = qty - :val",
      ExpressionAttributeValues: {
        ":val": 1,
      },
    };

    const updateCallback = (err) => {
      if (err) {
        reject(
          `Unable to update item. Error JSON: ${JSON.stringify(err, null, 2)}`
        );
      } else {
        resolve({ message: `update item success` });
      }
    };

    docClient.update(params, updateCallback);
  });
};

const sendEmailToAdmin = (stripeSession) => {
  const emailString = `Session id: ${stripeSession.id}
Amount total: ${stripeSession.amount_total} cents
Artworks ids: ${stripeSession.metadata.artworkIds}
Shipping: ${JSON.stringify(stripeSession.shipping, null, 2)}
`;

  const params = {
    Destination: {
      ToAddresses: ["hello@yiyiyili.com"],
    },
    FromEmailAddress: "hello@yiyiyili.com",
    Content: {
      Simple: {
        Body: {
          Text: {
            Data: emailString,
            Charset: "UTF-8",
          },
        },
        Subject: {
          Data: `Payment successful from ${stripeSession.shipping.name}`,
          Charset: "UTF-8",
        },
      },
    },
  };

  return new Promise((resolve, reject) => {
    sesv2.sendEmail(params, (err) => {
      if (err) {
        console.log(`SESV2 sendEmail error: ${JSON.stringify(err, null, 2)}`);
        console.log(err, err.stack);
        reject(
          `Unable to send AWS SES email. Error JSON: ${JSON.stringify(
            err,
            null,
            2
          )}`
        );
      } else {
        console.log(`SESV2 sendEmail successful.`);
        resolve({ message: `AWS SES email sent successful` });
      }
    });
  });
};
