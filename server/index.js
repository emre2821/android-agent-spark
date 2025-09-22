import express from "express";
import cors from "cors";
import { mockAgents } from "./mockAgents.js";
import {
  listWorkflows,
  getWorkflow,
  createWorkflow,
  updateDraftVersion,
  createDraftVersion,
  duplicateVersion,
  revertToVersion,
  publishVersion,
  diffVersions,
  exportWorkflow,
  importWorkflows,
} from "./workflowStore.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/agents", (req, res) => {
  res.json(mockAgents);
});

app.get("/workflows", (req, res) => {
  try {
    const workflows = listWorkflows();
    res.json(workflows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/workflows/:id", (req, res) => {
  try {
    const workflow = getWorkflow(req.params.id);
    res.json(workflow);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

app.post("/workflows", (req, res) => {
  try {
    const { name, description, trigger, steps, author, changeSummary } = req.body;
    const result = createWorkflow({ name, description, trigger, steps, author, changeSummary });
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post("/workflows/:id/versions", (req, res) => {
  try {
    const { definition, author, changeSummary } = req.body;
    const result = createDraftVersion(req.params.id, { definition, author, changeSummary, action: "created" });
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.patch("/workflows/:id/versions/:versionId", (req, res) => {
  try {
    const { definition, author, changeSummary } = req.body;
    const version = updateDraftVersion(req.params.id, req.params.versionId, { definition, author, changeSummary });
    res.json(version);
  } catch (error) {
    const status = error.message.includes("immutable") ? 409 : 400;
    res.status(status).json({ message: error.message });
  }
});

app.post("/workflows/:id/versions/:versionId/duplicate", (req, res) => {
  try {
    const { author, changeSummary } = req.body;
    const version = duplicateVersion(req.params.id, req.params.versionId, { author, changeSummary });
    res.status(201).json(version);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post("/workflows/:id/versions/:versionId/revert", (req, res) => {
  try {
    const { author, changeSummary } = req.body;
    const version = revertToVersion(req.params.id, req.params.versionId, { author, changeSummary });
    res.status(201).json(version);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post("/workflows/:id/versions/:versionId/publish", (req, res) => {
  try {
    const { author, changeSummary } = req.body;
    const version = publishVersion(req.params.id, req.params.versionId, { author, changeSummary });
    res.json(version);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/workflows/:id/diff", (req, res) => {
  const { from, to } = req.query;
  if (!to) {
    res.status(400).json({ message: "Query parameter 'to' is required" });
    return;
  }
  try {
    const diff = diffVersions(req.params.id, from, to);
    res.json(diff);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/workflows/:id/export", (req, res) => {
  const { format = "json", versionId } = req.query;
  try {
    const payload = exportWorkflow(req.params.id, { format, versionId });
    res.type(format === "yaml" ? "text/yaml" : "application/json").send(payload);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post("/workflows/import", (req, res) => {
  const { content, format = "json" } = req.body;
  if (!content) {
    res.status(400).json({ message: "content is required" });
    return;
  }
  try {
    const workflows = importWorkflows(content, format);
    res.status(201).json(workflows);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});
