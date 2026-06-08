import "dotenv/config";
import { buildServer } from "./server";

async function main() {
  const app = await buildServer();

  const port = Number(process.env.PORT) || 3334;
  const host = process.env.HOST ?? "0.0.0.0";

  await app.listen({ port, host });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
