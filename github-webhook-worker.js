const { workerData: event, parentPort } = require("worker_threads");
const { exec } = require("child_process");

const { name, url } = event.payload.repository;

let command = "";

if (name === "satis") {
  command = "git diff HEAD --exit-code && git pull && bin/satis build";
} else if (event.payload.deleted) {
  command = "bin/satis build";
} else {
  command = `bin/satis build --repository-url ${new URL(url).toString()}`;
}

parentPort.postMessage(command);

exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
  if (error) throw error;
  if (stderr) parentPort.postMessage(stderr);
  if (stdout) parentPort.postMessage(stdout);
});
