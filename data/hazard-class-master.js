(() => {
  "use strict";
  const labels = Object.freeze({
    "1": "1．火薬類（1.1～1.6）",
    "1.1": "1.1 火薬類", "1.2": "1.2 火薬類", "1.3": "1.3 火薬類",
    "1.4": "1.4 火薬類", "1.5": "1.5 火薬類", "1.6": "1.6 火薬類",
    "2": "2．高圧ガス（2.1～2.3）",
    "2.1": "2.1 引火性高圧ガス",
    "2.2": "2.2 非引火性・非毒性高圧ガス",
    "2.3": "2.3 毒性高圧ガス",
    "3": "3 引火性液体類",
    "4": "4．可燃性物質類（4.1～4.3）",
    "4.1": "4.1 可燃性物質", "4.2": "4.2 自然発火性物質", "4.3": "4.3 水反応可燃性物質",
    "5": "5．酸化性物質類（5.1～5.2）",
    "5.1": "5.1 酸化性物質", "5.2": "5.2 有機過酸化物",
    "6": "6．毒物類（6.1～6.2）",
    "6.1": "6.1 毒物", "6.2": "6.2 病毒をうつしやすい物質",
    "7": "7 放射性物質", "8": "8 腐食性物質", "9": "9 有害性物質"
  });
  const primaryValues = Object.freeze([
    "1", "1.1", "1.2", "1.3", "1.4", "1.5", "1.6",
    "2", "2.1", "2.2", "2.3", "3",
    "4", "4.1", "4.2", "4.3",
    "5", "5.1", "5.2", "6", "6.1", "6.2", "7", "8", "9"
  ]);
  const subsidiaryValues = Object.freeze(["1", "2.1", "3", "4.1", "4.2", "4.3", "5.1", "6.1", "8"]);
  const groupMembers = Object.freeze({
    "1": Object.freeze(["1.1", "1.2", "1.3", "1.4", "1.5", "1.6"]),
    "2": Object.freeze(["2.1", "2.2", "2.3"]),
    "4": Object.freeze(["4.1", "4.2", "4.3"]),
    "5": Object.freeze(["5.1", "5.2"]),
    "6": Object.freeze(["6.1", "6.2"])
  });
  window.HAZARD_CLASS_MASTER = Object.freeze({
    labels, primaryValues, subsidiaryValues, groupMembers,
    label(value) { const key = String(value ?? "").trim(); return labels[key] || key; },
    options(values) { return values.map(value => ({ value, label: labels[value] || value })); },
    matches(selected, actual) {
      const selectedKey = String(selected ?? "").trim();
      const actualKey = String(actual ?? "").trim();
      return selectedKey === actualKey || (groupMembers[selectedKey] || []).includes(actualKey);
    }
  });
})();
