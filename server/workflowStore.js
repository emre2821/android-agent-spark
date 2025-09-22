import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "node:crypto";
import YAML from "yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultStorePath = path.join(__dirname, "data", "workflows.json");

const storePath = process.env.WORKFLOW_STORE_PATH || defaultStorePath;

const clone = (value) => (value === undefined ? value : structuredClone(value));

const ensureStore = () => {
  if (!fs.existsSync(storePath)) {
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify({ workflows: [] }, null, 2));
  }
};

const readStore = () => {
  ensureStore();
  const raw = fs.readFileSync(storePath, "utf-8");
  const data = JSON.parse(raw || "{\"workflows\":[]}");
  if (!data.workflows) {
    data.workflows = [];
  }
  return data;
};

const writeStore = (data) => {
  fs.writeFileSync(storePath, JSON.stringify(data, null, 2));
};

const mutateStore = (mutator) => {
  const data = readStore();
  const result = mutator(data);
  writeStore(data);
  return clone(result);
};

const findWorkflow = (data, workflowId) => {
  const workflow = data.workflows.find((wf) => wf.id === workflowId);
  if (!workflow) {
    throw new Error("Workflow not found");
  }
  return workflow;
};

const generateId = (prefix) => `${prefix}-${crypto.randomUUID()}`;

const sanitizeSteps = (steps = []) =>
  steps.map((step) => ({
    ...step,
    id: step.id || generateId("step"),
  }));

const sanitizeDefinition = (definition = {}) => ({
  name: definition.name || "Untitled Workflow",
  description: definition.description || "",
  trigger: definition.trigger || "manual",
  steps: sanitizeSteps(definition.steps || []),
});

const maxVersionNumber = (workflow) =>
  workflow.versions.reduce((max, version) => Math.max(max, version.number), 0);

const recordHistory = (workflow, entry) => {
  workflow.history = workflow.history || [];
  workflow.history.push({
    id: generateId("hist"),
    timestamp: new Date().toISOString(),
    ...entry,
  });
};

const updateWorkflowMetadataFromDefinition = (workflow, definition) => {
  workflow.name = definition.name;
  workflow.description = definition.description;
  workflow.trigger = definition.trigger;
  workflow.updatedAt = new Date().toISOString();
};

const createVersionEntry = (workflow, definition, author, changeSummary, action) => {
  const sanitizedDefinition = sanitizeDefinition(definition);
  const now = new Date().toISOString();
  const version = {
    id: generateId("ver"),
    number: maxVersionNumber(workflow) + 1,
    status: "draft",
    author: author || "Unknown",
    changeSummary: changeSummary || "Updated workflow",
    createdAt: now,
    updatedAt: now,
    definition: sanitizedDefinition,
  };
  workflow.versions.push(version);
  recordHistory(workflow, {
    action: action || "created",
    author: version.author,
    summary: version.changeSummary,
    versionId: version.id,
    versionNumber: version.number,
  });
  updateWorkflowMetadataFromDefinition(workflow, sanitizedDefinition);
  return version;
};

export const listWorkflows = () => {
  return mutateStore((data) => data.workflows);
};

export const getWorkflow = (workflowId) => {
  return mutateStore((data) => {
    const workflow = findWorkflow(data, workflowId);
    return workflow;
  });
};

export const createWorkflow = ({
  name,
  description,
  trigger,
  steps,
  author,
  changeSummary,
}) => {
  return mutateStore((data) => {
    const now = new Date().toISOString();
    const workflow = {
      id: generateId("wf"),
      name: name || "New Workflow",
      description: description || "",
      trigger: trigger || "manual",
      createdAt: now,
      updatedAt: now,
      publishedVersionId: null,
      versions: [],
      history: [],
    };
    data.workflows.push(workflow);
    const version = createVersionEntry(
      workflow,
      {
        name: name || "New Workflow",
        description,
        trigger,
        steps,
      },
      author || "System",
      changeSummary || "Initial draft",
      "created",
    );
    return {
      workflow,
      version,
    };
  });
};

export const updateDraftVersion = (workflowId, versionId, { definition, author, changeSummary }) => {
  return mutateStore((data) => {
    const workflow = findWorkflow(data, workflowId);
    const version = workflow.versions.find((v) => v.id === versionId);
    if (!version) {
      throw new Error("Version not found");
    }
    if (version.status !== "draft") {
      throw new Error("Published versions are immutable");
    }
    const sanitizedDefinition = sanitizeDefinition(definition || version.definition);
    version.definition = sanitizedDefinition;
    version.updatedAt = new Date().toISOString();
    if (author) {
      version.author = author;
    }
    if (changeSummary) {
      version.changeSummary = changeSummary;
    }
    recordHistory(workflow, {
      action: "updated",
      author: version.author,
      summary: changeSummary || version.changeSummary,
      versionId: version.id,
      versionNumber: version.number,
    });
    updateWorkflowMetadataFromDefinition(workflow, sanitizedDefinition);
    return version;
  });
};

