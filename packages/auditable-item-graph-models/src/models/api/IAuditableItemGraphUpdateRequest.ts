// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Update an auditable item graph vertex.
 */
export interface IAuditableItemGraphUpdateRequest {
	/**
	 * The path parameters.
	 */
	pathParams: {
		/**
		 * The id of the vertex to update.
		 */
		id: string;
	};

	/**
	 * The data to be used in the vertex.
	 */
	body?: {
		/**
		 * The metadata to be used in the vertex as JSON-LD.
		 */
		metadata?: unknown;

		/**
		 * Alternative aliases that can be used to identify the vertex.
		 */
		aliases?: {
			id: string;
			metadata?: unknown;
		}[];

		/**
		 * The resources attached to the vertex.
		 */
		resources?: {
			id: string;
			metadata?: unknown;
		}[];

		/**
		 * The edges connected to the vertex.
		 */
		edges?: {
			id: string;
			relationship: string;
			metadata?: unknown;
		}[];
	};
}
