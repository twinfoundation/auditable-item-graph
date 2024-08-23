// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuditableItemGraphVertex } from "../IAuditableItemGraphVertex";

/**
 * Response to getting an auditable item graph vertex.
 */
export interface IAuditableItemGraphGetResponse {
	/**
	 * The response body.
	 */
	body: IAuditableItemGraphVertex;
}
