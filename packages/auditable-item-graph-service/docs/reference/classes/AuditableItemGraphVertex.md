# Class: AuditableItemGraphVertex

Class describing the auditable item graph vertex.

## Constructors

### new AuditableItemGraphVertex()

> **new AuditableItemGraphVertex**(): [`AuditableItemGraphVertex`](AuditableItemGraphVertex.md)

#### Returns

[`AuditableItemGraphVertex`](AuditableItemGraphVertex.md)

## Properties

### id

> **id**: `string`

The id of the vertex.

***

### nodeIdentity?

> `optional` **nodeIdentity**: `string`

The identity of the node which controls the vertex.

***

### created

> **created**: `number`

The timestamp of when the vertex was created.

***

### aliases?

> `optional` **aliases**: [`AuditableItemGraphAlias`](AuditableItemGraphAlias.md)[]

Alternative aliases that can be used to identify the vertex.

***

### metadata?

> `optional` **metadata**: `object`

Metadata to associate with the vertex.

#### Index signature

 \[`id`: `string`\]: [`AuditableItemGraphProperty`](AuditableItemGraphProperty.md)

***

### resources?

> `optional` **resources**: [`AuditableItemGraphResource`](AuditableItemGraphResource.md)[]

The resources attached to the vertex.

***

### edges?

> `optional` **edges**: [`AuditableItemGraphEdge`](AuditableItemGraphEdge.md)[]

Edges connected to the vertex.

***

### changesets?

> `optional` **changesets**: [`AuditableItemGraphChangeset`](AuditableItemGraphChangeset.md)[]

Changesets containing time sliced changes to the vertex.
