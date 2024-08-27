// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IProperty } from "@gtsc/schema";

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
		 * Alternative aliases that can be used to identify the vertex.
		 */
		aliases?: {
			id: string;
			metadata?: IProperty[];
		}[];

		/**
		 * The metadata to be used in the vertex.
		 */
		metadata?: IProperty[];

		/**
		 * The resources attached to the vertex.
		 */
		resources?: {
			id: string;
			metadata?: IProperty[];
		}[];

		/**
		 * The edges connected to the vertex.
		 */
		edges?: {
			id: string;
			relationship: string;
			metadata?: IProperty[];
		}[];
	};
}
