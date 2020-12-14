"use strict";
const nFetch = require("node-fetch");

/**
 * Handles the actual sending request.
 * We're turning the https.request into a promise here for convenience
 * @param webhookURL
 * @param messageBody
 * @return {Promise}
 */
module.exports.sendSlackMessage = async function sendSlackMessage(
  webhookURL,
  messageBody
) {
  // make sure the incoming message body can be parsed into valid JSON
  try {
    messageBody = JSON.stringify(messageBody);
  } catch (e) {
    throw e;
  }

  const requestOptions = {
    method: "POST",
    header: {
      "Content-Type": "application/json",
    },
    body: messageBody,
  };
  console.log("sending request");
  // actual request
  const req = await nFetch(webhookURL, requestOptions);

  if (req.ok) {
    console.log("Slack message sent correctly");
  } else {
    console.log(req);
  }

  return req.ok;
};
