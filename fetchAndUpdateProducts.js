require("dotenv").config();
const nFetch = require("node-fetch");
const { v4: uuidv4 } = require("uuid");
const promptSync = require("prompt-sync")();
const cron = require("node-cron");
const { sendSlackMessage } = require("./sendSlackMessage");
const { slackMessageBody } = require("./slackTemplate");
let squarespaceFullItems = [];
let numOfRetries = 0;
const webhookUrl = process.env.WEBHOOK_URL;
let updatedItems = [];
const handleError = (error) => {
  numOfRetries += 1;
  console.log(error);
  return numOfRetries < 3;
};

module.exports.getUpdatedItems = () => updatedItems;

async function getSquarespaceItems() {
  let squarespaceItems = [];
  const fetchSquarespaceItems = async (cursor) => {
    try {
      console.log(`fetch squarespace items with cursor - ${cursor}`);
      const res = await nFetch(
        `https://api.squarespace.com/1.0/commerce/inventory${
          cursor ? "?cursor=" + cursor : ""
        }`,
        {
          headers: {
            Authorization: `Bearer ${process.env.SQUARE_API_KEY}`,
          },
        }
      );

      const data = await res.json();

      if (res.status !== 200) {
        const shouldRetry = handleError({
          name: res.statusText,
          message: data.message,
        });

        if (shouldRetry) {
          return fetchSquarespaceItems(cursor);
        }
        console.log(
          `Squarespace error: ${res.statusText} - Retried: ${numOfRetries} - Not quitting`
        );
        return;
      }

      if (data.inventory.length > 0) {
        squarespaceItems = squarespaceItems.concat(
          data.inventory.map((item) => ({
            name: item.descriptor,
            ...item,
          }))
        );
        squarespaceFullItems = squarespaceFullItems.concat(data.inventory);
        if (data.pagination.hasNextPage) {
          return fetchSquarespaceItems(data.pagination.nextPageCursor);
        }
      }
    } catch (e) {
      console.error(e);
      await sendSlackMessage(webhookUrl, `Squarespace error: , ${e}`);
    }
  };
  console.log(`Requesting squarespace items`);
  await fetchSquarespaceItems();

  return squarespaceItems;
}

async function getLoyverseItems() {
  let loyverseItems = [];
  const requestItems = async (cursor) => {
    console.log(`fetch loyverse items with cursor - ${cursor}`);
    const res = await nFetch(
      `https://api.loyverse.com/v1.0/items?limit=250${
        cursor ? "&cursor=" + cursor : ""
      }`,
      {
        headers: {
          Authorization: `Bearer ${process.env.LOYVERSE_API_KEY}`,
        },
      }
    );

    console.log(`Loyverse Request with status - ${res.status}`);
    try {
      const data = await res.json();

      if (res.status !== 200) {
        const shouldRetry = handleError({
          name: res.statusText,
          message: data.message,
        });

        if (shouldRetry) {
          return requestItems(cursor);
        }

        console.log(
          `Loyverse Error: ${res.statusText} - Retried: ${numOfRetries} - Not quitting`
        );
        return;
      }

      if (data.items.length > 0) {
        loyverseItems = loyverseItems.concat(
          data.items.map((item) => ({
            variantId: item.variants[0].variant_id,
            sku: item.variants[0].sku,
            name: item.item_name,
            quantity: 0,
            imageUrl: item.image_url,
          }))
        );
        console.log(`Loyverse item length`, loyverseItems.length);
        if (data.items.length === 250 && data.cursor) {
          console.log(`Requesting next page.`);
          return requestItems(data.cursor);
        }
      }
    } catch (e) {
      console.error(e);
      await sendSlackMessage(webhookUrl, `Loyverse error: , ${e}`);
    }
  };

  console.log(`Requesting loyverse items`);
  await requestItems();

  return loyverseItems;
}

