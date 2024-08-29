# Interface: IAuditableItemGraphListRequest

Get the a list of the vertices with matching ids or aliases.

## Properties

### query

> **query**: `object`

The query parameters.

#### idOrAlias

> **idOrAlias**: `string`

The id or alias to try and find.

#### mode?

> `optional` **mode**: `"both"` \| `"id"` \| `"alias"`

Which field to look in, defaults to both.

#### properties?

> `optional` **properties**: `string`

The properties to return as a comma separated list, defaults to "id,created,aliases,metadata".

#### cursor?

> `optional` **cursor**: `string`

The optional cursor to get next chunk.

#### pageSize?

> `optional` **pageSize**: `number`

The maximum number of entities in a page.
