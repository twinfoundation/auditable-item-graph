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

> **create**(`aliases`?, `metadata`?, `identity`?, `nodeIdentity`?): `Promise`\<`string`\>

Create a new graph vertex.

#### Parameters

• **aliases?**: `string`[]

Alternative aliases that can be used to identify the vertex.

• **metadata?**: `IProperty`[]

The metadata for the vertex.

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

> **get**(`id`, `options`?): `Promise`\<`IAuditableItemGraphVertex`\>

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

`Promise`\<`IAuditableItemGraphVertex`\>

The vertex if found.

#### Implementation of

`IAuditableItemGraphComponent.get`

#### Throws

NotFoundError if the vertex is not found.
