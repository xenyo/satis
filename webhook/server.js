import Queue from "bull";
import { Webhooks, createNodeMiddleware } from "@octokit/webhooks";
import http from "http";
import { exec } from "child_process";
import { sanitizeUrl } from "@braintree/sanitize-url";
import pino from "pino";

const logger = pino();

// Set up queue
const queue = new Queue("satis");
queue.process(async job => {
  logger.info(`Processing ${job.data.id}`);
  const { name, url } = job.data.payload.repository;
  const parts = ["cd .. && bin/satis build"];
  if (name !== "satis" && !job.data.payload.deleted) {
    parts.push(`--repository-url ${sanitizeUrl(url)}`);
  }
  const command = parts.join(' ');
  logger.info(command);
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        logger.error(JSON.stringify(error));
        return reject(error);
      }
      if (stderr) {
	logger.error(stderr);
        return reject(stderr);
      }
      logger.info(`${job.data.id} succeeded`);
      resolve(stdout);
    });
  });
});

// Set up webhook listener
const webhooks = new Webhooks({
  secret: process.env.WEBHOOKS_SECRET,
});
webhooks.on("push", event => {
  logger.info(`Queueing ${event.id}`);
  queue.add(event);
});
http.createServer(createNodeMiddleware(webhooks)).listen(3000);
logger.info("Listening for requests on port 3000");

