const { queue, server, webhooks, logger } = require("github-webhooks-exec");

webhooks.on("push", (event) => {
    // Pull and trigger full build if Satis is updated
    if (event.payload.repository.name === "satis") {
        logger.info(
            `${event.payload.ref} was updated in ${event.payload.repository.full_name}.`
        );
        queue.kill();
        const commands = [
            "git diff HEAD --exit-code",
            "git pull",
            "composer install",
            "bin/satis build",
            "pnpm install",
            "pm2 reload ecosystem.config.js",
        ];
        queue.push(commands.join(" && "));
        return;
    }

    // Trigger full build if a branch or tag is deleted
    if (event.payload.deleted) {
        logger.info(
            `${event.payload.ref} was deleted from ${event.payload.repository.full_name}.`
        );
        logger.info("A branch or tag was deleted");
        queue.push("bin/satis build");
        return;
    }

    // Trigger partial build
    logger.info(
        `${event.payload.ref} was updated in ${event.payload.repository.full_name}.`
    );
    const url = new URL(event.payload.repository.url).toString();
    queue.push(`bin/satis build --repository-url ${url}`);
});

server.listen(process.env.GITHUB_WEBHOOKS_PORT);
logger.info("Ready");
