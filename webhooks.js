const { queue, server, webhooks, logger } = require("github-webhooks-exec");

webhooks.on("push", (event) => {
    logger.info("Received push event");

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

server.listen(process.env.GITHUB_WEBHOOKS_PORT);
logger.info("Ready");
