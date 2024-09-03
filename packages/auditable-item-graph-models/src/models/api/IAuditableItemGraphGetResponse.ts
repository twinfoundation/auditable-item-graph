// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuditableItemGraphChangeset } from "../IAuditableItemGraphChangeset";
import type { IAuditableItemGraphVertex } from "../IAuditableItemGraphVertex";

/**
 * Response to getting an auditable item graph vertex.
 */
export interface IAuditableItemGraphGetResponse {
	/**
	 * The response body.
	 */
	body: {
		/**
		 * The vertex data.
		 */
		vertex: IAuditableItemGraphVertex;

		/**
		 * Changesets containing time sliced changes to the vertex.
		 */
		changesets?: IAuditableItemGraphChangeset[];

		/**
		 * Whether the vertex has been verified.
		 */
		verified?: boolean;

		/**
		 * The verification for the changesets including any failure information.
		 */
		verification?: {
			created: number;
			failure?: string;
			failureProperties?: { [id: string]: unknown };
		}[];
	};
}
