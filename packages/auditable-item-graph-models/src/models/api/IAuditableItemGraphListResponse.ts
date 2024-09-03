// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuditableItemGraphVertex } from "../IAuditableItemGraphVertex";

/**
 * The response to getting the a list of the vertices with matching ids or aliases.
 */
export interface IAuditableItemGraphListResponse {
	/**
	 * The response payload.
	 */
	body: {
		/**
		 * The entities, which can be partial if a limited keys list was provided.
		 */
		entities: Partial<IAuditableItemGraphVertex>[];

		/**
		 * An optional cursor, when defined can be used to call find to get more entities.
		 */
		cursor?: string;
	};
}
