import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const loadStore = async () => {
  const store = await import("../../server/workflowStore.js");
  return store;
};

describe("workflow version transitions", () => {
  let tempDir: string;
  let storePath: string;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-store-"));
    storePath = path.join(tempDir, "workflows.json");
    process.env.WORKFLOW_STORE_PATH = storePath;
    vi.resetModules();
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("allows drafts to evolve while keeping published versions immutable", async () => {
    const {
      createWorkflow,
      updateDraftVersion,
      publishVersion,
      duplicateVersion,
      getWorkflow,
    } = await loadStore();

    const { workflow: createdWorkflow, version: initialVersion } = createWorkflow({
      name: "Ops Pipeline",
      description: "Automate operations tasks",
      trigger: "schedule",
      steps: [
        { id: "s1", type: "ingest", name: "Collect", config: { source: "db" } },
      ],
      author: "Ava",
      changeSummary: "Initial draft",
    });

    const refined = updateDraftVersion(createdWorkflow.id, initialVersion.id, {
      author: "Ava",
      changeSummary: "Refine scoring step",
      definition: {
        ...initialVersion.definition,
        steps: [
          { id: "s1", type: "ingest", name: "Collect", config: { source: "db" } },
          { id: "s2", type: "analyze", name: "Score", config: { model: "ops-v1" } },
        ],
      },
    });

    expect(refined.definition.steps).toHaveLength(2);
    expect(refined.changeSummary).toContain("Refine");

    const published = publishVersion(createdWorkflow.id, refined.id, {
      author: "Lead",
      changeSummary: "Stabilize pipeline",
    });

    expect(published.status).toBe("published");

    expect(() =>
      updateDraftVersion(createdWorkflow.id, refined.id, {
        changeSummary: "Attempt overwrite",
        definition: refined.definition,
      }),
    ).toThrowError(/immutable/);

    const duplicated = duplicateVersion(createdWorkflow.id, refined.id, {
      author: "Kai",
      changeSummary: "Experiment with enrichment",
    });

    expect(duplicated.status).toBe("draft");
    expect(duplicated.number).toBeGreaterThan(published.number);

    const tweaked = updateDraftVersion(createdWorkflow.id, duplicated.id, {
      author: "Kai",
      changeSummary: "Add enrichment step",
      definition: {
        ...duplicated.definition,
        steps: [
          ...duplicated.definition.steps,
          { id: "s3", type: "enrich", name: "Enrich", config: { provider: "crm" } },
        ],
      },
    });

    expect(tweaked.definition.steps).toHaveLength(3);

    const stored = getWorkflow(createdWorkflow.id);
    const publishedVersion = stored.versions.find((v) => v.id === refined.id);
    const draftVersion = stored.versions.find((v) => v.id === tweaked.id);

    expect(publishedVersion?.status).toBe("published");
    expect(publishedVersion?.definition.steps).toHaveLength(2);
    expect(draftVersion?.status).toBe("draft");
    expect(draftVersion?.definition.steps).toHaveLength(3);
  });
});
