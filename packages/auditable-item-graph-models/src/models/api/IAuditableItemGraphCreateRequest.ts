// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IProperty } from "@gtsc/schema";

/**
 * Create an auditable item graph vertex.
 */
export interface IAuditableItemGraphCreateRequest {
	/**
	 * The data to be used in the item.
	 */
	body: {
		/**
		 * Alternative aliases that can be used to identify the vertex.
		 */
		aliases?: string[];

		/**
		 * The metadata to be used in the item.
		 */
		metadata?: IProperty[];
	};
}
