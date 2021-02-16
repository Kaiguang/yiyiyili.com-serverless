const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient();

const allowed_countries = ["CA", "US"];

const generateStripeCheckoutLineItem = (id) => {
  return new Promise((resolve, reject) => {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME_ARTWORKS,
      Key: {
        id,
      },
    };

    const getCallback = (err, data) => {
      if (err) {
        reject(
          `Unable to read item. Error JSON: ${JSON.stringify(err, null, 2)}`
        );
      } else {
        const artwork = data.Item;
        if (artwork.qty > 0) {
          resolve({
            price_data: {
              currency: "cad",
              unit_amount: artwork.price,
              product_data: {
                name: artwork.name,
                images: [`${artwork.stripeCheckoutImgUrl}`],
                metadata: { artworkId: artwork.id },
              },
            },
            quantity: 1,
          });
        } else {
          resolve(null);
        }
      }
    };

    docClient.get(params, getCallback);
  });
};

exports.handler = async (event) => {
  const body = JSON.parse(event.body);

  // Check the request data format
  if (!body.shoppingBag || body.shoppingBag.length === 0) {
    console.error("Did not receive shopppingBag data.");
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "The request data format did not match",
      }),
    };
  }

  // Make a Stripe session
  const lineItemsFromClient = await Promise.all(
    body.shoppingBag.map(async (id) => await generateStripeCheckoutLineItem(id))
  );
  const lineItemsWithoutSoldItems = lineItemsFromClient.filter(
    (item) => item !== null
  );
  const artworkIds = lineItemsWithoutSoldItems.map(
    (item) => item.price_data.product_data.metadata.artworkId
  );
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    success_url: `${process.env.WEBSITE_ROOT_URL}/checkout/?success=true`,
    cancel_url: `${process.env.WEBSITE_ROOT_URL}/checkout/?canceled=true`,
    line_items: lineItemsWithoutSoldItems,
    metadata: { artworkIds: JSON.stringify(artworkIds, null, 2) },
    shipping_address_collection: {
      allowed_countries,
    },
  });

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ id: session.id }),
  };
};