export const createDraftVersion = (workflowId, { definition, author, changeSummary, action }) => {
  return mutateStore((data) => {
    const workflow = findWorkflow(data, workflowId);
    const version = createVersionEntry(
      workflow,
      definition,
      author || "System",
      changeSummary || "Created new draft",
      action,
    );
    return {
      workflow,
      version,
    };
  });
};

export const duplicateVersion = (workflowId, versionId, { author, changeSummary }) => {
  return mutateStore((data) => {
    const workflow = findWorkflow(data, workflowId);
    const version = workflow.versions.find((v) => v.id === versionId);
    if (!version) {
      throw new Error("Version not found");
    }
    const duplicated = createVersionEntry(
      workflow,
      version.definition,
      author || version.author,
      changeSummary || `Duplicated from v${version.number}`,
      "duplicated",
    );
    return duplicated;
  });
};

export const revertToVersion = (workflowId, versionId, { author, changeSummary }) => {
  return mutateStore((data) => {
    const workflow = findWorkflow(data, workflowId);
    const version = workflow.versions.find((v) => v.id === versionId);
    if (!version) {
      throw new Error("Version not found");
    }
    const reverted = createVersionEntry(
      workflow,
      version.definition,
      author || "System",
      changeSummary || `Reverted to version ${version.number}`,
      "reverted",
    );
    return reverted;
  });
};

export const publishVersion = (workflowId, versionId, { author, changeSummary }) => {
  return mutateStore((data) => {
    const workflow = findWorkflow(data, workflowId);
    const version = workflow.versions.find((v) => v.id === versionId);
    if (!version) {
      throw new Error("Version not found");
    }
    if (version.status !== "draft") {
      throw new Error("Only draft versions can be published");
    }
    const now = new Date().toISOString();
    workflow.versions.forEach((v) => {
      if (v.id !== version.id && v.status === "published") {
        v.status = "archived";
      }
    });
    version.status = "published";
    version.updatedAt = now;
    workflow.publishedVersionId = version.id;
    updateWorkflowMetadataFromDefinition(workflow, version.definition);
    recordHistory(workflow, {
      action: "published",
      author: author || version.author,
      summary: changeSummary || version.changeSummary,
      versionId: version.id,
      versionNumber: version.number,
    });
    return version;
  });
};

const getDefinitionForVersion = (workflow, versionId) => {
  const version = workflow.versions.find((v) => v.id === versionId);
  if (!version) {
    throw new Error("Version not found");
  }
  return version.definition;
};

const diffConfigs = (left, right) => {
  const leftString = JSON.stringify(left ?? {});
  const rightString = JSON.stringify(right ?? {});
  if (leftString === rightString) {
    return null;
  }
  return {
    from: left,
    to: right,
  };
};

const computeDiff = (fromDefinition, toDefinition) => {
  if (!fromDefinition) {
    return {
      metadataChanges: ["name", "description", "trigger"].map((field) => ({
        field,
        from: null,
        to: toDefinition[field] ?? null,
      })),
      addedSteps: toDefinition.steps,
      removedSteps: [],
      changedSteps: [],
    };
  }
  const metadataChanges = ["name", "description", "trigger"].flatMap((field) => {
    if ((fromDefinition?.[field] ?? null) === (toDefinition?.[field] ?? null)) {
      return [];
    }
    return [
      {
        field,
        from: fromDefinition?.[field] ?? null,
        to: toDefinition?.[field] ?? null,
      },
    ];
  });
  const fromSteps = new Map((fromDefinition.steps || []).map((step) => [step.id, step]));
  const toSteps = new Map((toDefinition.steps || []).map((step) => [step.id, step]));

  const addedSteps = Array.from(toSteps.entries())
    .filter(([id]) => !fromSteps.has(id))
    .map(([, step]) => step);
  const removedSteps = Array.from(fromSteps.entries())
    .filter(([id]) => !toSteps.has(id))
    .map(([, step]) => step);

  const changedSteps = Array.from(toSteps.entries())
    .filter(([id]) => fromSteps.has(id))
    .map(([id, step]) => {
      const original = fromSteps.get(id);
      const fieldChanges = [];
      ["name", "type"].forEach((field) => {
        if ((original?.[field] ?? null) !== (step?.[field] ?? null)) {
          fieldChanges.push({
            field,
            from: original?.[field] ?? null,
            to: step?.[field] ?? null,
          });
        }
      });
      const configDiff = diffConfigs(original?.config, step?.config);
      if (configDiff) {
        fieldChanges.push({ field: "config", ...configDiff });
      }
      if (fieldChanges.length === 0) {
        return null;
      }
      return {
        id,
        name: step.name,
        changes: fieldChanges,
      };
    })
    .filter(Boolean);

  return {
    metadataChanges,
    addedSteps,
    removedSteps,
    changedSteps,
  };
};

