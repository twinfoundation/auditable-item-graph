# Class: AuditableItemGraphService

Class for performing auditable item graph operations.

## Implements

- `IAuditableItemGraphComponent`

## Constructors

### new AuditableItemGraphService()

> **new AuditableItemGraphService**(`options`?): [`AuditableItemGraphService`](AuditableItemGraphService.md)

Create a new instance of AuditableItemGraphService.

#### Parameters

• **options?**

The dependencies for the auditable item graph connector.

• **options.vaultConnectorType?**: `string`

The vault connector type, defaults to "vault".

• **options.vertexEntityStorageType?**: `string`

The entity storage for vertices, defaults to "vertex".

• **options.immutableStorageType?**: `string`

The immutable storage for audit trail, defaults to "audit-trail".

• **options.config?**: [`IAuditableItemGraphServiceConfig`](../interfaces/IAuditableItemGraphServiceConfig.md)

The configuration for the connector.

#### Returns

[`AuditableItemGraphService`](AuditableItemGraphService.md)

## Properties

### NAMESPACE

> `static` `readonly` **NAMESPACE**: `string` = `"aig"`

The namespace for the service.

***

### CLASS\_NAME

> `readonly` **CLASS\_NAME**: `string`

Runtime name for the class.

#### Implementation of

`IAuditableItemGraphComponent.CLASS_NAME`

## Methods

### create()

> **create**(`aliases`?, `metadata`?, `resources`?, `edges`?, `identity`?, `nodeIdentity`?): `Promise`\<`string`\>

Create a new graph vertex.

#### Parameters

• **aliases?**: `object`[]

Alternative aliases that can be used to identify the vertex.

• **metadata?**: `IProperty`[]

The metadata for the vertex.

• **resources?**: `object`[]

The resources attached to the vertex.

• **edges?**: `object`[]

The edges connected to the vertex.

• **identity?**: `string`

The identity to create the auditable item graph operation with.

• **nodeIdentity?**: `string`

The node identity to include in the auditable item graph.

#### Returns

`Promise`\<`string`\>

The id of the new graph item.

#### Implementation of

`IAuditableItemGraphComponent.create`

***

### get()

> **get**(`id`, `options`?): `Promise`\<`object`\>

Get a graph vertex.

#### Parameters

• **id**: `string`

The id of the vertex to get.

• **options?**

Additional options for the get operation.

• **options.includeDeleted?**: `boolean`

Whether to include deleted aliases, resource, edges, defaults to false.

• **options.includeChangesets?**: `boolean`

Whether to include the changesets of the vertex, defaults to false.

• **options.verifySignatureDepth?**: `"all"` \| `"none"` \| `"current"`

How many signatures to verify, defaults to "none".

#### Returns

`Promise`\<`object`\>

The vertex if found.

##### verified?

> `optional` **verified**: `boolean`

##### verification?

> `optional` **verification**: `object`

###### Index signature

 \[`epoch`: `number`\]: `object`

##### vertex

> **vertex**: `IAuditableItemGraphVertex`

#### Implementation of

`IAuditableItemGraphComponent.get`

#### Throws

NotFoundError if the vertex is not found.

***

### update()

> **update**(`id`, `aliases`?, `metadata`?, `resources`?, `edges`?, `identity`?, `nodeIdentity`?): `Promise`\<`void`\>

Update a graph vertex.

#### Parameters

• **id**: `string`

The id of the vertex to update.

• **aliases?**: `object`[]

Alternative aliases that can be used to identify the vertex.

• **metadata?**: `IProperty`[]

The metadata for the vertex.

• **resources?**: `object`[]

The resources attached to the vertex.

• **edges?**: `object`[]

The edges connected to the vertex.

• **identity?**: `string`

The identity to create the auditable item graph operation with.

• **nodeIdentity?**: `string`

The node identity to include in the auditable item graph.

#### Returns

`Promise`\<`void`\>

Nothing.

#### Implementation of

`IAuditableItemGraphComponent.update`

***

### buildChangesetMetadataList()

> `private` **buildChangesetMetadataList**(`parentId`, `elementName`, `metadataList`, `epochSignatureObjects`): `void`

Build the changesets of a metadata list.

#### Parameters

• **parentId**: `string`

The id of the parent element.

• **elementName**: `string`

The name of the element.

• **metadataList**: `undefined` \| `IAuditableItemGraphProperty`[]

The metadata list to verify.

• **epochSignatureObjects**

The epoch signature objects to add to.

#### Returns

`void`

***

### buildChangesetAliasList()

> `private` **buildChangesetAliasList**(`aliases`, `epochSignatureObjects`): `void`

Build the changesets of an alias list.

#### Parameters

• **aliases**: `undefined` \| `IAuditableItemGraphAlias`[]

The aliases to verify.

• **epochSignatureObjects**

The epoch signature objects to add to.

#### Returns

`void`

***

### buildChangesetResourceList()

> `private` **buildChangesetResourceList**(`resources`, `epochSignatureObjects`): `void`

Build the changesets of a resource list.

#### Parameters

• **resources**: `undefined` \| `IAuditableItemGraphResource`[]

The resources to verify.

• **epochSignatureObjects**

The epoch signature objects to add to.

#### Returns

`void`

***

### buildChangesetEdgeList()

> `private` **buildChangesetEdgeList**(`edges`, `epochSignatureObjects`): `void`

Build the changesets of an edge list.

#### Parameters

• **edges**: `undefined` \| `IAuditableItemGraphEdge`[]

The edges to verify.

• **epochSignatureObjects**

The epoch signature objects to add to.

#### Returns

`void`
