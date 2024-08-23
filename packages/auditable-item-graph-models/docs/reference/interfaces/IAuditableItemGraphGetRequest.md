# Interface: IAuditableItemGraphGetRequest

Get an auditable item graph vertex.

## Properties

### pathParams

> **pathParams**: `object`

The parameters from the path.

#### id

> **id**: `string`

The id of the vertex to get.

***

### query?

> `optional` **query**: `object`

The query parameters.

#### includeDeleted?

> `optional` **includeDeleted**: `boolean`

Whether to include deleted aliases, resource, edges.

##### Default

```ts
false
```

#### includeChangesets?

> `optional` **includeChangesets**: `boolean`

Whether to include the changesets of the vertex.

##### Default

```ts
false
```

#### verifySignatureDepth?

> `optional` **verifySignatureDepth**: `"all"` \| `"none"` \| `"current"`

How many signatures to verify.

##### Default

```ts
"none"
```
