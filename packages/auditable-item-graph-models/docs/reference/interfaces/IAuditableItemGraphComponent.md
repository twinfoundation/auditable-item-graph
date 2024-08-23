# Interface: IAuditableItemGraphComponent

Interface describing an auditable item graph contract.

## Extends

- `IComponent`

## Properties

### CLASS\_NAME

> `readonly` **CLASS\_NAME**: `string`

The name of the component.

#### Inherited from

`IComponent.CLASS_NAME`

## Methods

### bootstrap()?

> `optional` **bootstrap**(`nodeLoggingConnectorType`?): `Promise`\<`boolean`\>

Bootstrap the component by creating and initializing any resources it needs.

#### Parameters

• **nodeLoggingConnectorType?**: `string`

The node logging connector type, defaults to "node-logging".

#### Returns

`Promise`\<`boolean`\>

True if the bootstrapping process was successful.

#### Inherited from

`IComponent.bootstrap`

***

### start()?

> `optional` **start**(`nodeIdentity`, `nodeLoggingConnectorType`?): `Promise`\<`void`\>

The component needs to be started when the node is initialized.

#### Parameters

• **nodeIdentity**: `string`

The identity of the node starting the component.

• **nodeLoggingConnectorType?**: `string`

The node logging connector type, defaults to "node-logging".

#### Returns

`Promise`\<`void`\>

Nothing.

#### Inherited from

`IComponent.start`

***

### stop()?

> `optional` **stop**(`nodeIdentity`, `nodeLoggingConnectorType`?): `Promise`\<`void`\>

The component needs to be stopped when the node is closed.

#### Parameters

• **nodeIdentity**: `string`

The identity of the node stopping the component.

• **nodeLoggingConnectorType?**: `string`

The node logging connector type, defaults to "node-logging".

#### Returns

`Promise`\<`void`\>

Nothing.

#### Inherited from

`IComponent.stop`

***

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

The node identity to use for vault operations.

#### Returns

`Promise`\<`string`\>

The id of the new graph item.

***

### get()

> **get**(`id`, `options`?): `Promise`\<[`IAuditableItemGraphVertex`](IAuditableItemGraphVertex.md)\>

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

`Promise`\<[`IAuditableItemGraphVertex`](IAuditableItemGraphVertex.md)\>

The vertex if found.

#### Throws

NotFoundError if the vertex is not found.