async function getInventoryDetails(variantIds) {
  let inventoryData = [];
  let maxIterations = Math.ceil(variantIds.length / 200);
  console.log(`Max iterations ${maxIterations}`);
  let counter = 0;

  const fetchInventoryData = async () => {
    try {
      const iRes = await nFetch(
        `https://api.loyverse.com/v1.0/inventory?limit=250&variant_ids=${variantIds.slice(
          counter * 200,
          counter * 200 + 200
        )}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.LOYVERSE_API_KEY}`,
          },
        }
      );

      if (iRes.status >= 300) {
        throw new Error(`Response status is ${iRes.status}`);
      }
      const iData = await iRes.json();

      if (Array.isArray(iData.inventory_levels)) {
        return iData?.inventory_levels;
      }

      await sendSlackMessage(
        webhookUrl,
        `There was a problem updating, inventory was not an array`
      );
      throw new Error(`Inventory data is not an array`);
    } catch (e) {
      console.error(e);
      await sendSlackMessage(webhookUrl, `There was a problem updating, ${e}`);
      throw e;
    }
  };

  while (counter < maxIterations) {
    console.log(`Fetching inventory data - ${counter}`);
    const fetchedData = await fetchInventoryData();
    inventoryData = inventoryData.concat(fetchedData);
    counter = counter + 1;
  }

  return inventoryData;
}

async function updateItems() {
  try {
    const [squarespaceItems, loyverseItems] = await Promise.all([
      getSquarespaceItems(),
      getLoyverseItems(),
    ]);

    //   console.log(squarespaceItems.forEach((item) => console.log(item)));
    //   console.log(squarespaceItems.length);
    const filteredItems = [];
    loyverseItems.forEach((lItem) => {
      const item = squarespaceItems.find(
        (sItem) => sItem.sku.toUpperCase() === lItem.sku.toUpperCase()
      );

      if (item) {
        filteredItems.push({
          lVariantId: lItem.variantId,
          sku: item.sku,
          sVariantId: item.variantId,
          sQuantity: item.quantity,
          name: item.name,
          imageUrl: lItem.imageUrl,
        });
      }

      return squarespaceItems.find(
        (sItem) => sItem.sku.toUpperCase() === lItem.sku.toUpperCase()
      );
    });

    const variantIds = filteredItems.map((item) => item.lVariantId);

    const inventoryData = await getInventoryDetails(variantIds);

    const itemUpdates = [];

    filteredItems.forEach((fItem) => {
      const foundItem = inventoryData.find((item) => {
        return (
          item.variant_id === fItem.lVariantId &&
          Math.max(0, item.in_stock) !== fItem.sQuantity
        );
      });

      if (foundItem) {
        itemUpdates.push({
          name: fItem.name,
          quantity: Math.max(0, fItem.in_stock),
          variantId: fItem.sVariantId,
          prevQuantity: fItem.sQuantity,
          imageUrl: fItem.imageUrl,
        });
      }
    });
    console.log(filteredItems);
    console.log(itemUpdates);
    if (itemUpdates.length === 0) {
      console.log("No updates to post");
      return;
    }

    const idKey = uuidv4();

    const body = JSON.stringify({
      setFiniteOperations: itemUpdates.map((item) => ({
        quantity: item.quantity,
        variantId: item.variantId,
      })),
    });

    console.log(body);

    const updateRes = await nFetch(
      "https://api.squarespace.com/1.0/commerce/inventory/adjustments",
      {
        headers: {
          Authorization: `Bearer ${process.env.SQUARE_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idKey,
        },
        method: "POST",
        body,
      }
    );

    if (updateRes.status !== 200) {
      console.log(`Failed update ${updateRes.status}`);
      const body = await updateRes.json();
      console.log(`Response body - ${body}`);
      await sendSlackMessage(
        process.env.WEBHOOK_URL,
        `There was a problem updating. ${updateRes.status}, ${body}`
      );
    } else {
      const slackBody = slackMessageBody(itemUpdates);

      await sendSlackMessage(process.env.WEBHOOK_URL, slackBody);

      updatedItems = itemUpdates;
    }
  } catch (e) {
    console.error(e);
    await sendSlackMessage(
      process.env.WEBHOOK_URL,
      `There was a problem updating. ${e}`
    );
  }
}

(async () => {
  try {
    await updateItems();
    cron.schedule("*/25 10-20 * * *", updateItems);
  } catch (e) {
    console.error(e);
    await sendSlackMessage(
      process.env.WEBHOOK_URL,
      `There was a problem updating. ${e}`
    );
  }
})();
