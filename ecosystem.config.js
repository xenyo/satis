module.exports = {
    apps: [
        {
            name: "webhooks",
            script: "./webhooks.js",
            watch: ["webhooks.js"],
        },
    ],
};
