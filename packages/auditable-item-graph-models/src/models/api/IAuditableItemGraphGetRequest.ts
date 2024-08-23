// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Get an auditable item graph vertex.
 */
export interface IAuditableItemGraphGetRequest {
	/**
	 * The parameters from the path.
	 */
	pathParams: {
		/**
		 * The id of the vertex to get.
		 */
		id: string;
	};

	/**
	 * The query parameters.
	 */
	queryParams?: {
		/**
		 * Whether to include deleted aliases, resource, edges.
		 * @default false
		 */
		includeDeleted?: boolean;

		/**
		 * Whether to include the changesets of the vertex.
		 * @default false
		 */
		includeChangesets?: boolean;

		/**
		 * How many signatures to verify.
		 * @default "none"
		 */
		verifySignatureDepth?: "none" | "current" | "all";
	};
}
