"use strict";

const https = require("https");
const nFetch = require("node-fetch");

/**
 * Handles the actual sending request.
 * We're turning the https.request into a promise here for convenience
 * @param webhookURL
 * @param messageBody
 * @return {Promise}
 */
export async function sendSlackMessage(webhookURL, messageBody) {
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
  // Promisify the https.request
  return new Promise((resolve, reject) => {
    // general request options, we defined that it's a POST request and content is JSON
    // const req = fetch(webhookURL, requestOptions, (res) => {
    //   let response = "";
    //   console.log(res);
    //   res.on("data", (d) => {
    //     console.log("receieved data");
    //     response += d;
    //   });
    //   // response finished, resolve the promise with data
    //   res.on("end", () => {
    //     console.log("receieved end");
    //     resolve(response);
    //   });
    // });
    // // there was an error, reject the promise
    // req.on("error", (e) => {
    //   console.log("receieved error");
    //   reject(e);
    // });
    // // send our message body (was parsed to JSON beforehand)
    // req.write(messageBody);
    // req.end();
  });
}
