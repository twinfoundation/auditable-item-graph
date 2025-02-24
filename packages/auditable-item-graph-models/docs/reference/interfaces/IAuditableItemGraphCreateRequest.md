# Interface: IAuditableItemGraphCreateRequest

Create an auditable item graph vertex.

## Properties

### body

> **body**: `object`

The data to be used in the vertex.

#### annotationObject?

> `optional` **annotationObject**: `IJsonLdNodeObject`

The object to be used in the vertex as JSON-LD.

#### aliases?

> `optional` **aliases**: `object`[]

Alternative aliases that can be used to identify the vertex.

#### resources?

> `optional` **resources**: `object`[]

The resources attached to the vertex.

#### edges?

> `optional` **edges**: `object`[]

The edges connected to the vertex.
