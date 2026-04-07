const bcrypt = require("bcryptjs");

function parseArgs(argv = []) {
  const args = [...argv];
  let rounds = 10;
  let password = "";

  while (args.length) {
    const current = String(args.shift() || "");

    if (!current) {
      continue;
    }

    if (current === "--rounds" || current === "-r") {
      rounds = Number(args.shift() || 10);
      continue;
    }

    if (current.startsWith("--rounds=")) {
      rounds = Number(current.slice("--rounds=".length) || 10);
      continue;
    }

    if (!password) {
      password = current;
    }
  }

  return {
    password: password || String(process.env.ADMIN_PASSWORD || ""),
    rounds
  };
}

function main() {
  const { password, rounds } = parseArgs(process.argv.slice(2));

  if (!password) {
    console.error("用法: npm run admin:hash-password -- '你的强密码'");
    console.error("也可以使用: ADMIN_PASSWORD='你的强密码' npm run admin:hash-password");
    process.exit(1);
  }

  if (!Number.isInteger(rounds) || rounds < 4 || rounds > 15) {
    console.error("rounds 必须是 4 到 15 之间的整数。");
    process.exit(1);
  }

  process.stdout.write(`${bcrypt.hashSync(password, rounds)}\n`);
}

main();
