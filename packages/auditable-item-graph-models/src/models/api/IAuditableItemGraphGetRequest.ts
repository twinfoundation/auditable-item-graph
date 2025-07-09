// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { HeaderTypes, MimeTypes } from "@twin.org/web";
import type { VerifyDepth } from "../verifyDepth";

/**
 * Get an auditable item graph vertex.
 */
export interface IAuditableItemGraphGetRequest {
	/**
	 * The headers which can be used to determine the response data type.
	 */
	headers?: {
		[HeaderTypes.Accept]: typeof MimeTypes.Json | typeof MimeTypes.JsonLd;
	};

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
	query?: {
		/**
		 * Whether to include deleted aliases, resource, edges, defaults to false.
		 */
		includeDeleted?: boolean | string;

		/**
		 * Whether to include the changesets of the vertex, defaults to false.
		 */
		includeChangesets?: boolean | string;

		/**
		 * How many signatures to verify, none, current or all, defaults to "none".
		 */
		verifySignatureDepth?: VerifyDepth;
	};
}
