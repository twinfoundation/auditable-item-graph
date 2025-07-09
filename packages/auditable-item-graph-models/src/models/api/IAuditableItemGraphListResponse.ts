// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { HeaderTypes, MimeTypes } from "@twin.org/web";
import type { IAuditableItemGraphVertexList } from "../IAuditableItemGraphVertexList";

/**
 * The response to getting the a list of the vertices with matching ids or aliases.
 */
export interface IAuditableItemGraphListResponse {
	/**
	 * The headers which can be used to determine the response data type.
	 */
	headers?: {
		[HeaderTypes.ContentType]: typeof MimeTypes.Json | typeof MimeTypes.JsonLd;
	};

	/**
	 * The response payload.
	 */
	body: IAuditableItemGraphVertexList;
}
