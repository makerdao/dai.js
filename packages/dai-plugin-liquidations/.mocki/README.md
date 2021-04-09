# Liq 2.0 GraphQL Mocks

This subdirectory contains tooling for mocking Data API GraphQL queries related to
Liquidations 2.0. We use [Mocki](https://mocki.io/docs) to generate a mock GraphQL
API. In order to keep the schema as close to the real Data API schema as possible,
we autogenerate a mock schema by merging custom-defined mocks with the real Data
API schema. Here's how the files in this directory work together to keep the mock
schema in sync:

- `mock-schema.json`: Add mock GraphQL queries and types here, following GraphQL
   JSON schema syntax. This is a JSON file with two top-level keys: "mockQueries"
   (for new queries), and "mockTypes" (for new scalar types). To add a new mock,
   start by editing this file.
- `vdb-schema.json`: The existing Data API GraphQL schema as JSON. You should not
   need to touch this file in order to add a new mock, but the types inside may
   be useful for reference, and you can refer to them in your own custom mocks.
- `merge-schemas.js`: A quick and dirty JS script that merges the mock queries
   and types with the existing schema and updates `config.yml`. Just use Node
   to run it: `$ node merge-schemas.js`.
- `config.yml`: The Mocki config file. The GraphQL schema contained here is
   autogenerated, but the other attributes are meant to be changed by hand. If
   you want to stub a data type or query response, use the `mocks` defined here.


## Adding a new mock query

1. If your mock is similar to an existing query, look at `vdb-schema.json` for
   reference. This helps ensure that the mock will have the same structure,
   filters, and pagination parameters as other Postgraphile-defined queries.
   The Data API schema format is mostly defined by Postgraphile, so it's important
   to get this right, or mocks will be out of sync with reality.
2. Add new queries and types to `mock-schema.json`. Most Postgraphile queries
   that return collections are nested, so you may have add types a few levels deep.
   For example, mocking the `allClips` query required:

     - Adding the `allClips` query definition to `mockQueries`
     - Adding a `ClipSaleSnapshotsConnection` type
     - Adding a `ClipSaleSnapshotsEdge` type
     - Adding a `ClipSaleSnapshot` type
     - Adding a `ClipSaleEventsConnection` type
     - Adding a `ClipSaleEventsEdge` type
     - Adding a `ClipSaleEvent` type

   This is all boilerplate, so it's easy to copy-paste, but it's verbose. Most collection
   entities follow this type/edge/connection pattern.

   Note that you can refer to types from the existing schema in your mocks with no need to
   define them, since we're merging these mocks with the existing schema! In this case, we
   had to define our new types, but did not have to define common types like `IlkSnapshot`,
   `UrnSnapshot`, and `Tx`. If it already exists in the Data API schema, you can refer to
   it without adding a new query or type.
3. Run `merge-schemas.js` to merge the schemas and generate a new Mocki config file. You
   can just use Node directly: `$ node merge-schemas.js`.
4. Spin up Mocki and try your query: `$ mocki run --path config.yml`. Mocki seems to have
   built-in mocks for most scalar primitives, like `Int` and `String`, but is missing
   some of the types like `BigInt` and `JSON` used in the API. If you get a "no mock defined
   for type" error back from the API when you load your query, you may need to stub out the value.
   See "Stubbing a mock response" below for details.

## Stubbing a mock response

Mocki will do its best to read and mock out the low level scalar types defined in our mock schema,
but the default mock resolvers won't always return realistic data. For example, if we query for a
transaction:

```graphql
{
  allTransactions(first: 1) {
    nodes {
      id
        txTo
        txFrom
        hash
        txIndex
    }
  }
}
```

...we get back a mock response like this:

```json
{
  "data": {
    "allTransactions": {
      "nodes": [{
        "id": -46,
          "txTo": "Hello World",
          "txFrom": "Hello World",
          "hash": "Hello World",
          "txIndex": -71
      }]
    }
  }
}
```

Better than nothing, but not very realistic—the types are right, but the data is not very
meaningful. To use a stub instead, add the type you're stubbing under `graphql.mocks` in the
`config.yml` file. For example:

```yml
endpoints:
  - path: /graphql
    method: post
    graphql:
      mocks:
        Transaction:
          id: 1
          txTo: '0xF32836B9E1f47a0515c6Ec431592D5EbC276407f'
          txFrom: '0x81FE72B5A8d1A857d176C3E7d5Bd2679A9B85763'
          hash: '0x432e286525aa030a2c32be421f12b61a9df38cb22bae8bca7dbfd6c535410b4b'
          txIndex: 127
```

This will stub out the values and produce a more realistic response:

```json
{
  "data": {
    "allTransactions": {
      "nodes": [{
        "id": 1,
          "txTo": "0xF32836B9E1f47a0515c6Ec431592D5EbC276407f",
          "txFrom": "0x81FE72B5A8d1A857d176C3E7d5Bd2679A9B85763",
          "hash": "0x432e286525aa030a2c32be421f12b61a9df38cb22bae8bca7dbfd6c535410b4b",
          "txIndex": 127
      }]
    }
  }
}
```

If you're stubbing an existing type, grabbing these values from the API is a great starting point
to generate realistic stub data!