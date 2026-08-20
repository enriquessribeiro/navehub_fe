import "dotenv/config";
import { pathToFileURL } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { questoesRoutes } from "./routes/questoes.js";
import { tentativasRoutes } from "./routes/tentativas.js";

const porta = Number(process.env.PORT) || 3333;

export const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(questoesRoutes);
await app.register(tentativasRoutes);

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await app.listen({ port: porta, host: "0.0.0.0" });
  } catch (erro) {
    app.log.error(erro);
    process.exit(1);
  }
}