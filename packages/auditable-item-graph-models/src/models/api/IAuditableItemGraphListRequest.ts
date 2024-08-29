// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Get the a list of the vertices with matching ids or aliases.
 */
export interface IAuditableItemGraphListRequest {
	/**
	 * The query parameters.
	 */
	query: {
		/**
		 * The id or alias to try and find.
		 */
		idOrAlias: string;

		/**
		 * Which field to look in, defaults to both.
		 */
		mode?: "id" | "alias" | "both";

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
