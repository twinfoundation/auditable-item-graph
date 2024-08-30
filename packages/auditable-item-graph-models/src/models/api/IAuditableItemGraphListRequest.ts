// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { SortDirection } from "@gtsc/entity";

/**
 * Get the a list of the vertices with matching ids or aliases.
 */
export interface IAuditableItemGraphListRequest {
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
		 * The order for the results, default to created.
		 */
		orderBy?: "created" | "updated";

		/**
		 * The direction for the order, defaults to desc.
		 */
		orderByDirection?: SortDirection;

		/**
		 * The properties to return as a comma separated list, defaults to "id,created,aliases,metadata".
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