export const diffVersions = (workflowId, fromVersionId, toVersionId) => {
  return mutateStore((data) => {
    const workflow = findWorkflow(data, workflowId);
    const toDefinition = getDefinitionForVersion(workflow, toVersionId);
    const fromDefinition = fromVersionId ? getDefinitionForVersion(workflow, fromVersionId) : null;
    return computeDiff(fromDefinition, toDefinition);
  });
};

const serializeWorkflow = (workflow, versionId) => {
  const payload = {
    name: workflow.name,
    description: workflow.description,
    trigger: workflow.trigger,
    versions: workflow.versions,
  };
  if (versionId) {
    const version = workflow.versions.find((v) => v.id === versionId);
    if (!version) {
      throw new Error("Version not found");
    }
    payload.versions = [version];
  }
  return payload;
};

export const exportWorkflow = (workflowId, { format = "json", versionId } = {}) => {
  return mutateStore((data) => {
    const workflow = findWorkflow(data, workflowId);
    const exportPayload = {
      workflow: serializeWorkflow(workflow, versionId),
    };
    if (format === "yaml") {
      return YAML.stringify(exportPayload);
    }
    return JSON.stringify(exportPayload, null, 2);
  });
};

const normalizeImportedWorkflows = (payload) => {
  if (!payload) {
    return [];
  }
  if (payload.workflows && Array.isArray(payload.workflows)) {
    return payload.workflows;
  }
  if (payload.workflow) {
    return [payload.workflow];
  }
  return [];
};

export const importWorkflows = (content, format = "json") => {
  const parsed = format === "yaml" ? YAML.parse(content) : JSON.parse(content);
  const workflows = normalizeImportedWorkflows(parsed);
  if (!workflows.length) {
    throw new Error("No workflows found in import payload");
  }
  return mutateStore((data) => {
    const created = workflows.map((wf) => {
      const now = new Date().toISOString();
      const workflow = {
        id: generateId("wf"),
        name: wf.name || wf.definition?.name || "Imported Workflow",
        description: wf.description || wf.definition?.description || "",
        trigger: wf.trigger || wf.definition?.trigger || "manual",
        createdAt: now,
        updatedAt: now,
        publishedVersionId: null,
        versions: [],
        history: [],
      };
      const versions = Array.isArray(wf.versions) && wf.versions.length
        ? wf.versions
        : [
            {
              status: "draft",
              author: wf.author || "Imported",
              changeSummary: "Imported version",
              definition: {
                name: wf.name || "Imported Workflow",
                description: wf.description || "",
                trigger: wf.trigger || "manual",
                steps: wf.steps || [],
              },
            },
          ];
      versions
        .sort((a, b) => (a.number || 0) - (b.number || 0))
        .forEach((version, index) => {
          const entry = {
            id: generateId("ver"),
            number: index + 1,
            status: version.status === "published" ? "draft" : version.status || "draft",
            author: version.author || "Imported",
            changeSummary: version.changeSummary || "Imported version",
            createdAt: now,
            updatedAt: now,
            definition: sanitizeDefinition(version.definition || wf.definition || {}),
          };
          workflow.versions.push(entry);
          if (version.status === "published") {
            if (workflow.publishedVersionId) {
              const previousPublished = workflow.versions.find(
                (existing) => existing.id === workflow.publishedVersionId,
              );
              if (previousPublished) {
                previousPublished.status = "archived";
              }
            }
            workflow.publishedVersionId = entry.id;
            entry.status = "published";
          }
          recordHistory(workflow, {
            action: "imported",
            author: entry.author,
            summary: entry.changeSummary,
            versionId: entry.id,
            versionNumber: entry.number,
          });
        });
      if (!workflow.publishedVersionId) {
        const latest = workflow.versions.at(-1);
        workflow.publishedVersionId = latest?.id ?? null;
      }
      data.workflows.push(workflow);
      return workflow;
    });
    return created;
  });
};

