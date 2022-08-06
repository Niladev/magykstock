import { handleRetry } from "./handleRetry.js";
import nFetch from "node-fetch";

const SQUARE_API_URL = "https://api.squarespace.com/1.0/commerce/inventory";
let squarespaceFullItems = [];

export const fetchSquarespaceItems = async (squarespaceItems, cursor) => {
  try {
    console.log(`fetch squarespace items with cursor - ${cursor}`);
    const res = await nFetch(
      `${SQUARE_API_URL}${cursor ? "?cursor=" + cursor : ""}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SQUARE_API_KEY}`,
        },
      }
    );

    const data = await res.json();

    if (res.status !== 200) {
      const shouldRetry = handleRetry({
        name: res.statusText,
        message: data.message,
      });

      if (shouldRetry) {
        return fetchSquarespaceItems(squarespaceItems, cursor);
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
        return fetchSquarespaceItems(
          squarespaceItems,
          data.pagination.nextPageCursor
        );
      }
    }
  } catch (e) {
    console.error(e);
    await sendSlackMessage(webhookUrl, `Squarespace error: , ${e}`);
  }
};
