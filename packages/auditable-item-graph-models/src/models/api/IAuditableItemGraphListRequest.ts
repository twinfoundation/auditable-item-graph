// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { SortDirection } from "@twin.org/entity";
import type { HeaderTypes, MimeTypes } from "@twin.org/web";
import type { IAuditableItemGraphVertex } from "../IAuditableItemGraphVertex";

/**
 * Get the a list of the vertices with matching ids or aliases.
 */
export interface IAuditableItemGraphListRequest {
	/**
	 * The headers which can be used to determine the response data type.
	 */
	headers?: {
		[HeaderTypes.Accept]: typeof MimeTypes.Json | typeof MimeTypes.JsonLd;
	};

	/**
	 * The query parameters.
	 */
	query?: {
		/**
		 * The id or alias to try and find.
		 */
		id?: string;

		/**
		 * Which field to look in with the id, defaults to both.
		 */
		idMode?: "id" | "alias" | "both";

		/**
		 * The order for the results, default to dateCreated.
		 */
		orderBy?: keyof Pick<IAuditableItemGraphVertex, "dateCreated" | "dateModified">;

		/**
		 * The direction for the order, defaults to desc.
		 */
		orderByDirection?: SortDirection;

		/**
		 * The properties to return as a comma separated list, defaults to "id,dateCreated,aliases,vertexObject".
		 */
		properties?: string;

		/**
		 * The optional cursor to get next chunk.
		 */
		cursor?: string;

		/**
		 * The maximum number of entities in a page.
		 */
		pageSize?: number;
	};
}
