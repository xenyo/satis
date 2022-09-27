// Import Node.js modules
const http = require("http");
const { exec } = require("child_process");

// Import npm modules
const dotenv = require("dotenv");
const fastq = require("fastq");
const log = require("loglevel");
const { Webhooks, createNodeMiddleware } = require("@octokit/webhooks");

// Load environment variables from .env file
dotenv.config();

// Set up loglevel
if (process.env.GITHUB_WEBHOOKS_LOG_LEVEL)
    log.setLevel(process.env.GITHUB_WEBHOOKS_LOG_LEVEL);

// Set up queue
const queue = fastq((command, cb) => {
    log.info(command);
    exec(command, (error, stdout, stderr) => {
        if (error) {
            log.error(error);
            return cb(error);
        }
        if (stderr) {
            log.error(stderr);
            return cb(error);
        }
        log.debug(stdout);
        cb(null, stdout);
    });
});

// Set up webhook handler
const webhooks = new Webhooks({ secret: process.env.GITHUB_WEBHOOKS_SECRET });
webhooks.on("push", (event) => {
    // Pull and trigger full build if Satis is updated
    if (event.payload.repository.name === "satis") {
        queue.kill();
        return queue.push(
            "git diff HEAD --exit-code && git pull && bin/satis build"
        );
    }

    // Trigger full build if a branch or tag is deleted
    if (event.payload.deleted) {
        queue.kill();
        return queue.push("bin/satis build");
    }

    // Trigger partial build
    const url = new URL(event.payload.repository.url).toString();
    queue.push(`bin/satis build --repository-url ${url}`);
});

// Start http server
const port = process.env.GITHUB_WEBHOOKS_PORT || 3000;
http.createServer(createNodeMiddleware(webhooks)).listen(port);
log.info(`Listening for requests to /api/webhooks/github on port ${port}`);
