# Class: AuditableItemGraphEdge

Class describing the auditable item graph edge.

## Constructors

### Constructor

> **new AuditableItemGraphEdge**(): `AuditableItemGraphEdge`

#### Returns

`AuditableItemGraphEdge`

## Properties

### id

> **id**: `string`

The id of the edge.

***

### dateCreated

> **dateCreated**: `string`

The date/time of when the edge was created.

***

### dateModified?

> `optional` **dateModified**: `string`

The date/time of when the edge was last modified.

***

### dateDeleted?

> `optional` **dateDeleted**: `string`

The timestamp of when the edge was deleted, as we never actually remove items.

***

### edgeRelationships

> **edgeRelationships**: `string`[]

The relationships between the two vertices.

***

### annotationObject?

> `optional` **annotationObject**: `IJsonLdNodeObject`

Object to associate with the edge as JSON-LD.
