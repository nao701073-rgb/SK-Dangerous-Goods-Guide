import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const errors = [];
const warnings = [];

function loadBrowserScript(relativePath) {
  const filename = path.join(rootDir, relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const window = {};
  const context = vm.createContext({ window, console });
  vm.runInContext(source, context, { filename, timeout: 15_000 });
  return window;
}

function requiredString(record, key, label) {
  if (typeof record[key] !== "string" || record[key].trim() === "") {
    errors.push(`${label}: ${key} must be a non-empty string`);
  }
}

function validateUnDatabase() {
  const { UN_DATABASE: records } = loadBrowserScript("data/un-data.js");
  if (!Array.isArray(records)) {
    errors.push("UN_DATABASE must be an array");
    return { recordCount: 0, uniqueUnCount: 0 };
  }

  const sourceKeys = new Set();
  const unNumbers = new Set();
  records.forEach((record, index) => {
    const label = `UN_DATABASE[${index}]`;
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      errors.push(`${label}: record must be an object`);
      return;
    }
    if (!Number.isInteger(record.sourcePage) || record.sourcePage < 1) {
      errors.push(`${label}: sourcePage must be a positive integer`);
    }
    if (!Number.isInteger(record.sourceRow) || record.sourceRow < 1) {
      errors.push(`${label}: sourceRow must be a positive integer`);
    }
    requiredString(record, "unNumber", label);
    requiredString(record, "properShippingNameJa", label);
    requiredString(record, "properShippingName", label);
    requiredString(record, "classification", label);
    requiredString(record, "class", label);
    requiredString(record, "source", label);

    if (typeof record.unNumber === "string" && !/^\d{4}$/.test(record.unNumber)) {
      errors.push(`${label}: unNumber must contain exactly four digits`);
    }
    if (!Array.isArray(record.specialProvisions)) {
      errors.push(`${label}: specialProvisions must be an array`);
    }
    if (!Array.isArray(record.labels)) {
      errors.push(`${label}: labels must be an array`);
    }
    if (typeof record.marinePollutant !== "boolean") {
      errors.push(`${label}: marinePollutant must be boolean`);
    }

    const sourceKey = `${record.sourcePage}:${record.sourceRow}`;
    if (sourceKeys.has(sourceKey)) {
      errors.push(`${label}: duplicate source location ${sourceKey}`);
    }
    sourceKeys.add(sourceKey);
    unNumbers.add(record.unNumber);

    const duplicates = Array.isArray(record.specialProvisions)
      ? record.specialProvisions.filter((value, i, list) => list.indexOf(value) !== i)
      : [];
    if (duplicates.length > 0) {
      warnings.push(`${label}: duplicate special provisions (${[...new Set(duplicates)].join(", ")})`);
    }
  });

  return { recordCount: records.length, uniqueUnCount: unNumbers.size };
}

function validateOrganizationMaster() {
  const { ISSOrganizationMaster: master } = loadBrowserScript("data/organization-master.js");
  if (!master || typeof master !== "object") {
    errors.push("ISSOrganizationMaster must be an object");
    return { blockCount: 0, officeCount: 0 };
  }
  if (!Array.isArray(master.blocks)) {
    errors.push("ISSOrganizationMaster.blocks must be an array");
    return { blockCount: 0, officeCount: 0 };
  }

  const ids = new Set();
  const officeCodes = new Set();
  let officeCount = 0;
  const addId = (id, label) => {
    if (typeof id !== "string" || id.trim() === "") {
      errors.push(`${label}: id must be a non-empty string`);
      return;
    }
    if (ids.has(id)) errors.push(`${label}: duplicate id ${id}`);
    ids.add(id);
  };

  addId(master.headquarters?.id, "headquarters");
  for (const [blockIndex, block] of master.blocks.entries()) {
    addId(block.id, `blocks[${blockIndex}]`);
    requiredString(block, "code", `blocks[${blockIndex}]`);
    requiredString(block, "name", `blocks[${blockIndex}]`);
    if (!Array.isArray(block.offices)) {
      errors.push(`blocks[${blockIndex}].offices must be an array`);
      continue;
    }
    for (const [officeIndex, office] of block.offices.entries()) {
      officeCount += 1;
      const label = `blocks[${blockIndex}].offices[${officeIndex}]`;
      addId(office.id, label);
      requiredString(office, "code", label);
      requiredString(office, "name", label);
      if (officeCodes.has(office.code)) errors.push(`${label}: duplicate office code ${office.code}`);
      officeCodes.add(office.code);
    }
  }
  return { blockCount: master.blocks.length, officeCount };
}

const unSummary = validateUnDatabase();
const organizationSummary = validateOrganizationMaster();

console.log("Static data validation summary");
console.log(JSON.stringify({ ...unSummary, ...organizationSummary, warnings: warnings.length, errors: errors.length }, null, 2));

if (warnings.length > 0) {
  console.warn(`Warnings (${warnings.length}; first 20 shown):`);
  warnings.slice(0, 20).forEach((warning) => console.warn(`- ${warning}`));
}
if (errors.length > 0) {
  console.error(`Errors (${errors.length}; first 50 shown):`);
  errors.slice(0, 50).forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
}
