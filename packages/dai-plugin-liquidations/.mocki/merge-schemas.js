const fs = require('fs');
const yaml = require('js-yaml');

const MOCK_SCHEMA_FILE = './mock-schema.json';
const VDB_SCHEMA_FILE = './vdb-schema.json';
const MOCKI_CONFIG_FILE = './config.yml';

function merge() {
  const mocksJSON = fs.readFileSync(MOCK_SCHEMA_FILE);
  const mocks = JSON.parse(mocksJSON);

  const vdbSchemaJSON = fs.readFileSync(VDB_SCHEMA_FILE);
  const vdbSchema = JSON.parse(vdbSchemaJSON);

  let mergedSchema = vdbSchema;

  // Merge mock queries into the Vulcanize schema
  mergedSchema.data.__schema.types[0].fields.push(...mocks.mockQueries);

  // Merge mock types into the Vulcanize schema
  mergedSchema.data.__schema.types.push(...mocks.mockTypes);

  const mockiYAML = fs.readFileSync(MOCKI_CONFIG_FILE);
  let mockiConfig = yaml.safeLoad(mockiYAML);
  mockiConfig.endpoints[0].graphql.schema = mergedSchema.data;

  fs.writeFileSync(MOCKI_CONFIG_FILE, yaml.safeDump(mockiConfig));
}

merge();
