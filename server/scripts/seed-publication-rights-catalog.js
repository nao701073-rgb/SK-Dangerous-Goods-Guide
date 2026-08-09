import { syncPublicationRightsCatalog } from '../src/publication-rights-catalog.js';
try {
  const result=await syncPublicationRightsCatalog({executedBy:null});
  console.log(JSON.stringify(result,null,2));
  process.exit(0);
} catch(error) {
  console.error(error?.stack||error);
  process.exit(1);
}
