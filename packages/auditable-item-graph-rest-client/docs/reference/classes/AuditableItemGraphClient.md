# Class: AuditableItemGraphClient

Client for performing auditable item graph through to REST endpoints.

## Extends

- `BaseRestClient`

## Implements

- `IAuditableItemGraphComponent`

## Constructors

### new AuditableItemGraphClient()

> **new AuditableItemGraphClient**(`config`): [`AuditableItemGraphClient`](AuditableItemGraphClient.md)

Create a new instance of AuditableItemGraphClient.

#### Parameters

• **config**: `IBaseRestClientConfig`

The configuration for the client.

#### Returns

[`AuditableItemGraphClient`](AuditableItemGraphClient.md)

#### Overrides

`BaseRestClient.constructor`

## Properties

### CLASS\_NAME

> `readonly` **CLASS\_NAME**: `string`

Runtime name for the class.

#### Implementation of

`IAuditableItemGraphComponent.CLASS_NAME`

## Methods

### getEndpointWithPrefix()

> **getEndpointWithPrefix**(): `string`

Get the endpoint with the prefix for the namespace.

#### Returns

`string`

The endpoint with namespace prefix attached.

#### Inherited from

`BaseRestClient.getEndpointWithPrefix`

***

### fetch()

> **fetch**\<`T`, `U`\>(`route`, `method`, `request`?): `Promise`\<`U`\>

Perform a request in json format.

#### Type parameters

• **T** *extends* `IHttpRequest`\<`any`\>

• **U** *extends* `IHttpResponse`\<`any`\>

#### Parameters

• **route**: `string`

The route of the request.

• **method**: `HttpMethod`

The http method.

• **request?**: `T`

Request to send to the endpoint.

#### Returns

`Promise`\<`U`\>

The response.

#### Inherited from

`BaseRestClient.fetch`

***

### create()

> **create**(`aliases`?, `metadata`?): `Promise`\<`string`\>

Create a new graph vertex.

#### Parameters

• **aliases?**: `string`[]

Alternative aliases that can be used to identify the vertex.

• **metadata?**: `IProperty`[]

The metadata for the vertex.

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
