# Interface: IAuditableItemGraphGetResponse

Response to getting an auditable item graph vertex.

## Properties

### body

> **body**: `object`

The response body.

#### verified?

> `optional` **verified**: `boolean`

Whether the vertex has been verified.

#### verification?

> `optional` **verification**: `object`[]

The verification patches including any failure information.

#### vertex

> **vertex**: [`IAuditableItemGraphVertex`](IAuditableItemGraphVertex.md)

The vertex data.

#### changesets?

> `optional` **changesets**: [`IAuditableItemGraphChangeset`](IAuditableItemGraphChangeset.md)[]

Changesets containing time sliced changes to the vertex.
