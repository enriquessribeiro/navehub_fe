import "dotenv/config";
import { pathToFileURL } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { cadernoRoutes } from "./routes/caderno.js";

const porta = Number(process.env.CADERNO_PORT) || 3334;

export const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } });
await app.register(cadernoRoutes);

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await app.listen({ port: porta, host: "0.0.0.0" });
  } catch (erro) {
    app.log.error(erro);
    process.exit(1);
  }
}