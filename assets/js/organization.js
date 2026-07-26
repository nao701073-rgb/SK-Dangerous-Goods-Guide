(() => {
  "use strict";

  const master = window.ISSOrganizationMaster || { blocks: [], headquarters: {} };

  const getBlocks = () => Array.isArray(master.blocks) ? master.blocks : [];
  const getOffices = () => getBlocks().flatMap(block =>
    (block.offices || []).map(office => ({ ...office, blockId: block.id, blockName: block.name }))
  );

  window.ISSOrganization = {
    getHeadquarters() {
      return master.headquarters || {};
    },
    getBlocks,
    getOffices,
    getOfficeById(id) {
      return getOffices().find(office => office.id === id) || null;
    },
    getOfficeByName(name) {
      return getOffices().find(office => office.name === name) || null;
    },
    getBlockById(id) {
      return getBlocks().find(block => block.id === id) || null;
    },
    getOfficeOptions() {
      return getOffices().filter(office => office.status !== "inactive");
    }
  };
})();
