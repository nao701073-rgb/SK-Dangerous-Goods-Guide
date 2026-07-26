
(() => {
  "use strict";

  const assignments = window.EMS_ASSIGNMENTS || {};
  const master = window.EMS_SCHEDULE_MASTER || {
    fireSchedules: [],
    spillageSchedules: []
  };

  const normalizeUn = value =>
    String(value ?? "").replace(/\D/g, "").padStart(4, "0");

  const parseExistingEms = value => {
    const text = String(value || "").toUpperCase();
    const fire = text.match(/\bF-[A-Z]\b/)?.[0] || "";
    const spillage = text.match(/\bS-[A-Z]\b/)?.[0] || "";
    return { fireCode: fire, spillageCode: spillage };
  };

  const findSchedule = (type, code) => {
    const list = type === "fire"
      ? master.fireSchedules
      : master.spillageSchedules;
    return list.find(item => item.code === code) || null;
  };

  window.EMSResolver = {
    resolve(record) {
      const unNumber = normalizeUn(record?.unNumber);
      const existing = parseExistingEms(record?.ems);
      const indexed = assignments[unNumber] || {};

      const fireCode = existing.fireCode || indexed.fireCode || "";
      const spillageCode = existing.spillageCode || indexed.spillageCode || "";

      return {
        unNumber,
        fireCode,
        spillageCode,
        combinedCode: [fireCode, spillageCode].filter(Boolean).join(" "),
        fireSchedule: fireCode ? findSchedule("fire", fireCode) : null,
        spillageSchedule: spillageCode
          ? findSchedule("spillage", spillageCode)
          : null,
        source: indexed.source || window.EMS_SOURCE_METADATA?.circular || "",
        imdgAmendment:
          indexed.imdgAmendment ||
          window.EMS_SOURCE_METADATA?.imdgAmendment ||
          "",
        status: fireCode && spillageCode ? "resolved" : "unresolved"
      };
    }
  };
})();
