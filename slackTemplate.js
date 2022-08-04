export const slackMessageBody = (items) => {
  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Here are the items that were updated:*",
        },
      },
      {
        type: "divider",
      },
      ...items.map((item) => {
        return {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${item.name}*\nUpdated quantity *${
              item.quantity !== 0 ? item.quantity : "SOLD OUT!"
            }*`,
          },
          accessory: {
            type: "image",
            image_url: `${item.imageUrl}`,
            alt_text: `${item.name}`,
          },
        };
      }),
    ],
  };
};

// {
// 	"blocks": [
// 		{
// 			"type": "section",
// 			"text": {
// 				"type": "mrkdwn",
// 				"text": "*Here are the items that were updated:*"
// 			}
// 		},
// 		{
// 			"type": "divider"
// 		},
// 		{
// 			"type": "section",
// 			"text": {
// 				"type": "mrkdwn",
// 				"text": "*Pajitas de acero eco 9€*\nUpdated quantity: *6*"
// 			},
// 			"accessory": {
// 				"type": "image",
// 				"image_url": "https://api.loyverse.com/image/057c9476-6e09-4d59-939c-d2a9921df8ff",
// 				"alt_text": "alt text for image"
// 			}
// 		}
// 	]
// }
