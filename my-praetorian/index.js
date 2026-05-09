const { execute } = require('./agent');

(async () => {
  const input = process.argv[2] || "Ping";
  const output = await execute(input);
  console.log(`[STDOUT] ${output}`);
})();