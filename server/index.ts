import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { briefMarkdown, buildBrief, resolveLocation } from "./briefing.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.get("/brief", async (req, res) => {
    try {
      const brief = await buildBrief(req);
      res.type("text/markdown; charset=utf-8").send(briefMarkdown(brief));
    } catch (error) {
      res.status(400).type("text/plain").send(error instanceof Error ? error.message : "Unable to build forecast brief.");
    }
  });

  app.get("/brief.json", async (req, res) => {
    try {
      const brief = await buildBrief(req);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.json(brief);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Unable to build forecast brief." });
    }
  });

  app.get("/locations", async (req, res) => {
    try {
      const location = await resolveLocation(req.query);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.json(location);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Unable to resolve location." });
    }
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
