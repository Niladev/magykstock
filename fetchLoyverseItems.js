import nFetch from "node-fetch";

export const fetchLoyverseItems = async (loyverseItems, cursor) => {
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
        return fetchLoyverseItems(loyverseItems, cursor);
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
        return fetchLoyverseItems(loyverseItems, data.cursor);
      }
    }
  } catch (e) {
    console.error(e);
    await sendSlackMessage(webhookUrl, `Loyverse error: , ${e}`);
  }
};
